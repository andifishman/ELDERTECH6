// Contenido de la guía "¿Cómo usar?" — texto plano y simple, pensado para
// adultos mayores. Separado de la pantalla para que el componente se ocupe
// solo de mostrarlo (acordeón) y este archivo sea fácil de revisar y
// actualizar sin tocar código de UI.
//
// Si se agrega o cambia una función real de la app, actualizar acá también
// — esta guía tiene que reflejar lo que el residente puede tocar hoy, nunca
// una función que todavía no existe.

export interface SeccionGuia {
  id: string;
  emoji: string;
  titulo: string;
  /** Etiqueta corta para el botón de la grilla (si el título completo no entra en una tarjeta angosta) */
  tituloBoton?: string;
  /** Color de acento — el mismo que usa la tarjeta de esa sección en la Home o en Más */
  color: string;
  /** Una o dos frases que explican para qué sirve la sección */
  intro: string;
  /** Pasos numerados, en orden, con vocabulario simple ("tocá", "escribí") */
  pasos: string[];
  /** Aclaración corta y útil, opcional (se muestra destacada) */
  tip?: string;
  /** Solo la sección "Más" tiene subsecciones — Clima, Radio, Juegos, Sugerencias */
  subsecciones?: SeccionGuia[];
}

export const INTRO_GENERAL: SeccionGuia = {
  id: 'inicio',
  emoji: '🏠',
  titulo: 'La pantalla principal',
  tituloBoton: 'Inicio',
  color: '#4CAF50',
  intro:
    'La pantalla principal es lo primero que ves al abrir ElderTech. Desde ahí entrás a todas las demás secciones de la aplicación.',
  pasos: [
    'Arriba de todo dice "ElderTech" y, al lado, este mismo botón "¿Cómo usar?" que te trajo hasta esta guía.',
    'Debajo aparece la fecha de hoy y, si tenés una actividad pronto, un aviso con el horario.',
    'Más abajo hay botones grandes de colores: Horarios, Llamar, Tutoriales, Asistente, Más, Hablemos y Agenda. Tocá cualquiera para entrar a esa parte de la aplicación.',
    'Muchos botones tienen debajo uno que dice "🔊 Escuchar" — tocalo para que el celular te lea en voz alta de qué se trata, sin necesidad de leer la pantalla.',
    'Adentro de cualquier sección vas a encontrar, arriba a la izquierda, una flecha "←" — tocala cuando quieras volver a la pantalla anterior.',
  ],
  tip: 'Podés tocar el botón 🔊 Escuchar todas las veces que quieras: no gasta nada y repite la explicación las veces que necesites.',
};

