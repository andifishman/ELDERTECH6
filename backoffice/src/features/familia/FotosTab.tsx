import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Images, Plus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState, LoadingState } from '@/components/common/states';
import { useAuth } from '@/features/auth/AuthContext';
import { fechaCorta } from './formato';
import { useAlbumes, useCrearAlbum } from './useFamilia';

function NuevoAlbumDialog({ abierto, onCerrar }: { abierto: boolean; onCerrar: () => void }) {
  const navigate = useNavigate();
  const crear = useCrearAlbum();
  const [titulo, setTitulo] = useState('');
  const [actividad, setActividad] = useState('');
  const [fecha, setFecha] = useState('');

  const cerrar = () => {
    setTitulo('');
    setActividad('');
    setFecha('');
    onCerrar();
  };

  return (
    <Dialog open={abierto} onOpenChange={(v) => !v && !crear.isPending && cerrar()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuevo álbum</DialogTitle>
          <DialogDescription>Se crea como borrador: las familias no ven nada hasta que lo publiques. Después subís las fotos.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="alb-titulo">Título</Label>
            <Input id="alb-titulo" value={titulo} maxLength={120} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej. Taller de música del jueves" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="alb-act">Actividad (opcional)</Label>
            <Input id="alb-act" value={actividad} maxLength={120} onChange={(e) => setActividad(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="alb-fecha">Fecha (por defecto, hoy)</Label>
            <Input id="alb-fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={cerrar} disabled={crear.isPending}>Cancelar</Button>
          <Button
            disabled={!titulo.trim() || crear.isPending}
            onClick={() =>
              crear.mutate(
                { titulo: titulo.trim(), actividad: actividad.trim() || null, ...(fecha ? { fecha } : {}), publicar: false },
                { onSuccess: (r) => { cerrar(); navigate(`/familia/contenido/fotos/${r.id}`); } },
              )
            }
          >
            {crear.isPending ? 'Creando…' : 'Crear y subir fotos'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function FotosTab() {
  const { puede } = useAuth();
  const navigate = useNavigate();
  const albumesQ = useAlbumes();
  const [nuevo, setNuevo] = useState(false);

  if (albumesQ.isLoading) return <LoadingState mensaje="Cargando álbumes…" />;
  if (albumesQ.isError) return <ErrorState mensaje={albumesQ.error.message} onReintentar={() => void albumesQ.refetch()} />;
  const albumes = albumesQ.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {puede('familia_contenido', 'crear') && <Button onClick={() => setNuevo(true)} className="gap-1.5"><Plus className="h-4 w-4" /> Nuevo álbum</Button>}
      </div>
      {albumes.length === 0 ? (
        <EmptyState icono={Images} titulo="Todavía no hay álbumes" descripcion="Solo se muestran a las familias las fotos de los álbumes que vos publiques de forma explícita." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {albumes.map((a) => (
            <Card key={a.id} className="cursor-pointer overflow-hidden transition-shadow hover:shadow-md" onClick={() => navigate(`/familia/contenido/fotos/${a.id}`)}>
              <div className="relative aspect-[4/3] bg-muted">
                {a.portada_url ? <img src={a.portada_url} alt="" className="h-full w-full object-cover" loading="lazy" /> : <div className="flex h-full items-center justify-center text-muted-foreground"><Camera className="h-8 w-8" /></div>}
                <div className="absolute left-2 top-2">{a.publicado_en ? <Badge variant="success">Publicado</Badge> : <Badge variant="warning">Borrador</Badge>}</div>
              </div>
              <div className="p-3">
                <p className="truncate font-semibold">{a.titulo}</p>
                <p className="truncate text-sm text-muted-foreground">{a.actividad ? `${a.actividad} · ` : ''}{fechaCorta(a.fecha)} · {a.cantidad_fotos} {a.cantidad_fotos === 1 ? 'foto' : 'fotos'}</p>
              </div>
            </Card>
          ))}
        </div>
      )}
      <NuevoAlbumDialog abierto={nuevo} onCerrar={() => setNuevo(false)} />
    </div>
  );
}
