-- Nuevo valor del enum de secciones para dar de alta empleados de Ledor
-- Vador (staff), no solo residentes por piso/sección física.
--
-- ALTER TYPE ... ADD VALUE no puede usarse en la misma transacción en la que
-- se inserta una fila con ese valor — por eso el grupo correspondiente se crea
-- en una migración aparte (20261009120500), igual que se documentó al agregar
-- 'grupo' a destino_tipo_enum.
alter type public.seccion_enum add value if not exists 'EMPLEADO LEDOR VADOR';
