-- Grupo "seccion" correspondiente al nuevo valor 'EMPLEADO LEDOR VADOR' del
-- enum (ver 20261009120000) — mismo patrón que el resto de los grupos base
-- de sección creados en 20261005140000_grupos_module.sql.
insert into public.grupos (organizacion_id, nombre, descripcion, tipo, seccion)
select o.id, 'EMPLEADOS', 'Empleados de Ledor Vador', 'seccion', 'EMPLEADO LEDOR VADOR'::public.seccion_enum
from public.organizaciones o
on conflict (organizacion_id, nombre) do nothing;

-- Backfill por si ya hay residentes con esa sección cargada antes de que
-- existiera el grupo (no debería pasar en el orden normal, pero es gratis).
insert into public.grupo_residentes (grupo_id, residente_id)
select g.id, r.id
from public.residentes r
join public.grupos g
  on g.organizacion_id = r.organizacion_id
 and g.tipo = 'seccion'
 and g.seccion = r.seccion
where r.seccion = 'EMPLEADO LEDOR VADOR'::public.seccion_enum
on conflict (grupo_id, residente_id) do nothing;
