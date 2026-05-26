# ElderTech — Contexto del Proyecto

## Visión
App móvil exclusiva para residentes de geriátricos. Pensada para adultos mayores con dificultades tecnológicas.
Organización inicial: **Ledor Vador** (Buenos Aires, Argentina).

## Público objetivo
- Adultos mayores (70–95 años)
- Nivel tecnológico bajo o muy bajo
- Posibles problemas de visión, motricidad o memoria

## Principios UX irrenunciables
- Botones grandes (mínimo 48pt táctil)
- Texto grande (body ≥ 17px, títulos ≥ 22px)
- Alto contraste
- Interfaz estable — elementos siempre en el mismo lugar
- Pocos pasos para cada acción
- TTS en todos los elementos importantes

## Arquitectura del proyecto

```
ELDERTECH6/
├── app/                      # Expo Router (file-based navigation)
│   ├── _layout.tsx           # Root: SafeArea + QueryProvider + RadioProvider
│   ├── index.tsx             # Home screen
│   ├── horarios/
│   │   ├── index.tsx         # Lista de actividades del día
│   │   └── [id].tsx          # Detalle de actividad
│   └── mas/
│       ├── index.tsx         # Menú Más
│       ├── clima.tsx         # Pantalla Clima
│       └── radio.tsx         # Pantalla Radio
├── src/
│   ├── components/           # Componentes reutilizables
│   │   ├── common/           # AppHeader, SpeakButton, LoadingState
│   │   ├── home/             # HomeCard
│   │   ├── horarios/         # ActividadCard, DaySelector
│   │   ├── clima/            # (pendiente: WeatherMain)
│   │   └── radio/            # RadioCard, NowPlayingBar
│   ├── constants/            # Colors, Typography, Spacing
│   ├── context/              # RadioContext (estado global del reproductor)
│   ├── hooks/                # useActividades, useClima, useRadios
│   ├── providers/            # QueryProvider (React Query)
│   ├── services/             # supabase.ts, actividadesService, climaService, radioService
│   ├── types/                # database.types, clima.types, radio.types
│   └── utils/                # dateUtils, tts
└── assets/
    ├── images/               # icon.png, splash.png, adaptive-icon.png (agregar manualmente)
    └── fonts/
```

## Navegación
- **Stack navigation** con Expo Router v4 — NO hay tabs
- Flujo: Home → Horarios → Detalle actividad
- Flujo: Home → Más → Clima / Radio / Juegos

## Estado global
- **React Query**: caché de datos remotos (actividades, clima, radios)
- **RadioContext**: estado del reproductor de radio (una sola instancia en toda la app)

## Pendiente de implementar
- Pantalla Llamar (contactos del residente)
- Pantalla Artículos (guías y videos)
- Pantalla Asistente (chatbot IA)
- Pantalla Juegos
- Autenticación con Supabase Auth
- Perfil de usuario / residente
- Notificaciones de actividades

## Decisiones técnicas clave
1. **Open-Meteo** para clima — gratis, sin API key, buena cobertura
2. **expo-av** para radio — streaming de audio con soporte background
3. **@tanstack/react-query v5** — caché + refetch automático
4. **expo-speech** para TTS — soporte nativo iOS/Android en español
5. **Fallback de radios** hardcodeado para desarrollo sin Supabase
6. **ORG_ID** por env var en dev — en producción vendrá del perfil autenticado

## Sistema de Radio — Contexto importante
**Leer `.claude/RADIO_RESEARCH.md` antes de tocar cualquier cosa de radio.**

Resumen ejecutivo:
- La DB tiene 37 radios (actualizada 2026-05-26), columna `url_fallback` agregada
- La mayoría de "fallas" son artefactos de testing en Windows, NO problemas reales en Android
- 6 radios StreamTheWorld/Triton sí fallan en Android (Aspen, Blue, Metro, Rock&Pop, AM750, D Sports)
- NO migrar a React Native Track Player — Expo AV es correcto para este caso
- Fix pendiente: función `resolveStreamTheWorld(mount)` para resolver URLs dinámicas de Triton
