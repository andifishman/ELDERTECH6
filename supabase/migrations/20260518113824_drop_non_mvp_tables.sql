-- Chatbot (feature futura, no está en DER)
DROP TABLE IF EXISTS historial_chatbot CASCADE;
DROP TABLE IF EXISTS sesiones_chatbot CASCADE;

-- Artículos (no está en DER)
DROP TABLE IF EXISTS articulos CASCADE;
DROP TABLE IF EXISTS categorias_articulo CASCADE;

-- Contactos (no está en DER)
DROP TABLE IF EXISTS contactos CASCADE;
DROP TABLE IF EXISTS tipos_contacto CASCADE;

-- Auth profiles (no está en DER)
DROP TABLE IF EXISTS perfiles_usuario CASCADE;

-- Habitaciones (se reemplaza por campo texto en residentes)
DROP TABLE IF EXISTS habitaciones CASCADE;
