-- ============================================================
-- ElderTech — Biblioteca de tutoriales v2
-- Reemplaza los 3 tutoriales placeholder (con un video de prueba falso de
-- w3schools) por 20 tutoriales con contenido real, y agrega dispositivo
-- (Android/iPhone/Ambos) a cada uno. Se mueven a la papelera (soft delete)
-- en vez de borrarse, por las dudas.
-- Fecha: 2026-09-15
-- ============================================================

DO $migration$
DECLARE
  cat_whatsapp    uuid;
  cat_fotos       uuid;
  cat_llamadas    uuid;
  cat_internet    uuid;
  cat_seguridad   uuid;
  cat_config      uuid;
  t_id            uuid;
BEGIN

-- ─── Sacar los 3 placeholder de circulación (soft delete, no se borran) ──────
UPDATE tutoriales SET deleted_at = now(), activo = false
WHERE titulo IN (
  'Cómo enviar un mensaje por WhatsApp',
  'Cómo sacar una foto con el celular',
  'Cómo enviar una foto por WhatsApp'
) AND deleted_at IS NULL;

SELECT id INTO cat_whatsapp  FROM categorias_tutorial WHERE nombre = 'WhatsApp';
SELECT id INTO cat_fotos     FROM categorias_tutorial WHERE nombre = 'Fotos';
SELECT id INTO cat_llamadas  FROM categorias_tutorial WHERE nombre = 'Llamadas';
SELECT id INTO cat_internet  FROM categorias_tutorial WHERE nombre = 'Internet';
SELECT id INTO cat_seguridad FROM categorias_tutorial WHERE nombre = 'Seguridad';
SELECT id INTO cat_config    FROM categorias_tutorial WHERE nombre = 'Configuración';


-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Cómo enviar un mensaje por WhatsApp (Ambos)
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO tutoriales (categoria_id, titulo, descripcion, formato, nivel, dispositivo, duracion_segundos, orden, activo, lo_que_aprenderas)
VALUES (cat_whatsapp, 'Cómo enviar un mensaje por WhatsApp',
  'Escribile a tu familia y a tus amigos de forma simple, paso a paso.',
  'guia', 'principiante', 'ambos', 120, 200, true,
  ARRAY['Cómo abrir WhatsApp', 'Cómo buscar un contacto', 'Cómo escribir y enviar un mensaje', 'Cómo saber si lo leyeron']
) RETURNING id INTO t_id;
INSERT INTO pasos_tutorial (tutorial_id, orden, titulo, descripcion, tip) VALUES
  (t_id, 1, 'Abrí WhatsApp', 'Buscá el ícono verde con un teléfono blanco y tocalo una vez.', NULL),
  (t_id, 2, 'Elegí el contacto', 'Vas a ver una lista de conversaciones. Tocá el nombre de la persona a la que le querés escribir.', 'Si no la encontrás en la lista, tocá el círculo verde con un lápiz o un "+" para buscarla entre tus contactos.'),
  (t_id, 3, 'Escribí tu mensaje', 'Tocá el espacio que dice "Mensaje" en la parte de abajo de la pantalla y escribí lo que querés decir.', NULL),
  (t_id, 4, 'Enviá el mensaje', 'Tocá la flecha verde que aparece a la derecha del mensaje.', NULL),
  (t_id, 5, 'Fijate si lo leyó', 'Debajo de tu mensaje aparecen unos tildes (✓). Dos tildes grises significa que llegó. Dos tildes azules significa que ya lo leyó.', 'Si ves un solo tilde, todavía no le llegó — puede ser que la otra persona no tenga Internet en ese momento.');


-- ═══════════════════════════════════════════════════════════════════════════
-- 2. Cómo mandar un audio por WhatsApp (Ambos)
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO tutoriales (categoria_id, titulo, descripcion, formato, nivel, dispositivo, duracion_segundos, orden, activo, lo_que_aprenderas)
VALUES (cat_whatsapp, 'Cómo mandar un audio por WhatsApp',
  'Si escribir te cuesta o preferís hablar, podés mandar tu voz en vez de texto.',
  'guia', 'principiante', 'ambos', 100, 201, true,
  ARRAY['Cómo grabar un audio', 'Cómo escucharlo antes de mandarlo', 'Cómo enviarlo o cancelarlo']
) RETURNING id INTO t_id;
INSERT INTO pasos_tutorial (tutorial_id, orden, titulo, descripcion, tip) VALUES
  (t_id, 1, 'Abrí la conversación', 'Entrá a WhatsApp y tocá el nombre de la persona a la que le querés mandar el audio.', NULL),
  (t_id, 2, 'Buscá el micrófono', 'Al lado derecho de donde escribís el mensaje hay un dibujo de un micrófono.', NULL),
  (t_id, 3, 'Grabá tu mensaje', 'Mantené el dedo apretado sobre el micrófono y hablá. Sin soltar el dedo, seguí sosteniendo hasta terminar de hablar.', 'Si soltás el dedo antes de tiempo, el audio se corta y se manda solo. Practicá una vez para agarrarle la mano.'),
  (t_id, 4, 'Soltá para enviar', 'Cuando termines de hablar, soltá el dedo. El audio se manda solo.', NULL),
  (t_id, 5, 'Si te arrepentís', 'Mientras estás grabando, deslizá el dedo hacia la izquierda (sin soltarlo) para cancelar el audio sin mandarlo.', 'Es normal que la primera vez cueste. No pasa nada si mandás un audio de prueba a un familiar de confianza.');


