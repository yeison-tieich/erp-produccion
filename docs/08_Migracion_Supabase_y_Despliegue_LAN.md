# Migración de Supabase y despliegue LAN

Procedimiento para compilar en Windows y desplegar en el servidor Linux `192.168.20.100`. El backend queda en la red Docker privada, Nginx publica la aplicación por HTTP en el puerto 80 y PostgreSQL no se expone a la LAN.

## Estado conocido y precauciones

- Verificación SSH del 2026-10-05: el Compose activo está en `/opt/mecaytro/docker-compose.yml`; sus servicios son `mecaytro-db` y `mecaytro-backend`.
- El backend original reiniciaba porque ejecutaba `dist/index.js`, pero el build solo generaba `dist/server.js`. Se añadió `src/index.ts` y se reconstruyó el backend; después Prisma falló porque faltaba OpenSSL en Alpine. Se instaló OpenSSL en las etapas builder y runner. Actualmente el backend responde HTTP 200, Prisma conecta a `mecaytro_db` y el contenedor reportó cero reinicios en la verificación.
- El PostgreSQL existente es versión 16 y conserva datos en el bind mount `/opt/mecaytro/postgres_data:/var/lib/postgresql/data`. No reutilizar esa carpeta con PostgreSQL 18 ni eliminarla.
- `prisma migrate status` encontró dos migraciones pendientes en la base actual: `20260214140842_init` y `20260214152031_add_product_fields`. No ejecutar `migrate deploy` hasta comprobar el historial/esquema y hacer un backup recuperable.
- Se creó el backup custom `before-migration-pg16.dump` en `/opt/mecaytro` y se copió a `C:\Users\ADMINISTRACION\Documents\before-migration-pg16.dump`. `pg_restore --list` validó 894 entradas y el SHA-256 coincidió en servidor y PC. No se modificaron los datos del PostgreSQL.
- El SQL filtrado se restauró primero en `mecaytro_supabase_stage`; para PostgreSQL 16 se omitieron solo `SET transaction_timeout` y `CREATE SCHEMA public`, que son incompatibles/redundantes en ese servidor. El esquema mostró `No difference detected` frente a `schema.prisma`. Se reconciliaron en staging las dos migraciones anteriores ya representadas en ese esquema y Prisma quedó al día.
- Se creó `mecaytro_supabase_prod` clonando el staging validado. Verificados 56 objetos públicos y conteos de 9 usuarios, 12 clientes y 167 productos.
- El backend está configurado para `mecaytro_supabase_prod`; el preflight Prisma reporta `Database schema is up to date!`, el API devuelve HTTP 200 y el contenedor permanece `running` sin reinicios.
- El `.env` anterior y el Compose anterior se conservaron como `/opt/mecaytro/.env.before-supabase-cutover-2026-10-05` y `/opt/mecaytro/docker-compose.yml.before-supabase-cutover-2026-10-05`. También se guardó `/opt/mecaytro/.env.before-lan-frontend-2026-10-05` antes de agregar `FRONTEND_URL`.
- El frontend/Nginx se desplegó con el overlay `/opt/mecaytro/frontend/docker-compose.frontend-lan.yml`, conectado a la red existente `mecaytro_mecaytro-network`. Desde el PC de desarrollo se verificó `http://192.168.20.100/` con HTTP 200 y el preflight API con HTTP 204/CORS correcto.
- Consultar los logs cuando sea necesario: `docker logs --tail 200 mecaytro-backend`.
- El dump disponible es SQL plano, generado con `pg_dump 18.4` desde PostgreSQL 17.6. La configuración de este proyecto usa PostgreSQL 18 para importarlo con compatibilidad de versión.
- El contenedor antiguo se debe respaldar y renombrar, nunca eliminar durante el primer corte. No ejecutar `docker compose down -v`, `docker volume prune` ni comandos de borrado de volúmenes.
- El backup disponible declara esquemas gestionados por Supabase (`auth`, `storage`, `vault`, `realtime`, entre otros) y extensiones como `supabase_vault`. **No importarlo directamente** al PostgreSQL estándar del Compose. Generar desde Supabase una exportación solo de `public`, sin propietarios ni ACL; conservar el dump original intacto.
- Imágenes y documentos ya almacenados en Cloudinary continúan referenciados por sus URL. No se descargan ni se migran al contenedor. Se deben configurar las credenciales de Cloudinary en el backend.