export const SECCIONES_GUIA: SeccionGuia[] = [
  {
    id: 'horarios',
    emoji: '📅',
    titulo: 'Horarios',
    color: '#E57373',
    intro: 'Horarios te muestra las actividades organizadas para cada día en tu residencia.',
    pasos: [
      'Desde la pantalla principal, tocá el botón rojo "Horarios".',
      'Arriba vas a ver la fecha completa del día que estás mirando en ese momento.',
      'Debajo hay una fila de días con flechas a los costados: tocá la flecha de la derecha para avanzar un día, o la de la izquierda para retroceder. También podés tocar directamente cualquiera de los días de la fila.',
      'Más abajo aparece la lista de actividades de ese día, cada una en su propia tarjeta, con el horario y el lugar.',
      'Tocá cualquier actividad para ver el detalle completo: para qué es, en qué lugar, y quién la organiza.',
      'Si un día no tiene ninguna actividad cargada vas a ver el mensaje "No hay actividades para este día" — es normal, no es un error.',
    ],
    tip: 'Adentro del detalle de cada actividad también hay un botón "🔊 Escuchar" para que te lean toda la información.',
  },
  {
    id: 'llamar',
    emoji: '📞',
    titulo: 'Llamar',
    color: '#66BB6A',
    intro: 'Llamar te permite comunicarte por teléfono o WhatsApp con tu familia y amigos guardados.',
    pasos: [
      'Desde la pantalla principal, tocá el botón verde "Llamar".',
      'Vas a ver tus contactos guardados, cada uno en un cuadrito con su foto o sus iniciales.',
      'Para agregar a alguien nuevo, tocá el botón verde "Agregar contacto" de arriba y elegí a la persona desde los contactos de tu celular.',
      'Tocá la estrella en la esquina de una tarjeta para marcarla como favorita: los contactos favoritos aparecen siempre primero en la lista.',
      'Tocá cualquier contacto para abrir su ficha completa.',
      'Ahí vas a encontrar dos botones bien grandes: "Llamar" (para hacer una llamada telefónica común) y "WhatsApp" (para enviarle un mensaje, si esa persona tiene WhatsApp).',
      'También podés tocar la foto para agregarle o cambiarle una foto a ese contacto.',
    ],
  },
  {
    id: 'tutoriales',
    emoji: '📚',
    titulo: 'Tutoriales',
    color: '#AB47BC',
    intro: 'Tutoriales tiene guías paso a paso y videos para aprender a usar el celular.',
    pasos: [
      'Desde la pantalla principal, tocá el botón violeta "Tutoriales".',
      'Arriba vas a ver categorías, como "WhatsApp" o "Fotos": tocá una para ver solo esos tutoriales, o dejá "Todo" para verlos todos juntos.',
      'Debajo hay un buscador: escribí una palabra para encontrar un tutorial más rápido.',
      'Tocá la estrella de arriba a la derecha para ver solamente los tutoriales que marcaste como favoritos.',
      'Tocá cualquier tutorial para abrirlo. Si es un video, se reproduce solo; si es una guía, vas a ver los pasos con fotos.',
      'Dentro de un video hay un botón que dice "Ver los pasos uno por uno" — tocalo si además del video querés ver la guía escrita con imágenes.',
      'En la guía escrita, tocá "Siguiente" para avanzar de a un paso, y "Anterior" para volver. Al terminar todos los pasos aparece un cartel de "¡Muy bien!".',
    ],
  },
  {
    id: 'asistente',
    emoji: '🤖',
    titulo: 'Asistente',
    color: '#42A5F5',
    intro: 'El Asistente es un ayudante virtual al que le podés hacer preguntas sobre cómo usar el celular.',
    pasos: [
      'Desde la pantalla principal, tocá el botón azul "Asistente".',
      'Tocá "Hacer una consulta" para empezar una conversación nueva.',
      'Podés escribir tu pregunta, o tocar el micrófono para hacerla hablando en vez de escribir.',
      'El asistente te responde de forma simple y clara.',
      'Si no sabés qué preguntar, mirá las "Preguntas frecuentes" en la misma pantalla y tocá cualquiera para que el asistente la responda directamente.',
      'Todas tus conversaciones quedan guardadas: tocá "Ver conversaciones anteriores" para volver a leerlas cuando quieras.',
      'Adentro de una conversación, tocá el ícono de la rueda (⚙️) arriba para cambiar la velocidad de la voz o hacer que lea las respuestas en voz alta automáticamente.',
    ],
  },
  {
    id: 'hablemos',
    emoji: '💬',
    titulo: 'Hablemos',
    color: '#00897B',
    intro: 'Hablemos te permite mandar mensajes de texto o de voz a otros residentes de la casa.',
    pasos: [
      'Desde la pantalla principal, tocá el botón "Hablemos".',
      'Vas a ver la lista de tus conversaciones, con la más reciente arriba de todo.',
      'Para empezar una conversación nueva, tocá el botón "Nueva conversación" de abajo, buscá a la persona por su nombre y tocá el botón "Escribir" al lado de su nombre.',
      'Adentro de una conversación, tocá el botón grande "Escribir mensaje" para abrir una pantalla con letra grande donde escribís tu texto, y después tocá "Enviar".',
      'Si preferís no escribir, tocá el botón del micrófono para grabar un mensaje de voz. Al terminar de hablar podés elegir "Borrar" o "Enviar".',
      'Los mensajes de voz que te manden a vos tienen un botón "Escuchar" para reproducirlos cuando quieras.',
    ],
  },
  {
    id: 'agenda',
    emoji: '🗒️',
    titulo: 'Agenda',
    color: '#5C6BC0',
    intro: 'Agenda es tu propio calendario personal, para anotar las cosas que no querés olvidar.',
    pasos: [
      'Desde la pantalla principal, tocá el botón "Agenda".',
      'Arriba podés elegir cómo ver tus recordatorios: por Mes, por Semana, los de Hoy, o los Próximos.',
      'Para agregar uno nuevo, tocá el botón "Nuevo recordatorio", escribí un título corto, elegí el día en el calendario y la hora.',
      'La aplicación te avisa con una notificación una hora antes de cada recordatorio, de forma automática.',
      'Tocá cualquier recordatorio para ver su detalle completo.',
      'Ahí podés marcarlo como "Realizado" cuando ya lo hiciste, o eliminarlo si ya no lo necesitás.',
    ],
    tip: 'Un recordatorio que pasó su hora sin marcarse como "Realizado" aparece señalado como "Finalizado" — no significa que haya un error.',
  },
  {
    id: 'mas',
    emoji: '➕',
    titulo: 'Más',
    color: '#FFA726',
    intro: 'Más reúne otras funciones útiles: el clima, la radio, juegos, y un lugar para mandar sugerencias al personal.',
    pasos: [
      'Desde la pantalla principal, tocá el botón naranja "Más".',
      'Vas a ver varias tarjetas: Clima, Radio, Juegos y Sugerencias. Tocá "Ver más" en cualquiera para entrar.',
    ],
    subsecciones: [
      {
        id: 'clima',
        emoji: '⛅',
        titulo: 'Clima',
        color: '#1565C0',
        intro: 'Te muestra el clima de hoy y el pronóstico de los próximos días.',
        pasos: [
          'Al entrar, ves el clima de tu ciudad en el momento y el pronóstico de los próximos días.',
          'Podés agregar otras ciudades para ver el clima de donde vive tu familia: tocá el botón para agregar una ciudad, escribí su nombre y elegila de la lista.',
          'Deslizá el dedo hacia los costados para ver las distintas ciudades que agregaste.',
        ],
        tip: 'Tocá "🔊 Escuchar" para que te lean el pronóstico completo en voz alta.',
      },
      {
        id: 'radio',
        emoji: '📻',
        titulo: 'Radio',
        color: '#2E7D32',
        intro: 'Te deja escuchar radios en vivo, organizadas por idioma y por tipo.',
        pasos: [
          'Vas a ver una lista de radios: podés filtrarlas por idioma (Español, Hebreo, Inglés) o por categoría, tocando los botones de arriba.',
          'Tocá cualquier radio para empezar a escucharla.',
          'Mientras suena, aparece una barra abajo de la pantalla con el nombre de la radio y un botón para detenerla — se ve en cualquier parte de la aplicación, no hace falta quedarse en la pantalla de Radio.',
          'Tocá la estrella de una radio para guardarla como favorita.',
        ],
      },
      {
        id: 'juegos',
        emoji: '🎲',
        titulo: 'Juegos',
        color: '#6A1B9A',
        intro: 'Siete juegos simples para entretenerte y ejercitar la memoria.',
        pasos: [
          'Ahorcado: adiviná la palabra tocando letra por letra.',
          'Memotest: tocá las cartas de a dos para encontrar los pares iguales.',
          'Simon: mirá la secuencia de colores que se enciende y repetila tocando en el mismo orden.',
          'Conexiones: agrupá las palabras que van juntas según su categoría.',
          'Laberinto: encontrá el camino desde la entrada hasta la salida.',
          'Sopa de Letras: encontrá las palabras escondidas entre las letras.',
          'Une los Puntos: conectá los puntos del mismo color, en orden.',
        ],
        tip: 'Podés salir de cualquier juego en el momento que quieras, tocando la flecha "←" de arriba.',
      },
      {
        id: 'sugerencias',
        emoji: '📋',
        titulo: 'Sugerencias',
        color: '#E65100',
        intro: 'Sirve para mandarle un mensaje al personal de la residencia.',
        pasos: [
          'Elegí el tipo de mensaje tocando uno de los botones de arriba: Pedido, Comentario, Sugerencia, Actividad propuesta, o Recomendación de película.',
          'Escribí tu mensaje, o grabalo con el micrófono si preferís hablar en vez de escribir.',
          'Tocá "Enviar" para mandarlo al personal.',
          'Después vas a poder ver el estado de tu mensaje: "Pendiente", "En proceso" o "Resuelta".',
        ],
      },
    ],
  },
];

