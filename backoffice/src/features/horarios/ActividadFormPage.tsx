// ========================================
// PANTALLA: ActividadFormPage
// ========================================
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Save, X, Sparkles, Plus } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Combobox } from '@/components/ui/combobox';
import { LoadingState } from '@/components/common/states';
import { notify } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import { queryKeys } from '@/lib/queryClient';
import { crearUbicacion, crearResponsable, crearTipoActividad } from '@/services/catalogosService';
import type { CrearTipoActividadInput } from '@/services/catalogosService';
import {
  useActividad,
  useActualizarActividad,
  useCatalogos,
  useCrearActividad,
} from './useActividades';
import {
  DIAS_SEMANA,
  construirPatron,
  vistaPreviaRecurrencia,
  type PresetRecurrencia,
} from './recurrencia';

interface CamposTexto {
  nombre: string;
  emoji: string;
  hora_inicio: string;
  hora_fin: string;
  fecha: string;
  descripcion: string;
  capacidad: string;
  fecha_hasta: string;
}

const PRESETS: { valor: PresetRecurrencia; titulo: string; desc: string }[] = [
  { valor: 'diaria', titulo: 'Todos los días', desc: 'Se repite cada día' },
  { valor: 'lun_vie', titulo: 'Lunes a viernes', desc: 'Días de semana (L–V)' },
  { valor: 'fin_semana', titulo: 'Fines de semana', desc: 'Sábados y domingos' },
  { valor: 'especificos', titulo: 'Días específicos', desc: 'Elegí los días exactos' },
  { valor: 'unica', titulo: 'Única vez', desc: 'Solo en la fecha indicada' },
];

