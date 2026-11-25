// ========================================
// DIÁLOGO: ImportarResidentesDialog
// DESCRIPCIÓN:
// Alta masiva de usuarios desde un Excel. Flujo: descargar la
// plantilla → subir el archivo → vista previa con los errores
// fila por fila (nada se crea todavía) → confirmar. Si hay un
// solo error no se puede confirmar: se corrige y se vuelve a subir.
// La validación y normalización (mayúsculas, DNI sin puntos,
// sección válida) la hace el backend.
// ========================================
import { useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Upload, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { notify } from '@/components/ui/toast';
import { descargarPlantillaImportacion, type ResultadoImportacion } from '@/services/residentesService';
import { useImportarResidentes } from './useResidentes';

interface Props {
  abierto: boolean;
  onCerrar: () => void;
}

const MAX_BYTES = 4 * 1024 * 1024;

export function ImportarResidentesDialog({ abierto, onCerrar }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [resultado, setResultado] = useState<ResultadoImportacion | null>(null);
  const [descargando, setDescargando] = useState(false);
  const importar = useImportarResidentes();

  const reiniciar = () => {
    setArchivo(null);
    setResultado(null);
    if (inputRef.current) inputRef.current.value = '';
  };
  const cerrar = () => {
    reiniciar();
    onCerrar();
  };

  const descargarPlantilla = async () => {
    setDescargando(true);
    try {
      const blob = await descargarPlantillaImportacion();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'plantilla-residentes-eldertech.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      notify.error('No se pudo descargar la plantilla', err instanceof Error ? err.message : undefined);
    } finally {
      setDescargando(false);
    }
  };

  const elegirArchivo = (f: File | undefined) => {
    setResultado(null);
    if (!f) {
      setArchivo(null);
      return;
    }
    if (!f.name.toLowerCase().endsWith('.xlsx')) {
      notify.error('Archivo no válido', 'Subí un Excel en formato .xlsx (el de la plantilla).');
      reiniciar();
      return;
    }
    if (f.size > MAX_BYTES) {
      notify.error('Archivo demasiado grande', 'El máximo es 4 MB.');
      reiniciar();
      return;
    }
    setArchivo(f);
    // Se valida apenas se elige: la vista previa no crea nada.
    importar.mutate({ archivo: f, confirmar: false }, { onSuccess: setResultado, onError: () => setArchivo(null) });
  };

  const confirmar = () => {
    if (!archivo) return;
    importar.mutate({ archivo, confirmar: true }, {
      onSuccess: (r) => {
        setResultado(r);
        const fallidos = r.creados?.filter((c) => !c.ok).length ?? 0;
        const creados = (r.creados?.length ?? 0) - fallidos;
        if (creados > 0) notify.success(`${creados} usuario${creados === 1 ? '' : 's'} creado${creados === 1 ? '' : 's'}`);
        if (fallidos > 0) notify.error(`${fallidos} fila${fallidos === 1 ? '' : 's'} no se pudo${fallidos === 1 ? '' : 'ieron'} crear`, 'Mirá el detalle en la tabla.');
      },
    });
  };

  const resumen = resultado?.validacion.resumen;
  const yaCreado = resultado?.creados != null;
  const hayErrores = (resumen?.conErrores ?? 0) > 0;
  const fallosCreacion = new Map((resultado?.creados ?? []).filter((c) => !c.ok).map((c) => [c.fila, c.error ?? 'Error']));
  const creadosOk = new Set((resultado?.creados ?? []).filter((c) => c.ok).map((c) => c.fila));

  return (
    <Dialog open={abierto} onOpenChange={(o) => { if (!o) cerrar(); }}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Importar usuarios desde Excel</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/40 p-3 text-sm">
            <p className="max-w-md text-muted-foreground">
              Descargá la plantilla, completala (una fila por residente, la contraseña es el DNI) y subila acá. Antes de crear nada vas a ver una vista previa.
            </p>
            <Button variant="outline" size="sm" onClick={() => void descargarPlantilla()} disabled={descargando}>
              <Download className="h-4 w-4" /> {descargando ? 'Descargando…' : 'Descargar plantilla'}
            </Button>
          </div>

          {!yaCreado && (
            <div className="flex flex-wrap items-center gap-3">
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="hidden"
                onChange={(e) => elegirArchivo(e.target.files?.[0])}
              />
              <Button variant="outline" onClick={() => inputRef.current?.click()} disabled={importar.isPending}>
                <Upload className="h-4 w-4" /> {archivo ? 'Elegir otro archivo' : 'Elegir archivo .xlsx'}
              </Button>
              {archivo && (
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <FileSpreadsheet className="h-4 w-4" /> {archivo.name}
                </span>
              )}
              {importar.isPending && !resultado && <span className="text-sm text-muted-foreground">Revisando el archivo…</span>}
            </div>
          )}

          {resumen && (
            <>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant="muted">{resumen.total} fila{resumen.total === 1 ? '' : 's'}</Badge>
                <Badge variant="muted" className="gap-1"><CheckCircle2 className="h-3 w-3" /> {resumen.validas} correcta{resumen.validas === 1 ? '' : 's'}</Badge>
                {hayErrores && <Badge variant="danger" className="gap-1"><XCircle className="h-3 w-3" /> {resumen.conErrores} con errores</Badge>}
                {resumen.ejemplosOmitidos > 0 && <span className="text-muted-foreground">({resumen.ejemplosOmitidos} fila{resumen.ejemplosOmitidos === 1 ? '' : 's'} de ejemplo omitida{resumen.ejemplosOmitidos === 1 ? '' : 's'})</span>}
              </div>

              {hayErrores && !yaCreado && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                  <span>No se creó ningún usuario. Corregí las filas marcadas en el Excel y volvé a subirlo.</span>
                </div>
              )}

              <div className="max-h-[45vh] overflow-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-14">Fila</TableHead>
                      <TableHead>Residente</TableHead>
                      <TableHead>DNI</TableHead>
                      <TableHead>Sección</TableHead>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resultado!.validacion.filas.map((f) => {
                      const d = f.datos;
                      const falloCreacion = fallosCreacion.get(f.fila);
                      return (
                        <TableRow key={f.fila} className={f.estado === 'error' || falloCreacion ? 'bg-destructive/5' : undefined}>
                          <TableCell className="text-muted-foreground">{f.fila}</TableCell>
                          <TableCell>{d ? `${d.nombre} ${d.apellido}` : '—'}</TableCell>
                          <TableCell>{d?.dni ?? '—'}</TableCell>
                          <TableCell>{d?.seccion ?? '—'}</TableCell>
                          <TableCell>{d?.username ?? '—'}</TableCell>
                          <TableCell className="text-sm">
                            {f.estado === 'error' ? (
                              <ul className="list-disc space-y-0.5 pl-4 text-destructive">
                                {f.errores.map((e) => <li key={e}>{e}</li>)}
                              </ul>
                            ) : falloCreacion ? (
                              <span className="text-destructive">No se creó: {falloCreacion}</span>
                            ) : creadosOk.has(f.fila) ? (
                              <span className="flex items-center gap-1 text-emerald-600"><CheckCircle2 className="h-4 w-4" /> Creado</span>
                            ) : (
                              <span className="text-muted-foreground">Listo para crear</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={cerrar}>{yaCreado ? 'Cerrar' : 'Cancelar'}</Button>
          {!yaCreado && (
            <Button onClick={confirmar} disabled={!resumen || hayErrores || resumen.validas === 0 || importar.isPending}>
              {importar.isPending && resultado ? 'Creando…' : `Crear ${resumen?.validas ?? 0} usuario${resumen?.validas === 1 ? '' : 's'}`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