## 1. Exportar desde Supabase en Windows

Instalar los PostgreSQL Client Tools en el PC de desarrollo y confirmar que `pg_dump` está en `PATH`:

```powershell
pg_dump --version
```

Para generar un SQL nuevo compatible, usar el host/puerto/base/usuario de la conexión directa de Supabase (o pooler en modo sesión), sin publicar la contraseña en la línea de comandos. `pg_dump` solicitará la contraseña:

```powershell
pg_dump `
  --host "db.<PROJECT_REF>.supabase.co" `
  --port 5432 `
  --username "postgres" `
  --dbname "postgres" `
  --format plain `
  --schema public `
  --no-owner `
  --no-acl `
  --file "C:\Users\ADMINISTRACION\Documents\supabase_backup_lan.sql" `
  --password
```

Reemplazar `<PROJECT_REF>` y los parámetros por los de Supabase. Si se necesita conservar esquemas adicionales propios de la aplicación, repetir `--schema` por cada esquema, después de confirmar que no dependen de servicios gestionados de Supabase.

El backup existente debe conservarse como respaldo original. Se comprobó que incluye objetos gestionados por Supabase, así que no se debe pasar al comando `psql` de importación:

```powershell
Get-Item "C:\Users\ADMINISTRACION\Documents\supabase_backup.SQL" | Select-Object FullName,Length,LastWriteTime
Get-FileHash "C:\Users\ADMINISTRACION\Documents\supabase_backup.SQL" -Algorithm SHA256
```

Guardar el hash para identificar el archivo. No editar ni sobrescribir el backup original. Si no hay conectividad a Supabase para exportar `public`, detenerse: primero restaurar el dump completo en un entorno temporal compatible con Supabase y extraer de allí solo los objetos/datos de aplicación; no eliminar líneas del SQL a mano.

## 2. Preparar el proyecto y secretos

En el PC, desde la raíz del workspace, crear una copia de la plantilla backend y completar credenciales de producción. No guardar esta copia en Git:

```powershell
Copy-Item backend\.env.production.example backend\.env.production
notepad backend\.env.production
```

Configurar `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `DATABASE_URL`, `JWT_SECRET` y las tres claves de Cloudinary. La contraseña de PostgreSQL aparece tanto en `POSTGRES_PASSWORD` como en `DATABASE_URL`; deben coincidir. Si contiene caracteres reservados para URL, codificarlos en `DATABASE_URL`. Mantener el archivo privado.

El frontend se compila con `VITE_API_URL=http://192.168.20.100`, ya configurado en `frontend/.env.production`. Esta URL no es secreta. Node.js se compila dentro de Docker; no se necesita enviar `node_modules` ni `dist` desde Windows.

## 3. Copiar fuentes y dump por SCP

Reemplazar `adminmecaytro` si el usuario SSH es distinto. Preparar los directorios remotos:

```powershell
ssh adminmecaytro@192.168.20.100 "mkdir -p ~/mecaytro/backend/prisma ~/mecaytro/frontend"
```

Desde la raíz del workspace, transferir solo lo necesario para el build. Esta selección evita copiar `.env` local, dumps auxiliares, la base de desarrollo y datos de seed:

```powershell
scp -r backend\src backend\public "backend\Inventario Producto_Images" adminmecaytro@192.168.20.100:~/mecaytro/backend/
scp backend\package.json backend\package-lock.json backend\tsconfig.json backend\Dockerfile backend\.env.production.example adminmecaytro@192.168.20.100:~/mecaytro/backend/
scp backend\prisma\schema.prisma adminmecaytro@192.168.20.100:~/mecaytro/backend/prisma/
scp -r backend\prisma\migrations adminmecaytro@192.168.20.100:~/mecaytro/backend/prisma/
scp -r frontend\src frontend\public adminmecaytro@192.168.20.100:~/mecaytro/frontend/
scp frontend\package.json frontend\package-lock.json frontend\tsconfig.json frontend\tsconfig.node.json frontend\vite.config.ts frontend\index.html frontend\Dockerfile frontend\nginx.conf frontend\.env.production adminmecaytro@192.168.20.100:~/mecaytro/frontend/
scp docker-compose.yml .dockerignore adminmecaytro@192.168.20.100:~/mecaytro/
```

