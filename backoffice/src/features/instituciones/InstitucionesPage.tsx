// ========================================
// PANTALLA: InstitucionesPage (solo Super Admin)
// DESCRIPCIÓN:
// Todas las instituciones de la plataforma, con sus datos y su color principal. El color lo toman el backoffice y la app de
// familias de esa institución. Para entrar a trabajar en otra institución se usa el selector del menú lateral.
// ========================================
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, MapPin, Mail, Pencil, Phone } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState, LoadingState } from '@/components/common/states';
import { notify } from '@/components/ui/toast';
import { CONTRASTE_MINIMO, contrasteConBlanco, escala, esColorHex } from '@/lib/tema';
import { actualizarInstitucion, listarInstitucionesGestion, type InstitucionDetalle } from '@/services/organizacionesService';

const VIOLETA_ELDERTECH = '#5F3E88';

/** Colores sugeridos: todos cumplen el contraste mínimo con texto blanco. */
const SUGERIDOS: Array<{ nombre: string; hex: string }> = [
  { nombre: 'Violeta ElderTech', hex: VIOLETA_ELDERTECH },
  { nombre: 'Verde bosque', hex: '#1F6F5C' },
  { nombre: 'Azul profundo', hex: '#1D4E89' },
  { nombre: 'Bordó', hex: '#8C2F39' },
  { nombre: 'Naranja tostado', hex: '#B34700' },
  { nombre: 'Turquesa oscuro', hex: '#0F6E75' },
  { nombre: 'Índigo', hex: '#3B3F99' },
  { nombre: 'Frambuesa', hex: '#A3295B' },
  { nombre: 'Tierra', hex: '#6B4226' },
];

const rgbCss = (c: number[]): string => `rgb(${c.join(' ')})`;

/** Vista previa: cómo se vería la barra lateral y un botón con el color elegido. */
function VistaPrevia({ hex }: { hex: string }) {
  const e = escala(hex);
  return (
    <div className="flex overflow-hidden rounded-xl border border-border" aria-label="Vista previa del color">
      <div className="flex w-24 shrink-0 flex-col gap-1.5 p-2.5 text-[10px] font-semibold text-white" style={{ backgroundColor: rgbCss(e[600]!) }}>
        <span className="mb-1 text-xs font-extrabold">ElderTech</span>
        <span className="rounded px-1.5 py-1" style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}>Dashboard</span>
        <span className="px-1.5 py-1 opacity-80">Usuarios</span>
        <span className="px-1.5 py-1 opacity-80">Novedades</span>
      </div>
      <div className="flex flex-1 flex-col gap-2 bg-card p-3">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-lg px-3 py-1.5 text-xs font-bold text-white" style={{ backgroundColor: rgbCss(e[600]!) }}>Guardar</span>
          <span className="rounded-lg px-3 py-1.5 text-xs font-bold" style={{ backgroundColor: rgbCss(e[100]!), color: rgbCss(e[800]!) }}>Etiqueta</span>
          <span className="rounded-lg border px-3 py-1.5 text-xs font-bold" style={{ borderColor: rgbCss(e[300]!), color: rgbCss(e[700]!) }}>Cancelar</span>
        </div>
        <div className="flex gap-1">{[50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((t) => <span key={t} className="h-4 flex-1 rounded-sm" style={{ backgroundColor: rgbCss(e[t]!) }} />)}</div>
      </div>
    </div>
  );
}

