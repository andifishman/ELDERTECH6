-- Enum de secciones del geriátrico (reemplaza al concepto libre de "piso")
create type public.seccion_enum as enum (
  '1 AC', '1 B', '1 FRAGA',
  '2 AC', '2 B', '2 MODERADO', '2 REHABILITACION',
  '3 AC', '3B',
  'BAIT'
);

-- residentes: agregar seccion + dni, quitar piso/email/foto_url
alter table public.residentes add column seccion public.seccion_enum;
alter table public.residentes add column dni text;

update public.residentes set seccion = '1 AC'::public.seccion_enum where piso = '1';
update public.residentes set seccion = '2 AC'::public.seccion_enum where piso = '2';
update public.residentes set seccion = '3 AC'::public.seccion_enum where piso = '3';

alter table public.residentes drop column piso;
alter table public.residentes drop column email;
alter table public.residentes drop column foto_url;

-- actividades: pisos_objetivo -> secciones_objetivo (se limpia: el mapeo viejo de piso no es
-- equivalente a una sección específica, así que se resetea a "para todos" y el admin
-- reconfigura la segmentación por sección desde el backoffice)
update public.actividades set pisos_objetivo = null where pisos_objetivo is not null;
alter table public.actividades rename column pisos_objetivo to secciones_objetivo;

-- register_user / checkUsername ya no se usan (el alta ahora es admin-only vía Edge Function),
-- pero se dejan las funciones existentes intactas por compatibilidad histórica.