-- ═══════════════════════════════════════════════════════════════════════════
-- 3. Cómo hacer una videollamada por WhatsApp (Ambos)
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO tutoriales (categoria_id, titulo, descripcion, formato, nivel, dispositivo, duracion_segundos, orden, activo, lo_que_aprenderas)
VALUES (cat_whatsapp, 'Cómo hacer una videollamada por WhatsApp',
  'Vé y hablá con tu familia en tiempo real, aunque estén lejos.',
  'guia', 'principiante', 'ambos', 130, 202, true,
  ARRAY['Cómo iniciar una videollamada', 'Cómo contestar una que te hacen a vos', 'Cómo cortarla']
) RETURNING id INTO t_id;
INSERT INTO pasos_tutorial (tutorial_id, orden, titulo, descripcion, tip) VALUES
  (t_id, 1, 'Abrí la conversación', 'Entrá a WhatsApp y tocá el nombre de la persona con la que querés hacer la videollamada.', NULL),
  (t_id, 2, 'Tocá el ícono de la cámara', 'Arriba de la pantalla, a la derecha, hay un dibujo de una cámara de video.', NULL),
  (t_id, 3, 'Esperá a que atiendan', 'Vas a ver tu propia cara en la pantalla mientras esperás. Cuando la otra persona atienda, la vas a ver a ella.', 'Si tarda en atender, no pasa nada — puede estar ocupada. Probá llamar más tarde.'),
  (t_id, 4, 'Hablá normalmente', 'Podés hablar como si la persona estuviera enfrente tuyo. Se van a ver y escuchar los dos al mismo tiempo.', NULL),
  (t_id, 5, 'Si te llaman a vos', 'Cuando alguien te hace una videollamada, la pantalla se pone verde con el nombre de esa persona y dos botones: uno verde (atender) y uno rojo (rechazar).', NULL),
  (t_id, 6, 'Cómo cortar', 'Para terminar la videollamada, tocá el botón rojo redondo que aparece abajo de la pantalla.', NULL);


-- ═══════════════════════════════════════════════════════════════════════════
-- 4. Cómo enviar una foto por WhatsApp (Ambos)
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO tutoriales (categoria_id, titulo, descripcion, formato, nivel, dispositivo, duracion_segundos, orden, activo, lo_que_aprenderas)
VALUES (cat_whatsapp, 'Cómo enviar una foto por WhatsApp',
  'Compartí tus fotos favoritas con tu familia.',
  'guia', 'principiante', 'ambos', 110, 203, true,
  ARRAY['Cómo elegir una foto para mandar', 'Cómo sacar una foto nueva y mandarla al toque', 'Cómo mandar varias fotos juntas']
) RETURNING id INTO t_id;
INSERT INTO pasos_tutorial (tutorial_id, orden, titulo, descripcion, tip) VALUES
  (t_id, 1, 'Abrí la conversación', 'Entrá a WhatsApp y tocá el nombre de la persona a la que le querés mandar la foto.', NULL),
  (t_id, 2, 'Tocá el clip o el "+"', 'Cerca de donde escribís el mensaje hay un símbolo de un clip (📎) o un signo "+". Tocalo.', NULL),
  (t_id, 3, 'Elegí "Galería" o "Fotos"', 'Se abre un menú de opciones. Tocá la que dice "Galería" o "Fotos" para ver las fotos guardadas en tu celular.', 'Si preferís sacar una foto en el momento, elegí la opción "Cámara" en el mismo menú.'),
  (t_id, 4, 'Elegí la foto', 'Tocá la foto que querés mandar. Se marca con un tilde para mostrar que la elegiste.', 'Podés tocar varias fotos seguidas si querés mandar más de una junta.'),
  (t_id, 5, 'Enviá', 'Tocá la flecha verde para mandar la foto.', NULL);


