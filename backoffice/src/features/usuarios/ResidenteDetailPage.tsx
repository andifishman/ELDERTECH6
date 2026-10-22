import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MapPin, Phone, Calendar, MessageSquare, BookOpen, CloudSun, Heart, StickyNote, Star, Wifi, WifiOff, Users, Gamepad2, Smartphone, Lightbulb, CalendarCheck, Check } from 'lucide-react';
import { formatDistanceToNow, format, differenceInYears } from 'date-fns';
import { es } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingState, ErrorState } from '@/components/common/states';
import { iniciales } from '@/lib/utils';
import { useResidenteDetalle } from './useResidentes';

const NIVEL_LABEL: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' }> = {
  independiente: { label: 'Independiente', variant: 'success' },
  necesita_ayuda: { label: 'Necesita ayuda', variant: 'warning' },
  dependiente: { label: 'Dependiente', variant: 'danger' },
};

const TIPO_CELULAR_LABEL: Record<string, string> = {
  android: 'Android',
  iphone: 'iPhone',
  no_especificado: 'Ninguno / No especificado',
};

const JUEGOS_INFO: Record<string, { emoji: string; titulo: string }> = {
  ahorcado: { emoji: '🪢', titulo: 'Ahorcado' },
  memotest: { emoji: '🃏', titulo: 'Memotest' },
  simon: { emoji: '🎮', titulo: 'Simon' },
  conexiones: { emoji: '🔗', titulo: 'Conexiones' },
  laberinto: { emoji: '🌀', titulo: 'Laberinto' },
  sopa: { emoji: '🔤', titulo: 'Sopa de Letras' },
  puntos: { emoji: '🔵', titulo: 'Une los Puntos' },
  jardin: { emoji: '🌸', titulo: 'Jardín ElderTech' },
  bloques: { emoji: '🧱', titulo: 'Bloques ElderTech' },
  palabras: { emoji: '🔠', titulo: 'Palabras' },
};

const TIPO_PEDIDO_LABEL: Record<string, string> = {
  pedido: 'Pedido',
  comentario: 'Comentario',
  sugerencia: 'Sugerencia',
  actividad_propuesta: 'Actividad propuesta',
  recomendacion_pelicula: 'Recomendación de película',
};

const ESTADO_PEDIDO: Record<string, { label: string; variant: 'warning' | 'info' | 'success' }> = {
  pendiente: { label: 'Pendiente', variant: 'warning' },
  en_proceso: { label: 'En proceso', variant: 'info' },
  resuelta: { label: 'Resuelta', variant: 'success' },
};

const ESTADO_AGENDA: Record<string, { label: string; variant: 'warning' | 'info' | 'success' | 'muted' }> = {
  pendiente: { label: 'Pendiente', variant: 'warning' },
  realizado: { label: 'Realizado', variant: 'success' },
  vencido: { label: 'Vencido', variant: 'muted' },
  cancelado: { label: 'Cancelado', variant: 'muted' },
};

