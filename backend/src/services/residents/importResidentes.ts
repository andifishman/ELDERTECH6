import ExcelJS from 'exceljs';
import { StatusCodes } from 'http-status-codes';
import { HttpError } from '../../middlewares/errorHandler';

/**
 * Importación masiva de residentes desde Excel: plantilla descargable y
 * validación/normalización de lo que suben. Funciones puras (sin base de datos):
 * lo que ya existe en la base llega por parámetro (`ExistentesImport`).
 */

export const SECCIONES_IMPORT = [
  '1 AC', '1 B', '1 FRAGA',
  '2 AC', '2 B', '2 MODERADO', '2 REHABILITACION',
  '3 AC', '3B',
  'BAIT',
  'EMPLEADO LEDOR VADOR',
] as const;

const SECCION_EMPLEADO = 'EMPLEADO LEDOR VADOR';
const TIPOS_CELULAR = { android: 'Android', iphone: 'iPhone', no_especificado: 'Ninguno' } as const;
type TipoCelularImport = keyof typeof TIPOS_CELULAR;

export const HOJA_RESIDENTES = 'Residentes';
const HOJA_INSTRUCCIONES = 'Instrucciones';
const HOJA_LISTAS = 'Listas';
export const MAX_FILAS_IMPORT = 200;
/** Última fila con listas desplegables en la plantilla (más filas de las que se aceptan). */
const FILAS_PLANTILLA = 500;

interface Columna {
  clave: 'nombre' | 'apellido' | 'dni' | 'seccion' | 'usuario' | 'tipo_celular' | 'puesto';
  titulo: string;
  obligatoria: boolean;
  ancho: number;
}

const COLUMNAS: Columna[] = [
  { clave: 'nombre', titulo: 'Nombre', obligatoria: true, ancho: 20 },
  { clave: 'apellido', titulo: 'Apellido', obligatoria: true, ancho: 20 },
  { clave: 'dni', titulo: 'DNI', obligatoria: true, ancho: 16 },
  { clave: 'seccion', titulo: 'Sección', obligatoria: true, ancho: 24 },
  { clave: 'usuario', titulo: 'Usuario (opcional)', obligatoria: false, ancho: 20 },
  { clave: 'tipo_celular', titulo: 'Tipo de celular (opcional)', obligatoria: false, ancho: 24 },
  { clave: 'puesto', titulo: 'Puesto (solo empleados)', obligatoria: false, ancho: 24 },
];

// ── Normalización ────────────────────────────────────────────────────────────

function sinTildes(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Clave de comparación: sin tildes, sin espacios, mayúsculas, sin signos de puntuación. */
function clave(s: string): string {
  return sinTildes(s).toUpperCase().replace(/[\s._-]+/g, '');
}

const PARTICULAS = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'e', 'da', 'do', 'di', 'van', 'von']);