function EditarDialog({ institucion, onCerrar }: { institucion: InstitucionDetalle | null; onCerrar: () => void }) {
  const qc = useQueryClient();
  const [cargadaDe, setCargadaDe] = useState<string | null>(null);
  const [campos, setCampos] = useState({ nombre: '', ciudad: '', provincia: '', direccion: '', telefono: '', email: '' });
  const [color, setColor] = useState<string | null>(null);
  const [textoColor, setTextoColor] = useState('');

  // Al abrir se cargan los datos de la institución una sola vez.
  if ((institucion?.id ?? null) !== cargadaDe) {
    setCargadaDe(institucion?.id ?? null);
    if (institucion) {
      setCampos({ nombre: institucion.nombre, ciudad: institucion.ciudad ?? '', provincia: institucion.provincia ?? '', direccion: institucion.direccion ?? '', telefono: institucion.telefono ?? '', email: institucion.email ?? '' });
      setColor(institucion.colorPrincipal);
      setTextoColor(institucion.colorPrincipal ?? '');
    }
  }

  const guardar = useMutation({
    mutationFn: () =>
      actualizarInstitucion(institucion!.id, {
        nombre: campos.nombre.trim(),
        ciudad: campos.ciudad.trim() || null,
        provincia: campos.provincia.trim() || null,
        direccion: campos.direccion.trim() || null,
        telefono: campos.telefono.trim() || null,
        email: campos.email.trim() || null,
        colorPrincipal: color,
      }),
    onSuccess: () => {
      notify.success('Institución actualizada', 'El nuevo color lo ven el backoffice y la app de familias de esa institución.');
      void qc.invalidateQueries({ queryKey: ['instituciones'] });
      void qc.invalidateQueries({ queryKey: ['instituciones-gestion'] });
      onCerrar();
    },
    onError: (err: Error) => notify.error('No se pudo guardar', err.message),
  });

  const elegirColor = (hex: string | null) => {
    setColor(hex);
    setTextoColor(hex ?? '');
  };
  const escrito = (v: string) => {
    const t = v.startsWith('#') || v === '' ? v : `#${v}`;
    setTextoColor(t);
    if (esColorHex(t)) setColor(t.toUpperCase());
  };

  const contraste = color ? contrasteConBlanco(color) : null;
  const colorMuyClaro = contraste !== null && contraste < CONTRASTE_MINIMO;
  const textoInvalido = textoColor !== '' && !esColorHex(textoColor);
  const emailInvalido = campos.email.trim() !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(campos.email.trim());
  const listo = campos.nombre.trim().length >= 2 && !colorMuyClaro && !textoInvalido && !emailInvalido;
  const set = (k: keyof typeof campos, v: string) => setCampos((c) => ({ ...c, [k]: v }));

  return (
    <Dialog open={!!institucion} onOpenChange={(v) => !v && !guardar.isPending && onCerrar()}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar institución</DialogTitle>
          <DialogDescription>El color principal se ve en el backoffice y en la app de familias de esta institución.</DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="inst-nombre">Nombre</Label>
              <Input id="inst-nombre" value={campos.nombre} maxLength={120} onChange={(e) => set('nombre', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inst-ciudad">Ciudad</Label>
              <Input id="inst-ciudad" value={campos.ciudad} maxLength={80} onChange={(e) => set('ciudad', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inst-prov">Provincia</Label>
              <Input id="inst-prov" value={campos.provincia} maxLength={80} onChange={(e) => set('provincia', e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="inst-dir">Dirección</Label>
              <Input id="inst-dir" value={campos.direccion} maxLength={160} onChange={(e) => set('direccion', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inst-tel">Teléfono (lo ven las familias)</Label>
              <Input id="inst-tel" value={campos.telefono} maxLength={40} onChange={(e) => set('telefono', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inst-mail">Email</Label>
              <Input id="inst-mail" type="email" value={campos.email} maxLength={160} onChange={(e) => set('email', e.target.value)} aria-invalid={emailInvalido} />
              {emailInvalido && <p className="text-sm text-destructive">Revisá el email.</p>}
            </div>
          </div>

          <section className="space-y-3 rounded-xl border border-border p-4" aria-label="Color principal">
            <div>
              <h3 className="font-semibold">Color principal</h3>
              <p className="text-sm text-muted-foreground">Botones, menú y acentos. Tiene que ser lo bastante oscuro para que el texto blanco se lea bien.</p>
            </div>

            <div className="flex flex-wrap gap-2" role="group" aria-label="Colores sugeridos">
              {SUGERIDOS.map((s) => {
                const activo = (color ?? VIOLETA_ELDERTECH).toUpperCase() === s.hex;
                return (
                  <button
                    key={s.hex}
                    type="button"
                    onClick={() => elegirColor(s.hex === VIOLETA_ELDERTECH ? null : s.hex)}
                    aria-pressed={activo}
                    aria-label={s.nombre}
                    title={s.nombre}
                    className="h-9 w-9 rounded-full border-2 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    style={{ backgroundColor: s.hex, borderColor: activo ? 'hsl(var(--foreground))' : 'transparent' }}
                  >
                    {activo && <span className="text-sm font-bold text-white">✓</span>}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="inst-color-picker">Elegir otro</Label>
                <input
                  id="inst-color-picker"
                  type="color"
                  value={color ?? VIOLETA_ELDERTECH}
                  onChange={(e) => elegirColor(e.target.value.toUpperCase())}
                  className="h-10 w-16 cursor-pointer rounded-md border border-input bg-card p-1"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inst-color-hex">Código</Label>
                <Input id="inst-color-hex" value={textoColor} maxLength={7} placeholder="#5F3E88" onChange={(e) => escrito(e.target.value.trim())} aria-invalid={textoInvalido} className="w-32 font-mono" />
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => elegirColor(null)} disabled={color === null}>Usar violeta ElderTech</Button>
            </div>

            {textoInvalido && <p className="text-sm text-destructive">Escribí un código como #1F6F5C (6 dígitos).</p>}
            {colorMuyClaro && <p role="alert" className="text-sm font-medium text-destructive">Ese color es muy claro: el texto blanco no se leería bien. Elegí uno más oscuro.</p>}

            <VistaPrevia hex={color && !colorMuyClaro ? color : VIOLETA_ELDERTECH} />
          </section>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCerrar} disabled={guardar.isPending}>Cancelar</Button>
          <Button disabled={!listo || guardar.isPending} onClick={() => guardar.mutate()}>{guardar.isPending ? 'Guardando…' : 'Guardar cambios'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function InstitucionesPage() {
  const q = useQuery({ queryKey: ['instituciones-gestion'], queryFn: listarInstitucionesGestion });
  const [editando, setEditando] = useState<InstitucionDetalle | null>(null);
  const lista = useMemo(() => q.data ?? [], [q.data]);

  if (q.isLoading) return <LoadingState mensaje="Cargando instituciones…" />;
  if (q.isError) return <ErrorState mensaje={q.error.message} onReintentar={() => void q.refetch()} />;

  return (
    <div className="space-y-5">
      <PageHeader titulo="Instituciones" descripcion="Los geriátricos de la plataforma. Cada uno tiene sus propios datos, su color y sus residentes. Para trabajar dentro de uno, elegilo en el selector “Institución” del menú lateral." />

      {lista.length === 0 ? (
        <EmptyState icono={Building2} titulo="No hay instituciones" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {lista.map((i) => {
            const color = i.colorPrincipal ?? VIOLETA_ELDERTECH;
            return (
              <Card key={i.id} className="overflow-hidden p-0">
                <div className="h-2" style={{ backgroundColor: color }} aria-hidden />
                <div className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white" style={{ backgroundColor: color }}><Building2 className="h-5 w-5" /></span>
                      <div className="min-w-0">
                        <p className="truncate text-lg font-semibold">{i.nombre}</p>
                        <p className="truncate text-sm text-muted-foreground">{[i.ciudad, i.provincia].filter(Boolean).join(', ') || 'Sin ciudad cargada'}</p>
                      </div>
                    </div>
                    {i.activo ? <Badge variant="success">Activa</Badge> : <Badge variant="muted">Inactiva</Badge>}
                  </div>

                  <div className="space-y-1 text-sm text-muted-foreground">
                    {i.direccion && <p className="flex items-center gap-2"><MapPin className="h-4 w-4 shrink-0" />{i.direccion}</p>}
                    {i.telefono && <p className="flex items-center gap-2"><Phone className="h-4 w-4 shrink-0" />{i.telefono}</p>}
                    {i.email && <p className="flex items-center gap-2"><Mail className="h-4 w-4 shrink-0" />{i.email}</p>}
                  </div>

                  <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
                    <span className="flex items-center gap-2 text-sm">
                      <span className="h-5 w-5 rounded-full border border-border" style={{ backgroundColor: color }} aria-hidden />
                      <span className="font-mono">{i.colorPrincipal ?? 'Violeta ElderTech'}</span>
                    </span>
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setEditando(i)}><Pencil className="h-4 w-4" /> Editar</Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <EditarDialog institucion={editando} onCerrar={() => setEditando(null)} />
    </div>
  );
}
