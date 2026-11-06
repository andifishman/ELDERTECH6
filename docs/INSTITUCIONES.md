# Varias instituciones (multi-geriátrico)

ElderTech sirve a más de un geriátrico con el mismo código y la misma base. Todo dato pertenece a una institución
(`organizacion_id`) y el backend lo resuelve desde el perfil de quien llama: **nunca se mezclan datos entre instituciones**.

## Cómo entra cada quien
- Un **administrador o empleado** entra al backoffice con su email: el backend lo asocia a SU institución
  (`perfiles_usuario.organizacion_id`) y todo lo que ve y edita es de esa.
- Los **residentes** (app) y los **familiares** (app de familias) también ven solo lo de su institución.
- El **super admin** (allowlist en `backend/src/config/superAdmins.ts`) tiene el selector **Institución** en el menú
  lateral del backoffice: cambia de institución y trabaja ahí. Técnicamente manda el header `X-Organizacion-Id`; el backend
  solo lo respeta para un super admin y solo si la institución existe y está activa (`middlewares/auth.ts`).

## Instituciones (solo super admin)
Backoffice → **Instituciones**: datos de cada geriátrico y su **color principal**.

- El color (`organizaciones.color_principal`, formato `#RRGGBB`) lo toman el backoffice, la app de familias y la app de
  residentes. Se exige un contraste mínimo de 4,5:1 con texto blanco; un color muy claro se rechaza.
- **Migración a aplicar:** `supabase/migrations/20261103120000_organizacion_color.sql`. Sin ella la pantalla abre pero no
  guarda el color (avisa con un mensaje claro).
- **App de residentes:** los estilos de React Native se calculan al cargar cada pantalla, así que el color se aplica al
  arrancar (`index.js` → `src/theme/temaInstitucion.ts`) con lo último que guardó el dispositivo. Después de iniciar sesión se
  compara con `GET /api/me/branding`; si cambió, se guarda y la app se **recarga una vez**. En Expo Go / desarrollo no hay
  recarga automática: se aplica la próxima vez que se abre. Requiere una versión nueva de la app (APK/OTA) para estar activo.

## Qué es de una sola institución todavía
- **Grilla "Horarios del Hogar"**: viene de un sistema externo que es de Ledor Vador. Solo esa institución la recibe
  (`config/feedHorarios.ts`, `LEDOR_FEED_ORG_ID`). Las demás gestionan sus propias actividades en el backoffice
  (el menú "Actividades" abre `/horarios` en vez de `/horarios-hogar`).
- **Actividades en la app de residentes**: la app sigue abriendo la pantalla del feed (`RUTA_HORARIOS` en
  `src/constants/features.ts`); para otra institución queda vacía hasta que se integren las actividades propias.
- **Pisos / secciones**: son una lista fija en la base (`seccion_enum`, con los pisos de Ledor). Una institución nueva usa
  esos valores; para pisos propios hace falta una tabla de secciones por institución.
- Los grupos por sección se crearon para Ledor con la migración; para una institución nueva hay que sembrarlos.

## Institución de demostración
"Residencia Los Aromos (DEMO)", Rosario: administrador `admin@losaromos.example.com`, 6 residentes, grupos por sección y
contenido de ejemplo. Residente de prueba: `rosa.garcia`. El dominio `example.com` está reservado y no recibe mails: no hay
recuperación de contraseña por email para esas cuentas.
