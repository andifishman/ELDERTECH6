-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.organizaciones (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  direccion text,
  telefono text,
  email text,
  ciudad text,
  provincia text,
  pais text DEFAULT 'AR'::text,
  timezone text NOT NULL DEFAULT 'America/Argentina/Buenos_Aires'::text,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT organizaciones_pkey PRIMARY KEY (id)
);
CREATE TABLE public.intereses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nombre text NOT NULL UNIQUE,
  emoji text,
  activo boolean NOT NULL DEFAULT true,
  CONSTRAINT intereses_pkey PRIMARY KEY (id)
);
CREATE TABLE public.residentes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organizacion_id uuid NOT NULL,
  nombre text NOT NULL,
  apellido text NOT NULL,
  fecha_nacimiento date,
  nivel_dificultad USER-DEFINED NOT NULL DEFAULT 'independiente'::nivel_dificultad_enum,
  telefono text,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  habitacion text,
  notas text,
  fecha_ingreso date,
  ultima_conexion timestamp with time zone,
  seccion USER-DEFINED,
  dni text,
  nombre_completo text,
  tipo_celular text NOT NULL DEFAULT 'no_especificado'::text CHECK (tipo_celular = ANY (ARRAY['android'::text, 'iphone'::text, 'no_especificado'::text])),
  rol_empleado text,
  CONSTRAINT residentes_pkey PRIMARY KEY (id),
  CONSTRAINT residentes_organizacion_id_fkey FOREIGN KEY (organizacion_id) REFERENCES public.organizaciones(id)
);
CREATE TABLE public.residente_intereses (
  residente_id uuid NOT NULL,
  interes_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT residente_intereses_pkey PRIMARY KEY (residente_id, interes_id),
  CONSTRAINT residente_intereses_residente_id_fkey FOREIGN KEY (residente_id) REFERENCES public.residentes(id),
  CONSTRAINT residente_intereses_interes_id_fkey FOREIGN KEY (interes_id) REFERENCES public.intereses(id)
);
CREATE TABLE public.responsables (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organizacion_id uuid,
  nombre text NOT NULL,
  apellido text NOT NULL,
  email text,
  telefono text,
  foto_url text,
  es_externo boolean NOT NULL DEFAULT false,
  empresa_organizacion text,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT responsables_pkey PRIMARY KEY (id),
  CONSTRAINT responsables_organizacion_id_fkey FOREIGN KEY (organizacion_id) REFERENCES public.organizaciones(id)
);
CREATE TABLE public.tipos_actividad (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organizacion_id uuid,
  nombre text NOT NULL,
  emoji text,
  color text,
  descripcion text,
  activo boolean NOT NULL DEFAULT true,
  hora_inicio_default text,
  hora_fin_default text,
  CONSTRAINT tipos_actividad_pkey PRIMARY KEY (id),
  CONSTRAINT tipos_actividad_organizacion_id_fkey FOREIGN KEY (organizacion_id) REFERENCES public.organizaciones(id)
);
CREATE TABLE public.ubicaciones (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organizacion_id uuid NOT NULL,
  nombre text NOT NULL,
  descripcion text,
  activo boolean NOT NULL DEFAULT true,
  CONSTRAINT ubicaciones_pkey PRIMARY KEY (id),
  CONSTRAINT ubicaciones_organizacion_id_fkey FOREIGN KEY (organizacion_id) REFERENCES public.organizaciones(id)
);
CREATE TABLE public.actividades (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organizacion_id uuid NOT NULL,
  tipo_actividad_id uuid,
  ubicacion_id uuid,
  responsable_id uuid,
  nombre text NOT NULL,
  descripcion text,
  emoji_icono text,
  fecha date NOT NULL,
  hora_inicio time without time zone NOT NULL,
  hora_fin time without time zone,
  es_recurrente boolean NOT NULL DEFAULT false,
  patron_recurrencia jsonb,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  secciones_objetivo ARRAY,
  plantilla_id uuid,
  notificar_al_crear boolean NOT NULL DEFAULT false,
  recordatorio_minutos_antes integer,
  recordatorio_enviado boolean NOT NULL DEFAULT false,
  notificacion_id uuid,
  CONSTRAINT actividades_pkey PRIMARY KEY (id),
  CONSTRAINT actividades_organizacion_id_fkey FOREIGN KEY (organizacion_id) REFERENCES public.organizaciones(id),
  CONSTRAINT actividades_tipo_actividad_id_fkey FOREIGN KEY (tipo_actividad_id) REFERENCES public.tipos_actividad(id),
  CONSTRAINT actividades_ubicacion_id_fkey FOREIGN KEY (ubicacion_id) REFERENCES public.ubicaciones(id),
  CONSTRAINT actividades_responsable_id_fkey FOREIGN KEY (responsable_id) REFERENCES public.responsables(id),
  CONSTRAINT actividades_notificacion_id_fkey FOREIGN KEY (notificacion_id) REFERENCES public.notifications(id)
);
CREATE TABLE public.actividad_residentes (
  actividad_id uuid NOT NULL,
  residente_id uuid NOT NULL,
  estado text NOT NULL DEFAULT 'asignado'::text,
  notas text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT actividad_residentes_pkey PRIMARY KEY (actividad_id, residente_id),
  CONSTRAINT actividad_residentes_actividad_id_fkey FOREIGN KEY (actividad_id) REFERENCES public.actividades(id),
  CONSTRAINT actividad_residentes_residente_id_fkey FOREIGN KEY (residente_id) REFERENCES public.residentes(id)
);
CREATE TABLE public.eventos_personales (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  residente_id uuid NOT NULL,
  nombre text NOT NULL,
  descripcion text,
  emoji_icono text,
  fecha date NOT NULL,
  hora time without time zone,
  tipo USER-DEFINED NOT NULL DEFAULT 'recordatorio'::tipo_evento_enum,
  es_recurrente boolean NOT NULL DEFAULT false,
  patron_recurrencia jsonb,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT eventos_personales_pkey PRIMARY KEY (id),
  CONSTRAINT eventos_personales_residente_id_fkey FOREIGN KEY (residente_id) REFERENCES public.residentes(id)
);
CREATE TABLE public.categorias_radio (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nombre text NOT NULL UNIQUE,
  emoji text,
  descripcion text,
  orden integer NOT NULL DEFAULT 0,
  activo boolean NOT NULL DEFAULT true,
  CONSTRAINT categorias_radio_pkey PRIMARY KEY (id)
);
CREATE TABLE public.radios (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  categoria_id uuid,
  nombre text NOT NULL,
  descripcion text,
  url_stream text,
  url_logo text,
  pais text DEFAULT 'AR'::text,
  ciudad text,
  genero text,
  es_destacada boolean NOT NULL DEFAULT false,
  fuente USER-DEFINED NOT NULL DEFAULT 'manual'::fuente_radio_enum,
  stream_id_externo text,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  pais_radio_id uuid,
  api_id text,
  api_fuente text,
  url_fallback text,
  CONSTRAINT radios_pkey PRIMARY KEY (id),
  CONSTRAINT radios_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.categorias_radio(id),
  CONSTRAINT radios_pais_radio_id_fkey FOREIGN KEY (pais_radio_id) REFERENCES public.paises_radio(id)
);
CREATE TABLE public.residente_radios_favoritas (
  residente_id uuid NOT NULL,
  radio_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT residente_radios_favoritas_pkey PRIMARY KEY (residente_id, radio_id),
  CONSTRAINT residente_radios_favoritas_residente_id_fkey FOREIGN KEY (residente_id) REFERENCES public.residentes(id),
  CONSTRAINT residente_radios_favoritas_radio_id_fkey FOREIGN KEY (radio_id) REFERENCES public.radios(id)
);
CREATE TABLE public.historial_radio (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  residente_id uuid NOT NULL,
  radio_id uuid NOT NULL,
  inicio_escucha timestamp with time zone NOT NULL DEFAULT now(),
  fin_escucha timestamp with time zone,
  duracion_segundos integer,
  CONSTRAINT historial_radio_pkey PRIMARY KEY (id),
  CONSTRAINT historial_radio_residente_id_fkey FOREIGN KEY (residente_id) REFERENCES public.residentes(id),
  CONSTRAINT historial_radio_radio_id_fkey FOREIGN KEY (radio_id) REFERENCES public.radios(id)
);
CREATE TABLE public.paises_radio (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  nombre text NOT NULL,
  emoji_bandera text,
  activo boolean NOT NULL DEFAULT true,
  orden integer NOT NULL DEFAULT 0,
  CONSTRAINT paises_radio_pkey PRIMARY KEY (id)
);
CREATE TABLE public.perfiles_usuario (
  id uuid NOT NULL,
  residente_id uuid,
  organizacion_id uuid,
  username text NOT NULL CHECK (length(TRIM(BOTH FROM username)) >= 3),
  rol USER-DEFINED NOT NULL DEFAULT 'residente'::rol_usuario_enum,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT perfiles_usuario_pkey PRIMARY KEY (id),
  CONSTRAINT perfiles_usuario_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id),
  CONSTRAINT perfiles_usuario_residente_id_fkey FOREIGN KEY (residente_id) REFERENCES public.residentes(id),
  CONSTRAINT perfiles_usuario_organizacion_id_fkey FOREIGN KEY (organizacion_id) REFERENCES public.organizaciones(id)
);
CREATE TABLE public.ciudades_familiares (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  pais_codigo text NOT NULL DEFAULT 'AR'::text,
  lat numeric,
  lon numeric,
  activo boolean NOT NULL DEFAULT true,
  orden integer NOT NULL DEFAULT 0,
  timezone text,
  CONSTRAINT ciudades_familiares_pkey PRIMARY KEY (id)
);
CREATE TABLE public.residente_ciudades_familiares (
  residente_id uuid NOT NULL,
  ciudad_familiar_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT residente_ciudades_familiares_pkey PRIMARY KEY (residente_id, ciudad_familiar_id),
  CONSTRAINT residente_ciudades_familiares_residente_id_fkey FOREIGN KEY (residente_id) REFERENCES public.residentes(id),
  CONSTRAINT residente_ciudades_familiares_ciudad_familiar_id_fkey FOREIGN KEY (ciudad_familiar_id) REFERENCES public.ciudades_familiares(id)
);
CREATE TABLE public.tipos_contacto (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nombre text NOT NULL UNIQUE,
  emoji text,
  orden smallint NOT NULL DEFAULT 0,
  CONSTRAINT tipos_contacto_pkey PRIMARY KEY (id)
);
CREATE TABLE public.contactos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  residente_id uuid NOT NULL,
  tipo_contacto_id uuid,
  nombre text NOT NULL,
  apellido text,
  telefono text NOT NULL,
  whatsapp_disponible boolean NOT NULL DEFAULT true,
  foto_url text,
  origen_contacto text NOT NULL DEFAULT 'manual'::text CHECK (origen_contacto = ANY (ARRAY['dispositivo'::text, 'manual'::text])),
  contacto_device_id text,
  favorito boolean NOT NULL DEFAULT false,
  orden smallint NOT NULL DEFAULT 0,
  activo boolean NOT NULL DEFAULT true,
  notas text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT contactos_pkey PRIMARY KEY (id),
  CONSTRAINT contactos_residente_id_fkey FOREIGN KEY (residente_id) REFERENCES public.residentes(id),
  CONSTRAINT contactos_tipo_contacto_id_fkey FOREIGN KEY (tipo_contacto_id) REFERENCES public.tipos_contacto(id)
);
CREATE TABLE public.categorias_tutorial (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nombre text NOT NULL UNIQUE,
  emoji text,
  orden smallint NOT NULL DEFAULT 0,
  activo boolean NOT NULL DEFAULT true,
  CONSTRAINT categorias_tutorial_pkey PRIMARY KEY (id)
);
CREATE TABLE public.tutoriales (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  categoria_id uuid,
  titulo text NOT NULL,
  descripcion text,
  formato USER-DEFINED NOT NULL DEFAULT 'video'::formato_tutorial_enum,
  url_video text,
  duracion_segundos integer,
  thumbnail_url text,
  lo_que_aprenderas ARRAY,
  orden smallint NOT NULL DEFAULT 0,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  nivel text NOT NULL DEFAULT 'principiante'::text CHECK (nivel = ANY (ARRAY['principiante'::text, 'intermedio'::text, 'avanzado'::text])),
  deleted_at timestamp with time zone,
  dispositivo text NOT NULL DEFAULT 'ambos'::text CHECK (dispositivo = ANY (ARRAY['android'::text, 'iphone'::text, 'ambos'::text])),
  CONSTRAINT tutoriales_pkey PRIMARY KEY (id),
  CONSTRAINT tutoriales_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.categorias_tutorial(id)
);
CREATE TABLE public.pasos_tutorial (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tutorial_id uuid NOT NULL,
  orden smallint NOT NULL DEFAULT 0,
  titulo text,
  descripcion text,
  imagen_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  tip text,
  CONSTRAINT pasos_tutorial_pkey PRIMARY KEY (id),
  CONSTRAINT pasos_tutorial_tutorial_id_fkey FOREIGN KEY (tutorial_id) REFERENCES public.tutoriales(id)
);
CREATE TABLE public.progreso_tutorial (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  residente_id uuid NOT NULL,
  tutorial_id uuid NOT NULL,
  favorito boolean NOT NULL DEFAULT false,
  completado boolean NOT NULL DEFAULT false,
  segundos_vistos integer NOT NULL DEFAULT 0,
  ultima_vista timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT progreso_tutorial_pkey PRIMARY KEY (id),
  CONSTRAINT progreso_tutorial_residente_id_fkey FOREIGN KEY (residente_id) REFERENCES public.residentes(id),
  CONSTRAINT progreso_tutorial_tutorial_id_fkey FOREIGN KEY (tutorial_id) REFERENCES public.tutoriales(id)
);
CREATE TABLE public.sesiones_asistente (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  residente_id uuid NOT NULL,
  titulo text,
  activa boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT sesiones_asistente_pkey PRIMARY KEY (id),
  CONSTRAINT sesiones_asistente_residente_id_fkey FOREIGN KEY (residente_id) REFERENCES public.residentes(id)
);
CREATE TABLE public.mensajes_asistente (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  sesion_id uuid NOT NULL,
  residente_id uuid NOT NULL,
  rol text NOT NULL CHECK (rol = ANY (ARRAY['usuario'::text, 'asistente'::text])),
  contenido text NOT NULL,
  es_favorito boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT mensajes_asistente_pkey PRIMARY KEY (id),
  CONSTRAINT mensajes_asistente_sesion_id_fkey FOREIGN KEY (sesion_id) REFERENCES public.sesiones_asistente(id),
  CONSTRAINT mensajes_asistente_residente_id_fkey FOREIGN KEY (residente_id) REFERENCES public.residentes(id)
);
CREATE TABLE public.faq_asistente (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  pregunta text NOT NULL,
  categoria text DEFAULT 'general'::text,
  emoji text DEFAULT '❓'::text,
  orden smallint NOT NULL DEFAULT 0,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT faq_asistente_pkey PRIMARY KEY (id)
);
CREATE TABLE public.audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organizacion_id uuid,
  usuario_id uuid,
  usuario_nombre text,
  accion text NOT NULL,
  tabla_afectada text NOT NULL,
  registro_id text,
  descripcion text,
  datos_nuevos jsonb,
  datos_previos jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT audit_logs_pkey PRIMARY KEY (id),
  CONSTRAINT audit_logs_organizacion_id_fkey FOREIGN KEY (organizacion_id) REFERENCES public.organizaciones(id)
);
CREATE TABLE public.actividad_residentes_override (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  actividad_id uuid NOT NULL,
  residente_id uuid NOT NULL,
  incluido boolean NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT actividad_residentes_override_pkey PRIMARY KEY (id),
  CONSTRAINT actividad_residentes_override_actividad_id_fkey FOREIGN KEY (actividad_id) REFERENCES public.actividades(id),
  CONSTRAINT actividad_residentes_override_residente_id_fkey FOREIGN KEY (residente_id) REFERENCES public.residentes(id)
);
CREATE TABLE public.pedidos_sugerencias (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organizacion_id uuid NOT NULL,
  residente_id uuid NOT NULL,
  tipo USER-DEFINED NOT NULL,
  titulo text NOT NULL,
  descripcion text,
  audio_url text,
  audio_duracion_segundos integer,
  transcripcion text,
  transcripcion_estado text CHECK (transcripcion_estado = ANY (ARRAY['pendiente'::text, 'completada'::text, 'fallida'::text])),
  estado USER-DEFINED NOT NULL DEFAULT 'pendiente'::estado_pedido_enum,
  resuelto_por uuid,
  resuelto_en timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT pedidos_sugerencias_pkey PRIMARY KEY (id),
  CONSTRAINT pedidos_sugerencias_organizacion_id_fkey FOREIGN KEY (organizacion_id) REFERENCES public.organizaciones(id),
  CONSTRAINT pedidos_sugerencias_residente_id_fkey FOREIGN KEY (residente_id) REFERENCES public.residentes(id),
  CONSTRAINT pedidos_sugerencias_resuelto_por_fkey FOREIGN KEY (resuelto_por) REFERENCES auth.users(id)
);
CREATE TABLE public.device_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  perfil_usuario_id uuid NOT NULL,
  residente_id uuid,
  organizacion_id uuid,
  expo_push_token text NOT NULL UNIQUE,
  plataforma text NOT NULL CHECK (plataforma = ANY (ARRAY['ios'::text, 'android'::text, 'web'::text])),
  dispositivo text,
  activo boolean NOT NULL DEFAULT true,
  last_seen_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT device_tokens_pkey PRIMARY KEY (id),
  CONSTRAINT device_tokens_perfil_usuario_id_fkey FOREIGN KEY (perfil_usuario_id) REFERENCES auth.users(id),
  CONSTRAINT device_tokens_residente_id_fkey FOREIGN KEY (residente_id) REFERENCES public.residentes(id),
  CONSTRAINT device_tokens_organizacion_id_fkey FOREIGN KEY (organizacion_id) REFERENCES public.organizaciones(id)
);
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organizacion_id uuid NOT NULL,
  titulo text NOT NULL,
  mensaje text NOT NULL,
  imagen_url text,
  icono text,
  tipo USER-DEFINED NOT NULL DEFAULT 'general'::tipo_notificacion_enum,
  destino_tipo USER-DEFINED NOT NULL DEFAULT 'todos'::destino_tipo_enum,
  destino_filtro jsonb,
  excluir_residente_ids ARRAY,
  programacion_tipo USER-DEFINED NOT NULL DEFAULT 'instantanea'::programacion_tipo_enum,
  programada_para timestamp with time zone,
  recurrencia USER-DEFINED NOT NULL DEFAULT 'ninguna'::recurrencia_enum,
  estado USER-DEFINED NOT NULL DEFAULT 'borrador'::estado_notificacion_enum,
  silenciosa boolean NOT NULL DEFAULT false,
  sonido boolean NOT NULL DEFAULT true,
  vibracion boolean NOT NULL DEFAULT true,
  prioridad USER-DEFINED NOT NULL DEFAULT 'normal'::prioridad_notificacion_enum,
  pantalla_destino text,
  actividad_id uuid,
  creado_por uuid,
  enviado_por uuid,
  enviada_en timestamp with time zone,
  cancelada_en timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  incluir_residente_ids ARRAY,
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_organizacion_id_fkey FOREIGN KEY (organizacion_id) REFERENCES public.organizaciones(id),
  CONSTRAINT notifications_actividad_id_fkey FOREIGN KEY (actividad_id) REFERENCES public.actividades(id),
  CONSTRAINT notifications_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES auth.users(id),
  CONSTRAINT notifications_enviado_por_fkey FOREIGN KEY (enviado_por) REFERENCES auth.users(id)
);
CREATE TABLE public.notification_recipients (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL,
  residente_id uuid NOT NULL,
  device_token_id uuid,
  estado USER-DEFINED NOT NULL DEFAULT 'pendiente'::estado_destinatario_enum,
  expo_ticket_id text,
  error_mensaje text,
  enviado_en timestamp with time zone,
  entregado_en timestamp with time zone,
  abierto_en timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT notification_recipients_pkey PRIMARY KEY (id),
  CONSTRAINT notification_recipients_notification_id_fkey FOREIGN KEY (notification_id) REFERENCES public.notifications(id),
  CONSTRAINT notification_recipients_residente_id_fkey FOREIGN KEY (residente_id) REFERENCES public.residentes(id),
  CONSTRAINT notification_recipients_device_token_id_fkey FOREIGN KEY (device_token_id) REFERENCES public.device_tokens(id)
);
CREATE TABLE public.notification_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  notification_id uuid,
  accion text NOT NULL CHECK (accion = ANY (ARRAY['crear'::text, 'editar'::text, 'eliminar'::text, 'programar'::text, 'cancelar'::text, 'enviar'::text, 'reenviar'::text, 'duplicar'::text, 'error'::text])),
  usuario_id uuid,
  descripcion text,
  metadata jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT notification_logs_pkey PRIMARY KEY (id),
  CONSTRAINT notification_logs_notification_id_fkey FOREIGN KEY (notification_id) REFERENCES public.notifications(id),
  CONSTRAINT notification_logs_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES auth.users(id)
);
CREATE TABLE public.partidas_juegos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organizacion_id uuid NOT NULL,
  residente_id uuid NOT NULL,
  juego text NOT NULL CHECK (juego = ANY (ARRAY['ahorcado'::text, 'memotest'::text, 'simon'::text, 'conexiones'::text, 'laberinto'::text, 'sopa'::text, 'puntos'::text, 'jardin'::text, 'bloques'::text, 'palabras'::text])),
  resultado text CHECK (resultado = ANY (ARRAY['ganado'::text, 'perdido'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  puntos integer CHECK (puntos IS NULL OR puntos >= 0),
  CONSTRAINT partidas_juegos_pkey PRIMARY KEY (id),
  CONSTRAINT partidas_juegos_organizacion_id_fkey FOREIGN KEY (organizacion_id) REFERENCES public.organizaciones(id),
  CONSTRAINT partidas_juegos_residente_id_fkey FOREIGN KEY (residente_id) REFERENCES public.residentes(id)
);
CREATE TABLE public.conversaciones (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organizacion_id uuid NOT NULL,
  creado_por uuid NOT NULL,
  ultimo_mensaje_preview text,
  ultimo_mensaje_tipo text CHECK (ultimo_mensaje_tipo = ANY (ARRAY['texto'::text, 'audio'::text, 'imagen'::text])),
  ultimo_mensaje_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT conversaciones_pkey PRIMARY KEY (id),
  CONSTRAINT conversaciones_organizacion_id_fkey FOREIGN KEY (organizacion_id) REFERENCES public.organizaciones(id),
  CONSTRAINT conversaciones_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES public.residentes(id)
);
CREATE TABLE public.conversacion_participantes (
  conversacion_id uuid NOT NULL,
  residente_id uuid NOT NULL,
  no_leidos_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT conversacion_participantes_pkey PRIMARY KEY (conversacion_id, residente_id),
  CONSTRAINT conversacion_participantes_conversacion_id_fkey FOREIGN KEY (conversacion_id) REFERENCES public.conversaciones(id),
  CONSTRAINT conversacion_participantes_residente_id_fkey FOREIGN KEY (residente_id) REFERENCES public.residentes(id)
);
CREATE TABLE public.mensajes_hablemos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  conversacion_id uuid NOT NULL,
  remitente_id uuid NOT NULL,
  tipo text NOT NULL CHECK (tipo = ANY (ARRAY['texto'::text, 'audio'::text, 'imagen'::text])),
  contenido text CHECK (contenido IS NULL OR char_length(contenido) <= 2000),
  audio_url text,
  audio_duracion_segundos integer,
  estado text NOT NULL DEFAULT 'enviado'::text CHECK (estado = ANY (ARRAY['enviado'::text, 'recibido'::text, 'leido'::text])),
  recibido_en timestamp with time zone,
  leido_en timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  imagen_url text,
  CONSTRAINT mensajes_hablemos_pkey PRIMARY KEY (id),
  CONSTRAINT mensajes_hablemos_conversacion_id_fkey FOREIGN KEY (conversacion_id) REFERENCES public.conversaciones(id),
  CONSTRAINT mensajes_hablemos_remitente_id_fkey FOREIGN KEY (remitente_id) REFERENCES public.residentes(id)
);
CREATE TABLE public.agenda_recordatorios (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  residente_id uuid NOT NULL,
  organizacion_id uuid NOT NULL,
  creado_por uuid NOT NULL,
  titulo text NOT NULL,
  fecha date NOT NULL,
  hora time without time zone NOT NULL,
  estado text NOT NULL DEFAULT 'pendiente'::text CHECK (estado = ANY (ARRAY['pendiente'::text, 'realizado'::text, 'vencido'::text, 'cancelado'::text])),
  completado_en timestamp with time zone,
  notificacion_enviada boolean NOT NULL DEFAULT false,
  notificacion_enviada_en timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  grupo_id uuid,
  CONSTRAINT agenda_recordatorios_pkey PRIMARY KEY (id),
  CONSTRAINT agenda_recordatorios_residente_id_fkey FOREIGN KEY (residente_id) REFERENCES public.residentes(id),
  CONSTRAINT agenda_recordatorios_organizacion_id_fkey FOREIGN KEY (organizacion_id) REFERENCES public.organizaciones(id),
  CONSTRAINT agenda_recordatorios_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES public.residentes(id)
);
CREATE TABLE public.jardin_niveles_progreso (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organizacion_id uuid NOT NULL,
  residente_id uuid NOT NULL,
  nivel integer NOT NULL CHECK (nivel >= 1 AND nivel <= 120),
  estrellas integer NOT NULL CHECK (estrellas >= 1 AND estrellas <= 3),
  movimientos_usados integer NOT NULL CHECK (movimientos_usados >= 0),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT jardin_niveles_progreso_pkey PRIMARY KEY (id),
  CONSTRAINT jardin_niveles_progreso_organizacion_id_fkey FOREIGN KEY (organizacion_id) REFERENCES public.organizaciones(id),
  CONSTRAINT jardin_niveles_progreso_residente_id_fkey FOREIGN KEY (residente_id) REFERENCES public.residentes(id)
);
CREATE TABLE public.modulos (
  id text NOT NULL,
  nombre text NOT NULL,
  descripcion text,
  orden smallint NOT NULL DEFAULT 0,
  asignable boolean NOT NULL DEFAULT true,
  activo boolean NOT NULL DEFAULT true,
  CONSTRAINT modulos_pkey PRIMARY KEY (id)
);
CREATE TABLE public.modulo_usuario (
  usuario_id uuid NOT NULL,
  modulo_id text NOT NULL,
  puede_ver boolean NOT NULL DEFAULT false,
  puede_crear boolean NOT NULL DEFAULT false,
  puede_editar boolean NOT NULL DEFAULT false,
  puede_eliminar boolean NOT NULL DEFAULT false,
  updated_by uuid,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT modulo_usuario_pkey PRIMARY KEY (usuario_id, modulo_id),
  CONSTRAINT modulo_usuario_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.perfiles_usuario(id),
  CONSTRAINT modulo_usuario_modulo_id_fkey FOREIGN KEY (modulo_id) REFERENCES public.modulos(id)
);
CREATE TABLE public.grupos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organizacion_id uuid NOT NULL,
  nombre text NOT NULL,
  descripcion text,
  tipo text NOT NULL DEFAULT 'personalizado'::text CHECK (tipo = ANY (ARRAY['seccion'::text, 'personalizado'::text])),
  seccion USER-DEFINED,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT grupos_pkey PRIMARY KEY (id),
  CONSTRAINT grupos_organizacion_id_fkey FOREIGN KEY (organizacion_id) REFERENCES public.organizaciones(id)
);
CREATE TABLE public.grupo_residentes (
  grupo_id uuid NOT NULL,
  residente_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT grupo_residentes_pkey PRIMARY KEY (grupo_id, residente_id),
  CONSTRAINT grupo_residentes_grupo_id_fkey FOREIGN KEY (grupo_id) REFERENCES public.grupos(id),
  CONSTRAINT grupo_residentes_residente_id_fkey FOREIGN KEY (residente_id) REFERENCES public.residentes(id)
);
CREATE TABLE public.novedades (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organizacion_id uuid NOT NULL,
  titulo text NOT NULL CHECK (char_length(titulo) >= 1 AND char_length(titulo) <= 120),
  texto text NOT NULL CHECK (char_length(texto) >= 1 AND char_length(texto) <= 4000),
  imagen_url text,
  grupo_ids ARRAY,
  visible_hasta timestamp with time zone NOT NULL DEFAULT (now() + '1 mon'::interval),
  notificacion_id uuid,
  creado_por uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  publicar_en timestamp with time zone NOT NULL DEFAULT now(),
  es_borrador boolean NOT NULL DEFAULT false,
  fijada boolean NOT NULL DEFAULT false,
  categoria text NOT NULL DEFAULT 'general'::text CHECK (categoria = ANY (ARRAY['general'::text, 'evento'::text, 'salud'::text, 'comida'::text, 'cumpleanos'::text, 'visita'::text, 'aviso'::text])),
  fecha_evento timestamp with time zone,
  CONSTRAINT novedades_pkey PRIMARY KEY (id),
  CONSTRAINT novedades_organizacion_id_fkey FOREIGN KEY (organizacion_id) REFERENCES public.organizaciones(id),
  CONSTRAINT novedades_notificacion_id_fkey FOREIGN KEY (notificacion_id) REFERENCES public.notifications(id),
  CONSTRAINT novedades_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES auth.users(id)
);
CREATE TABLE public.novedad_lecturas (
  novedad_id uuid NOT NULL,
  residente_id uuid NOT NULL,
  leida_en timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT novedad_lecturas_pkey PRIMARY KEY (novedad_id, residente_id),
  CONSTRAINT novedad_lecturas_novedad_id_fkey FOREIGN KEY (novedad_id) REFERENCES public.novedades(id),
  CONSTRAINT novedad_lecturas_residente_id_fkey FOREIGN KEY (residente_id) REFERENCES public.residentes(id)
);
CREATE TABLE public.palabras_niveles_progreso (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organizacion_id uuid NOT NULL,
  residente_id uuid NOT NULL,
  nivel integer NOT NULL CHECK (nivel >= 1 AND nivel <= 300),
  pistas_usadas integer NOT NULL DEFAULT 0 CHECK (pistas_usadas >= 0),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT palabras_niveles_progreso_pkey PRIMARY KEY (id),
  CONSTRAINT palabras_niveles_progreso_organizacion_id_fkey FOREIGN KEY (organizacion_id) REFERENCES public.organizaciones(id),
  CONSTRAINT palabras_niveles_progreso_residente_id_fkey FOREIGN KEY (residente_id) REFERENCES public.residentes(id)
);
CREATE TABLE public.palabras_pistas (
  residente_id uuid NOT NULL,
  organizacion_id uuid NOT NULL,
  pistas integer NOT NULL DEFAULT 3 CHECK (pistas >= 0),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT palabras_pistas_pkey PRIMARY KEY (residente_id),
  CONSTRAINT palabras_pistas_residente_id_fkey FOREIGN KEY (residente_id) REFERENCES public.residentes(id),
  CONSTRAINT palabras_pistas_organizacion_id_fkey FOREIGN KEY (organizacion_id) REFERENCES public.organizaciones(id)
);