-- ═══════════════════════════════════════════════════════════════════════════
-- 5. Cómo evitar estafas por WhatsApp (Ambos) — Seguridad
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO tutoriales (categoria_id, titulo, descripcion, formato, nivel, dispositivo, duracion_segundos, orden, activo, lo_que_aprenderas)
VALUES (cat_seguridad, 'Cómo evitar estafas por WhatsApp',
  'Aprendé a reconocer los mensajes falsos más comunes, para no caer en un engaño.',
  'guia', 'principiante', 'ambos', 150, 500, true,
  ARRAY['Cómo reconocer un mensaje sospechoso', 'Qué información nunca tenés que compartir', 'Qué hacer si tenés dudas sobre un mensaje']
) RETURNING id INTO t_id;
INSERT INTO pasos_tutorial (tutorial_id, orden, titulo, descripcion, tip) VALUES
  (t_id, 1, 'Desconfiá de los premios', 'Si un mensaje dice que ganaste un premio, un sorteo o un regalo que nunca pediste, es casi siempre falso.', 'Ninguna empresa seria te avisa de un premio por WhatsApp de la nada.'),
  (t_id, 2, 'Cuidado con "soy yo, cambié de número"', 'Una estafa común es un mensaje de un supuesto familiar diciendo que cambió de número y pidiendo plata con urgencia.', 'Antes de mandar nada, llamá por teléfono a ese familiar al número que ya tenías guardado, para confirmar que es realmente él.'),
  (t_id, 3, 'Nunca compartas códigos', 'Si te llega un código de 6 números por SMS o WhatsApp, no se lo pases a nadie, ni aunque te digan que son "del banco" o "de WhatsApp".', 'Ese código sirve para entrar a TU cuenta. Nadie legítimo te lo va a pedir nunca.'),
  (t_id, 4, 'No toques links raros', 'Si un mensaje inesperado trae un link (una dirección de internet) y te genera dudas, no lo toques.', 'Fijate si el mensaje tiene errores de escritura raros o te apura mucho a actuar — son señales de alarma comunes.'),
  (t_id, 5, 'Consultá antes de actuar', 'Si un mensaje te genera dudas o miedo, mostraselo a un familiar de confianza antes de responder o mandar dinero.', 'Nunca es una molestia preguntar. Es mucho peor arrepentirse después.');


-- ═══════════════════════════════════════════════════════════════════════════
-- 6. Cómo sacar una foto (Ambos)
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO tutoriales (categoria_id, titulo, descripcion, formato, nivel, dispositivo, duracion_segundos, orden, activo, lo_que_aprenderas)
VALUES (cat_fotos, 'Cómo sacar una foto',
  'Usá la cámara de tu celular para capturar los momentos que querés recordar.',
  'guia', 'principiante', 'ambos', 90, 300, true,
  ARRAY['Cómo abrir la cámara', 'Cómo enfocar y sacar la foto', 'Dónde se guarda']
) RETURNING id INTO t_id;
INSERT INTO pasos_tutorial (tutorial_id, orden, titulo, descripcion, tip) VALUES
  (t_id, 1, 'Abrí la cámara', 'Buscá el ícono que parece una cámara de fotos y tocalo.', 'Muchos celulares también tienen un atajo: desde la pantalla bloqueada, deslizá el dedo desde el ícono de cámara que aparece en una esquina.'),
  (t_id, 2, 'Apuntá', 'Sostené el celular con las dos manos y apuntá hacia lo que querés fotografiar. Vas a ver la imagen en la pantalla.', NULL),
  (t_id, 3, 'Esperá que enfoque', 'Tocá una vez sobre la pantalla, en la parte de la imagen que más te interesa. El celular va a enfocar ahí.', NULL),
  (t_id, 4, 'Sacá la foto', 'Tocá el círculo grande y blanco que está abajo de la pantalla.', 'Tratá de quedarte quieto un segundo al tocar, para que la foto no salga movida.'),
  (t_id, 5, 'Dónde queda guardada', 'La foto se guarda sola en tu celular, en un álbum llamado "Galería" o "Fotos".', NULL);


-- ═══════════════════════════════════════════════════════════════════════════
-- 7. Cómo ver tus fotos guardadas (Ambos)
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO tutoriales (categoria_id, titulo, descripcion, formato, nivel, dispositivo, duracion_segundos, orden, activo, lo_que_aprenderas)
VALUES (cat_fotos, 'Cómo ver tus fotos guardadas',
  'Encontrá y volvé a mirar las fotos que sacaste o que te mandaron.',
  'guia', 'principiante', 'ambos', 80, 301, true,
  ARRAY['Cómo abrir el álbum de fotos', 'Cómo moverte entre fotos', 'Cómo agrandar una foto para verla mejor']
) RETURNING id INTO t_id;
INSERT INTO pasos_tutorial (tutorial_id, orden, titulo, descripcion, tip) VALUES
  (t_id, 1, 'Abrí la app de Fotos', 'Buscá el ícono que parece un molinete de colores (o varias fotitos apiladas) y tocalo.', 'Se suele llamar "Fotos" o "Galería", dependiendo del celular.'),
  (t_id, 2, 'Mirá las más recientes', 'Al abrir la app, vas a ver primero las fotos más nuevas, arriba de todo.', NULL),
  (t_id, 3, 'Deslizá para ver más', 'Pasá el dedo por la pantalla de abajo hacia arriba para ver fotos más viejas.', NULL),
  (t_id, 4, 'Agrandá una foto', 'Tocá una foto para verla más grande, ocupando toda la pantalla.', 'Una vez agrandada, podés acercar el dedo índice y el pulgar y separarlos sobre la pantalla para hacer zoom y ver los detalles.'),
  (t_id, 5, 'Volvé atrás', 'Para volver a la lista de fotos, tocá la flecha que aparece arriba a la izquierda.', NULL);