/** "maría DE los ángeles  perez" → "María de los Ángeles Perez". Respeta guiones y apóstrofes. */
export function normalizarNombrePropio(valor: string): string {
  const palabras = valor.trim().replace(/\s+/g, ' ').toLowerCase().split(' ').filter(Boolean);
  return palabras
    .map((palabra, i) => {
      if (i > 0 && PARTICULAS.has(palabra)) return palabra;
      return palabra.replace(/(^|[-'’])(\p{L})/gu, (_m, sep: string, letra: string) => sep + letra.toUpperCase());
    })
    .join(' ');
}

/** Solo dígitos: acepta "12.345.678", "12 345 678", "12-345-678". Devuelve null si trae letras u otros caracteres. */
export function normalizarDni(valor: string): string | null {
  const limpio = valor.trim().replace(/[.\s-]/g, '');
  return /^\d+$/.test(limpio) ? limpio : null;
}

/** "Lucas" + "Martínez" → "lmartinez" (inicial del nombre + apellido, sin tildes ni signos). */
export function generarUsernameBase(nombre: string, apellido: string): string {
  const limpiar = (s: string) => sinTildes(s).replace(/[^A-Za-z0-9\s]/g, '').trim();
  return (limpiar(nombre).charAt(0) + limpiar(apellido).split(/\s+/).filter(Boolean).join('')).toLowerCase();
}

// ── Lectura de celdas ────────────────────────────────────────────────────────

function textoDeCelda(valor: ExcelJS.CellValue): string {
  if (valor === null || valor === undefined) return '';
  if (typeof valor === 'string') return valor.trim();
  if (typeof valor === 'number') return String(valor);
  if (typeof valor === 'boolean') return valor ? 'true' : 'false';
  if (valor instanceof Date) return valor.toISOString();
  if (typeof valor === 'object') {
    if ('richText' in valor) return valor.richText.map((t) => t.text).join('').trim();
    if ('result' in valor) return textoDeCelda(valor.result as ExcelJS.CellValue);
    if ('text' in valor) return String(valor.text).trim();
  }
  return '';
}

/** Los números se leen como texto, pero uno con decimales (ej. 12.345 escrito como número) no es un DNI válido. */
function esNumeroConDecimales(valor: ExcelJS.CellValue): boolean {
  return typeof valor === 'number' && !Number.isInteger(valor);
}

// ── Resultado de la validación ───────────────────────────────────────────────

export interface FilaImportDatos {
  nombre: string;
  apellido: string;
  dni: string;
  seccion: string;
  username: string;
  tipo_celular: TipoCelularImport;
  rol_empleado: string | null;
}

export interface FilaImport {
  /** Número de fila en el Excel (la primera de datos es la 2). */
  fila: number;
  estado: 'ok' | 'error';
  datos: FilaImportDatos | null;
  errores: string[];
}

export interface ResultadoValidacion {
  filas: FilaImport[];
  resumen: { total: number; validas: number; conErrores: number; ejemplosOmitidos: number };
}

export interface ExistentesImport {
  /** DNIs de residentes ya cargados en la institución (solo dígitos). */
  dnis: Set<string>;
  /** Nombres de usuario ya tomados (minúsculas). */
  usernames: Set<string>;
}

const DNI_EJEMPLO = new Set(['10000001', '10000002', '10000003']);
const USERNAME_VALIDO = /^[a-z0-9._-]{3,30}$/;

function esFilaEjemplo(nombre: string, dniCrudo: string): boolean {
  return /^prueba\s*[123]$/i.test(nombre.trim()) && DNI_EJEMPLO.has(normalizarDni(dniCrudo) ?? '');
}

// ── Lectura del archivo ──────────────────────────────────────────────────────

export interface FilaCruda {
  fila: number;
  nombre: string;
  apellido: string;
  dni: string;
  dniNumeroInvalido: boolean;
  seccion: string;
  usuario: string;
  tipoCelular: string;
  puesto: string;
}

function error400(mensaje: string): HttpError {
  return new HttpError(StatusCodes.BAD_REQUEST, mensaje);
}

const FIRMA_ZIP = [0x50, 0x4b, 0x03, 0x04];

export async function leerExcel(buffer: Buffer): Promise<FilaCruda[]> {
  // .xlsx es un zip: rechazar de entrada lo que no lo es (un .xls viejo, un .csv, un PDF renombrado…).
  if (buffer.length < 4 || !FIRMA_ZIP.every((b, i) => buffer[i] === b)) {
    throw error400('El archivo no es un Excel válido (.xlsx). Descargá la plantilla, completala y guardala como .xlsx.');
  }

  const libro = new ExcelJS.Workbook();
  try {
    await libro.xlsx.load(buffer as unknown as ArrayBuffer);
  } catch {
    throw error400('No se pudo leer el archivo: está dañado o no es un Excel (.xlsx) válido.');
  }

  const hoja = libro.getWorksheet(HOJA_RESIDENTES);
  if (!hoja) {
    throw error400(`Este archivo no es la plantilla de ElderTech: no tiene la hoja "${HOJA_RESIDENTES}". Descargá la plantilla y usá esa.`);
  }

  // Encabezados de la fila 1 → columna.
  const indicePorClave = new Map<Columna['clave'], number>();
  hoja.getRow(1).eachCell((celda, numero) => {
    const titulo = clave(textoDeCelda(celda.value));
    const columna = COLUMNAS.find((c) => clave(c.titulo) === titulo);
    if (columna && !indicePorClave.has(columna.clave)) indicePorClave.set(columna.clave, numero);
  });

  const faltantes = COLUMNAS.filter((c) => c.obligatoria && !indicePorClave.has(c.clave)).map((c) => c.titulo);
  if (faltantes.length > 0) {
    throw error400(
      `Este archivo no tiene el formato de la plantilla: faltan las columnas ${faltantes.map((f) => `"${f}"`).join(', ')} en la fila 1 de la hoja "${HOJA_RESIDENTES}". Descargá la plantilla y no cambies los encabezados.`,
    );
  }

  const leer = (fila: ExcelJS.Row, k: Columna['clave']): string => {
    const i = indicePorClave.get(k);
    return i ? textoDeCelda(fila.getCell(i).value) : '';
  };

  const filas: FilaCruda[] = [];
  const ultima = hoja.actualRowCount > 0 ? hoja.rowCount : 1;
  for (let n = 2; n <= ultima; n += 1) {
    const fila = hoja.getRow(n);
    const crudo: FilaCruda = {
      fila: n,
      nombre: leer(fila, 'nombre'),
      apellido: leer(fila, 'apellido'),
      dni: leer(fila, 'dni'),
      dniNumeroInvalido: esNumeroConDecimales(fila.getCell(indicePorClave.get('dni') as number).value),
      seccion: leer(fila, 'seccion'),
      usuario: leer(fila, 'usuario'),
      tipoCelular: leer(fila, 'tipo_celular'),
      puesto: leer(fila, 'puesto'),
    };
    const vacia = !crudo.nombre && !crudo.apellido && !crudo.dni && !crudo.seccion && !crudo.usuario && !crudo.tipoCelular && !crudo.puesto;
    if (!vacia) filas.push(crudo);
  }

  if (filas.length === 0) throw error400('El archivo no tiene filas para importar. Completá los residentes a partir de la fila 2.');
  return filas;
}

// ── Validación ───────────────────────────────────────────────────────────────

export function validarFilas(crudas: FilaCruda[], existentes: ExistentesImport): ResultadoValidacion {
  const reales = crudas.filter((f) => !esFilaEjemplo(f.nombre, f.dni));
  const ejemplosOmitidos = crudas.length - reales.length;

  if (reales.length > MAX_FILAS_IMPORT) {
    throw error400(`El archivo tiene ${reales.length} filas; el máximo por importación es ${MAX_FILAS_IMPORT}. Dividilo en varios archivos.`);
  }
  if (reales.length === 0) {
    throw error400('El archivo solo tiene las filas de ejemplo (prueba1, prueba2, prueba3). Borralas y cargá a los residentes reales.');
  }

  const dnisVistos = new Map<string, number>();
  const usernamesTomados = new Set(existentes.usernames);
  const filas: FilaImport[] = [];

  // Primero se reservan los usuarios escritos a mano, así uno automático no se los "roba".
  const manuales = new Map<number, string>();
  for (const f of reales) {
    const u = f.usuario.trim().toLowerCase().replace(/\s+/g, '');
    if (u) manuales.set(f.fila, u);
  }
  const conteoManual = new Map<string, number>();
  for (const u of manuales.values()) conteoManual.set(u, (conteoManual.get(u) ?? 0) + 1);

  for (const f of reales) {
    const errores: string[] = [];

    const nombre = normalizarNombrePropio(f.nombre);
    const apellido = normalizarNombrePropio(f.apellido);
    if (!nombre) errores.push('Falta el nombre.');
    if (!apellido) errores.push('Falta el apellido.');
    if (nombre && !/^[\p{L}][\p{L}\s'’.-]*$/u.test(nombre)) errores.push('El nombre solo puede tener letras.');
    if (apellido && !/^[\p{L}][\p{L}\s'’.-]*$/u.test(apellido)) errores.push('El apellido solo puede tener letras.');

    let dni = '';
    if (!f.dni) {
      errores.push('Falta el DNI.');
    } else if (f.dniNumeroInvalido) {
      errores.push('El DNI no es válido (tiene decimales). Escribilo solo con números, sin puntos.');
    } else {
      const limpio = normalizarDni(f.dni);
      if (limpio === null) errores.push('El DNI solo puede tener números.');
      else if (limpio.length < 6 || limpio.length > 8) errores.push('El DNI debe tener entre 6 y 8 dígitos.');
      else {
        dni = limpio;
        const previa = dnisVistos.get(dni);
        if (previa !== undefined) errores.push(`El DNI está repetido en el archivo (también en la fila ${previa}).`);
        else dnisVistos.set(dni, f.fila);
        if (existentes.dnis.has(dni)) errores.push('Ya existe un residente cargado con ese DNI.');
      }
    }

    let seccion = '';
    if (!f.seccion) {
      errores.push('Falta la sección.');
    } else {
      const encontrada = SECCIONES_IMPORT.find((s) => clave(s) === clave(f.seccion));
      if (encontrada) seccion = encontrada;
      else errores.push(`La sección "${f.seccion}" no existe. Elegí una de la lista desplegable.`);
    }

    let tipoCelular: TipoCelularImport = 'no_especificado';
    if (f.tipoCelular) {
      const k = clave(f.tipoCelular);
      const encontrado = (Object.keys(TIPOS_CELULAR) as TipoCelularImport[]).find(
        (t) => clave(TIPOS_CELULAR[t]) === k || clave(t) === k || (t === 'no_especificado' && ['NINGUNO', 'NOESPECIFICADO'].includes(k)),
      );
      if (encontrado) tipoCelular = encontrado;
      else errores.push(`El tipo de celular "${f.tipoCelular}" no es válido. Elegí Android, iPhone o Ninguno.`);
    }

    let username = '';
    const manual = manuales.get(f.fila);
    if (manual) {
      if (!USERNAME_VALIDO.test(manual)) {
        errores.push('El usuario solo puede tener letras, números, punto, guion y guion bajo (entre 3 y 30 caracteres).');
      } else if (existentes.usernames.has(manual)) {
        errores.push(`El usuario "${manual}" ya está en uso.`);
      } else if ((conteoManual.get(manual) ?? 0) > 1) {
        errores.push(`El usuario "${manual}" está repetido en el archivo.`);
      } else {
        username = manual;
        usernamesTomados.add(manual);
      }
    } else if (nombre && apellido) {
      const base = generarUsernameBase(nombre, apellido);
      if (base.length < 3) {
        errores.push('No se pudo generar un usuario a partir del nombre; escribilo en la columna "Usuario".');
      } else {
        let candidato = base;
        for (let n = 2; usernamesTomados.has(candidato) || [...manuales.values()].includes(candidato); n += 1) candidato = `${base}${n}`;
        username = candidato;
        usernamesTomados.add(candidato);
      }
    }

    const puesto = normalizarNombrePropio(f.puesto).slice(0, 80);
    const rolEmpleado = seccion === SECCION_EMPLEADO && puesto ? puesto : null;

    filas.push({
      fila: f.fila,
      estado: errores.length === 0 ? 'ok' : 'error',
      datos: errores.length === 0 ? { nombre, apellido, dni, seccion, username, tipo_celular: tipoCelular, rol_empleado: rolEmpleado } : null,
      errores,
    });
  }

  const validas = filas.filter((f) => f.estado === 'ok').length;
  return { filas, resumen: { total: filas.length, validas, conErrores: filas.length - validas, ejemplosOmitidos } };
}

// ── Plantilla ────────────────────────────────────────────────────────────────

export async function generarPlantilla(): Promise<Buffer> {
  const libro = new ExcelJS.Workbook();
  libro.creator = 'ElderTech';

  const hoja = libro.addWorksheet(HOJA_RESIDENTES, { views: [{ state: 'frozen', ySplit: 1 }] });
  hoja.columns = COLUMNAS.map((c) => ({ header: c.titulo, key: c.clave, width: c.ancho }));

  const encabezado = hoja.getRow(1);
  encabezado.height = 24;
  encabezado.eachCell((celda, n) => {
    const obligatoria = COLUMNAS[n - 1]?.obligatoria ?? false;
    celda.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: obligatoria ? 'FF1F4E79' : 'FF7F8FA6' } };
    celda.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  // DNI como texto (para que Excel no lo convierta ni le saque ceros) en todas las filas editables.
  hoja.getColumn('dni').numFmt = '@';

  // Tres filas de ejemplo — se omiten al importar.
  const ejemplos: Array<Record<string, string>> = [
    { nombre: 'prueba1', apellido: 'ejemplo uno', dni: '10000001', seccion: '1 AC', usuario: '', tipo_celular: 'Android', puesto: '' },
    { nombre: 'prueba2', apellido: 'ejemplo dos', dni: '10000002', seccion: '2 MODERADO', usuario: 'prueba2', tipo_celular: 'iPhone', puesto: '' },
    { nombre: 'prueba3', apellido: 'ejemplo tres', dni: '10000003', seccion: 'EMPLEADO LEDOR VADOR', usuario: '', tipo_celular: '', puesto: 'enfermera' },
  ];
  ejemplos.forEach((e) => {
    const fila = hoja.addRow(e);
    fila.eachCell((c) => {
      c.font = { italic: true, color: { argb: 'FF7F7F7F' } };
    });
  });

  // Hoja de listas (oculta) que alimenta los desplegables.
  const listas = libro.addWorksheet(HOJA_LISTAS, { state: 'veryHidden' });
  SECCIONES_IMPORT.forEach((s, i) => { listas.getCell(i + 1, 1).value = s; });
  Object.values(TIPOS_CELULAR).forEach((t, i) => { listas.getCell(i + 1, 2).value = t; });

  const colSeccion = COLUMNAS.findIndex((c) => c.clave === 'seccion') + 1;
  const colCelular = COLUMNAS.findIndex((c) => c.clave === 'tipo_celular') + 1;
  for (let n = 2; n <= FILAS_PLANTILLA; n += 1) {
    hoja.getCell(n, colSeccion).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [`${HOJA_LISTAS}!$A$1:$A$${SECCIONES_IMPORT.length}`],
      showErrorMessage: true,
      errorStyle: 'stop',
      errorTitle: 'Sección no válida',
      error: 'Elegí una sección de la lista desplegable.',
    };
    hoja.getCell(n, colCelular).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [`${HOJA_LISTAS}!$B$1:$B$${Object.keys(TIPOS_CELULAR).length}`],
      showErrorMessage: true,
      errorStyle: 'stop',
      errorTitle: 'Tipo de celular no válido',
      error: 'Elegí Android, iPhone o Ninguno.',
    };
    hoja.getCell(n, 3).numFmt = '@';
  }

  const ayuda = libro.addWorksheet(HOJA_INSTRUCCIONES);
  ayuda.getColumn(1).width = 110;
  [
    'CÓMO COMPLETAR LA PLANTILLA',
    '',
    '1. Completá la hoja "Residentes" a partir de la fila 5 (las filas prueba1, prueba2 y prueba3 son de ejemplo: podés dejarlas o borrarlas, no se importan).',
    '2. Una fila por residente. No cambies ni borres los encabezados de la fila 1.',
    '3. Columnas azules: obligatorias (Nombre, Apellido, DNI, Sección). Columnas grises: opcionales.',
    '4. Nombre y Apellido: podés escribirlos como quieras ("maria perez"); el sistema los deja con mayúscula inicial ("María Perez").',
    '5. DNI: solo números, sin puntos ni espacios (si los ponés, se quitan solos). Entre 6 y 8 dígitos. Es la contraseña inicial del residente.',
    '6. Sección: elegila de la lista desplegable. Si escribís algo que no está en la lista, la fila se rechaza.',
    '7. Usuario: opcional. Si lo dejás vacío se genera solo (inicial del nombre + apellido, ej. "mperez"). Si ya existe, se agrega un número.',
    '8. Tipo de celular: opcional (Android, iPhone o Ninguno). Sirve para mostrarle los tutoriales correctos.',
    '9. Puesto: solo para la sección EMPLEADO LEDOR VADOR (ej. Enfermera). En otras secciones se ignora.',
    `10. Máximo ${MAX_FILAS_IMPORT} residentes por archivo. Guardalo como .xlsx y subilo desde Backoffice → Usuarios → Importar desde Excel.`,
    '',
    'Antes de crear nada, el sistema te muestra una vista previa con los errores fila por fila. Si hay algún error, no se importa nada hasta corregirlo.',
  ].forEach((t, i) => {
    const celda = ayuda.getCell(i + 1, 1);
    celda.value = t;
    celda.alignment = { wrapText: true, vertical: 'top' };
    if (i === 0) celda.font = { bold: true, size: 14 };
  });

  libro.views = [{ x: 0, y: 0, width: 10000, height: 20000, firstSheet: 0, activeTab: 0, visibility: 'visible' }];
  const salida = await libro.xlsx.writeBuffer();
  return Buffer.from(salida);
}
