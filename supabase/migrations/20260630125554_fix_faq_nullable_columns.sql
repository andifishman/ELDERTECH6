-- faq_asistente: permitir NULL en categoria y emoji para que el form
-- funcione cuando el usuario los deja en blanco
ALTER TABLE faq_asistente
  ALTER COLUMN categoria DROP NOT NULL,
  ALTER COLUMN emoji     DROP NOT NULL;