-- ═══════════════════════════════════════════════════════════════════════════
-- 8. Cómo borrar fotos para liberar espacio (Ambos)
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO tutoriales (categoria_id, titulo, descripcion, formato, nivel, dispositivo, duracion_segundos, orden, activo, lo_que_aprenderas)
VALUES (cat_fotos, 'Cómo borrar fotos para liberar espacio',
  'Si tu celular te avisa que "no hay espacio", borrar fotos viejas o repetidas suele solucionarlo.',
  'guia', 'principiante', 'ambos', 100, 302, true,
  ARRAY['Cómo elegir las fotos que ya no necesitás', 'Cómo borrarlas', 'Qué hacer si borraste una por error']
) RETURNING id INTO t_id;
INSERT INTO pasos_tutorial (tutorial_id, orden, titulo, descripcion, tip) VALUES
  (t_id, 1, 'Abrí la app de Fotos', 'Buscá el ícono de Fotos o Galería y tocalo.', NULL),
  (t_id, 2, 'Buscá fotos repetidas o borrosas', 'Fijate si tenés varias fotos casi iguales, o fotos que salieron movidas y no sirven.', 'Las capturas de pantalla viejas que ya no necesitás también ocupan mucho lugar.'),
  (t_id, 3, 'Mantené el dedo apretado sobre la foto', 'Tocá una foto y no la sueltes por un segundo, hasta que se marque con un tilde.', 'Así podés seleccionar varias fotos seguidas antes de borrar, tocando cada una.'),
  (t_id, 4, 'Tocá el tacho de basura', 'Arriba o abajo de la pantalla vas a ver un dibujo de un tacho de basura. Tocalo para borrar las fotos elegidas.', NULL),
  (t_id, 5, 'Si te arrepentís', 'Las fotos borradas quedan un tiempo guardadas en un álbum llamado "Eliminados recientemente" o "Papelera", por si las necesitás de vuelta.', 'Buscá ese álbum dentro de la app de Fotos si borraste algo por error.');


-- ═══════════════════════════════════════════════════════════════════════════
-- 9/10. Cómo aumentar el tamaño de la letra — Android / iPhone
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO tutoriales (categoria_id, titulo, descripcion, formato, nivel, dispositivo, duracion_segundos, orden, activo, lo_que_aprenderas)
VALUES (cat_config, 'Cómo aumentar el tamaño de la letra — Android',
  'Si te cuesta leer la pantalla, podés agrandar las letras de todo el celular en un momento.',
  'guia', 'principiante', 'android', 90, 400, true,
  ARRAY['Dónde encontrar el ajuste de tamaño de letra', 'Cómo probar distintos tamaños', 'Cómo agrandar también los íconos']
) RETURNING id INTO t_id;
INSERT INTO pasos_tutorial (tutorial_id, orden, titulo, descripcion, tip) VALUES
  (t_id, 1, 'Abrí Ajustes', 'Buscá el ícono con forma de engranaje ⚙️ y tocalo.', NULL),
  (t_id, 2, 'Buscá "Pantalla" o "Accesibilidad"', 'Deslizá la lista hasta encontrar una opción que diga "Pantalla" o "Accesibilidad". Tocala.', 'El nombre exacto puede variar un poco según la marca del celular (Samsung, Motorola, Xiaomi), pero siempre está en una de esas dos secciones.'),
  (t_id, 3, 'Buscá "Tamaño de fuente" o "Tamaño de letra"', 'Dentro de esa sección, buscá la opción de tamaño de letra o tamaño de texto.', NULL),
  (t_id, 4, 'Movés el control hacia la derecha', 'Vas a ver una barrita o un control deslizante. Arrastralo hacia la derecha para agrandar la letra.', 'Vas a ver un texto de ejemplo que cambia de tamaño mientras movés el control, así sabés cómo va a quedar antes de confirmar.'),
  (t_id, 5, 'Agrandá también los íconos (opcional)', 'Si además de la letra querés que los botones y los íconos sean más grandes, buscá la opción "Tamaño de pantalla" o "Tamaño de visualización", cerca de la anterior.', NULL);