Copiar el SQL filtrado que se creó desde Supabase:

```powershell
scp "C:\Users\ADMINISTRACION\Documents\supabase_backup_lan.sql" adminmecaytro@192.168.20.100:~/supabase_backup_lan.sql
Get-FileHash "C:\Users\ADMINISTRACION\Documents\supabase_backup_lan.sql" -Algorithm SHA256
```

Para verificar el archivo transferido, calcular en Linux `sha256sum ~/supabase_backup_lan.sql` y comparar ambos valores.

## 4. Configurar y preservar el PostgreSQL que ya existe

En el servidor Linux:

```bash
cd ~/mecaytro
docker logs --tail 200 mecaytro-backend
docker inspect mecaytro-postgres --format '{{json .Mounts}}'
docker inspect mecaytro-postgres --format '{{json .Config.Env}}'
```

La inspección puede mostrar variables sensibles; no compartir su salida sin ocultar credenciales. Hacer backup lógico del contenedor PostgreSQL 16 existente antes de detenerlo. El comando solicita la contraseña si la autenticación lo requiere:

```bash
docker exec mecaytro-postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > ~/mecaytro-postgres16-before-cutover.dump
test -s ~/mecaytro-postgres16-before-cutover.dump
sha256sum ~/mecaytro-postgres16-before-cutover.dump
```

Copiar también ese backup fuera del servidor y conservar el volumen antiguo. Solo después de verificar el archivo, detener los contenedores antiguos y renombrar PostgreSQL para liberar el nombre esperado por Compose:

```bash
docker stop mecaytro-backend || true
docker rename mecaytro-backend mecaytro-backend-legacy
docker stop mecaytro-postgres
docker rename mecaytro-postgres mecaytro-postgres-pg16-legacy
```

El contenedor PostgreSQL 16 queda detenido y su volumen no se borra. Si la verificación del backup falla, detenerse aquí y no cambiar el contenedor.

## 5. Importar el SQL filtrado al PostgreSQL nuevo

En el servidor, preparar un archivo real de entorno basado en la plantilla copiada:

```bash
cd ~/mecaytro
cp backend/.env.production.example backend/.env.production
nano backend/.env.production
chmod 600 backend/.env.production
```

Completar secretos y configurar:

```dotenv
NODE_ENV=production
PORT=3000
FRONTEND_URL=http://192.168.20.100
POSTGRES_DB=mecaytro
POSTGRES_USER=mecaytro_app
POSTGRES_PASSWORD=<clave-segura>
DATABASE_URL=postgresql://mecaytro_app:<clave-segura>@mecaytro-postgres:5432/mecaytro?schema=public
JWT_SECRET=<secreto-aleatorio-largo>
CLOUDINARY_CLOUD_NAME=<cloud-name>
CLOUDINARY_API_KEY=<api-key>
CLOUDINARY_API_SECRET=<api-secret>
```

Las credenciales mostradas son marcadores, no valores válidos. Usar una clave de PostgreSQL hexadecimal para evitar problemas de codificación de URL y el mismo valor en `POSTGRES_PASSWORD` y `DATABASE_URL`.

Levantar solo PostgreSQL 18; el volumen PostgreSQL 16 anterior no se monta ni se modifica:

```bash
docker compose --env-file backend/.env.production up -d mecaytro-postgres
docker compose ps
docker exec mecaytro-postgres pg_isready -U mecaytro_app -d mecaytro
```

Importar solo la exportación de `public` usando el cliente `psql` incluido en PostgreSQL 18:

```bash
docker exec -i mecaytro-postgres psql -v ON_ERROR_STOP=1 -U mecaytro_app -d mecaytro < ~/supabase_backup_lan.sql
```

