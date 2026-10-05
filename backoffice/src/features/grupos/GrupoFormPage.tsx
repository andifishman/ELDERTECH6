// ========================================
// PANTALLA: GrupoFormPage
// DESCRIPCIÓN:
// Crear un grupo personalizado: nombre, descripción opcional y los
// residentes que lo integran desde el arranque (se pueden sumar/sacar
// después desde el detalle del grupo).
// ========================================
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Save, X } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { coincideBusqueda } from '@/lib/textSearch';
import { listarResidentes } from '@/services/residentesService';
import { useCrearGrupo } from './useGrupos';

export function GrupoFormPage() {
  const navigate = useNavigate();
  const crear = useCrearGrupo();
  const residentesQ = useQuery({ queryKey: ['residentes-grupo'], queryFn: () => listarResidentes().then((rs) => rs.filter((r) => r.activo)) });

  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [seleccionados, setSeleccionados] = useState<string[]>([]);

  const residentes = residentesQ.data ?? [];
  const filtrados = useMemo(() => residentes.filter((r) => coincideBusqueda(`${r.nombre} ${r.apellido}`, busqueda)), [residentes, busqueda]);

  const toggle = (id: string) => setSeleccionados((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const guardar = () => {
    if (!nombre.trim()) return;
    crear.mutate(
      { nombre: nombre.trim(), descripcion: descripcion.trim() || null, residenteIds: seleccionados },
      { onSuccess: (grupo) => navigate(`/grupos/${grupo.id}`) },
    );
  };

  return (
    <div className="space-y-5 pb-10">
      <PageHeader titulo="Nuevo grupo" descripcion="Un grupo sirve para elegir a quién le llega algo sin tener que armar la lista cada vez." />

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-1.5">
            <Label htmlFor="nombre">Nombre</Label>
            <Input id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Taller de música" maxLength={80} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="descripcion">Descripción (opcional)</Label>
            <Textarea id="descripcion" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={2} maxLength={300} placeholder="Para qué sirve este grupo" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 pt-6">
          <div className="flex items-center justify-between">
            <Label>Integrantes (opcional, se pueden sumar después)</Label>
            <Badge variant="muted">{seleccionados.length} seleccionados</Badge>
          </div>
          <Input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar residente…" />
          <div className="max-h-72 overflow-y-auto rounded-lg border border-border">
            {filtrados.length === 0 ? (
              <p className="p-3 text-xs text-muted-foreground">Sin resultados.</p>
            ) : (
              <ul className="divide-y divide-border">
                {filtrados.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                    <span className="truncate">
                      {r.nombre} {r.apellido}
                      {r.seccion ? <span className="text-xs text-muted-foreground"> · {r.seccion}</span> : null}
                    </span>
                    <input
                      type="checkbox"
                      checked={seleccionados.includes(r.id)}
                      onChange={() => toggle(r.id)}
                      aria-label={`Sumar a ${r.nombre} ${r.apellido}`}
                      className="h-4 w-4 shrink-0"
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={() => navigate('/grupos')}>
          <X className="h-4 w-4" /> Cancelar
        </Button>
        <Button type="button" disabled={!nombre.trim() || crear.isPending} onClick={guardar} className="gap-1.5">
          <Save className="h-4 w-4" /> {crear.isPending ? 'Creando…' : 'Crear grupo'}
        </Button>
      </div>
    </div>
  );
}