INSERT INTO tutoriales (categoria_id, titulo, descripcion, formato, nivel, dispositivo, duracion_segundos, orden, activo, lo_que_aprenderas)
VALUES (cat_config, 'Cómo aumentar el tamaño de la letra — iPhone',
  'Si te cuesta leer la pantalla, podés agrandar las letras de todo el iPhone en un momento.',
  'guia', 'principiante', 'iphone', 90, 401, true,
  ARRAY['Dónde encontrar el ajuste de tamaño de letra', 'Cómo probar distintos tamaños', 'Cómo activar el texto en negrita']
) RETURNING id INTO t_id;
INSERT INTO pasos_tutorial (tutorial_id, orden, titulo, descripcion, tip) VALUES
  (t_id, 1, 'Abrí Ajustes', 'Buscá el ícono gris con forma de engranaje ⚙️ y tocalo.', NULL),
  (t_id, 2, 'Tocá "Accesibilidad"', 'Deslizá la lista de Ajustes hasta encontrar la opción "Accesibilidad" y tocala.', NULL),
  (t_id, 3, 'Tocá "Pantalla y tamaño del texto"', 'Dentro de Accesibilidad, buscá y tocá esa opción.', NULL),
  (t_id, 4, 'Tocá "Texto más grande"', 'Vas a ver una opción que dice "Texto más grande". Tocala.', NULL),
  (t_id, 5, 'Movés el control deslizante', 'Abajo de la pantalla hay una barrita. Arrastrala hacia la derecha para agrandar la letra en todo el iPhone.', 'Podés activar también "Texto en negrita" en la pantalla anterior de Accesibilidad, para que las letras se vean más marcadas y sean más fáciles de leer.');


-- ═══════════════════════════════════════════════════════════════════════════
-- 11/12. Cómo conectarte a una red Wi-Fi — Android / iPhone
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO tutoriales (categoria_id, titulo, descripcion, formato, nivel, dispositivo, duracion_segundos, orden, activo, lo_que_aprenderas)
VALUES (cat_config, 'Cómo conectarte a una red Wi-Fi — Android',
  'Conectate al Wi-Fi de tu casa o de la residencia para usar Internet sin gastar datos.',
  'guia', 'principiante', 'android', 100, 402, true,
  ARRAY['Cómo activar el Wi-Fi', 'Cómo elegir la red correcta', 'Cómo poner la contraseña']
) RETURNING id INTO t_id;
INSERT INTO pasos_tutorial (tutorial_id, orden, titulo, descripcion, tip) VALUES
  (t_id, 1, 'Abrí Ajustes', 'Buscá el ícono con forma de engranaje ⚙️ y tocalo.', NULL),
  (t_id, 2, 'Tocá "Wi-Fi" o "Conexiones"', 'Vas a ver una opción que dice "Wi-Fi", a veces dentro de un menú llamado "Conexiones".', NULL),
  (t_id, 3, 'Activá el Wi-Fi', 'Si el interruptor de arriba está apagado, tocalo para encenderlo. Se va a poner de otro color cuando esté activado.', NULL),
  (t_id, 4, 'Elegí tu red', 'Debajo van a aparecer los nombres de las redes disponibles cerca tuyo. Tocá el nombre de la tuya.', 'Si no sabés cuál es el nombre de tu red, preguntale a quien instaló el Internet en tu casa o residencia.'),
  (t_id, 5, 'Escribí la contraseña', 'Te va a pedir una contraseña. Escribila con cuidado (las mayúsculas y minúsculas importan) y tocá "Conectar".', 'Una vez que conectás por primera vez, el celular va a recordar la contraseña y se va a conectar solo las próximas veces.');

INSERT INTO tutoriales (categoria_id, titulo, descripcion, formato, nivel, dispositivo, duracion_segundos, orden, activo, lo_que_aprenderas)
VALUES (cat_config, 'Cómo conectarte a una red Wi-Fi — iPhone',
  'Conectate al Wi-Fi de tu casa o de la residencia para usar Internet sin gastar datos.',
  'guia', 'principiante', 'iphone', 100, 403, true,
  ARRAY['Cómo activar el Wi-Fi', 'Cómo elegir la red correcta', 'Cómo poner la contraseña']
) RETURNING id INTO t_id;
INSERT INTO pasos_tutorial (tutorial_id, orden, titulo, descripcion, tip) VALUES
  (t_id, 1, 'Abrí Ajustes', 'Buscá el ícono gris con forma de engranaje ⚙️ y tocalo.', NULL),
  (t_id, 2, 'Tocá "Wi-Fi"', 'Es una de las primeras opciones de la lista, arriba de todo.', NULL),
  (t_id, 3, 'Activá el Wi-Fi', 'Si el interruptor no está verde, tocalo para activarlo.', NULL),
  (t_id, 4, 'Elegí tu red', 'Debajo, en "Elegir una red...", van a aparecer las redes disponibles. Tocá el nombre de la tuya.', 'Si no sabés cuál es el nombre de tu red, preguntale a quien instaló el Internet en tu casa o residencia.'),
  (t_id, 5, 'Escribí la contraseña', 'Escribila con cuidado (las mayúsculas y minúsculas importan) y tocá "Unirse".', 'Una vez que conectás por primera vez, el iPhone va a recordar la contraseña y se va a conectar solo las próximas veces.');


