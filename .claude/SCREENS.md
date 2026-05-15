# ElderTech — Especificación de Pantallas

## Estado actual de implementación

| Pantalla | Estado | Archivo |
|---|---|---|
| Home | ✅ Implementada | `app/index.tsx` |
| Horarios (lista) | ✅ Implementada | `app/horarios/index.tsx` |
| Horarios (detalle) | ✅ Implementada | `app/horarios/[id].tsx` |
| Más (menú) | ✅ Implementada | `app/mas/index.tsx` |
| Clima | ✅ Implementada | `app/mas/clima.tsx` |
| Radio | ✅ Implementada | `app/mas/radio.tsx` |
| Llamar | 🔲 Pendiente | - |
| Artículos | 🔲 Pendiente | - |
| Asistente | 🔲 Pendiente | - |
| Juegos | 🔲 Pendiente | - |

## Pantallas implementadas

### Home (`app/index.tsx`)
- Header: verde oscuro (#1B5E3B) con logo + globo
- Fecha del día + avatar del usuario
- Tarjeta grande Horarios (roja)
- Grid 2×2: Llamar (verde), Artículos (morado), Asistente (azul), Más (naranja)
- Cada tarjeta pequeña tiene SpeakRow
- La tarjeta Horarios tiene SpeakButton chip

### Horarios lista (`app/horarios/index.tsx`)
- AppHeader rojo con "Horarios del Día"
- Fecha actual en texto largo
- DaySelector: semana completa (L-D), día activo en círculo rojo
- FlatList de ActividadCard, ordenadas por hora_inicio
- Badge de hora azul (<13hs) o ámbar (≥13hs)
- Estado vacío, loading y error

### Horarios detalle (`app/horarios/[id].tsx`)
- Hero con emoji grande + nombre + horario
- Sección Ubicación (si existe)
- Sección Descripción (si existe)
- Sección Responsable (si existe)
- SpeakButton en cada sección

### Más menú (`app/mas/index.tsx`)
- Lista vertical: Clima, Radio, Juegos
- Separador rojo entre Clima y Radio
- Juegos marcado como "Próximamente"
- Botón "Volver" grande al pie

### Clima (`app/mas/clima.tsx`)
- Header verde + pull-to-refresh
- Card gradiente azul con temperatura, descripción, max/min
- Row de detalles: sensación térmica, humedad, viento
- Pronóstico 7 días en card blanca
- Datos: Open-Meteo API (sin API key)
- Config de ciudad: tabla `configuracion_clima` en Supabase

### Radio (`app/mas/radio.tsx`)
- Header verde + barra de instrucción
- SectionList agrupada por país
- Cada RadioCard: logo emoji + nombre + descripción + botón play verde
- NowPlayingBar fija al pie cuando hay radio activa
- Audio: expo-av con streaming HTTP/HLS
- Estado global: RadioContext (mantiene audio entre navegaciones)

## Pantallas pendientes

### Llamar
- FlatList de contactos del residente (tabla `contactos`)
- Ordenados por `orden ASC`
- Botones: llamar por teléfono, WhatsApp
- Usar `Linking.openURL('tel:...')` y `Linking.openURL('whatsapp://...')`

### Artículos
- Categorías de artículos (`categorias_articulo`)
- Lista de artículos por categoría
- Soporte para tipo: texto, video, guia
- Para videos: usar expo-av o WebView

### Asistente (Chatbot)
- Interfaz de chat simple
- Integración con Claude API (claude-haiku-4-5 para velocidad)
- Guardar sesiones en `sesiones_chatbot` y `historial_chatbot`
- TTS automático de respuestas

### Juegos
- Definir juegos apropiados para adultos mayores
- Opciones: memoria, trivia, sopa de letras
