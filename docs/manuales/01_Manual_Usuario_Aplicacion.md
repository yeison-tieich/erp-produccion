# Manual del usuario - Control MT

## 1. Objetivo

Este manual explica cómo utilizar la aplicación Control MT en la operación diaria del negocio. Está orientado a usuarios de producción, inventario, calidad, administración y supervisión.

## 2. Acceso a la aplicación

1. Abrir la URL de la app en producción o en entorno local.
2. Ingresar usuario y contraseña.
3. Si la cuenta está activa, el sistema redirige al dashboard principal.
4. Si la sesión se cierra, volver a iniciar sesión y verificar permisos del rol.
5. Si administración cambia los permisos de la cuenta, volver a cargar la aplicación para actualizar el menú.

## 3. Roles recomendados

Los usuarios normalmente se agrupan por rol:

- Administrador: gestión general, configuración, usuarios y validación.
- Supervisor: seguimiento de producción, inventario y operaciones.
- Operario: tareas, inventario de campo, reportes y seguimiento de OT.
- Calidad: inspecciones, no conformidades y reclamos.
- Mantenimiento: máquinas, preventivos y alertas.

El perfil Administrador puede asignar permisos por módulo desde **Usuarios**. La opción **Ver** habilita el módulo y los permisos **Crear**, **Editar**, **Eliminar** y **Exportar** controlan las operaciones correspondientes. El tema y los colores configurados por el Administrador se comparten con todos los perfiles.

## 4. Dashboard principal

La pantalla principal muestra:

- indicadores generales del sistema,
- estado de inventario,
- OT activas y pendientes,
- producción diaria,
- alertas de mantenimiento o calidad,
- acceso rápido a módulos clave.

## 5. Módulos principales

### 5.1 Inventario

Para consultar y actualizar materiales:

1. Entrar a Inventario.
2. Buscar por SKU, nombre o categoría.
3. Revisar stock actual, reservado y punto de reorden.
4. Registrar movimiento si corresponde: ingreso, salida o ajuste.
5. Verificar que la información quede consistente antes de guardar.

### 5.2 Productos

En catálogo de productos:

- revisar nombres, medidas, precio y stock,
- consultar BOM o lista de materiales,
- asociar documentos o planos,
- revisar disponibilidad para producción.

### 5.3 Órdenes de trabajo

Para operar OT:

1. abrir la OT correspondiente,
2. revisar cantidad, prioridad, fecha de entrega y cliente,
3. actualizar estado de producción,
4. asignar tareas, máquinas y personal,
5. registrar avances y comentarios,
6. cerrar la OT una vez completada y validada.

### 5.4 Proyectos especiales

Se usan para cargas no repetitivas o trabajos técnicos:

- revisar fases del proyecto,
- controlar piezas y documentos,
- registrar avances por fase,
- asociar fotos o planos para referencia.

### 5.5 Personal y mantenimiento

Desde este módulo se puede:

- consultar personal por área o cargo,
- actualizar horas y productividad,
- revisar mantenimientos preventivos,
- alertar por máquinas con riesgo o vencimiento.

### 5.6 Calidad

Se registra:

- inspecciones,
- no conformidades,
- reclamos del cliente,
- riesgos y seguimiento de acciones correctivas.

## 6. Buenas prácticas de uso

- no modificar datos sin revisar la OT o el material involucrado,
- antes de cerrar una tarea confirmar que el dato es correcto,
- usar comentarios en cada acción importante,
- no guardar archivos temporales en la base del sistema,
- reportar inconsistencias de stock, producción o calidad de inmediato.

## 7. Recomendaciones de seguridad

- no compartir credenciales,
- cerrar sesión cuando se use un equipo compartido,
- verificar permisos antes de realizar cambios críticos,
- no usar accesos de producción en pruebas o entorno no autorizado.

## 8. Soporte y escalamiento

En caso de error o inconsistencia:

1. revisar si el problema es de permisos, ingreso o datos,
2. verificar si la acción fue realizada en producción o desarrollo,
3. informar al responsable del área,
4. documentar el problema con fecha, usuario, proceso y evidencia.

## 9. Cierre

La app está diseñada para centralizar la operación productiva y facilitar la toma de decisiones. El uso correcto del sistema depende de mantener datos limpios, validaciones claras y seguimiento constante de cada OT, inventario y tarea.