-- ═══════════════════════════════════════════════════════════════════════════
-- 13. Cómo subir y bajar el volumen (Ambos)
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO tutoriales (categoria_id, titulo, descripcion, formato, nivel, dispositivo, duracion_segundos, orden, activo, lo_que_aprenderas)
VALUES (cat_config, 'Cómo subir y bajar el volumen del celular',
  'Ajustá qué tan fuerte suena tu celular, para llamadas, música o notificaciones.',
  'guia', 'principiante', 'ambos', 70, 404, true,
  ARRAY['Cómo usar los botones de volumen', 'La diferencia entre volumen de llamada y de notificaciones', 'Cómo poner el celular en silencio']
) RETURNING id INTO t_id;
INSERT INTO pasos_tutorial (tutorial_id, orden, titulo, descripcion, tip) VALUES
  (t_id, 1, 'Encontrá los botones', 'En uno de los costados del celular hay dos botones juntos, uno arriba del otro. Son los botones de volumen.', NULL),
  (t_id, 2, 'Subí el volumen', 'Apretá el botón de arriba varias veces para que suene más fuerte.', NULL),
  (t_id, 3, 'Bajá el volumen', 'Apretá el botón de abajo varias veces para que suene más bajo.', NULL),
  (t_id, 4, 'Fijate qué volumen estás cambiando', 'Al apretar los botones, aparece en la pantalla una barrita que indica de qué volumen se trata: llamadas, música o notificaciones, según lo que estés usando en ese momento.', 'Si estás mirando un video y apretás los botones, cambiás el volumen del video. Si el celular está con la pantalla apagada, cambiás el volumen de las llamadas o notificaciones.'),
  (t_id, 5, 'Silenciarlo del todo', 'Apretando el botón de bajar varias veces seguidas, el volumen llega a cero y el celular queda en silencio.', 'Para asegurarte de que suene de nuevo, subí el volumen con el mismo botón cuando lo necesites.');


-- ═══════════════════════════════════════════════════════════════════════════
-- 14. Cómo conectar auriculares Bluetooth (Ambos)
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO tutoriales (categoria_id, titulo, descripcion, formato, nivel, dispositivo, duracion_segundos, orden, activo, lo_que_aprenderas)
VALUES (cat_config, 'Cómo conectar auriculares Bluetooth',
  'Escuchá música, videollamadas o al Asistente sin cables, con auriculares inalámbricos.',
  'guia', 'intermedio', 'ambos', 130, 405, true,
  ARRAY['Cómo poner los auriculares en modo de emparejar', 'Cómo activar el Bluetooth del celular', 'Cómo conectarlos por primera vez']
) RETURNING id INTO t_id;
INSERT INTO pasos_tutorial (tutorial_id, orden, titulo, descripcion, tip) VALUES
  (t_id, 1, 'Preparar los auriculares', 'Sacá los auriculares de su estuche y dejalos abiertos y cerca del celular. Muchos entran solos en "modo de emparejar" al abrir la tapa.', 'Si tus auriculares tienen un botón, puede que tengas que mantenerlo apretado unos segundos hasta que una lucecita empiece a titilar.'),
  (t_id, 2, 'Abrí Ajustes en el celular', 'Buscá el ícono con forma de engranaje ⚙️ y tocalo.', NULL),
  (t_id, 3, 'Tocá "Bluetooth"', 'Buscá la palabra "Bluetooth" en la lista de Ajustes y tocala.', NULL),
  (t_id, 4, 'Activalo si está apagado', 'Si el interruptor de Bluetooth no está encendido, tocalo para activarlo.', NULL),
  (t_id, 5, 'Elegí tus auriculares de la lista', 'Va a aparecer el nombre de tus auriculares en una lista de "Dispositivos disponibles". Tocalo para conectarte.', 'La primera vez puede tardar unos segundos en aparecer. Una vez conectados, las próximas veces se van a conectar solos apenas los abras cerca del celular.');


-- ═══════════════════════════════════════════════════════════════════════════
-- 15/16. Cómo hacer una captura de pantalla — Android / iPhone
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO tutoriales (categoria_id, titulo, descripcion, formato, nivel, dispositivo, duracion_segundos, orden, activo, lo_que_aprenderas)
VALUES (cat_config, 'Cómo hacer una captura de pantalla — Android',
  'Sacale una "foto" a lo que estás viendo en la pantalla, útil para mostrarle un problema a un familiar.',
  'guia', 'intermedio', 'android', 80, 406, true,
  ARRAY['Qué botones apretar', 'Dónde queda guardada la captura', 'Cómo mandarla por WhatsApp']
) RETURNING id INTO t_id;
INSERT INTO pasos_tutorial (tutorial_id, orden, titulo, descripcion, tip) VALUES
  (t_id, 1, 'Ubicá los dos botones', 'Necesitás el botón de apagar/encender (de un costado) y el botón de bajar volumen (del otro costado o al lado).', NULL),
  (t_id, 2, 'Apretalos juntos', 'Apretá los dos botones al mismo tiempo, y soltalos enseguida.', 'Puede llevar un par de intentos agarrarle la sincronización. No pasa nada si tarda en salir.'),
  (t_id, 3, 'Confirmá que se sacó', 'La pantalla hace un efecto como de flash y aparece un avisito abajo confirmando que se guardó la captura.', NULL),
  (t_id, 4, 'Buscala en Fotos', 'La captura queda guardada en la app de Fotos o Galería, junto con tus otras fotos.', NULL),
  (t_id, 5, 'Mandala por WhatsApp', 'Podés enviarla como cualquier otra foto (ver el tutorial "Cómo enviar una foto por WhatsApp").', NULL);

