-- ============================================================
-- ElderTech — Tutoriales para usar la app
-- Categoría: "Conocé ElderTech"
-- 8 guías paso a paso para que los residentes aprendan a usar la app
-- Fecha: 2026-06-19
-- ============================================================

DO $migration$
DECLARE
  cat_eldertech uuid;

  t_inicio     uuid;
  t_horarios   uuid;
  t_llamar     uuid;
  t_contactos  uuid;
  t_asistente  uuid;
  t_radio      uuid;
  t_clima      uuid;
  t_ajustes    uuid;
BEGIN

-- ─── Categoría ────────────────────────────────────────────────────────────────
INSERT INTO categorias_tutorial (nombre, emoji, orden)
VALUES ('Conocé ElderTech', '📱', 8)
ON CONFLICT (nombre) DO UPDATE SET emoji = EXCLUDED.emoji, orden = EXCLUDED.orden
RETURNING id INTO cat_eldertech;


-- ═══════════════════════════════════════════════════════════════════════════════
-- TUTORIAL 1: Pantalla de Inicio
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO tutoriales (
  categoria_id, titulo, descripcion, formato,
  duracion_segundos, orden, activo, lo_que_aprenderas
) VALUES (
  cat_eldertech,
  'Cómo navegar en ElderTech',
  'Conocé la pantalla principal de la app y aprendé a moverte entre las diferentes secciones.',
  'guia', 180, 100, true,
  ARRAY[
    'Qué hace cada botón de la pantalla principal',
    'Cómo ir a Horarios, Llamadas, Tutoriales y más',
    'Cómo volver a la pantalla de inicio desde cualquier lugar'
  ]
) RETURNING id INTO t_inicio;

INSERT INTO pasos_tutorial (tutorial_id, orden, titulo, descripcion, tip) VALUES
  (t_inicio, 1, 'La pantalla de inicio',
   'Cuando abrís ElderTech, lo primero que ves es la pantalla de inicio. Tiene botones grandes y de colores para que sean fáciles de tocar.',
   NULL),
  (t_inicio, 2, 'Botón rojo: Horarios del Día',
   'El botón rojo grande de arriba te lleva a los horarios y actividades del día: el desayuno, el almuerzo, los talleres y mucho más.',
   'Este es el botón que vas a usar más seguido todos los días.'),
  (t_inicio, 3, 'Botón verde: Llamar',
   'El botón verde te lleva a tu lista de contactos. Desde ahí podés llamar a tus familiares o amigos.',
   NULL),
  (t_inicio, 4, 'Botón morado: Tutoriales',
   'El botón morado te lleva a los tutoriales, donde podés aprender a usar el celular y la app paso a paso.',
   NULL),
  (t_inicio, 5, 'Botón azul: Asistente',
   'El botón azul abre el Asistente, un robot inteligente que responde tus preguntas sobre el celular, la app, el clima, cocina, historia y mucho más.',
   NULL),
  (t_inicio, 6, 'Botón naranja: Más',
   'El botón naranja "Más" abre opciones extras: Radio en vivo, Clima y Ajustes de la app.',
   NULL),
  (t_inicio, 7, 'Cómo volver al inicio',
   'Si estás en cualquier pantalla y querés volver, tocá la flecha ← que aparece arriba a la izquierda. Siempre te lleva a la pantalla anterior.',
   'Podés tocar la flecha ← varias veces seguidas hasta llegar al inicio.');


-- ═══════════════════════════════════════════════════════════════════════════════
-- TUTORIAL 2: Horarios del Día
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO tutoriales (
  categoria_id, titulo, descripcion, formato,
  duracion_segundos, orden, activo, lo_que_aprenderas
) VALUES (
  cat_eldertech,
  'Cómo ver los horarios del día',
  'Consultá las actividades de la residencia: el desayuno, el almuerzo, los talleres, la gimnasia y todo lo que hay programado.',
  'guia', 150, 101, true,
  ARRAY[
    'Cómo ver las actividades de hoy',
    'Cómo cambiar al día que querés consultar',
    'Cómo ver todos los detalles de una actividad'
  ]
) RETURNING id INTO t_horarios;

