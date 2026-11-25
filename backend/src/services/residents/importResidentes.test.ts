import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import {
  generarPlantilla,
  generarUsernameBase,
  leerExcel,
  normalizarDni,
  normalizarNombrePropio,
  validarFilas,
  type ExistentesImport,
} from './importResidentes';

const vacio = (): ExistentesImport => ({ dnis: new Set(), usernames: new Set() });

async function libroConFilas(filas: Array<Array<string | number>>, encabezados?: string[]): Promise<Buffer> {
  const libro = new ExcelJS.Workbook();
  const hoja = libro.addWorksheet('Residentes');
  hoja.addRow(encabezados ?? ['Nombre', 'Apellido', 'DNI', 'Sección']);
  filas.forEach((f) => hoja.addRow(f));
  return Buffer.from(await libro.xlsx.writeBuffer());
}

describe('normalización', () => {
  it('capitaliza nombres y respeta partículas', () => {
    expect(normalizarNombrePropio('maría DE los ángeles')).toBe('María de los Ángeles');
    expect(normalizarNombrePropio('  juan   carlos ')).toBe('Juan Carlos');
    expect(normalizarNombrePropio("o'brien-pérez")).toBe("O'Brien-Pérez");
  });
  it('limpia el DNI y rechaza letras', () => {
    expect(normalizarDni('12.345.678')).toBe('12345678');
    expect(normalizarDni(' 12 345 678 ')).toBe('12345678');
    expect(normalizarDni('12a45678')).toBeNull();
  });
  it('genera el usuario base', () => {
    expect(generarUsernameBase('Lucas', 'Martínez')).toBe('lmartinez');
    expect(generarUsernameBase('Ana', 'De la Vega')).toBe('adelavega');
  });
});

describe('leerExcel', () => {
  it('rechaza un archivo que no es xlsx', async () => {
    await expect(leerExcel(Buffer.from('nombre,apellido\nA,B'))).rejects.toThrow(/no es un Excel/);
  });
  it('rechaza un Excel sin la hoja Residentes', async () => {
    const libro = new ExcelJS.Workbook();
    libro.addWorksheet('Otra').addRow(['x']);
    await expect(leerExcel(Buffer.from(await libro.xlsx.writeBuffer()))).rejects.toThrow(/no es la plantilla/);
  });
  it('rechaza un Excel al que le faltan columnas', async () => {
    const buf = await libroConFilas([['Ana', 'Perez']], ['Nombre', 'Apellido']);
    await expect(leerExcel(buf)).rejects.toThrow(/faltan las columnas "DNI", "Sección"/);
  });
  it('rechaza un Excel sin filas', async () => {
    await expect(leerExcel(await libroConFilas([]))).rejects.toThrow(/no tiene filas/);
  });
});

