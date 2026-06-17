# ElderTech · Backoffice

Panel administrativo de **ElderTech**, integrado con la misma base de datos Supabase
que la app móvil. Todo lo que se gestiona acá (horarios, tutoriales, residentes, FAQ,
configuración) impacta **en tiempo real** en la app de los residentes.

> Esto **no** es un proyecto separado: vive dentro del repositorio `eldertech6`, comparte
> el contrato de tipos del schema y se conecta al mismo proyecto Supabase.

---

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 19 + TypeScript + Vite 6 |
| UI | Tailwind CSS 3 + componentes estilo shadcn/ui (Radix) |
| Estado servidor | TanStack React Query 5 |
| Formularios | React Hook Form |
| Routing | React Router 6 |
| Gráficos | Recharts |
| Backend / DB / Auth / Realtime | Supabase |

## Arquitectura

```
backoffice/
├── src/
│   ├── components/
│   │   ├── ui/          # primitivas (button, card, table, dialog, select…)
│   │   ├── layout/      # AppShell, Sidebar, Topbar, nav.config
│   │   ├── common/      # PageHeader, KpiCard, EmptyState, ConfirmDialog, states
│   │   └── charts/      # BarChartCard, DonutChartCard
│   ├── features/        # un módulo por dominio
│   │   ├── auth/        # AuthContext, ProtectedRoute, LoginPage
│   │   ├── dashboard/   # KPIs, gráficos, actividad reciente
│   │   ├── horarios/    # CRUD de actividades + recurrencia + intereses/pisos
│   │   ├── tutoriales/  # CRUD de contenido educativo (artículos)
│   │   ├── usuarios/    # CRUD de residentes
│   │   ├── asistente/   # FAQ + métricas del asistente IA
│   │   ├── auditoria/   # registro de acciones
│   │   └── configuracion/ # datos del geriátrico
│   ├── hooks/           # usePermisos, useRealtime
│   ├── lib/             # supabase, queryClient, utils
│   ├── providers/       # AppProviders (Query + Auth + Toaster)
│   ├── services/        # acceso a datos (Supabase) + auditoría
│   └── types/           # database.types (espejo) + backoffice.types
```

## Puesta en marcha

```bash
cd backoffice
cp .env.example .env     # completá VITE_SUPABASE_ANON_KEY y VITE_ORG_ID
npm install
npm run dev              # http://localhost:5173
```

### Variables de entorno

| Variable | Descripción |
|---|---|
| `VITE_SUPABASE_URL` | URL del proyecto Supabase (mismo que la app móvil) |
| `VITE_SUPABASE_ANON_KEY` | Clave pública anon |
| `VITE_ORG_ID` | ID de la organización (geriátrico) |

## Base de datos

La migración del backoffice está en
`../supabase/migrations/20260616_backoffice_module.sql`. Es **aditiva** (no toca datos
existentes) y agrega: `perfiles_usuario.rol`, `faq`, `audit_logs`, `notificaciones`,
`actividad_intereses`, `organizaciones.logo_url` + políticas RLS.

Aplicarla desde el dashboard de Supabase (SQL Editor) o con la CLI:

```bash
supabase db push
```

Luego, dar de alta el primer administrador (ver nota al pie del archivo SQL).

## Roles y permisos

| Rol | Crear/Editar | Eliminar | Usuarios | Configuración |
|---|---|---|---|---|
| `super_admin` | ✅ | ✅ | ✅ | ✅ |
| `admin` | ✅ | ✅ | ✅ | ❌ |
| `editor` | ✅ | ❌ | ❌ | ❌ |

La matriz está centralizada en `src/hooks/usePermisos.ts` y se refuerza con RLS en la DB.

## Integración en tiempo real

Cada mutación invalida la caché de React Query y, además, `useRealtime` suscribe las
tablas relevantes a `postgres_changes`. Resultado: un cambio en el backoffice se refleja
de inmediato tanto en este panel como en la app móvil.

## Scripts

```bash
npm run dev        # desarrollo
npm run build      # typecheck + build de producción
npm run preview    # previsualizar el build
npm run typecheck  # solo chequeo de tipos
```