INSERT INTO pasos_tutorial (tutorial_id, orden, titulo, descripcion, tip) VALUES
  (t_horarios, 1, 'Abrí los Horarios',
   'Desde la pantalla de inicio, tocá el botón rojo grande "Horarios del Día".',
   NULL),
  (t_horarios, 2, 'Ves las actividades de hoy',
   'Se abre una lista con todas las actividades del día de hoy, ordenadas por horario, de la más temprana a la más tardía.',
   NULL),
  (t_horarios, 3, 'Cambiá el día',
   'En la parte de arriba hay una fila con los días de la semana. Tocá el día que querés ver para cambiar la lista de actividades.',
   NULL),
  (t_horarios, 4, 'Ver los detalles de una actividad',
   'Cada actividad tiene una tarjeta con el nombre y la hora. Tocá el botón "Ver más" para ver toda la información de esa actividad.',
   NULL),
  (t_horarios, 5, 'Qué vas a encontrar en los detalles',
   'En el detalle vas a ver: el lugar donde se hace la actividad, una descripción de qué se hace, y el nombre del responsable.',
   NULL),
  (t_horarios, 6, 'Escuchá la información',
   'En el detalle de cualquier actividad, tocá el botón "Escuchar" para que la app te lea la información en voz alta.',
   'Muy útil si la letra te queda chica o si preferís escuchar antes que leer.');


-- ═══════════════════════════════════════════════════════════════════════════════
-- TUTORIAL 3: Llamar a un familiar
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO tutoriales (
  categoria_id, titulo, descripcion, formato,
  duracion_segundos, orden, activo, lo_que_aprenderas
) VALUES (
  cat_eldertech,
  'Cómo llamar a un familiar',
  'Usá ElderTech para comunicarte con tus seres queridos de forma rápida y sencilla, por llamada o por WhatsApp.',
  'guia', 150, 102, true,
  ARRAY[
    'Cómo ver tu lista de contactos en ElderTech',
    'Cómo hacer una llamada de teléfono',
    'Cómo enviar un mensaje por WhatsApp'
  ]
) RETURNING id INTO t_llamar;

INSERT INTO pasos_tutorial (tutorial_id, orden, titulo, descripcion, tip) VALUES
  (t_llamar, 1, 'Abrí la pantalla Llamar',
   'Desde la pantalla de inicio, tocá el botón verde "Llamar".',
   NULL),
  (t_llamar, 2, 'Ves tu lista de contactos',
   'Se muestra la lista de personas que podés contactar desde ElderTech. Cada persona tiene su foto y nombre.',
   'Las personas que marcaste como favoritas aparecen primero en la lista.'),
  (t_llamar, 3, 'Elegí a quien querés contactar',
   'Tocá la tarjeta de la persona con quien querés comunicarte. Se abre la pantalla de ese contacto.',
   NULL),
  (t_llamar, 4, 'Hacé una llamada de teléfono',
   'Tocá el botón verde grande "Llamar" para iniciar una llamada de teléfono. Se abre la app de llamadas del celular automáticamente.',
   NULL),
  (t_llamar, 5, 'Mandá un mensaje por WhatsApp',
   'Si la persona tiene WhatsApp disponible, también vas a ver un botón de WhatsApp. Tocalo para abrir una conversación y escribirle.',
   'Para que funcione, la otra persona también tiene que tener WhatsApp instalado en su celular.');


-- ═══════════════════════════════════════════════════════════════════════════════
-- TUTORIAL 4: Agregar un contacto
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO tutoriales (
  categoria_id, titulo, descripcion, formato,
  duracion_segundos, orden, activo, lo_que_aprenderas
) VALUES (
  cat_eldertech,
  'Cómo agregar un contacto',
  'Agregá a tus familiares y amigos a la lista de ElderTech importándolos desde los contactos de tu celular.',
  'guia', 180, 103, true,
  ARRAY[
    'Cómo importar un contacto del celular a ElderTech',
    'Cómo dar permiso para acceder a los contactos del teléfono',
    'Qué pasa si el contacto ya está en la lista'
  ]
) RETURNING id INTO t_contactos;

