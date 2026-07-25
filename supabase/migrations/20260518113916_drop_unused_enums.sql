-- Se eliminan junto con sus tablas
DROP TYPE IF EXISTS unidad_temperatura_enum CASCADE;
DROP TYPE IF EXISTS rol_usuario_enum CASCADE;
DROP TYPE IF EXISTS tipo_articulo_enum CASCADE;
DROP TYPE IF EXISTS nivel_articulo_enum CASCADE;

-- Se mantienen:
-- nivel_dificultad_enum → residentes.nivel_dificultad
-- fuente_radio_enum     → radios.fuente
-- tipo_evento_enum      → eventos_personales.tipo