/** Las 8 secciones de la grilla, en orden — "La pantalla principal" primero, después el resto */
export const TODAS_LAS_SECCIONES: SeccionGuia[] = [INTRO_GENERAL, ...SECCIONES_GUIA];

/** Busca una sección o subsección por id — usado por la pantalla de detalle */
export function buscarSeccion(id: string | undefined): SeccionGuia | undefined {
  if (!id) return undefined;
  for (const seccion of TODAS_LAS_SECCIONES) {
    if (seccion.id === id) return seccion;
    const sub = seccion.subsecciones?.find((s) => s.id === id);
    if (sub) return sub;
  }
  return undefined;
}

/** Arma el texto completo de una sección (y sus subsecciones, si tiene) para el botón "Escuchar" del header */
export function textoCompletoSeccion(seccion: SeccionGuia): string {
  const pasos = seccion.pasos.map((p, i) => `Paso ${i + 1}: ${p}`).join(' ');
  const propio = [seccion.intro, pasos, seccion.tip ?? ''].filter(Boolean).join(' ');
  if (!seccion.subsecciones) return propio;
  const subs = seccion.subsecciones.map((s) => `${s.titulo}. ${textoCompletoSeccion(s)}`).join(' ');
  return [propio, subs].filter(Boolean).join(' ');
}
