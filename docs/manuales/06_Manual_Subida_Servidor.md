# Manual de subida al servidor - Control MT

## 1. Objetivo

Este manual explica el proceso para subir una versión validada del sistema al servidor en producción.

## 2. Preparación previa

Antes de subir, verificar:

- base de datos respaldada,
- código validado en pruebas,
- variables de entorno listas,
- build compilado correctamente,
- acceso al servidor disponible,
- rollback documentado.

## 3. Backup obligatorio

Antes del despliegue ejecutar:

1. backup de PostgreSQL,
2. respaldo del último build funcional,
3. respaldo del directorio persistente de archivos `/opt/mecaytro/backend/uploads`,
4. respaldo de configuración importante del servidor,
5. revisión de logs para detectar fallas previas.

## 4. Flujo recomendado de despliegue

### Paso 1: acceder al servidor

```bash
ssh adminmecaytro@192.168.20.100
```

### Paso 2: ubicar el proyecto

```bash
cd /opt/mecaytro
```

### Paso 3: actualizar código

La instalación LAN usa el Compose existente de `/opt/mecaytro`; no sustituirlo por otro archivo de Compose ni actualizar PostgreSQL como parte de una publicación normal.

```bash
git status --short
docker compose ps
```

Transferir los archivos aprobados por SCP según la guía [08_Migracion_Supabase_y_Despliegue_LAN.md](../08_Migracion_Supabase_y_Despliegue_LAN.md). No copiar `.env`, respaldos o datos locales del desarrollador.

### Paso 4: compilar y validar

```bash
# En el equipo de build
cd backend
npm ci
npm run build
cd ../frontend
npm ci
npm run build
```

### Paso 5: preservar uploads y configurar el volumen

Los planos PDF y las imágenes de producto se guardan en `backend/uploads`. El directorio debe sobrevivir a recreaciones del contenedor. Antes de actualizar Compose, conservar cualquier archivo existente y montar una ruta persistente, por ejemplo:

```bash
mkdir -p /opt/mecaytro/backend/uploads
```

En el servicio backend del Compose activo, asegurar este volumen:

```yaml
volumes:
  - /opt/mecaytro/backend/uploads:/app/uploads
```

Dar permisos de escritura al UID/GID con el que corre el backend. Confirmar el montaje con `docker inspect` antes de desplegar. No borrar ni reemplazar el directorio existente.

### Paso 6: aplicar únicamente migraciones aprobadas

Hacer backup antes de una migración y confirmar el destino de `DATABASE_URL`. Luego aplicar solo migraciones versionadas y revisadas:

```bash
docker exec mecaytro-backend ./node_modules/.bin/prisma migrate status
docker exec mecaytro-backend ./node_modules/.bin/prisma migrate deploy
```

No ejecutar `prisma db push`, seeds ni Compose que reemplace PostgreSQL en una publicación normal.

### Paso 7: reiniciar servicios

Recrear únicamente el backend después de verificar el build y la migración. Para el frontend, publicar el build nuevo conservando el anterior y después recrear Nginx para que tome la configuración y el montaje vigentes.

Después de copiar archivos del frontend, dar permisos de lectura/tránsito a Nginx:

```bash
chmod -R a+rX /opt/mecaytro/frontend/dist
```

## 5. Verificación post-deploy

Confirmar:

- API responde en la URL pública,
- frontend abre sin errores,
- login funciona,
- módulos críticos responden,
- no hay errores de base de datos,
- imágenes y PDF de producto cargan y abren sin problema,
- los archivos siguen disponibles después de recrear el contenedor backend,
- el HTML responde sin caché obsoleta y los archivos `.js` devuelven `application/javascript`.

Para subir un plano de producto: abrir **Productos**, elegir **Editar** en un producto, seleccionar **Plano técnico PDF**, adjuntar un archivo `.pdf` de hasta 24 MB y guardar los cambios. Al crear un producto también se puede adjuntar el plano; la aplicación primero crea el registro y luego carga el archivo.

## 6. Criterios de éxito

La subida se considera correcta cuando:

- el entorno funciona sin bloqueos,
- la versión subida corresponde a lo validado,
- los usuarios pueden operar normalmente,
- no hay fallas críticas en la aplicación o en la base.

## 7. Gestión de problemas

Si algo falla:

1. revisar logs del backend y Nginx,
2. verificar variable de entorno,
3. comprobar base de datos y migraciones,
4. volver a la versión anterior si es necesario,
5. documentar y corregir la causa raíz.

## 8. Cierre

La subida al servidor debe hacerse con control, documentación y confirmación. No es una operación de “prueba rápida”; es un paso crítico del ciclo de vida de la app.
