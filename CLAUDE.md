# ElderTech — Instrucciones para Claude

## ¿Qué es este proyecto?
Aplicación móvil para adultos mayores en residencias geriátricas.
Stack: **React Native + Expo SDK 54 + TypeScript + Supabase**.

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

**El backend (`backend/`) tiene que estar corriendo siempre** — la app y el
backoffice ya no hablan con Supabase directo para la mayoría de los módulos,
sino con este BFF (`http://localhost:3001` en dev). Si no está levantado, el
dashboard del backoffice y las pantallas de la app quedan sin datos (todo en 0
o "sin datos aún"), sin ningún error visible.

```bash
# Backend (BFF) — dejarlo corriendo en su propia terminal
cd backend && npm install   # solo la primera vez (o si package.json cambió)
cd backend && npm run dev   # queda escuchando en :3001

# App móvil
npx expo start          # Iniciar en modo desarrollo
npx expo start --android
npx expo start --ios

# Backoffice
cd backoffice && npm run dev   # Vite, queda en :5173
```

Si en Windows ves `SELF_SIGNED_CERT_IN_CHAIN` en los logs del backend (típico
en redes corporativas/escolares con inspección TLS), corré
`cd backend && npm run setup:certs` — también se corre solo antes de cada
`npm run dev` (`predev`), así que normalmente no hace falta a mano.

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