INSERT INTO pasos_tutorial (tutorial_id, orden, titulo, descripcion, tip) VALUES
  (t_contactos, 1, 'Abrí la pantalla Llamar',
   'Desde el inicio, tocá el botón verde "Llamar".',
   NULL),
  (t_contactos, 2, 'Tocá Agregar contacto',
   'En la parte de arriba de la pantalla hay un botón verde que dice "Agregar contacto". Tocalo.',
   NULL),
  (t_contactos, 3, 'Dar permiso al celular',
   'La primera vez que usás esta función, el celular te pide permiso para acceder a tus contactos. Tocá "Permitir" para continuar.',
   'Este permiso solo se pide una vez. Después no te vuelve a preguntar.'),
  (t_contactos, 4, 'Buscá a la persona',
   'Se abre una lista con todos los contactos guardados en tu celular. Buscá el nombre de la persona que querés agregar.',
   'Podés desplazarte hacia abajo para ver más contactos.'),
  (t_contactos, 5, 'Tocá el nombre de la persona',
   'Cuando encontrés a quien buscás, tocá su nombre. La persona queda agregada a tu lista de ElderTech.',
   NULL),
  (t_contactos, 6, 'El contacto ya apareció',
   'Volvés a la pantalla de Llamar y ya podés ver a la persona en tu lista. Tocá su tarjeta para llamarla.',
   NULL),
  (t_contactos, 7, 'Si el contacto ya existe',
   'Si esa persona ya estaba en tu lista, ElderTech te avisa con un mensaje "Contacto duplicado". No se agrega dos veces.',
   NULL);


-- ═══════════════════════════════════════════════════════════════════════════════
-- TUTORIAL 5: El Asistente con IA
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO tutoriales (
  categoria_id, titulo, descripcion, formato,
  duracion_segundos, orden, activo, lo_que_aprenderas
) VALUES (
  cat_eldertech,
  'Cómo usar el Asistente',
  'El Asistente es un robot inteligente que responde tus preguntas sobre el celular, la app, el clima, la historia, recetas y mucho más.',
  'guia', 240, 104, true,
  ARRAY[
    'Cómo hacerle una pregunta al Asistente',
    'Cómo usar el micrófono para hablarle en vez de escribir',
    'Cómo escuchar y guardar las respuestas',
    'Cómo ver el historial de conversaciones anteriores'
  ]
) RETURNING id INTO t_asistente;

INSERT INTO pasos_tutorial (tutorial_id, orden, titulo, descripcion, tip) VALUES
  (t_asistente, 1, 'Abrí el Asistente',
   'Desde la pantalla de inicio, tocá el botón azul "Asistente".',
   NULL),
  (t_asistente, 2, 'Preguntas frecuentes',
   'En la pantalla del Asistente ves botones con preguntas comunes como "¿Cómo mando un mensaje por WhatsApp?". Tocá cualquiera para hacer esa pregunta directamente, sin tener que escribir.',
   NULL),
  (t_asistente, 3, 'Escribí tu propia pregunta',
   'En el campo de texto de abajo podés escribir lo que quieras preguntar: cómo usar una app, qué tiempo hace, una receta de cocina, un hecho histórico... ¡cualquier cosa!',
   NULL),
  (t_asistente, 4, 'Enviá la pregunta',
   'Cuando terminés de escribir, tocá el botón con la flecha → para enviar. Aparece un mensaje "Pensando una respuesta..." mientras el robot procesa tu pregunta.',
   'El Asistente responde en unos pocos segundos.'),
  (t_asistente, 5, 'Usá el micrófono en vez de escribir',
   'Si preferís hablar, tocá el ícono del micrófono 🎤 al lado del campo de texto. Hablá tu pregunta claramente. Cuando terminés, la pregunta se envía sola.',
   'Hablá despacio y a una distancia normal del celular para que te entienda bien.'),
  (t_asistente, 6, 'Escuchá la respuesta',
   'Cuando el Asistente te responde, tocá el botón "Escuchar" para que lea la respuesta en voz alta. Muy útil para no tener que leer texto en pantalla.',
   NULL),
  (t_asistente, 7, 'Guardá la respuesta',
   'Si la respuesta te resultó útil, tocá el botón "Guardar" (el ícono de estrella). La respuesta queda guardada para que puedas volver a verla cuando quieras.',
   NULL),
  (t_asistente, 8, 'Ver conversaciones guardadas',
   'Tocá el ícono de reloj 🕐 que está arriba a la derecha para ver todas tus conversaciones anteriores y las respuestas que guardaste como favoritas.',
   NULL),
  (t_asistente, 9, 'Seguir una conversación',
   'Si querés seguir hablando de lo mismo, simplemente seguí escribiendo o hablando en la misma pantalla. El Asistente recuerda lo que hablaron antes.',
   NULL);


