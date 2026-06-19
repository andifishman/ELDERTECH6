import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MapPin, Phone, Mail, Calendar, MessageSquare, BookOpen, CloudSun, Heart, StickyNote, Star, Wifi, WifiOff } from 'lucide-react';
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

export function ResidenteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useResidenteDetalle(id);

  if (isLoading) return <LoadingState mensaje="Cargando perfil del residente…" />;
  if (isError || !data) return <ErrorState onReintentar={() => void refetch()} />;

  const { residente: r, mensajes, intereses, tutorialesCompletados, ciudadesClima } = data;
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
          {r.foto_url && <AvatarImage src={r.foto_url} alt="" />}
          <AvatarFallback className="text-2xl bg-primary-100 text-primary-700">
            {iniciales(`${r.nombre} ${r.apellido}`)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-foreground">{r.nombre} {r.apellido}</h2>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {r.habitacion && (
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" /> Hab. {r.habitacion}
                {r.piso ? ` · Piso ${r.piso}` : ''}
              </span>
            )}
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
            {r.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{r.email}</span>
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
            {!r.fecha_nacimiento && !r.email && !r.telefono && (
              <p className="text-muted-foreground">Sin datos cargados.</p>
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Tutoriales completados */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground uppercase tracking-wide">
              <BookOpen className="h-4 w-4" /> Tutoriales completados
              {tutorialesCompletados.length > 0 && (
                <Badge variant="outline" className="ml-auto normal-case">{tutorialesCompletados.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tutorialesCompletados.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin tutoriales completados aún.</p>
            ) : (
              <ul className="space-y-2">
                {tutorialesCompletados.map((t, idx) => (
                  <li key={idx} className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 overflow-hidden">
                      {t.thumbnail_url
                        ? <img src={t.thumbnail_url} alt="" className="h-full w-full object-cover" />
                        : <BookOpen className="h-4 w-4 text-primary-400" />
                      }
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{t.titulo}</p>
                      {t.completado_at && (
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(t.completado_at), { addSuffix: true, locale: es })}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Mensajes al asistente */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground uppercase tracking-wide">
              <MessageSquare className="h-4 w-4" /> Actividad en el asistente
              {mensajes.length > 0 && (
                <Badge variant="outline" className="ml-auto normal-case">{mensajes.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {mensajes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin consultas al asistente aún.</p>
            ) : (
              <ul className="divide-y divide-border">
                {mensajes.map((m) => (
                  <li key={m.id} className="py-2.5">
                    <p className="text-sm text-foreground line-clamp-2">{m.contenido}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(m.created_at), { addSuffix: true, locale: es })}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
