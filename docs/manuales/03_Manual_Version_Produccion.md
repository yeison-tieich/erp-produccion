# Manual de versión de producción - Control MT

## 1. Objetivo

Este documento describe cómo manejar la versión de producción de la aplicación, tanto para la web como para la infraestructura del servidor.

## 2. Requisitos de producción

La versión de producción debe contar con:

- backend en Node.js con variables de entorno correctamente cargadas,
- PostgreSQL disponible y respaldado,
- frontend compilado con la URL de API correcta,
- Nginx o reverse proxy configurado,
- certificado HTTPS activo,
- backup de bases y build anterior,
- proceso de monitoreo y rollback definido.

## 3. Variables críticas

Antes del despliegue, verificar:

- `DATABASE_URL` apuntando a la base correcta,
- `JWT_SECRET` con un valor real y seguro,
- `FRONTEND_URL` compatible con el dominio público,
- `CLOUDINARY_*` configuradas correctamente,
- `PORT` y rutas de servicio coherentes con la infraestructura.

## 4. Reglas de producción

- no hacer cambios directos sin validación,
- no usar `db push` como solución definitiva en producción,
- no mezclar pruebas con producción,
- no publicar secretos en el repositorio,
- no desplegar sin backup previo.

## 5. Proceso de despliegue

### Paso 1: respaldar

1. hacer backup de PostgreSQL,
2. guardar versión actual en un punto estable,
3. conservar el último build y commit funcional,
4. revisar logs del backend y del proxy.

### Paso 2: preparar cambios

1. verificar que el código está listo en la rama correcta,
2. confirmar que se validó en pruebas,
3. revisar migraciones y cambios de esquema,
4. confirmar compatibilidad con la versión actual de producción.

### Paso 3: desplegar

- subir el código o la versión aprobada,
- ejecutar instalación de dependencias si aplica,
- compilar backend y frontend,
- aplicar migraciones autorizadas,
- reiniciar servicios.

### Paso 4: verificar

Tras el despliegue revisar:

- acceso al login,
- contenido del dashboard,
- inventario y producción principal,
- carga de archivos,
- API respondiendo correctamente,
- estabilidad del servidor y de la base de datos.

## 6. Monitoreo post-deploy

Durante las primeras horas:

- revisar logs del backend,
- revisar errores de CORS o rutas,
- verificar uso de memoria y CPU,
- confirmar que los usuarios puedan operar sin errores,
- atender incidencias que surjan antes de cerrar el despliegue.

## 7. Rollback

Si falla la versión nueva:

1. detener la versión recién desplegada,
2. volver a la última versión estable,
3. restaurar el backup si lo requiere la base,
4. verificar funcionamiento de nuevo,
5. documentar la causa del problema.

## 8. Cierre

La producción debe operar con una regla estricta: solo se publica lo que ya fue validado, documentado y aprobado. El despliegue en producción exige control, trazabilidad y procedimientos claros.
