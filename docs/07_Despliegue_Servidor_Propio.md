# Despliegue de Control MT en servidor propio

Guía para alojar la aplicación web en un servidor Linux propio (por ejemplo, Ubuntu LTS) con PostgreSQL, Node.js y Nginx. La API se ejecuta como servicio persistente y el frontend se publica como archivos estáticos.

> **Importante:** esta guía corresponde al código actual. `backend/prisma/schema.prisma` declara PostgreSQL, aunque algunos documentos antiguos todavía mencionan SQLite. No se debe usar SQLite para el backend de esta versión.

## 1. Arquitectura desplegada

```text
Navegador
   │ HTTPS
   ▼
Nginx ───────────────► frontend/dist (React/Vite)
   │ /api/* y /uploads/*
   ▼
Backend Express/Node.js (puerto interno 3000)
   ├── PostgreSQL (Prisma)
   └── Cloudinary (archivos e imágenes subidos)
```

El frontend y el backend pueden compartir un dominio. Nginx sirve la web y envía las rutas `/api/` al backend. PostgreSQL debe aceptar conexiones solo desde el servidor de aplicación o la red privada.

## 2. Estructura del repositorio

```text
.
├── backend/
│   ├── src/
│   │   ├── controllers/   # Lógica HTTP y de negocio
│   │   ├── middleware/    # Autenticación y autorización JWT
│   │   ├── routes/        # Rutas /api/*
│   │   ├── services/      # Servicios de dominio
│   │   ├── utils/         # Cloudinary, PDF y utilidades
│   │   ├── prisma.ts
│   │   ├── server.ts       # Servidor Express; escucha en 0.0.0.0
│   │   └── index.ts        # Punto de entrada compilado para producción
│   ├── prisma/
│   │   ├── schema.prisma  # Modelo de datos PostgreSQL
│   │   └── migrations/    # Historial actual de migraciones
│   ├── public/            # Recursos estáticos servidos en /public
│   ├── uploads/           # Directorio servido en /uploads
│   ├── package.json
│   └── tsconfig.json      # Compila src/ a dist/
├── frontend/
│   ├── src/               # React, vistas, stores, repositorios
│   ├── public/            # Recursos incluidos en la web
│   ├── package.json
│   ├── vite.config.ts
│   └── .env.production    # URL de API usada al compilar
├── functions/             # Código separado para Firebase Functions; no requerido
└── docs/
```

## 3. Tecnologías y dependencias

### Backend

- Node.js y npm; TypeScript 5; Express 5.
- Prisma 5 y `@prisma/client` para PostgreSQL.
- `jsonwebtoken` y `bcryptjs` para tokens y contraseñas.
- `cors`, `dotenv`, `multer` para API, configuración, CORS y recepción de archivos.
- `cloudinary` para archivos subidos (fotos, planos, remisiones y documentos).
- `pdfkit`, `xlsx`, `axios` y `zod` para generación PDF, hojas de cálculo, HTTP y validación.
- Herramientas de desarrollo: `typescript`, `ts-node` y `nodemon`.

### Frontend web

- React 18, TypeScript, Vite 6 y React Router.
- Tailwind CSS 4, `@tailwindcss/vite`, `lucide-react`.
- Axios y Zustand para HTTP y estado.
- Recharts, date-fns, jsPDF, jspdf-autotable y xlsx para gráficos, fechas y exportaciones.
- Capacitor y `@capacitor-community/sqlite` se usan para el cliente móvil; no sustituyen PostgreSQL en el servidor web.

Las versiones exactas instaladas están fijadas por `backend/package-lock.json` y `frontend/package-lock.json`. Instalar con `npm ci` para reproducirlas. La carpeta `functions/` es un proyecto independiente y no se necesita para desplegar la aplicación web/API.

## 4. Requisitos del servidor

- Linux de 64 bits con acceso administrativo y conexión a Internet.
- Node.js LTS compatible con las dependencias (se recomienda Node 20 LTS) y npm.
- PostgreSQL compatible con Prisma 5.
- Nginx o un proxy inverso equivalente; dominio y certificado TLS para acceso externo.
- Espacio de disco para código, logs y respaldos. Cloudinary almacena los archivos subidos por la aplicación.
- Reglas de firewall: publicar únicamente HTTP/HTTPS (80/443) y SSH administrado; mantener privado el puerto de PostgreSQL. El puerto 3000 no necesita exponerse públicamente.