describe('validarFilas', () => {
  it('normaliza una fila correcta', async () => {
    const crudas = await leerExcel(await libroConFilas([['maria de los angeles', 'perez', '12.345.678', '1ac']]));
    const r = validarFilas(crudas, vacio());
    expect(r.resumen).toMatchObject({ total: 1, validas: 1, conErrores: 0 });
    expect(r.filas[0]!.datos).toMatchObject({ nombre: 'Maria de los Angeles', apellido: 'Perez', dni: '12345678', seccion: '1 AC', username: 'mperez' });
  });
  it('acepta el DNI como número de Excel', async () => {
    const crudas = await leerExcel(await libroConFilas([['Ana', 'Gómez', 12345678, '3B']]));
    expect(validarFilas(crudas, vacio()).filas[0]!.datos?.dni).toBe('12345678');
  });
  it('marca errores por fila', async () => {
    const crudas = await leerExcel(await libroConFilas([
      ['', 'Perez', '12345678', '1 AC'],
      ['Ana', 'Perez', 'abc', '1 AC'],
      ['Ana', 'Perez', '123', '1 AC'],
      ['Ana', 'Perez', '87654321', 'PISO 9'],
      ['Ana', 'Perez', '', ''],
    ]));
    const r = validarFilas(crudas, vacio());
    expect(r.resumen.conErrores).toBe(5);
    expect(r.filas[0]!.errores).toContain('Falta el nombre.');
    expect(r.filas[1]!.errores[0]).toMatch(/solo puede tener números/);
    expect(r.filas[2]!.errores[0]).toMatch(/entre 6 y 8/);
    expect(r.filas[3]!.errores[0]).toMatch(/no existe/);
  });
  it('detecta DNI repetido en el archivo y ya existente', async () => {
    const crudas = await leerExcel(await libroConFilas([
      ['Ana', 'Perez', '11111111', '1 AC'],
      ['Beto', 'Lopez', '11.111.111', '1 AC'],
      ['Cris', 'Diaz', '22222222', '1 AC'],
    ]));
    const r = validarFilas(crudas, { dnis: new Set(['22222222']), usernames: new Set() });
    expect(r.filas[1]!.errores[0]).toMatch(/repetido en el archivo/);
    expect(r.filas[2]!.errores[0]).toMatch(/Ya existe/);
  });
  it('desambigua usuarios repetidos', async () => {
    const crudas = await leerExcel(await libroConFilas([
      ['Ana', 'Perez', '11111111', '1 AC'],
      ['Alicia', 'Perez', '22222222', '1 AC'],
    ]));
    const r = validarFilas(crudas, { dnis: new Set(), usernames: new Set(['aperez']) });
    expect(r.filas.map((f) => f.datos?.username)).toEqual(['aperez2', 'aperez3']);
  });
  it('rechaza un archivo que solo tiene las filas de ejemplo de la plantilla', async () => {
    const crudas = await leerExcel(await generarPlantilla());
    expect(() => validarFilas(crudas, vacio())).toThrow(/solo tiene las filas de ejemplo/);
  });
  it('la plantilla completada se importa y el puesto queda solo para empleados', async () => {
    const libro = new ExcelJS.Workbook();
    await libro.xlsx.load((await generarPlantilla()) as unknown as ArrayBuffer);
    const hoja = libro.getWorksheet('Residentes')!;
    ['rosa', 'garcia', '30.111.222', '2 B'].forEach((v, i) => { hoja.getCell(5, i + 1).value = v; });
    ['pedro', 'sosa', '30111223', 'EMPLEADO LEDOR VADOR', 'enfermero'].forEach((v, i) => { hoja.getCell(6, i + 1).value = v; });
    const r = validarFilas(await leerExcel(Buffer.from(await libro.xlsx.writeBuffer())), vacio());
    expect(r.resumen).toMatchObject({ total: 2, validas: 2, ejemplosOmitidos: 3 });
    expect(r.filas[0]!.datos).toMatchObject({ nombre: 'Rosa', dni: '30111222', tipo_celular: 'no_especificado', rol_empleado: null });
    expect(r.filas[1]!.datos).toMatchObject({ rol_empleado: 'Enfermero' });
  });
  it('rechaza un puesto en una sección que no es de empleados', async () => {
    const crudas = await leerExcel(await libroConFilas([['Ana', 'Perez', '11111111', '1 AC', 'enfermera']], ['Nombre', 'Apellido', 'DNI', 'Sección', 'Puesto (solo empleados)']));
    const r = validarFilas(crudas, vacio());
    expect(r.filas[0]!.errores[0]).toMatch(/solo se completa para la sección EMPLEADO LEDOR VADOR/);
  });
  it('acepta un Excel con las columnas viejas de más (se ignoran)', async () => {
    const crudas = await leerExcel(await libroConFilas([['Ana', 'Perez', '11111111', '1 AC', 'anita', 'android']], ['Nombre', 'Apellido', 'DNI', 'Sección', 'Usuario (opcional)', 'Tipo de celular (opcional)']));
    const r = validarFilas(crudas, vacio());
    expect(r.filas[0]!.datos).toMatchObject({ username: 'aperez', tipo_celular: 'no_especificado' });
  });
});

describe('generarPlantilla', () => {
  it('tiene solo las columnas Nombre, Apellido, DNI, Sección y Puesto, y 3 filas de ejemplo', async () => {
    const libro = new ExcelJS.Workbook();
    await libro.xlsx.load((await generarPlantilla()) as unknown as ArrayBuffer);
    const hoja = libro.getWorksheet('Residentes')!;
    expect(hoja.getRow(1).values).toEqual([undefined, 'Nombre', 'Apellido', 'DNI', 'Sección', 'Puesto (solo empleados)']);
    expect([2, 3, 4].map((n) => String(hoja.getCell(n, 1).value))).toEqual(['prueba1', 'prueba2', 'prueba3']);
    expect(hoja.getCell('C2').value).toBe(10000001);
  });
  it('la sección es un desplegable y el puesto solo se habilita para empleados', async () => {
    const libro = new ExcelJS.Workbook();
    await libro.xlsx.load((await generarPlantilla()) as unknown as ArrayBuffer);
    const hoja = libro.getWorksheet('Residentes')!;
    expect(hoja.getCell('D2').dataValidation.type).toBe('list');
    expect(hoja.getCell('D300').dataValidation.type).toBe('list');
    expect(hoja.getCell('E2').dataValidation.type).toBe('custom');
    expect(String(hoja.getCell('E7').dataValidation.formulae?.[0])).toContain('$D7="EMPLEADO LEDOR VADOR"');
  });
});
