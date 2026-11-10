# 06. Guía de Operación - Control MT

Esta guía describe la forma correcta de levantar, configurar y desplegar Control MT en desarrollo y producción. La documentación aplica a la versión actual del proyecto y refleja la infraestructura real del backend con PostgreSQL, Prisma y frontend React.

## 1. Requisitos previos

- Node.js LTS (recomendado 20 o posterior)
- npm
- PostgreSQL funcional y accesible
- acceso a un dominio o IP para despliegue web
- credenciales Cloudinary válidas
- permisos de escritura para el entorno de despliegue

## 2. Estructura del proyecto

```text
backend/
  src/
  prisma/
  public/
  uploads/
  package.json

frontend/
  src/
  public/
  package.json
  vite.config.ts

docs/
```

## 3. Variables de entorno

Crear un archivo `.env` en la carpeta `backend` con las variables mínimas:

```dotenv
NODE_ENV=development
PORT=3000
DATABASE_URL="postgresql://usuario:password@host:5432/control_mt?schema=public"
JWT_SECRET="cambiar_por_un_secreto_largo_y_aleatorio"
FRONTEND_URL="http://localhost:5173"
CLOUDINARY_CLOUD_NAME="tu_cloud_name"
CLOUDINARY_API_KEY="tu_api_key"
CLOUDINARY_API_SECRET="tu_api_secret"
```

### Variables importantes
- `DATABASE_URL`: es la conexión principal de PostgreSQL
- `JWT_SECRET`: obligatorio para firma y validación de sesión
- `FRONTEND_URL`: origen permitido por el backend en CORS
- `Cloudinary_*`: necesarios para planos PDF, remisiones y otros documentos; las fotos de productos se almacenan en `backend/uploads/products`

> Nunca guardar secretos en el repositorio ni en logs del sistema.

## 4. Instalación del backend

```bash
cd backend
npm install
npx prisma generate
npm run dev
```

### Verificación

- confirmar que el backend arrancó en puerto 3000
- validar `GET /` responde con `Control MT API is running`
- verificar que Prisma puede conectarse a PostgreSQL

## 5. Instalación del frontend

```bash
cd frontend
npm install
npm run dev
```

La app web normalmente se sirve en:

```text
http://localhost:5173
```

## 6. Compilación para producción

### Backend

```bash
cd backend
npm ci
npx prisma generate
npm run build
```

### Frontend

Antes de compilar, definir la URL de API pública en `frontend/.env.production` o al momento del build:

```dotenv
VITE_API_URL=https://erp.ejemplo.com
```

```bash
cd frontend
npm ci
npm run build
```

## 7. Base de datos y migraciones

### Recomendación de flujo

1. crear la base de datos PostgreSQL
2. definir `DATABASE_URL`
3. ejecutar migraciones desde el backend
4. validar con datos de prueba
5. hacer backup antes del despliegue operativo

### Comandos útiles

```bash
cd backend
npx prisma migrate status
npx prisma migrate deploy
```

En desarrollo local también se puede usar `db push` cuando se está iterando sobre esquema, pero en producción es mejor respetar el historial de migraciones y versionado.

## 8. Despliegue recomendado

### Opción A: servidor propio

- levantar backend como servicio en Node
- servir frontend con Nginx
- mantener PostgreSQL en red interna o privada
- aplicar SSL y proxy inverso

Se recomienda la guía de despliegue en:

- [07. Despliegue en Servidor Propio](07_Despliegue_Servidor_Propio.md)

### Opción B: Docker

El repositorio incluye archivos de Compose para una infraestructura de contenedores, así que es posible desplegar el backend y la base de datos en un servicio aislado y reproducible.

```bash
docker compose up --build -d
```

Ajustar variables del entorno antes de levantar contenedores en producción.

## 9. Backup y rollback

Antes de desplegar cambios críticos:

- respaldar PostgreSQL
- conservar el último build funcional
- documentar la versión del commit desplegada
- probar acceso a login, API y módulos clave

### Rollback

- reimplementar la versión estable anterior del build
- reactivar el servicio o el frontend anterior si hace falta
- restaurar la base de datos si la migración tuvo efectos de esquema o datos

## 10. Seguridad operativa

- no publicar `.env` ni secretos
- usar HTTPS en producción
- limitar acceso a PostgreSQL y puertos internos
- revisar permisos y firewall del servidor
- revisar logs del backend y del reverse proxy
- establecer políticas de backup y rotación de secretos

## 11. Checklist de despliegue

- [ ] PostgreSQL disponible y correcto
- [ ] `backend/.env` configurado
- [ ] `JWT_SECRET` definido con valor real
- [ ] `CLOUDINARY_*` configuradas
- [ ] `FRONTEND_URL` coincide con la URL real
- [ ] frontend compilado con `VITE_API_URL` correcta
- [ ] backend compilado y corriendo en producción
- [ ] Nginx o proxy inverso configurado
- [ ] backup realizado antes del cambio
- [ ] pruebas de login, inventario y OT ejecutadas

## Referencias

- `backend/package.json`
- `frontend/package.json`
- `backend/prisma/schema.prisma`
- `backend/src/server.ts`
- `docs/07_Despliegue_Servidor_Propio.md`
- `docs/08_Migracion_Supabase_y_Despliegue_LAN.md`