## 5. Variables de entorno

Crear `backend/.env` fuera del control de versiones, con permisos de lectura restringidos:

```dotenv
NODE_ENV=production
PORT=3000
DATABASE_URL="postgresql://usuario:clave@127.0.0.1:5432/control_mt?schema=public"
JWT_SECRET="REEMPLAZAR_POR_UN_SECRETO_ALEATORIO_LARGO"
FRONTEND_URL="https://erp.ejemplo.com"
CLOUDINARY_CLOUD_NAME="..."
CLOUDINARY_API_KEY="..."
CLOUDINARY_API_SECRET="..."
```

- `DATABASE_URL`, `JWT_SECRET` y `PORT` son consumidas por el backend. `PORT` usa 3000 por defecto.
- `FRONTEND_URL` añade el origen web permitido por CORS. El código también contiene algunos orígenes antiguos; para producción, especificar el dominio real y comprobarlo en `backend/src/server.ts`.
- Las tres variables de Cloudinary las consume el servicio de medios. Configurar una cuenta Cloudinary para que las funciones de carga puedan operar.
- Generar `JWT_SECRET` aleatoriamente, mantenerlo privado y no reutilizar el valor de desarrollo. El fallback presente en el código no es aceptable como configuración de producción.
- Codificar caracteres especiales de usuario/clave de PostgreSQL en la URL de conexión.

Para el frontend, definir `VITE_API_URL` antes de construirlo. En `frontend/.env.production` o en el entorno de build:

```dotenv
VITE_API_URL=https://erp.ejemplo.com
```

Si se separa el API en otro subdominio, por ejemplo `https://api.ejemplo.com`, usar esa URL y establecer exactamente el origen web en `FRONTEND_URL`. Las variables `VITE_*` quedan incorporadas en los archivos públicos del build: nunca poner secretos en ellas. Esta compilación no lee las variables del servidor una vez publicada.

## 6. Preparación de base de datos y migraciones

1. Crear una base de datos y un usuario PostgreSQL dedicados a la aplicación, con permisos únicamente sobre esa base.
2. Configurar `DATABASE_URL` y comprobar conectividad desde el servidor de aplicación.
3. Antes de aplicar cambios, hacer backup y validar la versión del esquema en un entorno de pruebas.

**Bloqueo importante para una instalación nueva:** el directorio `backend/prisma/migrations/` contiene actualmente una sola migración tardía que modifica tablas existentes; no es una migración inicial que cree todo el modelo. Por tanto, `npx prisma migrate deploy` por sí solo no inicializa una base vacía con todas las tablas. Revisar y completar formalmente el historial de migraciones antes de desplegar sobre una base nueva.

No ejecutar `prisma db push` automáticamente en producción: sincroniza el esquema sin aportar el historial normal de migraciones. Si el despliegue debe partir de una base creada previamente, confirmar que su esquema y datos corresponden a esta revisión, respaldar primero y aplicar solo los cambios aprobados. Las migraciones de producción deben quedar versionadas y probadas.

## 7. Instalación y compilación

Ejecutar desde la raíz del repositorio en el servidor o en un proceso de CI que compile los artefactos:

```bash
# Backend
cd backend
npm ci
npx prisma generate
npm run build

# Frontend: configurar VITE_API_URL antes de compilar
cd ../frontend
npm ci
npm run build
```

Resultados:

- Backend compilado: `backend/dist/index.js` (arranque) y `backend/dist/server.js` (servidor).
- Frontend compilado: `frontend/dist/`; Nginx publica el contenido de esta carpeta.
- El script `postinstall` del backend también ejecuta `prisma generate`; el comando explícito permite verificar la generación durante el despliegue.

No usar `npm run dev` ni `vite preview` como procesos de producción. No ejecutar `npm run seed:all` en producción: incluye `backend/prisma/seed.js`, que elimina registros de producción como órdenes, productos, materias primas y clientes.

## 8. Ejecutar el backend como servicio

El backend ofrece `npm start`, que ejecuta `node dist/index.js`. Gestionarlo mediante `systemd`, PM2 o el supervisor operativo de la organización para que reinicie ante fallos y arranque con el sistema. Ejemplo conceptual para `systemd`:

