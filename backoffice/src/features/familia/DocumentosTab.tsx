import { useRef, useState } from 'react';
import { ExternalLink, FileText, Plus, Trash2, Upload } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { notify } from '@/components/ui/toast';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState, LoadingState } from '@/components/common/states';
import { useAuth } from '@/features/auth/AuthContext';
import type { DocumentoFamilia } from '@/services/familiaService';
import { excedeTamano, fechaCorta, MAX_ARCHIVO_MB, tamano } from './formato';
import { useDocumentos, useEliminarDocumento, useSubirDocumento } from './useFamilia';

const ACEPTADOS = 'application/pdf,image/jpeg,image/png,image/webp';

function SubirDialog({ abierto, onCerrar }: { abierto: boolean; onCerrar: () => void }) {
  const subir = useSubirDocumento();
  const inputArchivo = useRef<HTMLInputElement>(null);
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [archivo, setArchivo] = useState<File | null>(null);

  const cerrar = () => {
    setTitulo('');
    setDescripcion('');
    setArchivo(null);
    onCerrar();
  };

  const elegir = (f: File | undefined) => {
    if (!f) return;
    if (excedeTamano(f)) {
      notify.error('El archivo es muy pesado', `El máximo es ${MAX_ARCHIVO_MB} MB.`);
      if (inputArchivo.current) inputArchivo.current.value = '';
      return;
    }
    setArchivo(f);
    if (!titulo.trim()) setTitulo(f.name.replace(/\.[^.]+$/, '').slice(0, 120));
  };

  return (
    <Dialog open={abierto} onOpenChange={(v) => !v && !subir.isPending && cerrar()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Subir documento</DialogTitle>
          <DialogDescription>Información general de la residencia (reglamento, menú, horarios de visita). Nada del residente ni de su salud.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Archivo (PDF o imagen, hasta {MAX_ARCHIVO_MB} MB)</Label>
            <input ref={inputArchivo} type="file" accept={ACEPTADOS} className="hidden" onChange={(e) => elegir(e.target.files?.[0])} />
            <Button type="button" variant="outline" className="w-full justify-start gap-2" onClick={() => inputArchivo.current?.click()}>
              <Upload className="h-4 w-4" /> <span className="truncate">{archivo ? `${archivo.name} · ${tamano(archivo.size)}` : 'Elegir archivo…'}</span>
            </Button>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="doc-titulo">Título</Label>
            <Input id="doc-titulo" value={titulo} maxLength={120} onChange={(e) => setTitulo(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="doc-desc">Descripción (opcional)</Label>
            <Input id="doc-desc" value={descripcion} maxLength={500} onChange={(e) => setDescripcion(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={cerrar} disabled={subir.isPending}>Cancelar</Button>
          <Button disabled={!archivo || !titulo.trim() || subir.isPending} onClick={() => archivo && subir.mutate({ titulo: titulo.trim(), descripcion: descripcion.trim(), archivo }, { onSuccess: cerrar })}>
            {subir.isPending ? 'Subiendo…' : 'Publicar documento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DocumentosTab() {
  const { puede } = useAuth();
  const docsQ = useDocumentos();
  const eliminar = useEliminarDocumento();
  const [subiendo, setSubiendo] = useState(false);
  const [aEliminar, setAEliminar] = useState<DocumentoFamilia | null>(null);

  if (docsQ.isLoading) return <LoadingState mensaje="Cargando documentos…" />;
  if (docsQ.isError) return <ErrorState mensaje={docsQ.error.message} onReintentar={() => void docsQ.refetch()} />;
  const docs = docsQ.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {puede('familia_contenido', 'crear') && <Button onClick={() => setSubiendo(true)} className="gap-1.5"><Plus className="h-4 w-4" /> Subir documento</Button>}
      </div>
      {docs.length === 0 ? (
        <EmptyState icono={FileText} titulo="Todavía no hay documentos" descripcion="El tablón de las familias muestra los archivos generales de la residencia." />
      ) : (
        <div className="space-y-2">
          {docs.map((d) => (
            <Card key={d.id} className="flex items-center gap-3 p-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-700"><FileText className="h-5 w-5" /></div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{d.titulo}</p>
                <p className="truncate text-sm text-muted-foreground">{d.descripcion ? `${d.descripcion} · ` : ''}{d.nombre_archivo} · {tamano(d.tamano_bytes)} · {fechaCorta(d.created_at)}</p>
              </div>
              {d.url && (
                <Button asChild variant="outline" size="sm" className="shrink-0 gap-1.5">
                  <a href={d.url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /> Abrir</a>
                </Button>
              )}
              {puede('familia_contenido', 'eliminar') && <Button variant="ghost" size="icon" aria-label={`Eliminar ${d.titulo}`} onClick={() => setAEliminar(d)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
            </Card>
          ))}
        </div>
      )}

      <SubirDialog abierto={subiendo} onCerrar={() => setSubiendo(false)} />
      <ConfirmDialog
        abierto={!!aEliminar}
        onOpenChange={(v) => !v && setAEliminar(null)}
        titulo="¿Eliminar el documento?"
        descripcion={aEliminar ? `"${aEliminar.titulo}" deja de estar disponible para las familias.` : ''}
        textoConfirmar="Eliminar"
        cargando={eliminar.isPending}
        onConfirmar={() => aEliminar && eliminar.mutate(aEliminar.id, { onSuccess: () => setAEliminar(null) })}
      />
    </div>
  );
}
