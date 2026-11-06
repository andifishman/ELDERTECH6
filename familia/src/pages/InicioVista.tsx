// Vista de la pantalla de Inicio. Es "tonta" a propósito (solo recibe datos y los dibuja) para poder
// mirar el diseño con datos de ejemplo sin sesión ni backend.
import { Link } from 'react-router-dom';
import { Bell, Camera, CalendarDays, CheckCircle2, ChevronRight, Heart, MessageCircle, Newspaper, Phone, Send, Sparkles, Sun } from 'lucide-react';
import clsx from 'clsx';
import { Boton } from '@/components/ui';
import { fechaCorta, fechaHora, fechaHoyLarga, saludo } from '@/lib/format';
import type { ActividadHogar, Album, Inicio, Noticia, Recordatorio } from '@/services/familia';

export interface DiaSemana {
  /** AAAA-MM-DD */
  fecha: string;
  /** "L", "M", … */
  inicial: string;
  nombre: string;
  numero: string;
  cantidad: number;
  esHoy: boolean;
}

export interface InicioVistaProps {
  nombreFamiliar: string;
  residente: { id: string; nombre: string; apellido: string; parentesco: string | null; seccion: string | null } | null;
  inicio: Inicio;
  /** null = todavía no cargó o el sistema del Hogar no respondió */
  actividadesHoy: ActividadHogar[] | null;
  recordatoriosHoy: Recordatorio[];
  /** Lunes a domingo de esta semana, con cuántas actividades tiene su piso cada día */
  semana: DiaSemana[];
  albumes: Album[];
  noticias: Noticia[];
  institucion: { nombre: string; telefono: string | null } | null;
  ahoraMin: number;
  onConfirmar: (avisoId: string) => void;
  confirmandoId: string | null;
  errorConfirmar: string | null;
}

const FRASES = ['❤️ Te quiero mucho', '😊 ¿Cómo estás hoy?', '🤗 Te mando un abrazo', '📞 Te llamo más tarde'];

/** Una frase por día: pequeñas ideas para acompañar de lejos. */
const IDEAS = [
  'Un mensaje corto todos los días vale más que una visita larga cada tanto.',
  'Mandale una foto de lo que hiciste hoy: le encanta enterarse de tu vida.',
  'Preguntale por un recuerdo: a todos nos gusta que nos pidan una historia.',
  'Una llamada de cinco minutos puede cambiarle la semana.',
  'Contale una novedad de la familia, aunque parezca chica.',
  'Pedile su receta favorita y sacale una foto cuando la prepare.',
  'Un “pensé en vos” sin motivo es el mejor mensaje.',
];