```ini
[Unit]
Description=Control MT API
After=network.target postgresql.service

[Service]
Type=simple
User=controlmt
WorkingDirectory=/opt/control-mt/backend
EnvironmentFile=/opt/control-mt/backend/.env
ExecStart=/usr/bin/node /opt/control-mt/backend/dist/index.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Ajustar rutas, usuario y ubicación real de Node.js. Ejecutar la API con un usuario sin privilegios, no como `root`. El servidor escucha en `0.0.0.0`; restringir el acceso externo mediante firewall y proxy inverso.

## 9. Nginx y HTTPS

Configurar Nginx para servir el build y enviar las llamadas API al proceso Node. Ejemplo base; reemplazar dominio y rutas:

```nginx
server {
    listen 80;
    server_name erp.ejemplo.com;

    root /opt/control-mt/frontend/dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 25m;
    }

    location /uploads/ {
        proxy_pass http://127.0.0.1:3000/uploads/;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

La aplicación sirve también recursos en `/public`, `/images` y `/uploads`; si se accede a esas rutas en producción, enviarlas al backend con Nginx o publicar los recursos estáticos necesarios. Activar HTTPS con un certificado válido y redirigir HTTP a HTTPS. Después, comprobar CORS, rutas profundas de React y el acceso a `/` del backend (`Control MT API is running`).

## 10. Despliegues posteriores

1. Hacer backup de PostgreSQL y conservar el build actualmente publicado para rollback.
2. Obtener la revisión aprobada del repositorio y ejecutar `npm ci` en backend y frontend.
3. Generar Prisma Client y compilar backend y frontend; definir `VITE_API_URL` en el build.
4. Revisar/aplicar únicamente migraciones ya probadas y compatibles con el esquema actual.
5. Reiniciar el servicio API y publicar `frontend/dist` de forma atómica.
6. Verificar inicio de sesión, módulos principales, cargas de archivos y logs; revertir build/código si falla la validación.

## 11. Seguridad, archivos y respaldos

- Mantener `.env`, credenciales de PostgreSQL y llaves de Cloudinary fuera del repositorio y de los logs.
- Usar HTTPS para web y API. El JWT protege las rutas del API; restringir la administración y mantener secretos rotables.
- Las cargas de archivos se reciben en memoria y se envían a Cloudinary. Asegurar límites de tamaño adecuados en Nginx y Cloudinary; el ejemplo fija 25 MB como límite del proxy.
- Respaldar PostgreSQL con una política periódica y probar restauraciones. Guardar backups cifrados fuera del mismo disco/servidor.
- Los datos subidos a Cloudinary tienen ciclo de vida separado de PostgreSQL; proteger y revisar la cuenta, cuotas y backups/retención.
- Revisar `backend/uploads`, `backend/public` e `Inventario Producto_Images` si se conservan recursos locales o estáticos; preservar permisos y copiarlos al cambiar de servidor. La carpeta de imágenes del inventario se expone bajo `/images`.
- Centralizar logs del servicio, vigilar espacio libre, disponibilidad del API, PostgreSQL y uso de Cloudinary.

## 12. Lista de comprobación

- [ ] DNS apunta al servidor y TLS está activo.
- [ ] PostgreSQL está disponible solo en red privada y se confirmó la estrategia de migraciones.
- [ ] `backend/.env` tiene secretos propios del entorno; `JWT_SECRET` no usa el fallback.
- [ ] Credenciales de Cloudinary son válidas y se probó una carga real.
- [ ] `VITE_API_URL` apunta a la URL pública correcta y se reconstruyó el frontend.
- [ ] `FRONTEND_URL` coincide con el origen real de la web.
- [ ] El proceso backend arranca automáticamente y Nginx no publica directamente el puerto 3000.
- [ ] Se probaron inicio de sesión, rutas SPA, API autenticada, recursos y subida de archivos.
- [ ] Existe backup reciente y se conoce el procedimiento de restauración.

## Referencias del repositorio

- `backend/package.json`, `frontend/package.json`.
- `backend/src/server.ts`, `backend/src/utils/cloudinary.ts`.
- `backend/prisma/schema.prisma`, `backend/prisma/migrations/`.
- `frontend/src/api.ts`, `frontend/.env.production`.