INSERT INTO tutoriales (categoria_id, titulo, descripcion, formato, nivel, dispositivo, duracion_segundos, orden, activo, lo_que_aprenderas)
VALUES (cat_config, 'Cómo hacer una captura de pantalla — iPhone',
  'Sacale una "foto" a lo que estás viendo en la pantalla, útil para mostrarle un problema a un familiar.',
  'guia', 'intermedio', 'iphone', 80, 407, true,
  ARRAY['Qué botones apretar', 'Dónde queda guardada la captura', 'Cómo mandarla por WhatsApp']
) RETURNING id INTO t_id;
INSERT INTO pasos_tutorial (tutorial_id, orden, titulo, descripcion, tip) VALUES
  (t_id, 1, 'Ubicá los dos botones', 'Necesitás el botón lateral (del costado derecho) y el botón de subir volumen (del costado izquierdo).', NULL),
  (t_id, 2, 'Apretalos juntos', 'Apretá los dos botones al mismo tiempo, y soltalos enseguida.', 'Puede llevar un par de intentos agarrarle la sincronización. No pasa nada si tarda en salir.'),
  (t_id, 3, 'Confirmá que se sacó', 'La pantalla hace un efecto como de flash, y en la esquina de abajo aparece una miniatura de la captura por unos segundos.', 'Si tocás esa miniatura enseguida, podés recortar o marcar la captura antes de que se guarde.'),
  (t_id, 4, 'Buscala en Fotos', 'La captura queda guardada en la app de Fotos, en un álbum llamado "Capturas de pantalla".', NULL),
  (t_id, 5, 'Mandala por WhatsApp', 'Podés enviarla como cualquier otra foto (ver el tutorial "Cómo enviar una foto por WhatsApp").', NULL);


-- ═══════════════════════════════════════════════════════════════════════════
-- 17. Cómo hacer una llamada (Ambos)
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO tutoriales (categoria_id, titulo, descripcion, formato, nivel, dispositivo, duracion_segundos, orden, activo, lo_que_aprenderas)
VALUES (cat_llamadas, 'Cómo hacer una llamada desde el celular',
  'Llamá a tus familiares y amigos usando la app de Teléfono.',
  'guia', 'principiante', 'ambos', 90, 600, true,
  ARRAY['Cómo abrir la app de Teléfono', 'Cómo elegir a quién llamar', 'Cómo cortar la llamada']
) RETURNING id INTO t_id;
INSERT INTO pasos_tutorial (tutorial_id, orden, titulo, descripcion, tip) VALUES
  (t_id, 1, 'Abrí Teléfono', 'Buscá el ícono verde con forma de auricular y tocalo. En ElderTech también podés usar el botón "Llamar" del inicio.', NULL),
  (t_id, 2, 'Buscá el contacto', 'Tocá "Contactos" y buscá el nombre de la persona que querés llamar.', NULL),
  (t_id, 3, 'Tocá el nombre', 'Al tocar el nombre de la persona, se abren sus datos.', NULL),
  (t_id, 4, 'Tocá el botón verde', 'Tocá el ícono verde de teléfono para iniciar la llamada.', NULL),
  (t_id, 5, 'Cortá la llamada', 'Cuando termines de hablar, tocá el botón rojo redondo para cortar.', NULL);


-- ═══════════════════════════════════════════════════════════════════════════
-- 18. Cómo saber si una llamada es sospechosa (Ambos) — Seguridad
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO tutoriales (categoria_id, titulo, descripcion, formato, nivel, dispositivo, duracion_segundos, orden, activo, lo_que_aprenderas)
VALUES (cat_seguridad, 'Cómo identificar una llamada sospechosa',
  'Aprendé a reconocer llamadas de estafadores que se hacen pasar por bancos, empresas o familiares.',
  'guia', 'principiante', 'ambos', 140, 501, true,
  ARRAY['Señales de una llamada sospechosa', 'Qué información nunca tenés que dar por teléfono', 'Qué hacer si ya atendiste']
) RETURNING id INTO t_id;
INSERT INTO pasos_tutorial (tutorial_id, orden, titulo, descripcion, tip) VALUES
  (t_id, 1, 'Números desconocidos y largos', 'Desconfiá de llamadas de números muy largos o raros que nunca viste, sobre todo si te llaman de forma insistente.', NULL),
  (t_id, 2, 'Te apuran o te asustan', 'Un estafador suele meter urgencia o miedo: "tu cuenta va a ser bloqueada", "un familiar tuyo tuvo un accidente". Es una técnica para que no pienses con calma.', 'Respirá y cortá si algo te genera esa sensación de apuro. Podés siempre volver a llamar vos después, verificando el número.'),
  (t_id, 3, 'Piden datos personales', 'Ningún banco ni empresa seria te pide por teléfono tu contraseña completa, el código de tu tarjeta o un código que te llegó por mensaje.', NULL),
  (t_id, 4, 'Piden que instales algo', 'Desconfiá si te piden instalar una aplicación "para ayudarte" o "para verificar tu cuenta" durante la llamada.', NULL),
  (t_id, 5, 'Si tenés dudas, cortá y confirmá', 'Podés cortar la llamada en cualquier momento. Después, llamá vos mismo al número oficial de tu banco (el que tenés guardado, no uno que te dieron en la llamada) para confirmar si era real.', 'Nunca está mal cortar y preguntarle a un familiar antes de hacer algo que te pidieron por teléfono.');


