# ElderTech — Base de Datos (Supabase)

## ENUMs
```sql
nivel_dificultad_enum: 'independiente' | 'necesita_ayuda' | 'dependiente'
rol_usuario_enum:      'residente' | 'admin' | 'staff'
tipo_evento_enum:      'medicamento' | 'cita' | 'recordatorio' | 'otro'
fuente_radio_enum:     'tunein' | 'radio100' | 'manual'
tipo_articulo_enum:    'texto' | 'video' | 'guia'
nivel_articulo_enum:   'principiante' | 'intermedio' | 'avanzado'
unidad_temperatura_enum: 'celsius' | 'fahrenheit'
```

## Tablas principales

### organizaciones
Multi-tenant: cada geriátrico es una organización.
`ORG_ID` se usa en TODAS las queries.

### residentes
El actor central de la app. Vinculado a `organizacion_id`, `sector_id`, `habitacion_id`.

### perfiles_usuario
Extiende `auth.users` de Supabase. `residente_id` vincula el usuario autenticado con su residente.

## Módulo Horarios

### actividades
- `fecha`: DATE en formato 'YYYY-MM-DD'
- `hora_inicio`: TIME en formato 'HH:MM:SS'
- `hora_fin`: TIME | null
- `emoji_icono`: override al emoji del tipo_actividad
- `patron_recurrencia`: jsonb `{ dias_semana: number[], hasta: 'YYYY-MM-DD' }`

### Query estándar de actividades
```typescript
supabase
  .from('actividades')
  .select('*, tipo_actividad:tipos_actividad(*), ubicacion:ubicaciones(*), responsable:responsables(*)')
  .eq('organizacion_id', ORG_ID)
  .eq('fecha', 'YYYY-MM-DD')
  .eq('activo', true)
  .order('hora_inicio', { ascending: true })
```

## Módulo Clima

### configuracion_clima
Una fila por organización. Contiene ciudad, latitud, longitud.
Si no hay lat/lon, usar Open-Meteo Geocoding API para resolverlos.

## Módulo Radio

### radios + categorias_radio
Las radios se agrupan por país (`pais`) y categoría.
Las `es_destacada = true` van primero.

## Módulo Llamar

### contactos
Ordenados por `orden ASC`. Cada contacto tiene `telefono` y `whatsapp_disponible`.

## Seed inicial
Organización: **Ledor Vador** (Buenos Aires, AR)
Tipos de actividad globales (organizacion_id = NULL): Desayuno, Almuerzo, Merienda, Cena, Gimnasia, Lectura, Tecnología, Música, Juegos, Manualidades, Cine, Taller.

## Notas importantes
- Todas las tablas tienen `activo: boolean` — siempre filtrar por `activo = true`
- El campo `emoji_icono` en actividades tiene prioridad sobre `tipo_actividad.emoji`
- Los timestamps son `timestamptz` (incluyen timezone)
