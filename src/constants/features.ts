//qué versión de Horarios muestra la app. La propia (tabla actividades + backoffice) sigue completa
//en app/horarios — solo está oculta — para ofrecérsela a otros geriátricos que no tengan sistema propio
export const HORARIOS_DEL_HOGAR = true;

//ruta a la que apuntan el acceso de la Home y las notificaciones de "Horarios"
export const RUTA_HORARIOS = HORARIOS_DEL_HOGAR ? '/horarios-hogar' : '/horarios';