const minutos = (hora: string | null): number => {
  if (!hora) return 9999;
  const [h, m] = hora.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

/** Entrada escalonada: cada sección aparece un poquito después de la anterior. */
const orden = (i: number) => ({ '--i': i }) as React.CSSProperties;

function Seccion({ i, titulo, icono, color, children, enlace }: { i: number; titulo: string; icono: React.ReactNode; color: string; children: React.ReactNode; enlace?: { to: string; texto: string } }) {
  return (
    <section className="aparece space-y-3" style={orden(i)} aria-label={titulo}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2.5 text-xl font-bold text-primary-800">
          <span className={clsx('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', color)} aria-hidden>{icono}</span>
          {titulo}
        </h2>
        {enlace && <Link to={enlace.to} className="flex min-h-10 shrink-0 items-center gap-0.5 text-sm font-extrabold text-primary-700">{enlace.texto}<ChevronRight className="h-4 w-4" aria-hidden /></Link>}
      </div>
      {children}
    </section>
  );
}

/** Estado vacío con calidez: nunca una pantalla "sin nada". */
function Pronto({ emoji, titulo, texto, caja }: { emoji: string; titulo: string; texto: string; caja: string }) {
  return (
    <div className={clsx('rounded-3xl border-2 border-dashed p-5 text-center', caja)}>
      <p className="text-4xl" aria-hidden>{emoji}</p>
      <p className="mt-1 text-lg font-bold text-ink">{titulo}</p>
      <p className="text-soft">{texto}</p>
    </div>
  );
}

export function InicioVista(p: InicioVistaProps) {
  const { inicio: d, residente } = p;
  const nombreRes = residente?.nombre ?? 'tu familiar';
  const turno = (hora: string | null) => (minutos(hora) < 13 * 60 ? 'manana' : 'tarde');

  // Actividades de hoy ordenadas; "ahora" = empezó hace menos de una hora, "sigue" = la próxima que arranca
  const hoy = [...(p.actividadesHoy ?? [])].sort((a, b) => minutos(a.hora) - minutos(b.hora));
  const idxAhora = hoy.findIndex((a) => !a.suspendido && minutos(a.hora) <= p.ahoraMin && p.ahoraMin < minutos(a.hora) + 60);
  const idxSigue = hoy.findIndex((a) => !a.suspendido && minutos(a.hora) > p.ahoraMin);

  const chips = [
    { n: d.mensajesSinLeer, uno: 'mensaje nuevo', varios: 'mensajes nuevos', icono: <MessageCircle className="h-4 w-4" aria-hidden /> },
    { n: d.avisosSinLeer, uno: 'aviso sin leer', varios: 'avisos sin leer', icono: <Bell className="h-4 w-4" aria-hidden /> },
    { n: hoy.length, uno: 'actividad hoy', varios: 'actividades hoy', icono: <Sun className="h-4 w-4" aria-hidden /> },
  ].filter((c) => c.n > 0);

  const idea = IDEAS[Math.floor(Date.now() / 86_400_000) % IDEAS.length]!;
  const maxSemana = Math.max(1, ...p.semana.map((s) => s.cantidad));

  return (
    <div className="space-y-7">
      {/* ── Bienvenida ─────────────────────────────────────────────── */}
      <section className="aparece relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-coral-600 via-rosa-700 to-primary-700 p-5 pb-6 text-white shadow-calido" style={orden(0)} aria-label="Bienvenida">
        <span aria-hidden className="absolute -right-8 -top-10 h-36 w-36 rounded-full bg-sol-400" />
        <span aria-hidden className="absolute right-20 top-16 h-8 w-8 rounded-full bg-agua-200" />
        <span aria-hidden className="absolute -bottom-10 -left-8 h-28 w-28 rounded-full bg-white/10" />
        <Heart aria-hidden className="absolute right-4 top-4 h-9 w-9 animate-latido fill-coral-600 text-coral-600" />
        <p className="relative text-sm font-extrabold uppercase tracking-wider text-white/90">{fechaHoyLarga()}</p>
        <h1 className="relative mt-1 max-w-[70%] text-3xl font-extrabold leading-tight">{saludo()}, {p.nombreFamiliar}</h1>

        {residente && (
          <div className="relative mt-4 flex items-center gap-3 rounded-2xl bg-white/15 p-3 backdrop-blur-sm">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-sol-400 font-display text-2xl font-extrabold text-sol-900 ring-4 ring-white/40" aria-hidden>{residente.nombre.charAt(0).toUpperCase()}</span>
            <span className="min-w-0">
              <span className="block text-sm font-bold text-white/90">Así está el día de</span>
              <span className="block truncate font-display text-xl font-extrabold leading-tight">{residente.nombre} {residente.apellido}</span>
              <span className="block truncate text-sm font-semibold text-white/90">{[residente.seccion ? `Piso ${residente.seccion}` : null, residente.parentesco ? `Tu ${residente.parentesco.toLowerCase()}` : null].filter(Boolean).join(' · ') || 'Tu familiar'}</span>
            </span>
          </div>
        )}

        {chips.length > 0 && (
          <ul className="relative mt-3 flex flex-wrap gap-2">
            {chips.map((c) => (
              <li key={c.uno} className="flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-sm font-bold backdrop-blur-sm">{c.icono}{c.n} {c.n === 1 ? c.uno : c.varios}</li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Avisos importantes ─────────────────────────────────────── */}
      {d.avisosImportantes.map((a, i) => (
        <section key={a.id} className="aparece rounded-3xl border-2 border-rosa-200 bg-rosa-50 p-4 shadow-suave" style={orden(1 + i)} aria-label="Aviso importante">
          <div className="mb-1 flex items-center gap-2 text-rosa-700"><Bell className="h-5 w-5" aria-hidden /><span className="text-sm font-extrabold uppercase tracking-wide">Aviso importante</span></div>
          <h2 className="text-xl font-bold">{a.titulo}</h2>
          <p className="mt-1 whitespace-pre-line break-words">{a.texto}</p>
          {p.errorConfirmar && p.confirmandoId === a.id && <p role="alert" className="mt-2 text-rosa-700">{p.errorConfirmar}</p>}
          <Boton className="mt-3" bloque cargando={p.confirmandoId === a.id} onClick={() => p.onConfirmar(a.id)}><CheckCircle2 className="h-5 w-5" aria-hidden /> Ya lo leí</Boton>
        </section>
      ))}

      {/* ── Escribirle ─────────────────────────────────────────────── */}
      {residente && (
        <section className="aparece rounded-3xl border border-coral-200 bg-coral-50 p-4 shadow-suave" style={orden(2)} aria-label={`Escribirle a ${nombreRes}`}>
          <h2 className="flex items-center gap-2 text-xl font-bold text-coral-700"><Sparkles className="h-5 w-5" aria-hidden /> Un mensaje le alegra el día</h2>
          <p className="mt-0.5 text-soft">{nombreRes} lo recibe en su aplicación y te puede contestar.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {FRASES.map((f) => (
              <Link key={f} to={`/mensajes/${residente.id}?texto=${encodeURIComponent(f.replace(/^\S+\s/, ''))}`} className="min-h-11 rounded-full border-2 border-coral-200 bg-white px-4 py-2 text-sm font-bold text-coral-700 transition-colors hover:bg-coral-100">{f}</Link>
            ))}
          </div>
          <Link to={`/mensajes/${residente.id}`} className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-coral-600 px-5 text-base font-bold text-white shadow-calido"><Send className="h-5 w-5" aria-hidden /> Escribirle a {nombreRes}</Link>
        </section>
      )}

      {/* ── Accesos ────────────────────────────────────────────────── */}
      <nav className="aparece grid grid-cols-2 gap-3" style={orden(3)} aria-label="Accesos rápidos">
        {[
          { to: '/fotos', t: 'Fotos', c: d.fotosNuevas > 0 ? `${d.fotosNuevas} ${d.fotosNuevas === 1 ? 'álbum nuevo' : 'álbumes nuevos'}` : 'Mirá las fotos', i: <Camera className="h-7 w-7" aria-hidden />, caja: 'bg-agua-100 border-agua-200 text-agua-700', icono: 'bg-agua-500 text-white' },
          { to: '/calendario', t: 'Calendario', c: 'Actividades y agenda', i: <CalendarDays className="h-7 w-7" aria-hidden />, caja: 'bg-sol-100 border-sol-200 text-sol-900', icono: 'bg-sol-400 text-sol-900' },
          { to: '/avisos', t: 'Avisos', c: d.avisosSinLeer > 0 ? `${d.avisosSinLeer} sin leer` : 'Comunicados', i: <Bell className="h-7 w-7" aria-hidden />, caja: 'bg-primary-100 border-primary-200 text-primary-800', icono: 'bg-primary-600 text-white' },
          { to: '/noticias', t: 'Noticias', c: 'Qué pasa en la residencia', i: <Newspaper className="h-7 w-7" aria-hidden />, caja: 'bg-rosa-100 border-rosa-200 text-rosa-700', icono: 'bg-rosa-500 text-white' },
        ].map((t) => (
          <Link key={t.to} to={t.to} className={clsx('relative flex min-h-36 flex-col justify-between rounded-3xl border-2 p-4 shadow-suave transition-transform active:scale-[0.98]', t.caja)}>
            <span className={clsx('flex h-12 w-12 items-center justify-center rounded-2xl shadow', t.icono)}>{t.i}</span>
            <span>
              <span className="block font-display text-xl font-bold leading-tight text-ink">{t.t}</span>
              <span className="block text-sm font-bold">{t.c}</span>
            </span>
          </Link>
        ))}
      </nav>

      {/* ── Hoy en el piso ─────────────────────────────────────────── */}
      <Seccion i={4} titulo={`Hoy en el piso de ${nombreRes}`} icono={<Sun className="h-5 w-5 text-sol-900" />} color="bg-sol-200" enlace={{ to: '/calendario', texto: 'Ver todo' }}>
        {p.actividadesHoy === null ? (
          <Pronto emoji="⏳" titulo="Estamos trayendo las actividades de hoy" texto="Si tarda, probá de nuevo en un rato." caja="border-sol-200 bg-sol-50" />
        ) : hoy.length === 0 && p.recordatoriosHoy.length === 0 ? (
          <Pronto emoji="🌿" titulo="Hoy es un día tranquilo" texto="No hay actividades programadas en su piso." caja="border-sol-200 bg-sol-50" />
        ) : (
          <ul className="space-y-2">
            {hoy.slice(0, 5).map((a, i) => {
              const esAhora = i === idxAhora;
              const esSigue = i === idxSigue;
              return (
                <li key={a.id} className={clsx('flex items-center gap-3 rounded-2xl border-2 bg-white p-3 shadow-suave', esAhora ? 'border-agua-500' : esSigue ? 'border-sol-400' : 'border-transparent', a.suspendido && 'opacity-60')}>
                  <span className={clsx('flex min-w-[4.25rem] flex-col items-center rounded-xl px-2 py-1.5 text-center font-extrabold leading-tight', turno(a.hora) === 'manana' ? 'bg-sol-100 text-sol-900' : 'bg-coral-100 text-coral-700')}>
                    <span className="text-lg">{a.hora ?? '—'}</span>
                    <span className="text-[0.7rem] font-bold uppercase tracking-wide">{turno(a.hora) === 'manana' ? 'mañana' : 'tarde'}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={clsx('block font-bold leading-snug', a.suspendido && 'line-through')}>{a.nombre}</span>
                    {a.lugar && <span className="block text-sm text-soft">{a.lugar}</span>}
                  </span>
                  {a.suspendido ? <span className="rounded-full bg-rosa-100 px-2.5 py-1 text-xs font-extrabold text-rosa-700">Suspendida</span> : esAhora ? <span className="rounded-full bg-agua-500 px-2.5 py-1 text-xs font-extrabold text-white">Ahora</span> : esSigue ? <span className="rounded-full bg-sol-400 px-2.5 py-1 text-xs font-extrabold text-sol-900">Sigue</span> : null}
                </li>
              );
            })}
            {hoy.length > 5 && <li><Link to="/calendario" className="block rounded-2xl bg-white p-3 text-center font-bold text-primary-700 shadow-suave">y {hoy.length - 5} más · Ver todas</Link></li>}
            {p.recordatoriosHoy.map((r) => (
              <li key={r.id} className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-primary-200 bg-primary-50 p-3">
                <span className="rounded-xl bg-primary-600 px-2.5 py-1.5 text-lg font-extrabold text-white">{r.hora.slice(0, 5)}</span>
                <span className="min-w-0 flex-1"><span className="block text-xs font-extrabold uppercase tracking-wide text-primary-700">Lo anotó {nombreRes}</span><span className="block font-bold">{r.titulo}</span></span>
              </li>
            ))}
          </ul>
        )}
      </Seccion>

      {/* ── Semana ─────────────────────────────────────────────────── */}
      {p.semana.length > 0 && (
        <Seccion i={5} titulo="Esta semana" icono={<CalendarDays className="h-5 w-5 text-primary-700" />} color="bg-primary-100">
          <div className="rounded-3xl bg-white p-3 shadow-suave">
            <ol className="grid grid-cols-7 gap-1.5">
              {p.semana.map((s) => (
                <li key={s.fecha}>
                  <Link to="/calendario" aria-label={`${s.nombre} ${s.numero}: ${s.cantidad} ${s.cantidad === 1 ? 'actividad' : 'actividades'}${s.esHoy ? ' (hoy)' : ''}`} className={clsx('flex flex-col items-center gap-1 rounded-2xl px-0 py-2', s.esHoy ? 'bg-primary-600 text-white shadow-suave' : 'text-ink')}>
                    <span className={clsx('text-xs font-extrabold uppercase', s.esHoy ? 'text-white/90' : 'text-soft')}>{s.inicial}</span>
                    <span className="font-display text-lg font-extrabold leading-none">{s.numero}</span>
                    <span className="flex h-8 w-3 items-end overflow-hidden rounded-full bg-black/5" aria-hidden>
                      <span className={clsx('w-full rounded-full', s.esHoy ? 'bg-sol-400' : 'bg-agua-500')} style={{ height: `${Math.round((s.cantidad / maxSemana) * 100)}%` }} />
                    </span>
                    <span className="text-xs font-bold">{s.cantidad}</span>
                  </Link>
                </li>
              ))}
            </ol>
            <p className="mt-2 text-center text-xs font-semibold text-soft">Cantidad de actividades por día en su piso</p>
          </div>
        </Seccion>
      )}

      {/* ── Últimas fotos ──────────────────────────────────────────── */}
      <Seccion i={6} titulo="Últimas fotos" icono={<Camera className="h-5 w-5 text-agua-700" />} color="bg-agua-100" enlace={p.albumes.length > 0 ? { to: '/fotos', texto: 'Ver todas' } : undefined}>
        {p.albumes.length === 0 ? (
          <Pronto emoji="📸" titulo="Pronto vas a ver fotos" texto="Cuando la residencia publique fotos de las actividades, aparecen acá." caja="border-agua-200 bg-agua-50" />
        ) : (
          <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sin-barra">
            {p.albumes.slice(0, 6).map((a) => (
              <li key={a.id} className="w-44 shrink-0 snap-start">
                <Link to={`/fotos/${a.id}`} className="relative block aspect-[4/5] overflow-hidden rounded-3xl bg-agua-100 shadow-suave">
                  {a.portada_url && <img src={a.portada_url} alt="" className="h-full w-full object-cover" loading="lazy" />}
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent p-3 pt-10 text-white">
                    <span className="block font-display text-base font-bold leading-tight">{a.titulo}</span>
                    <span className="block text-xs font-bold text-white/90">{a.cantidad_fotos} {a.cantidad_fotos === 1 ? 'foto' : 'fotos'}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Seccion>

      {/* ── Próximos eventos ───────────────────────────────────────── */}
      <Seccion i={7} titulo="Próximos eventos" icono={<Heart className="h-5 w-5 text-rosa-700" />} color="bg-rosa-100" enlace={d.proximosEventos.length > 0 ? { to: '/calendario?tab=eventos', texto: 'Ver todos' } : undefined}>
        {d.proximosEventos.length === 0 ? (
          <Pronto emoji="🎈" titulo="No hay eventos por ahora" texto="Las fiestas y visitas abiertas a las familias aparecen acá, y te podés anotar." caja="border-rosa-200 bg-rosa-50" />
        ) : (
          <ul className="space-y-2">
            {d.proximosEventos.map((e) => {
              const [dia, mes] = fechaCorta(e.inicia_en).split(' ');
              return (
                <li key={e.id}>
                  <Link to="/calendario?tab=eventos" className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-suave">
                    <span className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-rosa-500 text-white"><span className="font-display text-2xl font-extrabold leading-none">{dia}</span><span className="text-xs font-extrabold uppercase">{mes?.replace('.', '')}</span></span>
                    <span className="min-w-0 flex-1"><span className="block font-bold leading-snug">{e.titulo}</span><span className="block text-sm text-soft">{fechaHora(e.inicia_en)}{e.lugar ? ` · ${e.lugar}` : ''}</span></span>
                    {e.abierto_inscripcion && <span className={clsx('shrink-0 rounded-full px-2.5 py-1 text-xs font-extrabold', e.mi_inscripcion ? 'bg-agua-100 text-agua-700' : 'bg-sol-100 text-sol-900')}>{e.mi_inscripcion ? 'Anotado' : 'Podés ir'}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Seccion>

      {/* ── Noticias ───────────────────────────────────────────────── */}
      <Seccion i={8} titulo="Noticias" icono={<Newspaper className="h-5 w-5 text-primary-700" />} color="bg-primary-100" enlace={p.noticias.length > 0 ? { to: '/noticias', texto: 'Ver todas' } : undefined}>
        {p.noticias.length === 0 ? (
          <Pronto emoji="📰" titulo="Sin noticias por ahora" texto="Cuando haya novedades de la residencia las vas a ver acá." caja="border-primary-200 bg-primary-50" />
        ) : (
          <ul className="space-y-3">
            {p.noticias.slice(0, 2).map((n) => (
              <li key={n.id}>
                <Link to="/noticias" className="block overflow-hidden rounded-3xl bg-white shadow-suave">
                  {n.imagen_url && <img src={n.imagen_url} alt="" className="h-36 w-full object-cover" loading="lazy" />}
                  <span className="block p-4"><span className="block font-display text-lg font-bold leading-snug">{n.titulo}</span><span className="mt-1 line-clamp-2 block text-soft">{n.texto}</span></span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Seccion>

      {/* ── Idea del día ───────────────────────────────────────────── */}
      <section className="aparece relative overflow-hidden rounded-3xl bg-sol-100 p-5 shadow-suave" style={orden(9)} aria-label="Idea del día">
        <span aria-hidden className="absolute -right-4 -top-4 text-7xl opacity-30">💛</span>
        <p className="relative text-sm font-extrabold uppercase tracking-wide text-sol-700">Idea del día</p>
        <p className="relative mt-1 font-display text-xl font-bold leading-snug text-sol-900">{idea}</p>
      </section>

      {/* ── Llamar ─────────────────────────────────────────────────── */}
      {p.institucion?.telefono && (
        <section className="aparece overflow-hidden rounded-3xl bg-gradient-to-br from-agua-700 to-agua-500 p-4 text-white shadow-suave" style={orden(10)} aria-label="Llamar a la residencia">
          <p className="text-sm font-extrabold uppercase tracking-wide text-white/90">¿Querés hablar con alguien?</p>
          <p className="font-display text-xl font-bold">{p.institucion.nombre} te atiende</p>
          <a href={`tel:${p.institucion.telefono.replace(/[^\d+]/g, '')}`} className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 text-lg font-extrabold text-agua-700"><Phone className="h-5 w-5" aria-hidden /> Llamar · {p.institucion.telefono}</a>
        </section>
      )}
    </div>
  );
}