-- ═══════════════════════════════════════════════════════════════════════════════
-- TUTORIAL 6: Radio en vivo
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO tutoriales (
  categoria_id, titulo, descripcion, formato,
  duracion_segundos, orden, activo, lo_que_aprenderas
) VALUES (
  cat_eldertech,
  'Cómo escuchar la radio',
  'Encontrá tus emisoras favoritas y escuchalas directamente desde ElderTech, sin publicidades ni complicaciones.',
  'guia', 150, 105, true,
  ARRAY[
    'Cómo acceder a la lista de emisoras',
    'Cómo reproducir y pausar una radio',
    'Cómo cambiar de emisora'
  ]
) RETURNING id INTO t_radio;

INSERT INTO pasos_tutorial (tutorial_id, orden, titulo, descripcion, tip) VALUES
  (t_radio, 1, 'Abrí el menú Más',
   'Desde la pantalla de inicio, tocá el botón naranja "Más".',
   NULL),
  (t_radio, 2, 'Elegí Radio',
   'Se abre un menú con opciones. Tocá el botón "Radio".',
   NULL),
  (t_radio, 3, 'Lista de emisoras',
   'Ves una lista de emisoras de radio, organizadas por país. Podés desplazarte hacia abajo para ver todas las opciones disponibles.',
   NULL),
  (t_radio, 4, 'Reproducir una emisora',
   'Cuando encontrés la radio que querés escuchar, tocá el botón verde "Reproducir" que está al lado del nombre.',
   NULL),
  (t_radio, 5, 'La radio está sonando',
   'La emisora empieza a sonar. En la parte inferior de la pantalla aparece una barra con el nombre de lo que estás escuchando.',
   'La radio sigue sonando aunque vayas a ver horarios, contactos u otras partes de la app.'),
  (t_radio, 6, 'Pausar y retomar',
   'Para pausar la radio, tocá el botón de pausa ⏸ en la barra de abajo. Para seguir escuchando, tocá el botón de reproducción ▶.',
   NULL),
  (t_radio, 7, 'Cambiar de emisora',
   'Para escuchar otra radio, tocá el botón "Reproducir" de otra emisora de la lista. La nueva reemplaza a la que estabas escuchando.',
   NULL);


-- ═══════════════════════════════════════════════════════════════════════════════
-- TUTORIAL 7: Clima
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO tutoriales (
  categoria_id, titulo, descripcion, formato,
  duracion_segundos, orden, activo, lo_que_aprenderas
) VALUES (
  cat_eldertech,
  'Cómo ver el pronóstico del clima',
  'Consultá la temperatura actual y el pronóstico para los próximos días sin salir de ElderTech.',
  'guia', 120, 106, true,
  ARRAY[
    'Cómo ver la temperatura y el tiempo de hoy',
    'Cómo ver el pronóstico para los próximos 7 días',
    'Cómo actualizar la información del clima'
  ]
) RETURNING id INTO t_clima;

