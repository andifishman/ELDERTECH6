-- Rol / puesto de los empleados de Ledor Vador (sección 'EMPLEADO LEDOR VADOR').
-- Texto libre que se carga desde el backoffice al crear o editar el usuario
-- (ej. "Enfermera", "Cocina", "Recepción"). Para residentes queda en null.
alter table public.residentes
  add column if not exists rol_empleado text;

comment on column public.residentes.rol_empleado is
  'Puesto del empleado de Ledor Vador (solo sección EMPLEADO LEDOR VADOR). Null para residentes.';
