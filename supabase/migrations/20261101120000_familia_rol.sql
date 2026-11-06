-- Rol "familiar" para la app de familiares.
--
-- ALTER TYPE ... ADD VALUE no puede usarse en la misma transacción en la que se
-- referencia el valor nuevo — por eso va solo, y el módulo (20261101120500) se
-- aplica después. Mismo criterio que 20261009120000_seccion_empleado.sql.
alter type public.rol_usuario_enum add value if not exists 'familiar';