INSERT INTO pasos_tutorial (tutorial_id, orden, titulo, descripcion, tip) VALUES
  (t_clima, 1, 'Abrí el menú Más',
   'Desde la pantalla de inicio, tocá el botón naranja "Más".',
   NULL),
  (t_clima, 2, 'Elegí Clima',
   'Se abre un menú con opciones. Tocá el botón "Clima".',
   NULL),
  (t_clima, 3, 'Temperatura actual',
   'Ves una tarjeta grande con la temperatura de ahora mismo en tu ciudad, si hay sol, nubes o lluvia, y la temperatura máxima y mínima del día.',
   NULL),
  (t_clima, 4, 'Detalles del tiempo',
   'Debajo ves información extra: humedad del aire, velocidad del viento y la sensación térmica, que es cómo se siente el frío o el calor en el cuerpo.',
   'Si hace viento, la sensación térmica puede ser varios grados más fría que la temperatura real.'),
  (t_clima, 5, 'Pronóstico de los próximos 7 días',
   'Más abajo en la pantalla ves el pronóstico para la semana completa, con el ícono del tiempo y las temperaturas máxima y mínima de cada día.',
   'Útil para saber si vas a necesitar abrigo o paraguas en los próximos días.'),
  (t_clima, 6, 'Actualizar el clima',
   'Para actualizar la información, arrastrá la pantalla hacia abajo con el dedo (como si la estuvieras "tirando" para abajo). El clima se actualiza automáticamente.',
   NULL);


-- ═══════════════════════════════════════════════════════════════════════════════
-- TUTORIAL 8: Ajustes de accesibilidad del Asistente
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO tutoriales (
  categoria_id, titulo, descripcion, formato,
  duracion_segundos, orden, activo, lo_que_aprenderas
) VALUES (
  cat_eldertech,
  'Cómo cambiar el tamaño de letra y la voz',
  'Ajustá el Asistente para que sea más cómodo: letra más grande, voz más lenta o que las respuestas se lean solas.',
  'guia', 150, 107, true,
  ARRAY[
    'Cómo hacer la letra del Asistente más grande',
    'Cómo cambiar la velocidad de la voz',
    'Cómo activar la lectura automática de respuestas'
  ]
) RETURNING id INTO t_ajustes;

INSERT INTO pasos_tutorial (tutorial_id, orden, titulo, descripcion, tip) VALUES
  (t_ajustes, 1, 'Abrí el Asistente',
   'Desde la pantalla de inicio, tocá el botón azul "Asistente".',
   NULL),
  (t_ajustes, 2, 'Abrí los ajustes',
   'En la pantalla del Asistente, tocá el ícono de engranaje ⚙️ que está en la esquina superior derecha.',
   NULL),
  (t_ajustes, 3, 'Cambiá el tamaño del texto',
   'Encontrás la sección "Tamaño del texto" con tres opciones: Normal, Grande y Muy grande. Tocá el que más te guste.',
   'Si elegís "Muy grande", el texto y los botones crecen para ser más fáciles de leer y de tocar.'),
  (t_ajustes, 4, 'Cambiá la velocidad de la voz',
   'En la sección "Velocidad de lectura" podés elegir entre Normal y Lenta. Si elegís Lenta, la voz habla más despacio y es más fácil de entender.',
   NULL),
  (t_ajustes, 5, 'Activá la lectura automática',
   'Si activás la opción "Leer respuestas automáticamente", el Asistente lee en voz alta cada respuesta en cuanto llega, sin que tengas que tocar nada.',
   'Ideal si preferís escuchar en vez de leer.'),
  (t_ajustes, 6, 'Los cambios quedan guardados',
   'Los ajustes se guardan solos. Cada vez que abrás el Asistente, va a recordar la configuración que elegiste.',
   NULL);


END $migration$;