-- ═══════════════════════════════════════════════════════════════════════════
-- 19. Cómo buscar algo en Google (Ambos)
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO tutoriales (categoria_id, titulo, descripcion, formato, nivel, dispositivo, duracion_segundos, orden, activo, lo_que_aprenderas)
VALUES (cat_internet, 'Cómo buscar algo en Google',
  'Encontrá información sobre cualquier tema escribiendo o hablando tu pregunta.',
  'guia', 'principiante', 'ambos', 90, 700, true,
  ARRAY['Cómo abrir el buscador', 'Cómo escribir una búsqueda simple', 'Cómo usar la voz en vez de escribir']
) RETURNING id INTO t_id;
INSERT INTO pasos_tutorial (tutorial_id, orden, titulo, descripcion, tip) VALUES
  (t_id, 1, 'Abrí Google o el navegador', 'Buscá un ícono redondo de colores que dice "Google", o el ícono de tu navegador de Internet.', 'También podés usar el Asistente de ElderTech para preguntar cualquier cosa sin salir de la app.'),
  (t_id, 2, 'Tocá la barra de búsqueda', 'Vas a ver un espacio en blanco, generalmente arriba de la pantalla, que dice "Buscar" o tiene una lupa 🔍.', NULL),
  (t_id, 3, 'Escribí tu pregunta', 'Escribí lo que querés saber, con tus propias palabras. Por ejemplo: "cómo se prepara una tarta de manzana".', 'No hace falta escribir perfecto ni usar mayúsculas — Google entiende igual.'),
  (t_id, 4, 'Tocá buscar', 'Tocá la lupa o el botón "Buscar" en el teclado para ver los resultados.', NULL),
  (t_id, 5, 'Buscá hablando', 'Si preferís no escribir, tocá el micrófono 🎤 que suele estar al lado de la barra de búsqueda, y decí tu pregunta en voz alta.', NULL);


-- ═══════════════════════════════════════════════════════════════════════════
-- 20. Qué hacer cuando el celular no tiene Internet (Ambos)
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO tutoriales (categoria_id, titulo, descripcion, formato, nivel, dispositivo, duracion_segundos, orden, activo, lo_que_aprenderas)
VALUES (cat_internet, 'Qué hacer cuando el celular no tiene Internet',
  'Pasos simples para revisar y solucionar cuando WhatsApp o las apps dejan de cargar.',
  'guia', 'intermedio', 'ambos', 120, 701, true,
  ARRAY['Cómo revisar si el Wi-Fi está conectado', 'Cómo activar los datos móviles', 'Cuándo conviene reiniciar el celular']
) RETURNING id INTO t_id;
INSERT INTO pasos_tutorial (tutorial_id, orden, titulo, descripcion, tip) VALUES
  (t_id, 1, 'Fijate arriba de la pantalla', 'En la parte de arriba del celular hay unos íconos chiquitos. Buscá el símbolo de Wi-Fi (como una gotita con ondas) o de datos móviles.', 'Si no ves ninguno de los dos, es una buena pista de que ahí está el problema.'),
  (t_id, 2, 'Revisá el Wi-Fi', 'Entrá a Ajustes y tocá "Wi-Fi". Fijate si dice "Conectado" debajo del nombre de tu red.', 'Si no está conectado, seguí el tutorial "Cómo conectarte a una red Wi-Fi".'),
  (t_id, 3, 'Probá los datos móviles', 'Si no tenés Wi-Fi cerca, entrá a Ajustes y activá "Datos móviles". Esto usa Internet de tu compañía telefónica en vez del Wi-Fi.', 'Los datos móviles pueden tener un límite mensual, según tu plan — preguntale a tu familia si no estás seguro de cuánto tenés disponible.'),
  (t_id, 4, 'Activá y desactivá el Modo Avión', 'Buscá el ícono de un avioncito ✈️ en los ajustes rápidos. Activalo, esperá 10 segundos, y desactivalo de nuevo.', 'Este truco simple soluciona muchos problemas de conexión, porque hace que el celular vuelva a buscar señal desde cero.'),
  (t_id, 5, 'Como último recurso, reiniciá', 'Si nada de lo anterior funciona, apagá el celular del todo (mantené apretado el botón de encendido y elegí "Apagar"), esperá unos segundos, y volvé a prenderlo.', 'Reiniciar el celular de vez en cuando es normal y no rompe nada — muchas veces soluciona problemas raros.');

END $migration$;