export function ResidenteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useResidenteDetalle(id);
  const [verTodosTutoriales, setVerTodosTutoriales] = useState(false);
  const [verTodosContactos, setVerTodosContactos] = useState(false);
  const [verTodosMensajes, setVerTodosMensajes] = useState(false);
  const [verTodasSugerencias, setVerTodasSugerencias] = useState(false);
  const [verTodaAgenda, setVerTodaAgenda] = useState(false);

  if (isLoading) return <LoadingState mensaje="Cargando perfil del residente…" />;
  if (isError || !data) return <ErrorState onReintentar={() => void refetch()} />;

  const { residente: r, mensajes, intereses, tutoriales, sugerencias, agenda, progresoNiveles, hablemosMensajesEnviados, ciudadesClima, contactos, juegos, dispositivoDetectado } = data;
  const totalPartidas = juegos.reduce((sum, j) => sum + j.partidas, 0);
  const tutorialesCompletados = tutoriales.filter((t) => t.completado);
  const edad = r.fecha_nacimiento ? differenceInYears(new Date(), new Date(r.fecha_nacimiento)) : null;
  const nivel = NIVEL_LABEL[r.nivel_dificultad] ?? NIVEL_LABEL['independiente'];


  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/usuarios')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Avatar className="h-20 w-20 ring-4 ring-primary-100">
          <AvatarFallback className="text-2xl bg-primary-100 text-primary-700">
            {iniciales(`${r.nombre} ${r.apellido}`)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-foreground">{r.nombre} {r.apellido}</h2>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {(r.habitacion || r.seccion) && (
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" /> {r.habitacion ? `Hab. ${r.habitacion}` : ''}
                {r.seccion ? ` · Sección ${r.seccion}` : ''}
              </span>
            )}
            {r.rol_empleado && <Badge variant="outline">{r.rol_empleado}</Badge>}
            <Badge variant={r.activo ? 'success' : 'muted'}>{r.activo ? 'Activo' : 'Inactivo'}</Badge>
            <Badge variant={nivel.variant}>{nivel.label}</Badge>
          </div>
          {edad !== null && (
            <p className="mt-1 text-sm text-muted-foreground">{edad} años</p>
          )}
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            {r.ultima_conexion
              ? <><Wifi className="h-3.5 w-3.5 shrink-0 text-primary-500" />Última conexión {formatDistanceToNow(new Date(r.ultima_conexion), { addSuffix: true, locale: es })}</>
              : <><WifiOff className="h-3.5 w-3.5 shrink-0" />Sin actividad registrada</>
            }
          </p>
        </div>
      </div>

      {/* Grid de info */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">

        {/* Datos personales */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground uppercase tracking-wide">
              <Star className="h-4 w-4" /> Datos personales
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {r.fecha_nacimiento && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span>{format(new Date(r.fecha_nacimiento + 'T00:00:00'), "d 'de' MMMM 'de' yyyy", { locale: es })}</span>
              </div>
            )}
            {r.telefono && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span>{r.telefono}</span>
              </div>
            )}
            {r.fecha_ingreso && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4 shrink-0" />
                <span>Ingresó el {format(new Date(r.fecha_ingreso + 'T00:00:00'), "d MMM yyyy", { locale: es })}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Smartphone className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span>
                {TIPO_CELULAR_LABEL[r.tipo_celular] ?? 'Ninguno / No especificado'}
                {dispositivoDetectado?.modelo ? ` — ${dispositivoDetectado.modelo}` : ''}
              </span>
            </div>
            {!r.fecha_nacimiento && !r.telefono && (
              <p className="text-muted-foreground">Sin más datos cargados.</p>
            )}
          </CardContent>
        </Card>

        {/* Intereses */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground uppercase tracking-wide">
              <Heart className="h-4 w-4" /> Intereses
            </CardTitle>
          </CardHeader>
          <CardContent>
            {intereses.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin intereses registrados.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {intereses.map((i, idx) => (
                  <Badge key={idx} variant="outline" className="gap-1">
                    {i.emoji && <span>{i.emoji}</span>}
                    {i.nombre}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Clima */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground uppercase tracking-wide">
              <CloudSun className="h-4 w-4" /> Ciudades en clima
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ciudadesClima.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin ciudades configuradas.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {ciudadesClima.map((ciudad, idx) => (
                  <Badge key={idx} variant="outline">{ciudad}</Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Notas */}
      {r.notas && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground uppercase tracking-wide">
              <StickyNote className="h-4 w-4" /> Notas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground whitespace-pre-wrap">{r.notas}</p>
          </CardContent>
        </Card>
      )}

      {/* Juegos jugados */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground uppercase tracking-wide">
            <Gamepad2 className="h-4 w-4" /> Juegos
            {totalPartidas > 0 && (
              <Badge variant="outline" className="ml-auto normal-case">{totalPartidas} partidas</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {totalPartidas === 0 ? (
            <p className="text-sm text-muted-foreground">Todavía no jugó ningún juego.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Juego</th>
                    <th className="px-3 py-2 text-right font-medium">Veces jugado</th>
                    <th className="px-3 py-2 text-right font-medium">Ganó / Perdió</th>
                    <th className="px-3 py-2 text-right font-medium">Mejor puntaje</th>
                    <th className="py-2 pl-3 text-right font-medium">Última vez</th>
                  </tr>
                </thead>
                <tbody>
                  {juegos.filter((j) => j.partidas > 0).sort((a, b) => b.partidas - a.partidas).map((j) => {
                    const info = JUEGOS_INFO[j.juego] ?? { emoji: '🎲', titulo: j.juego };
                    return (
                      <tr key={j.juego} className="border-b border-border/60 last:border-0">
                        <td className="py-2 pr-3 font-medium">{info.emoji} {info.titulo}</td>
                        <td className="px-3 py-2 text-right font-bold text-primary">{j.partidas}</td>
                        <td className="px-3 py-2 text-right text-muted-foreground">
                          {j.ganadas + j.perdidas > 0 ? `${j.ganadas} / ${j.perdidas}` : '—'}
                        </td>
                        <td className="px-3 py-2 text-right">{j.mejorPuntaje !== null ? j.mejorPuntaje.toLocaleString('es-AR') : '—'}</td>
                        <td className="py-2 pl-3 text-right text-xs text-muted-foreground">
                          {j.ultimaPartida ? formatDistanceToNow(new Date(j.ultimaPartida), { addSuffix: true, locale: es }) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {(progresoNiveles.jardin.niveles > 0 || progresoNiveles.palabras.niveles > 0) && (
            <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-3 text-sm">
              {progresoNiveles.jardin.niveles > 0 && (
                <Badge variant="outline">🌸 Jardín: {progresoNiveles.jardin.niveles} niveles · {progresoNiveles.jardin.estrellas} ⭐</Badge>
              )}
              {progresoNiveles.palabras.niveles > 0 && (
                <Badge variant="outline">🔠 Palabras: {progresoNiveles.palabras.niveles} niveles (hasta el {progresoNiveles.palabras.nivelMaximo})</Badge>
              )}
            </div>
          )}
          <Link to="/juegos" className="mt-3 inline-block text-xs font-medium text-primary hover:underline">Ver ranking de todos los juegos →</Link>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

        {/* Columna izquierda: Tutoriales + Contactos */}
        <div className="flex flex-col gap-4">

          {/* Tutoriales vistos */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground uppercase tracking-wide">
                <BookOpen className="h-4 w-4" /> Tutoriales vistos
                {tutoriales.length > 0 && (
                  <Badge variant="outline" className="ml-auto normal-case">
                    {tutorialesCompletados.length} completados de {tutoriales.length}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tutoriales.length === 0 ? (
                <p className="text-sm text-muted-foreground">Todavía no abrió ningún tutorial.</p>
              ) : (
                <>
                  <ul className="space-y-2">
                    {(verTodosTutoriales ? tutoriales : tutoriales.slice(0, 3)).map((t, idx) => (
                      <li key={idx} className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 overflow-hidden">
                          {t.thumbnail_url
                            ? <img src={t.thumbnail_url} alt="" className="h-full w-full object-cover" />
                            : <BookOpen className="h-4 w-4 text-primary-400" />
                          }
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{t.titulo}{t.favorito && <span className="ml-1.5 text-yellow-400">★</span>}</p>
                          {t.ultima_vista && (
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(t.ultima_vista), { addSuffix: true, locale: es })}
                            </p>
                          )}
                        </div>
                        {t.completado
                          ? <Badge variant="success" className="gap-1"><Check className="h-3 w-3" />Completo</Badge>
                          : <Badge variant="muted">En curso</Badge>}
                      </li>
                    ))}
                  </ul>
                  {tutoriales.length > 3 && (
                    <button
                      type="button"
                      onClick={() => setVerTodosTutoriales((v) => !v)}
                      className="mt-3 text-xs font-medium text-primary hover:underline"
                    >
                      {verTodosTutoriales ? 'Ver menos' : `Ver todos (${tutoriales.length})`}
                    </button>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Sugerencias enviadas */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground uppercase tracking-wide">
                <Lightbulb className="h-4 w-4" /> Sugerencias enviadas
                {sugerencias.length > 0 && <Badge variant="outline" className="ml-auto normal-case">{sugerencias.length}</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sugerencias.length === 0 ? (
                <p className="text-sm text-muted-foreground">No envió sugerencias ni pedidos.</p>
              ) : (
                <>
                  <ul className="divide-y divide-border">
                    {(verTodasSugerencias ? sugerencias : sugerencias.slice(0, 4)).map((p) => {
                      const estado = ESTADO_PEDIDO[p.estado] ?? { label: p.estado, variant: 'muted' as const };
                      return (
                        <li key={p.id} className="flex items-center gap-3 py-2.5">
                          <div className="min-w-0 flex-1">
                            <Link to={`/pedidos/${p.id}`} className="block truncate text-sm font-medium hover:underline">{p.titulo}</Link>
                            <p className="text-xs text-muted-foreground">
                              {TIPO_PEDIDO_LABEL[p.tipo] ?? p.tipo} · {formatDistanceToNow(new Date(p.created_at), { addSuffix: true, locale: es })}
                            </p>
                          </div>
                          <Badge variant={estado.variant}>{estado.label}</Badge>
                        </li>
                      );
                    })}
                  </ul>
                  {sugerencias.length > 4 && (
                    <button type="button" onClick={() => setVerTodasSugerencias((v) => !v)} className="mt-3 text-xs font-medium text-primary hover:underline">
                      {verTodasSugerencias ? 'Ver menos' : `Ver todas (${sugerencias.length})`}
                    </button>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Agenda */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground uppercase tracking-wide">
                <CalendarCheck className="h-4 w-4" /> Agenda
                {agenda.length > 0 && <Badge variant="outline" className="ml-auto normal-case">{agenda.length} recordatorios</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {agenda.length === 0 ? (
                <p className="text-sm text-muted-foreground">No cargó recordatorios en su agenda.</p>
              ) : (
                <>
                  <ul className="divide-y divide-border">
                    {(verTodaAgenda ? agenda : agenda.slice(0, 4)).map((a) => {
                      const estado = ESTADO_AGENDA[a.estado] ?? { label: a.estado, variant: 'muted' as const };
                      return (
                        <li key={a.id} className="flex items-center gap-3 py-2.5">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{a.titulo}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(a.fecha + 'T00:00:00'), "d MMM yyyy", { locale: es })} · {a.hora.slice(0, 5)} hs
                            </p>
                          </div>
                          <Badge variant={estado.variant}>{estado.label}</Badge>
                        </li>
                      );
                    })}
                  </ul>
                  {agenda.length > 4 && (
                    <button type="button" onClick={() => setVerTodaAgenda((v) => !v)} className="mt-3 text-xs font-medium text-primary hover:underline">
                      {verTodaAgenda ? 'Ver menos' : `Ver toda la agenda (${agenda.length})`}
                    </button>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Contactos */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground uppercase tracking-wide">
                <Users className="h-4 w-4" /> Contactos
                {contactos.length > 0 && (
                  <Badge variant="outline" className="ml-auto normal-case">{contactos.length}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {contactos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin contactos agregados aún.</p>
              ) : (
                <>
                  <ul className="space-y-2">
                    {(verTodosContactos ? contactos : contactos.slice(0, 3)).map((c) => (
                      <li key={c.id} className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 shrink-0">
                          {c.foto_url && <AvatarImage src={c.foto_url} alt="" />}
                          <AvatarFallback className="bg-primary-50 text-primary-700 text-xs">
                            {iniciales(`${c.nombre} ${c.apellido ?? ''}`)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {c.nombre}{c.apellido ? ` ${c.apellido}` : ''}
                            {c.favorito && <span className="ml-1.5 text-yellow-400">★</span>}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3 shrink-0" />
                            {c.telefono}
                            {c.whatsapp_disponible && <span className="ml-1 text-green-600">· WhatsApp</span>}
                          </p>
                        </div>
                        {c.tipo_contacto && (
                          <span className="text-xs text-muted-foreground shrink-0">
                            {c.tipo_contacto.emoji} {c.tipo_contacto.nombre}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                  {contactos.length > 3 && (
                    <button
                      type="button"
                      onClick={() => setVerTodosContactos((v) => !v)}
                      className="mt-3 text-xs font-medium text-primary hover:underline"
                    >
                      {verTodosContactos ? 'Ver menos' : `Ver todos (${contactos.length})`}
                    </button>
                  )}
                </>
              )}
            </CardContent>
          </Card>

        </div>

        {/* Columna derecha: Mensajes al asistente */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground uppercase tracking-wide">
              <MessageSquare className="h-4 w-4" /> Actividad en el asistente
              {hablemosMensajesEnviados > 0 && (
                <Badge variant="outline" className="ml-auto normal-case">{hablemosMensajesEnviados} mensajes en Hablemos</Badge>
              )}
              {mensajes.length > 0 && (
                <Badge variant="outline" className={hablemosMensajesEnviados > 0 ? 'normal-case' : 'ml-auto normal-case'}>{mensajes.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {mensajes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin consultas al asistente aún.</p>
            ) : (
              <>
                <ul className="divide-y divide-border">
                  {(verTodosMensajes ? mensajes : mensajes.slice(0, 5)).map((m) => (
                    <li key={m.id} className="py-2.5">
                      <p className="text-sm text-foreground line-clamp-2">{m.contenido}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(m.created_at), { addSuffix: true, locale: es })}
                      </p>
                    </li>
                  ))}
                </ul>
                {mensajes.length > 5 && (
                  <button
                    type="button"
                    onClick={() => setVerTodosMensajes((v) => !v)}
                    className="mt-3 text-sm font-medium text-primary hover:underline"
                  >
                    {verTodosMensajes ? 'Ver menos' : `Ver todos (${mensajes.length})`}
                  </button>
                )}
              </>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