Si el dump de `public` falla por una función externa (por ejemplo `auth.uid()`), owner o extensión, no continuar con el backend: guardar el error y revisar dependencias/políticas en una copia de prueba. No importar el dump completo conocido, no quitar `ON_ERROR_STOP` y no editar el SQL a mano.

Verificar tablas y versión del esquema antes de iniciar la API:

```bash
docker exec -it mecaytro-postgres psql -U mecaytro_app -d mecaytro -c '\dt public.*'
docker exec -it mecaytro-postgres psql -U mecaytro_app -d mecaytro -c 'SELECT count(*) AS usuarios FROM "Usuario";'
```

Comparar el esquema restaurado con `backend/prisma/schema.prisma`. Solo ejecutar `npx prisma migrate deploy` después de confirmar que el historial `_prisma_migrations` de la copia corresponde a las migraciones versionadas de este proyecto. No ejecutar `db push` ni seeds como solución rápida en producción.

## 6. Construir y levantar API/frontend

Una vez restaurada la base y verificado el esquema:

```bash
cd ~/mecaytro
docker compose --env-file backend/.env.production build --no-cache
docker compose --env-file backend/.env.production up -d
docker compose ps
```

El primer build ejecuta `npm ci`, `npx prisma generate` y `npm run build` dentro de la imagen backend. El frontend toma `VITE_API_URL` del build argument de Compose y queda detrás del Nginx del contenedor frontend.

Comprobar logs e endpoints:

```bash
docker compose logs --tail 150 mecaytro-postgres mecaytro-backend mecaytro-frontend
docker inspect --format '{{.State.Health.Status}}' mecaytro-postgres
docker inspect --format '{{.State.Health.Status}}' mecaytro-backend
curl -i http://127.0.0.1/
curl -i http://127.0.0.1/api/
```

La raíz de la API debe responder `Control MT API is running`; `/api/` puede devolver 404 porque las rutas concretas viven debajo de `/api/auth`, `/api/inventory`, etc. Desde otra PC de la LAN abrir `http://192.168.20.100`. Configurar el firewall para permitir TCP 80 y mantener 3000/5432 sin exposición pública.

## 7. Diagnóstico del reinicio del backend

Si vuelve a aparecer `Restarting`:

```bash
docker logs --tail 250 mecaytro-backend
docker inspect mecaytro-backend --format '{{json .State}}'
docker compose --env-file backend/.env.production config
docker exec mecaytro-postgres pg_isready -U mecaytro_app -d mecaytro
```

Errores frecuentes:

- `DATABASE_URL` ausente o con nombre de host incorrecto: dentro de Compose el host es `mecaytro-postgres`, no `localhost` ni la IP del servidor.
- `JWT_SECRET` sin configurar: el servicio actual advierte y cae en un secreto de desarrollo; sustituirlo siempre por un valor propio.
- `P1001` o conexión rechazada: revisar estado `healthy` de PostgreSQL y la URL interna.
- Tabla/columna no encontrada: el dump y `schema.prisma` no corresponden o falta una migración probada.
- Cloudinary 401/404: revisar credenciales, conectividad DNS/salida y que se hayan copiado correctamente.
- Web carga pero API no: comprobar `frontend/.env.production`, `VITE_API_URL`, Nginx y que el build se haya reconstruido después de cambiar la URL.

## 8. Rollback

Si la importación o aplicación falla, mantener detenidos los servicios nuevos, conservar el volumen PostgreSQL 18 para análisis y volver a arrancar el contenedor PostgreSQL 16 antiguo sin eliminar volúmenes:

```bash
docker compose stop mecaytro-frontend mecaytro-backend mecaytro-postgres
docker rename mecaytro-backend mecaytro-backend-new-failed
docker rename mecaytro-backend-legacy mecaytro-backend
docker rename mecaytro-postgres mecaytro-postgres-pg18-failed
docker rename mecaytro-postgres-pg16-legacy mecaytro-postgres
docker start mecaytro-postgres
```

El rollback restaura el servicio anterior, no los cambios de esquema hechos en PostgreSQL 18. No borrar el contenedor/volumen nuevo ni el backup pre-corte hasta validar formalmente la aplicación y el respaldo.