# Importar residentes desde Excel

Backoffice → **Usuarios** → **Importar desde Excel**. Plantilla lista para mandar: `docs/plantilla-residentes-eldertech.xlsx`
(también se descarga desde el mismo diálogo; se genera con `generarPlantilla()`). Columnas: Nombre, Apellido, DNI, Sección y Puesto.

## Flujo
1. Se descarga la plantilla y se completa a partir de la fila 5 (las filas 2–4, `prueba1/2/3`, son ejemplo y se ignoran).
2. Al elegir el `.xlsx` el backend lo valida y devuelve una **vista previa** fila por fila. No se crea nada.
3. Si hay **un solo error** no se puede confirmar: se corrige el Excel y se vuelve a subir.
4. Sin errores, "Crear N usuarios" da de alta a cada uno (misma Edge Function que el alta manual: cuenta + residente + perfil).
   Si una fila falla recién al crear (ej. caída de red), las demás igual se crean y la tabla marca cuál falló.

## Reglas (backend: `backend/src/services/residents/importResidentes.ts`)
| Campo | Regla |
|---|---|
| Nombre / Apellido | Obligatorios. Se normalizan a mayúscula inicial (`maria de los angeles` → `Maria de los Angeles`); solo letras. |
| DNI | Obligatorio. Se quitan puntos, espacios y guiones; solo dígitos, 6 a 8. Es la contraseña inicial. No puede repetirse en el archivo ni existir ya en la institución. |
| Sección | Obligatoria, una de `seccion_enum` (desplegable en la plantilla). Se acepta `1ac` → `1 AC`. |
| Puesto | Opcional y **solo** para `EMPLEADO LEDOR VADOR` (Excel no deja escribirlo en otra sección; el backend también lo rechaza). |

El usuario se genera solo (inicial del nombre + apellido, ej. `mperez`; con número si ya existe) y el tipo de celular se detecta cuando
entra a la app. Un Excel viejo con las columnas `Usuario` / `Tipo de celular` igual se acepta: esas columnas se ignoran.

Límites: 200 filas y 4 MB por archivo. Se rechaza lo que no sea `.xlsx`, lo que no tenga la hoja `Residentes` o le falten
las columnas obligatorias, y un archivo con solo las filas de ejemplo.

## Endpoints (permiso `usuarios:crear`)
- `GET  /api/admin/residents/import/template` → `.xlsx`
- `POST /api/admin/residents/import` (multipart `archivo`, `confirmar=true|false`) → `{ validacion, creados }`

## Si cambia la lista de secciones
Hay que actualizar `SECCIONES_IMPORT` en `importResidentes.ts` (además de `seccion_enum` y el backoffice) y regenerar la plantilla.

## Institución destino
La Edge Function `admin-usuarios` crea al usuario en la institución del admin que llama (un super admin puede indicar
`organizacion_id`; el backend lo manda según el selector de institución). Antes usaba "la primera institución de la base".
