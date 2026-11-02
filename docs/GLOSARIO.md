# Glosario de dominio

Mismo concepto, mismo nombre en las tres capas siempre que se pueda. Esta tabla
dice cómo se llama hoy cada funcionalidad en cada lugar, para poder seguir una
funcionalidad de punta a punta sin traducir de memoria. **Si agregás un módulo
nuevo, usá el nombre en español del dominio y sumalo acá.**

| Dominio (usar este) | Backend (`backend/src`) | App móvil (`app/`, `src/`) | Backoffice (`backoffice/src/features`) | URL de la API |
|---|---|---|---|---|
| Pedidos / sugerencias | `requests` | `pedidos` | `pedidos` | `/api/requests`, `/api/admin/requests` |
| Actividades | `activities` | `horarios`, `actividades` | `horarios` ("Actividades" en el menú) | `/api/activities` |
| Asistente | `assistant` | `asistente` | `asistente` | `/api/assistant` |
| Tutoriales / ¿Cómo usar? | `tutorials` | `como-usar`, `tutoriales` | `tutoriales` | `/api/tutorials` |
| Contactos (Llamar) | `contacts` | `llamar`, `contactos` | — | `/api/contacts` |
| Clima | `weather` | `mas/clima` | — | `/api/weather` |
| Radio | `radio` | `mas/radio` | — | `/api/radio` |
| Juegos | `games` | `mas/juegos` | `juegos` | `/api/games` |
| Hablemos (chat) | `hablemos` | `mas/hablemos` | — | `/api/hablemos` |
| Agenda | `agenda` | `agenda` | — | `/api/agenda` |
| Novedades | `novedades` | `novedades` | `novedades` | `/api/novedades` |
| Grupos | `grupos` | — | `grupos` | `/api/admin/grupos` |
| Accesos (permisos por módulo) | `access` | — | `accesos` | `/api/admin/accesos` |
| Administradores | `administradores` | — | `administradores` | `/api/admin/administradores` |
| Residentes / usuarios | `residents` | `AuthContext` | `usuarios` | `/api/admin/residents` |
| Auditoría | `audit` | — | `auditoria` | `/api/admin/audit` |
| Notificaciones | `notifications` | `notifications` | `notificaciones` | `/api/notifications` |
| Configuración | `configuracion` | — | `configuracion` | `/api/admin/configuracion` |

Los nombres en inglés del backend (`requests`, `activities`, `assistant`,
`tutorials`, `contacts`, `weather`, `games`, `residents`, `audit`) son heredados;
los módulos nuevos (`hablemos`, `agenda`, `novedades`, `grupos`) ya usan el
nombre del dominio. Renombrar los viejos rompe las URLs que ya consumen los
APK instalados, así que se hace solo junto con un cambio coordinado de versión.

## Colores

- **Marca**: `Colors.brand.*` (violeta, rojo de botón "Horarios", etc.).
- **Estado**: `Colors.status.error | errorDark | errorBg` — único origen del
  rojo de error. No escribir `#C62828`, `#D32F2F`, `#FFEBEE`, `#B3261E` a mano.
  Si cambia el color de marca, los errores no cambian con él (y viceversa).
- Las paletas propias de cada juego (piezas, fondos) viven dentro del juego a
  propósito: no son colores de la app.

## Linter

`npm run lint` (ESLint + typescript-eslint + react-hooks, config en
`eslint.config.js`). `no-explicit-any` es error; el resto arranca como
advertencia. Una directiva `eslint-disable` tiene que llevar el motivo al lado.
