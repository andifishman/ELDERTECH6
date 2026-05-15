# ElderTech — Sistema de Diseño

## Paleta de colores
Extraída del Figma oficial y las capturas de referencia.

```typescript
// src/constants/Colors.ts
brand: {
  greenDark:   '#1B5E3B',  // Header, AppBar principal
  greenMedium: '#2E7D32',  // Botón Llamar
  red:         '#D32F2F',  // Botón Horarios, header Horarios
  purple:      '#6A1B9A',  // Botón Artículos
  blueDark:    '#0D47A1',  // Botón Asistente
  orange:      '#E65100',  // Botón Más
}

activity: {
  morning:  '#3F51B5',  // Azul-índigo — actividades antes de 13hs
  afternoon: '#FF8F00', // Ámbar — actividades desde 13hs
}

weather: {
  background: '#1565C0',  // Azul para pantalla Clima
}
```

## Tipografía
```typescript
// src/constants/Typography.ts
size: {
  xs: 13, sm: 15, md: 18, lg: 20, xl: 24, xxl: 32, display: 48
}
// body mínimo: 18px — nunca menos para adultos mayores
```

## Espaciado
```typescript
// src/constants/Spacing.ts
touch.min: 48    // mínimo táctil según WCAG 2.5.5
touch.comfortable: 56
```

## Componentes reutilizables

### AppHeader
- Props: `titulo`, `subtitulo`, `mostrarVolver`, `mostrarHablar`, `textoHablar`, `backgroundColor`
- Siempre incluye botón de TTS en la derecha
- Color por defecto: `Colors.brand.greenDark`

### SpeakButton
- Variantes: `'onLight'` (círculo azul), `'onDark'` (círculo translúcido), `'chip'` (pill con texto)
- Sizes: `'sm'` (36px) y `'md'` (44px)
- Usa `expo-speech` con idioma `es-AR` a velocidad 0.85x

### SpeakRow
- Botón horizontal "Escuchar" para usar dentro de tarjetas pequeñas
- Props: `texto`, `onDark`

### HomeCard
- `variant="large"`: tarjeta Horarios (ancho completo)
- `variant="small"`: tarjetas del grid 2×2

### ActividadCard
- Color del badge de hora: azul si es mañana (<13hs), ámbar si es tarde
- Siempre incluye SpeakButton en la derecha

## Layout Home (referencia visual)
```
┌─────────────────────────────────┐
│ 🌿 ElderTech            🌐     │  ← Header verde oscuro
├─────────────────────────────────┤
│ 7 de abril de 2026      [👤]   │  ← Fecha + Avatar
│                                 │
│ ┌─────────────────────────────┐ │
│ │          📅                 │ │  ← Tarjeta HORARIOS (roja, grande)
│ │        Horarios             │ │
│ │  [Escuchar Descripcion 🎤]  │ │
│ └─────────────────────────────┘ │
│                                 │
│ ┌─────────┐   ┌─────────────┐  │
│ │  📞     │   │   📖        │  │  ← Grid 2×2
│ │ Llamar  │   │  Artículos  │  │
│ │[Escuchar]   │  [Escuchar] │  │
│ └─────────┘   └─────────────┘  │
│ ┌─────────┐   ┌─────────────┐  │
│ │  🤖     │   │   ➕        │  │
│ │Asistente│   │    Más      │  │
│ │[Escuchar]   │  [Escuchar] │  │
│ └─────────┘   └─────────────┘  │
└─────────────────────────────────┘
```

## Layout Horarios
```
┌─────────────────────────────────┐
│ ← Horarios del Día         🔊  │  ← Header rojo
├─────────────────────────────────┤
│ 📅 Lunes, 7 de abril de 2026   │  ← Fecha
├─────────────────────────────────┤
│ L  M  M  J  V  S  D            │  ← DaySelector (lunes-domingo)
│ 7 [8] 9  10 11 12 13           │
├─────────────────────────────────┤
│ ┌────────────────────────────┐  │
│ │ [08:00] ☕ Desayuno    🔊 │  │  ← ActividadCard (badge azul)
│ └────────────────────────────┘  │
│ ┌────────────────────────────┐  │
│ │ [12:30] 🍽️ Almuerzo  🔊 │  │  ← ActividadCard (badge ámbar)
│ └────────────────────────────┘  │
└─────────────────────────────────┘
```

## Layout Clima
```
┌─────────────────────────────────┐
│ ← Clima   T y pronóstico   🔊  │  ← Header verde
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │ (gradiente azul)            │ │
│ │   Buenos Aires   AR         │ │
│ │         ☀️                  │ │
│ │       10°C                  │ │
│ │     Despejado               │ │
│ │  Máx 15° · Mín 7°           │ │
│ │ [🌡️8°C] [💧80%] [💨6km/h] │ │
│ └─────────────────────────────┘ │
│ Pronóstico 7 días               │
│  Hoy    ⛅   15° / 7°          │
│  Mañana 🌦️  14° / 10°         │
└─────────────────────────────────┘
```