export function ActividadFormPage() {
  const { id } = useParams();
  const esEdicion = !!id;
  const navigate = useNavigate();

  const qc = useQueryClient();
  const { data: catalogos, isLoading: cargandoCat } = useCatalogos();
  const { data: actividad, isLoading: cargandoAct } = useActividad(id);
  const crear = useCrearActividad();
  const actualizar = useActualizarActividad();

  const ubicacionOpts = (catalogos?.ubicaciones ?? []).map((u) => ({ id: u.id, label: u.nombre }));
  const responsableOpts = (catalogos?.responsables ?? []).map((r) => ({
    id: r.id,
    label: r.apellido ? `${r.nombre} ${r.apellido}` : r.nombre,
  }));

  const handleCrearUbicacion = async (nombre: string) => {
    try {
      const newId = await crearUbicacion(nombre);
      void qc.invalidateQueries({ queryKey: queryKeys.catalogos });
      return newId;
    } catch (err) {
      notify.error('No se pudo crear el lugar', err instanceof Error ? err.message : undefined);
      throw err;
    }
  };

  const handleCrearResponsable = async (nombre: string) => {
    try {
      const newId = await crearResponsable(nombre);
      void qc.invalidateQueries({ queryKey: queryKeys.catalogos });
      return newId;
    } catch (err) {
      notify.error('No se pudo crear el responsable', err instanceof Error ? err.message : undefined);
      throw err;
    }
  };

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<CamposTexto>({
    defaultValues: {
      fecha: format(new Date(), 'yyyy-MM-dd'),
      hora_inicio: '09:00',
      hora_fin: '10:00',
      capacidad: '',
      fecha_hasta: '',
    },
  });

  const [tipoId, setTipoId] = useState('');
  const [ubicacionId, setUbicacionId] = useState('');
  const [responsableId, setResponsableId] = useState('');
  const [preset, setPreset] = useState<PresetRecurrencia>('lun_vie');
  const [dias, setDias] = useState<number[]>([1, 2, 3, 4, 5]);
  const [intereses, setIntereses] = useState<string[]>([]);
  const [pisos, setPisos] = useState<string[]>([]);
  // Notificar residentes: desactivado por defecto
  const [notificar, setNotificar] = useState(false);

  // mini-formulario nueva categoría — ahora con defaults de hora
  const [mostrarFormTipo, setMostrarFormTipo] = useState(false);
  const [nuevoTipo, setNuevoTipo] = useState<CrearTipoActividadInput>({
    nombre: '', emoji: '', hora_inicio_default: '', hora_fin_default: '',
  });
  const [creandoTipo, setCreandoTipo] = useState(false);

  const handleCrearTipo = async () => {
    if (!nuevoTipo.nombre.trim()) return;
    setCreandoTipo(true);
    try {
      const newId = await crearTipoActividad({
        nombre: nuevoTipo.nombre.trim(),
        emoji: nuevoTipo.emoji?.trim(),
        hora_inicio_default: nuevoTipo.hora_inicio_default?.trim(),
        hora_fin_default: nuevoTipo.hora_fin_default?.trim(),
      });
      void qc.invalidateQueries({ queryKey: queryKeys.catalogos });
      // Pre-seleccionar la categoría recién creada y aplicar sus defaults
      setTipoId(newId);
      if (nuevoTipo.nombre.trim()) setValue('nombre', nuevoTipo.nombre.trim());
      if (nuevoTipo.emoji?.trim()) setValue('emoji', nuevoTipo.emoji.trim());
      if (nuevoTipo.hora_inicio_default?.trim()) setValue('hora_inicio', nuevoTipo.hora_inicio_default.trim());
      if (nuevoTipo.hora_fin_default?.trim()) setValue('hora_fin', nuevoTipo.hora_fin_default.trim());
      setNuevoTipo({ nombre: '', emoji: '', hora_inicio_default: '', hora_fin_default: '' });
      setMostrarFormTipo(false);
      notify.success('Categoría creada y seleccionada');
    } catch (err) {
      notify.error('No se pudo crear la categoría', err instanceof Error ? err.message : undefined);
    } finally {
      setCreandoTipo(false);
    }
  };

  // Carga el formulario en modo edición
  useEffect(() => {
    if (!actividad) return;
    reset({
      nombre: actividad.nombre,
      emoji: actividad.emoji_icono ?? '',
      hora_inicio: actividad.hora_inicio?.slice(0, 5) ?? '09:00',
      hora_fin: actividad.hora_fin?.slice(0, 5) ?? '',
      fecha: actividad.fecha,
      descripcion: actividad.descripcion ?? '',
      capacidad: '',
      fecha_hasta: actividad.patron_recurrencia?.hasta ?? '',
    });
    setTipoId(actividad.tipo_actividad_id ?? '');
    setUbicacionId(actividad.ubicacion_id ?? '');
    setResponsableId(actividad.responsable_id ?? '');
    setPisos(actividad.pisos_objetivo ?? []);
    const d = actividad.patron_recurrencia?.dias_semana;
    if (!actividad.es_recurrente) setPreset('unica');
    else if (d?.length === 7) setPreset('diaria');
    else if (d && d.length === 5 && [1, 2, 3, 4, 5].every((x) => d.includes(x))) setPreset('lun_vie');
    else if (d && d.length === 2 && d.includes(0) && d.includes(6)) setPreset('fin_semana');
    else if (d) {
      setPreset('especificos');
      setDias(d);
    }
    const ints = (actividad as unknown as { actividad_intereses?: { interes_id: string }[] }).actividad_intereses;
    if (ints) setIntereses(ints.map((i) => i.interes_id));
  }, [actividad, reset]);

  // Seleccionar categoría existente: rellena todos sus defaults
  const aplicarCategoria = (tipo: { id: string; nombre: string; emoji: string | null; hora_inicio_default?: string | null; hora_fin_default?: string | null }) => {
    setTipoId(tipo.id);
    setValue('nombre', tipo.nombre);
    if (tipo.emoji) setValue('emoji', tipo.emoji);
    if (tipo.hora_inicio_default) setValue('hora_inicio', tipo.hora_inicio_default);
    if (tipo.hora_fin_default) setValue('hora_fin', tipo.hora_fin_default);
  };

  const previa = useMemo(() => vistaPreviaRecurrencia(preset, dias), [preset, dias]);

  const toggleEn = (lista: string[], set: (v: string[]) => void, valor: string) =>
    set(lista.includes(valor) ? lista.filter((x) => x !== valor) : [...lista, valor]);

  const onSubmit = (campos: CamposTexto) => {
    const { es_recurrente, patron } = construirPatron(preset, dias);
    // Agregar fecha_hasta al patrón si se proporcionó y la actividad es recurrente
    const patronFinal = es_recurrente && campos.fecha_hasta
      ? { ...patron, hasta: campos.fecha_hasta }
      : patron;

    const input = {
      nombre: campos.nombre,
      descripcion: campos.descripcion || null,
      tipo_actividad_id: tipoId || null,
      ubicacion_id: ubicacionId || null,
      responsable_id: responsableId || null,
      emoji_icono: campos.emoji || null,
      fecha: campos.fecha,
      hora_inicio: campos.hora_inicio,
      hora_fin: campos.hora_fin || null,
      es_recurrente,
      patron_recurrencia: patronFinal,
      pisos_objetivo: pisos,
      intereses,
    };

    if (esEdicion && id) {
      actualizar.mutate({ id, input }, { onSuccess: () => navigate('/horarios') });
    } else {
      crear.mutate(input, { onSuccess: () => navigate('/horarios') });
    }
  };

  if (cargandoCat || (esEdicion && cargandoAct)) {
    return <LoadingState mensaje="Cargando formulario…" />;
  }

  const guardando = crear.isPending || actualizar.isPending;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pb-10">
      <PageHeader
        titulo={esEdicion ? 'Editar actividad' : 'Nueva actividad'}
        descripcion={
          esEdicion
            ? 'Los cambios se aplican a todas las repeticiones de esta actividad.'
            : 'Completá los datos y configurá la repetición.'
        }
      />

      {/* 1. Datos básicos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">1 · Datos básicos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
            <div className="space-y-1.5">
              <Label htmlFor="nombre">Nombre de la actividad</Label>
              <Input id="nombre" placeholder="Ej: Taller de Tecnología" {...register('nombre', { required: 'Ingresá un nombre' })} />
              {errors.nombre && <p className="text-xs text-destructive">{errors.nombre.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emoji">Emoji</Label>
              <Input id="emoji" placeholder="💻" maxLength={4} {...register('emoji')} />
            </div>
          </div>

          {/* Categorías */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                <Sparkles className="h-4 w-4 text-primary" /> Categoría de actividad
                <span className="text-xs text-muted-foreground/70">(opcional)</span>
              </p>
              <button
                type="button"
                onClick={() => setMostrarFormTipo((v) => !v)}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <Plus className="h-3.5 w-3.5" /> Nueva categoría
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {/* Opción "Sin categoría" para des-seleccionar */}
              {tipoId && (
                <button
                  type="button"
                  onClick={() => setTipoId('')}
                  className="rounded-lg border border-dashed border-muted-foreground/40 px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent"
                >
                  ✕ Sin categoría
                </button>
              )}
              {(catalogos?.tiposActividad ?? []).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => aplicarCategoria(t)}
                  className={cn(
                    'rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
                    tipoId === t.id
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:bg-accent',
                  )}
                >
                  {t.emoji} {t.nombre}
                </button>
              ))}
            </div>

            {/* Mini-form nueva categoría — ahora con hora de inicio/fin */}
            {mostrarFormTipo && (
              <div className="rounded-lg border border-dashed border-primary/50 bg-primary/5 p-4 space-y-3">
                <p className="text-xs font-semibold text-primary">Nueva categoría — los datos se usan como valores predeterminados</p>
                <div className="flex gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Emoji</Label>
                    <Input
                      value={nuevoTipo.emoji ?? ''}
                      onChange={(e) => setNuevoTipo((p) => ({ ...p, emoji: e.target.value }))}
                      placeholder="🎨"
                      maxLength={4}
                      className="w-16 text-center"
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Nombre de la categoría *</Label>
                    <Input
                      value={nuevoTipo.nombre}
                      onChange={(e) => setNuevoTipo((p) => ({ ...p, nombre: e.target.value }))}
                      placeholder="Ej: Yoga, Teatro, Cocina…"
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void handleCrearTipo(); } }}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Hora inicio predeterminada</Label>
                    <Input
                      type="time"
                      value={nuevoTipo.hora_inicio_default ?? ''}
                      onChange={(e) => setNuevoTipo((p) => ({ ...p, hora_inicio_default: e.target.value }))}
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Hora fin predeterminada</Label>
                    <Input
                      type="time"
                      value={nuevoTipo.hora_fin_default ?? ''}
                      onChange={(e) => setNuevoTipo((p) => ({ ...p, hora_fin_default: e.target.value }))}
                    />
                  </div>
                  <div className="flex items-end gap-1">
                    <Button
                      type="button"
                      size="sm"
                      disabled={!nuevoTipo.nombre.trim() || creandoTipo}
                      onClick={() => void handleCrearTipo()}
                    >
                      {creandoTipo ? 'Creando…' : 'Crear'}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setMostrarFormTipo(false);
                        setNuevoTipo({ nombre: '', emoji: '', hora_inicio_default: '', hora_fin_default: '' });
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="hora_inicio">Hora inicio</Label>
              <Input id="hora_inicio" type="time" {...register('hora_inicio', { required: true })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hora_fin">Hora fin</Label>
              <Input id="hora_fin" type="time" {...register('hora_fin')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fecha">Fecha de inicio</Label>
              <Input id="fecha" type="date" {...register('fecha', { required: true })} />
            </div>
            <div className="space-y-1.5">
              <Label>Lugar</Label>
              <Combobox
                options={ubicacionOpts}
                value={ubicacionId}
                onChange={(newId) => setUbicacionId(newId)}
                placeholder="Elegir o escribir lugar"
                placeholderSearch="Buscar o crear lugar…"
                onCrear={handleCrearUbicacion}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Instructor / Responsable</Label>
              <Combobox
                options={responsableOpts}
                value={responsableId}
                onChange={(newId) => setResponsableId(newId)}
                placeholder="Elegir o escribir responsable"
                placeholderSearch="Buscar o crear responsable…"
                onCrear={handleCrearResponsable}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="descripcion">Descripción</Label>
              <Textarea id="descripcion" placeholder="Describí la actividad…" {...register('descripcion')} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Recurrencia */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">2 · Repetición</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {PRESETS.map((p) => (
              <button
                key={p.valor}
                type="button"
                onClick={() => setPreset(p.valor)}
                className={cn(
                  'rounded-xl border p-3 text-left transition-colors',
                  preset === p.valor ? 'border-primary bg-primary/10' : 'border-border hover:bg-accent',
                )}
              >
                <p className="text-sm font-semibold text-foreground">{p.titulo}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{p.desc}</p>
              </button>
            ))}
          </div>

          {preset === 'especificos' && (
            <div className="space-y-2">
              <Label>Seleccioná los días</Label>
              <div className="flex flex-wrap gap-2">
                {DIAS_SEMANA.map((d) => (
                  <button
                    key={d.valor}
                    type="button"
                    onClick={() =>
                      setDias((prev) => (prev.includes(d.valor) ? prev.filter((x) => x !== d.valor) : [...prev, d.valor]))
                    }
                    className={cn(
                      'h-10 w-12 rounded-lg border text-sm font-semibold transition-colors',
                      dias.includes(d.valor)
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border hover:bg-accent',
                    )}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Fecha hasta — solo si es recurrente */}
          {preset !== 'unica' && (
            <div className="flex items-end gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="fecha_hasta">
                  Repetir hasta <span className="text-muted-foreground">(opcional)</span>
                </Label>
                <Input id="fecha_hasta" type="date" {...register('fecha_hasta')} />
              </div>
              <p className="mb-1.5 text-xs text-muted-foreground">Dejá vacío para repetir indefinidamente</p>
            </div>
          )}

          <div className="rounded-lg border-l-4 border-primary bg-primary/5 p-3 text-sm text-primary-800">
            <span className="font-semibold">Vista previa: </span>
            {previa}
          </div>
        </CardContent>
      </Card>

      {/* 3. Para quién */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">3 · Para quién</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>Intereses (vacío = todos los residentes)</Label>
            <div className="flex flex-wrap gap-2">
              {(catalogos?.intereses ?? []).map((i) => (
                <button
                  key={i.id}
                  type="button"
                  onClick={() => toggleEn(intereses, setIntereses, i.id)}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                    intereses.includes(i.id)
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:bg-accent',
                  )}
                >
                  {i.emoji} {i.nombre}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Pisos objetivo (vacío = todos los pisos)</Label>
            <div className="flex flex-wrap gap-2">
              {(catalogos?.pisos ?? []).map((p) => {
                const valor = String(p.numero);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggleEn(pisos, setPisos, valor)}
                    className={cn(
                      'rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
                      pisos.includes(valor)
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border hover:bg-accent',
                    )}
                  >
                    {p.nombre ?? `Piso ${p.numero}`}
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. Avanzado */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">4 · Opciones avanzadas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium">Notificar a residentes al crear</p>
              <p className="text-xs text-muted-foreground">Envía un aviso push a los residentes correspondientes.</p>
            </div>
            <Switch checked={notificar} onCheckedChange={setNotificar} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="capacidad">Capacidad máxima (opcional)</Label>
              <Input id="capacidad" type="number" min={0} placeholder="20" {...register('capacidad')} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Acciones */}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={() => navigate('/horarios')}>
          <X className="h-4 w-4" /> Cancelar
        </Button>
        <Button type="submit" disabled={guardando}>
          <Save className="h-4 w-4" /> {guardando ? 'Guardando…' : 'Guardar actividad'}
        </Button>
      </div>
    </form>
  );
}
