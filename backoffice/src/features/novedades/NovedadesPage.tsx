// ========================================
// PANTALLA: NovedadesPage
// DESCRIPCIÓN:
// Noticias publicadas para los residentes: las que se están mostrando
// en la app y, aparte, las que ya vencieron (pasó el mes). Desde acá se
// publica una nueva, se edita o se elimina.
// ========================================
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Eye, Newspaper, Pencil, Plus, Trash2, Users2 } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { LoadingState, ErrorState } from '@/components/common/states';
import { EmptyState } from '@/components/common/EmptyState';
import { useAuth } from '@/features/auth/AuthContext';
import type { NovedadConLecturas } from '@/services/novedadesService';
import { useEliminarNovedad, useNovedadesLista } from './useNovedades';

const fecha = (iso: string) => new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' });

export function NovedadesPage() {
  const navigate = useNavigate();
  const { puede } = useAuth();
  const novedadesQ = useNovedadesLista();
  const eliminar = useEliminarNovedad();
  const [aEliminar, setAEliminar] = useState<NovedadConLecturas | null>(null);

  if (novedadesQ.isLoading) return <LoadingState mensaje="Cargando novedades…" />;
  if (novedadesQ.isError) return <ErrorState onReintentar={() => void novedadesQ.refetch()} />;

  const ahora = Date.now();
  const novedades = novedadesQ.data ?? [];
  const vigentes = novedades.filter((n) => new Date(n.visible_hasta).getTime() > ahora);
  const vencidas = novedades.filter((n) => new Date(n.visible_hasta).getTime() <= ahora);

  const acciones = {
    onEditar: puede('novedades', 'editar') ? (n: NovedadConLecturas) => navigate(`/novedades/${n.id}/editar`) : undefined,
    onEliminar: puede('novedades', 'eliminar') ? (n: NovedadConLecturas) => setAEliminar(n) : undefined,
  };

  return (
    <div className="space-y-5">
      <PageHeader
        titulo="Novedades"
        descripcion="Noticias de la residencia que los residentes ven en el botón Novedades de la app. Cada una se muestra durante un mes."
        acciones={
          puede('novedades', 'crear') ? (
            <Button onClick={() => navigate('/novedades/nueva')} className="gap-1.5">
              <Plus className="h-4 w-4" /> Nueva novedad
            </Button>
          ) : undefined
        }
      />

      {novedades.length === 0 ? (
        <EmptyState icono={Newspaper} titulo="Todavía no hay novedades" descripcion="Publicá la primera: una fiesta, una visita, un cambio de horario o cualquier noticia de la residencia." />
      ) : (
        <div className="space-y-6">
          <Seccion titulo="Se están mostrando" novedades={vigentes} vacio="No hay novedades publicadas en este momento." {...acciones} />
          {vencidas.length > 0 && <Seccion titulo="Vencidas (ya no se ven en la app)" novedades={vencidas} vencidas {...acciones} />}
        </div>
      )}

      <ConfirmDialog
        abierto={!!aEliminar}
        onOpenChange={(v) => { if (!v) setAEliminar(null); }}
        titulo={`¿Eliminar la novedad "${aEliminar?.titulo}"?`}
        descripcion="Deja de verse en la app enseguida. Esta acción no se puede deshacer."
        textoConfirmar="Eliminar novedad"
        variante="destructive"
        onConfirmar={() => {
          if (aEliminar) eliminar.mutate(aEliminar.id);
          setAEliminar(null);
        }}
      />
    </div>
  );
}

interface SeccionProps {
  titulo: string;
  novedades: NovedadConLecturas[];
  vacio?: string;
  vencidas?: boolean;
  onEditar?: (n: NovedadConLecturas) => void;
  onEliminar?: (n: NovedadConLecturas) => void;
}

function Seccion({ titulo, novedades, vacio, vencidas = false, onEditar, onEliminar }: SeccionProps) {
  return (
    <section className="space-y-2.5">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{titulo}</h3>
      {novedades.length === 0 ? (
        <p className="text-sm text-muted-foreground">{vacio}</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {novedades.map((n) => (
            <Card key={n.id} className={`flex overflow-hidden ${vencidas ? 'opacity-70' : ''}`}>
              {n.imagen_url && <img src={n.imagen_url} alt="" className="h-auto w-28 shrink-0 object-cover sm:w-36" />}
              <div className="flex min-w-0 flex-1 flex-col gap-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold leading-snug">{n.titulo}</p>
                  <div className="flex shrink-0 gap-1">
                    {onEditar && (
                      <Button variant="ghost" size="icon" aria-label={`Editar ${n.titulo}`} onClick={() => onEditar(n)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {onEliminar && (
                      <Button variant="ghost" size="icon" aria-label={`Eliminar ${n.titulo}`} onClick={() => onEliminar(n)} className="hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <p className="line-clamp-2 text-sm text-muted-foreground">{n.texto}</p>
                <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
                  <Badge variant={vencidas ? 'muted' : 'success'}>
                    {vencidas ? `Venció el ${fecha(n.visible_hasta)}` : `Hasta el ${fecha(n.visible_hasta)}`}
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <Users2 className="h-3 w-3" /> {n.grupo_ids ? `${n.grupo_ids.length} ${n.grupo_ids.length === 1 ? 'grupo' : 'grupos'}` : 'Todos'}
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <Eye className="h-3 w-3" /> Leída por {n.cantidad_lecturas}
                  </Badge>
                  {n.notificacion_id && (
                    <Badge variant="outline" className="gap-1">
                      <Bell className="h-3 w-3" /> Con aviso
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Publicada el {fecha(n.created_at)}</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
