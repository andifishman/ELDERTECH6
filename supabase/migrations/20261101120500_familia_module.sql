-- ============================================================
-- ElderTech — App de familiares
--
-- Un familiar es un usuario de Supabase Auth con perfiles_usuario.rol = 'familiar'
-- y una fila en `familiares`. Ve SOLO lo del/los residente(s) a los que el
-- personal lo vincula (`vinculos_familiares`), y el contenido general de su
-- institución (avisos, eventos, documentos, fotos, noticias).
--
-- Todo pasa por el backend con service_role (que saltea RLS): el aislamiento
-- real está en `requireFamiliar` + los filtros por organizacion_id de cada
-- repositorio. Estas políticas son la red de seguridad por si algo usa la anon
-- key directo: SOLO admin/staff — a propósito NADA para el rol familiar (los
-- familiares también son "authenticated", así que nunca `TO authenticated
-- USING (true)`).
-- ============================================================

-- ─── Familiares y vínculos ──────────────────────────────────────────────────
create table if not exists public.familiares (
  id              uuid primary key references public.perfiles_usuario(id) on delete cascade,
  organizacion_id uuid not null references public.organizaciones(id) on delete cascade,
  nombre          text not null check (char_length(trim(nombre)) between 1 and 80),
  apellido        text not null check (char_length(trim(apellido)) between 1 and 80),
  email           text not null,
  telefono        text,
  activo          boolean not null default true,
  invitado_en     timestamptz,
  ultimo_acceso   timestamptz,
  creado_por      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create unique index if not exists idx_familiares_email_unico on public.familiares (lower(email));
create index if not exists idx_familiares_organizacion on public.familiares (organizacion_id);

create trigger trg_familiares_updated_at before update on public.familiares
for each row execute function public.set_updated_at();

create table if not exists public.vinculos_familiares (
  id              uuid primary key default gen_random_uuid(),
  organizacion_id uuid not null references public.organizaciones(id) on delete cascade,
  familiar_id     uuid not null references public.familiares(id) on delete cascade,
  residente_id    uuid not null references public.residentes(id) on delete cascade,
  parentesco      text check (parentesco is null or char_length(parentesco) <= 60),
  activo          boolean not null default true,
  creado_por      uuid references auth.users(id) on delete set null,
  revocado_por    uuid references auth.users(id) on delete set null,
  revocado_en     timestamptz,
  created_at      timestamptz not null default now(),
  unique (familiar_id, residente_id)
);

create index if not exists idx_vinculos_residente on public.vinculos_familiares (residente_id) where activo;
create index if not exists idx_vinculos_familiar on public.vinculos_familiares (familiar_id) where activo;

-- El familiar, el residente y el vínculo tienen que ser de la MISMA institución.
create or replace function public.vinculo_familiar_misma_organizacion()
returns trigger language plpgsql as $$
begin
  if not exists (select 1 from public.familiares f where f.id = new.familiar_id and f.organizacion_id = new.organizacion_id)
     or not exists (select 1 from public.residentes r where r.id = new.residente_id and r.organizacion_id = new.organizacion_id) then
    raise exception 'El familiar y el residente tienen que ser de la misma institución del vínculo';
  end if;
  return new;
end;
$$;

create trigger trg_vinculo_misma_organizacion before insert or update of familiar_id, residente_id, organizacion_id
on public.vinculos_familiares for each row execute function public.vinculo_familiar_misma_organizacion();

-- ─── Mensajes familiar ↔ residente (un hilo por vínculo) ────────────────────
create table if not exists public.familia_mensajes (
  id           uuid primary key default gen_random_uuid(),
  vinculo_id   uuid not null references public.vinculos_familiares(id) on delete cascade,
  autor        text not null check (autor in ('familiar', 'residente')),
  contenido    text check (contenido is null or char_length(contenido) between 1 and 2000),
  imagen_path  text,
  leido_en     timestamptz,
  created_at   timestamptz not null default now(),
  constraint familia_mensajes_con_contenido check (contenido is not null or imagen_path is not null)
);

create index if not exists idx_familia_mensajes_hilo on public.familia_mensajes (vinculo_id, created_at desc);
create index if not exists idx_familia_mensajes_sin_leer on public.familia_mensajes (vinculo_id, autor) where leido_en is null;

-- ─── Consultas, solicitudes, sugerencias y reclamos ─────────────────────────
create table if not exists public.familia_categorias (
  id              uuid primary key default gen_random_uuid(),
  organizacion_id uuid not null references public.organizaciones(id) on delete cascade,
  nombre          text not null check (char_length(trim(nombre)) between 1 and 60),
  activa          boolean not null default true,
  orden           smallint not null default 0,
  created_at      timestamptz not null default now()
);

create unique index if not exists idx_familia_categorias_nombre on public.familia_categorias (organizacion_id, lower(nombre));

create table if not exists public.familia_casos (
  id              uuid primary key default gen_random_uuid(),
  organizacion_id uuid not null references public.organizaciones(id) on delete cascade,
  familiar_id     uuid not null references public.familiares(id) on delete cascade,
  residente_id    uuid references public.residentes(id) on delete set null,
  tipo            text not null check (tipo in ('consulta', 'sugerencia', 'reclamo')),
  categoria_id    uuid references public.familia_categorias(id) on delete set null,
  asunto          text not null check (char_length(trim(asunto)) between 1 and 120),
  descripcion     text not null check (char_length(trim(descripcion)) between 1 and 4000),
  estado          text not null default 'pendiente' check (estado in ('pendiente', 'en_proceso', 'resuelta')),
  resuelto_por    uuid references auth.users(id) on delete set null,
  resuelto_en     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_familia_casos_org on public.familia_casos (organizacion_id, estado, created_at desc);
create index if not exists idx_familia_casos_familiar on public.familia_casos (familiar_id, created_at desc);

create trigger trg_familia_casos_updated_at before update on public.familia_casos
for each row execute function public.set_updated_at();

create table if not exists public.familia_caso_mensajes (
  id         uuid primary key default gen_random_uuid(),
  caso_id    uuid not null references public.familia_casos(id) on delete cascade,
  autor      text not null check (autor in ('familiar', 'personal')),
  autor_id   uuid,
  texto      text not null check (char_length(trim(texto)) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index if not exists idx_familia_caso_mensajes on public.familia_caso_mensajes (caso_id, created_at);

-- ─── Avisos con confirmación de lectura ─────────────────────────────────────
create table if not exists public.familia_avisos (
  id              uuid primary key default gen_random_uuid(),
  organizacion_id uuid not null references public.organizaciones(id) on delete cascade,
  titulo          text not null check (char_length(trim(titulo)) between 1 and 120),
  texto           text not null check (char_length(trim(texto)) between 1 and 4000),
  importante      boolean not null default false,
  publicar_en     timestamptz not null default now(),
  creado_por      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_familia_avisos_org on public.familia_avisos (organizacion_id, publicar_en desc);

create trigger trg_familia_avisos_updated_at before update on public.familia_avisos
for each row execute function public.set_updated_at();

create table if not exists public.familia_aviso_lecturas (
  aviso_id    uuid not null references public.familia_avisos(id) on delete cascade,
  familiar_id uuid not null references public.familiares(id) on delete cascade,
  leido_en    timestamptz not null default now(),
  primary key (aviso_id, familiar_id)
);

create index if not exists idx_familia_aviso_lecturas_familiar on public.familia_aviso_lecturas (familiar_id);

-- ─── Eventos abiertos a las familias (calendario + inscripción) ─────────────
create table if not exists public.familia_eventos (
  id                  uuid primary key default gen_random_uuid(),
  organizacion_id     uuid not null references public.organizaciones(id) on delete cascade,
  titulo              text not null check (char_length(trim(titulo)) between 1 and 120),
  descripcion         text check (descripcion is null or char_length(descripcion) <= 2000),
  lugar               text check (lugar is null or char_length(lugar) <= 120),
  inicia_en           timestamptz not null,
  termina_en          timestamptz,
  abierto_inscripcion boolean not null default false,
  cupo                integer check (cupo is null or cupo > 0),
  creado_por          uuid references auth.users(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint familia_eventos_fechas check (termina_en is null or termina_en >= inicia_en)
);

create index if not exists idx_familia_eventos_org on public.familia_eventos (organizacion_id, inicia_en);

create trigger trg_familia_eventos_updated_at before update on public.familia_eventos
for each row execute function public.set_updated_at();

create table if not exists public.familia_evento_inscripciones (
  evento_id   uuid not null references public.familia_eventos(id) on delete cascade,
  familiar_id uuid not null references public.familiares(id) on delete cascade,
  personas    integer not null default 1 check (personas between 1 and 10),
  created_at  timestamptz not null default now(),
  primary key (evento_id, familiar_id)
);

-- ─── Tablón de documentos generales ─────────────────────────────────────────
create table if not exists public.familia_documentos (
  id              uuid primary key default gen_random_uuid(),
  organizacion_id uuid not null references public.organizaciones(id) on delete cascade,
  titulo          text not null check (char_length(trim(titulo)) between 1 and 120),
  descripcion     text check (descripcion is null or char_length(descripcion) <= 500),
  archivo_path    text not null,
  nombre_archivo  text not null,
  mime            text not null,
  tamano_bytes    integer not null,
  creado_por      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now()
);

create index if not exists idx_familia_documentos_org on public.familia_documentos (organizacion_id, created_at desc);

-- ─── Fotos de actividades ───────────────────────────────────────────────────
-- Un álbum = una actividad con varias fotos (el carrusel). `publicado_en` null =
-- borrador: NADA se muestra a las familias hasta que el personal lo publica.
-- `residente_ids` queda reservado para el consentimiento de imagen por residente
-- (hoy no se usa para filtrar: las fotos publicadas las ven todas las familias).
create table if not exists public.familia_albumes (
  id              uuid primary key default gen_random_uuid(),
  organizacion_id uuid not null references public.organizaciones(id) on delete cascade,
  titulo          text not null check (char_length(trim(titulo)) between 1 and 120),
  actividad       text check (actividad is null or char_length(actividad) <= 120),
  fecha           date not null default current_date,
  residente_ids   uuid[] not null default '{}',
  publicado_en    timestamptz,
  creado_por      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_familia_albumes_org on public.familia_albumes (organizacion_id, publicado_en desc);

create trigger trg_familia_albumes_updated_at before update on public.familia_albumes
for each row execute function public.set_updated_at();

create table if not exists public.familia_fotos (
  id              uuid primary key default gen_random_uuid(),
  album_id        uuid not null references public.familia_albumes(id) on delete cascade,
  organizacion_id uuid not null references public.organizaciones(id) on delete cascade,
  imagen_path     text not null,
  orden           integer not null default 0,
  created_at      timestamptz not null default now()
);

create index if not exists idx_familia_fotos_album on public.familia_fotos (album_id, orden);

create table if not exists public.familia_foto_reacciones (
  foto_id     uuid not null references public.familia_fotos(id) on delete cascade,
  familiar_id uuid not null references public.familiares(id) on delete cascade,
  tipo        text not null check (tipo in ('corazon', 'me_gusta', 'abrazo')),
  created_at  timestamptz not null default now(),
  primary key (foto_id, familiar_id)
);

create table if not exists public.familia_foto_comentarios (
  id              uuid primary key default gen_random_uuid(),
  foto_id         uuid not null references public.familia_fotos(id) on delete cascade,
  organizacion_id uuid not null references public.organizaciones(id) on delete cascade,
  familiar_id     uuid not null references public.familiares(id) on delete cascade,
  texto           text not null check (char_length(trim(texto)) between 1 and 500),
  eliminado_en    timestamptz,
  eliminado_por   uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now()
);

create index if not exists idx_familia_foto_comentarios on public.familia_foto_comentarios (foto_id, created_at);

-- ─── Propuestas de actividades o talleres ───────────────────────────────────
create table if not exists public.familia_propuestas (
  id              uuid primary key default gen_random_uuid(),
  organizacion_id uuid not null references public.organizaciones(id) on delete cascade,
  familiar_id     uuid not null references public.familiares(id) on delete cascade,
  tipo            text not null check (tipo in ('proponer', 'ofrecerse')),
  titulo          text not null check (char_length(trim(titulo)) between 1 and 120),
  descripcion     text not null check (char_length(trim(descripcion)) between 1 and 2000),
  estado          text not null default 'pendiente' check (estado in ('pendiente', 'en_revision', 'aceptada', 'no_posible')),
  respuesta       text check (respuesta is null or char_length(respuesta) <= 2000),
  respondido_por  uuid references auth.users(id) on delete set null,
  respondido_en   timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_familia_propuestas_org on public.familia_propuestas (organizacion_id, estado, created_at desc);

create trigger trg_familia_propuestas_updated_at before update on public.familia_propuestas
for each row execute function public.set_updated_at();

-- ─── Novedades: las que el personal marca "para familias" también las ven ellas
alter table public.novedades add column if not exists para_familias boolean not null default false;

-- ─── Storage: buckets PRIVADOS (el backend firma URLs de corta duración) ────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('familia-mensajes',   'familia-mensajes',   false, 5242880,  array['image/jpeg', 'image/png', 'image/webp']),
  ('familia-fotos',      'familia-fotos',      false, 10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('familia-documentos', 'familia-documentos', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- ─── RLS: solo admin/staff (red de seguridad; el backend usa service_role) ──
do $$
declare t text;
begin
  foreach t in array array[
    'familiares', 'vinculos_familiares', 'familia_mensajes', 'familia_categorias', 'familia_casos',
    'familia_caso_mensajes', 'familia_avisos', 'familia_aviso_lecturas', 'familia_eventos',
    'familia_evento_inscripciones', 'familia_documentos', 'familia_albumes', 'familia_fotos',
    'familia_foto_reacciones', 'familia_foto_comentarios', 'familia_propuestas'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_admin_all', t);
    execute format(
      'create policy %I on public.%I for all using (public.auth_es_admin_o_staff()) with check (public.auth_es_admin_o_staff())',
      t || '_admin_all', t
    );
  end loop;
end $$;

-- ─── Módulos de permisos del backoffice ─────────────────────────────────────
insert into public.modulos (id, nombre, descripcion, orden, asignable) values
  ('familiares',          'Familiares',               'Alta de familiares y vínculos con los residentes', 12, true),
  ('familia_comunicacion','Familias · Comunicación',  'Consultas, reclamos, sugerencias y propuestas de las familias', 13, true),
  ('familia_contenido',   'Familias · Contenido',     'Avisos, eventos, documentos y fotos para las familias', 14, true)
on conflict (id) do nothing;

-- Los administradores (rol admin) existentes reciben los módulos nuevos completos.
-- El staff ("editor") queda sin ellos: se los da el Super Admin desde Accesos.
insert into public.modulo_usuario (usuario_id, modulo_id, puede_ver, puede_crear, puede_editar, puede_eliminar)
select p.id, m.id, true, true, true, true
from public.perfiles_usuario p
cross join public.modulos m
where p.rol = 'admin' and m.id in ('familiares', 'familia_comunicacion', 'familia_contenido')
on conflict (usuario_id, modulo_id) do nothing;

-- ─── Categorías de consulta por defecto para cada institución ───────────────
insert into public.familia_categorias (organizacion_id, nombre, orden)
select o.id, c.nombre, c.orden
from public.organizaciones o
cross join (values ('Consulta general', 1), ('Pedido', 2), ('Administración', 3), ('Otro', 4)) as c(nombre, orden)
on conflict do nothing;

-- ─── Inscripción a eventos, atómica ─────────────────────────────────────────
-- Bloquea la fila del evento mientras cuenta el cupo, así dos familias que se anotan
-- al mismo tiempo no pueden pasarse del cupo. Devuelve 'ok' | 'sin_cupo' | 'cerrado'.
create or replace function public.familia_inscribir_evento(p_evento uuid, p_familiar uuid, p_personas integer)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_evento public.familia_eventos%rowtype;
  v_otros integer;
begin
  select * into v_evento from public.familia_eventos where id = p_evento for update;
  if not found or not v_evento.abierto_inscripcion or v_evento.inicia_en < now() then
    return 'cerrado';
  end if;
  if v_evento.cupo is not null then
    select coalesce(sum(personas), 0) into v_otros
    from public.familia_evento_inscripciones where evento_id = p_evento and familiar_id <> p_familiar;
    if v_otros + p_personas > v_evento.cupo then
      return 'sin_cupo';
    end if;
  end if;
  insert into public.familia_evento_inscripciones (evento_id, familiar_id, personas)
  values (p_evento, p_familiar, p_personas)
  on conflict (evento_id, familiar_id) do update set personas = excluded.personas;
  return 'ok';
end;
$$;

-- Solo el backend (service_role) la llama: nadie más debe poder ejecutarla.
revoke execute on function public.familia_inscribir_evento(uuid, uuid, integer) from public, anon, authenticated;
