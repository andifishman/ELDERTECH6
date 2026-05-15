# ElderTech — Instrucciones para Claude

## ¿Qué es este proyecto?
Aplicación móvil para adultos mayores en residencias geriátricas.
Stack: **React Native + Expo SDK 52 + TypeScript + Supabase**.

## Carpeta de skills
Toda la documentación del proyecto para Claude está en `.claude/`:
- `CONTEXT.md` — visión general, decisiones de arquitectura
- `DATABASE.md` — schema completo de Supabase
- `DESIGN.md` — sistema de diseño, colores, tipografía
- `SCREENS.md` — especificación pantalla por pantalla

**Leer siempre `.claude/CONTEXT.md` al inicio de cada sesión.**

## Alias de paths
`@/*` → `./src/*` (configurado en tsconfig.json y babel.config.js)

## Comandos útiles
```bash
npx expo start          # Iniciar en modo desarrollo
npx expo start --android
npx expo start --ios
```

## Reglas de desarrollo
1. **Accesibilidad primero**: botones mínimo 48×48pt, texto mínimo 17px body
2. **Sin tabs**: la navegación es Stack (Expo Router), no bottom tabs
3. **TypeScript estricto**: sin `any`, tipado explícito siempre
4. **Supabase real**: no mockear servicios — usar fallback solo para dev sin credenciales
5. **Open-Meteo**: API de clima gratuita, sin API key (ver `climaService.ts`)
6. **expo-av**: para streaming de radio (ver `RadioContext.tsx`)
7. **expo-speech**: para TTS en español AR (ver `tts.ts`)

## Variables de entorno necesarias
Ver `.env.example` — copiar a `.env` y completar con datos de Supabase.
