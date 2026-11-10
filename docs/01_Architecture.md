# 01. Arquitectura del Sistema - Control MT

Control MT es un ERP/MES para gestión industrial y de producción. Su objetivo es centralizar inventario, personal, maquinaria, órdenes de trabajo, proyectos especiales, calidad, mantenimiento y trazabilidad operativa en una sola solución.

## Stack tecnológico actual

### Backend
- Node.js + TypeScript
- Express 5
- Prisma ORM
- PostgreSQL
- JWT para autenticación
- CORS y middleware de seguridad
- Multer para cargas; fotos de productos en disco local y otros archivos/documentos en Cloudinary

### Frontend
- React 18 + TypeScript
- Vite
- Zustand para estado global
- Tailwind CSS 4
- Axios para llamadas HTTP
- Recharts, jsPDF, XLSX para reportes y analítica
- Capacitor para soporte móvil nativo

### Base de datos
- PostgreSQL como motor principal
- Prisma como capa de acceso y migraciones
- Variables de entorno por entorno (`DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`, Cloudinary)

> Nota: la versión actual del proyecto se ejecuta con PostgreSQL. Las referencias antiguas a SQLite deben considerarse obsoletas para el backend de producción.

## Arquitectura general

```text
Navegador / App Web / App Móvil
        │
        ▼
   Frontend React
   - páginas y dashboards
   - repositorios y stores
   - exportación PDF/XLSX
   - sincronización movil/offline
        │
        ▼
   Backend Express / TypeScript
   - autenticación JWT
   - rutas REST por módulo
   - validaciones y servicios
   - almacenamiento local para fotos de productos e integración con Cloudinary para otras cargas
        │
        ▼
   PostgreSQL + Prisma
   - usuarios, inventario, OT, clientes, productos
   - proyectos, herramientas, mantenimiento
   - calidad, personal y finanzas
```

## Capacidades del sistema

### 1. Capa de presentación
El frontend se organiza por módulos funcionales y reutiliza componentes visuales para tablas, formularios, filtros y dashboards.

### 2. Capa de negocio
El backend centraliza la lógica de negocio en rutas y controladores, separando responsabilidades y dejando la persistencia en Prisma.

### 3. Capa de datos
Prisma expone los modelos de negocio sobre PostgreSQL y coordina migraciones, validaciones y acceso a datos.

## Estructura del repositorio

```text
backend/
  src/
    controllers/
    routes/
    middleware/
    services/
    utils/
    server.ts
    index.ts
  prisma/
    schema.prisma
    migrations/
  public/
  uploads/
  package.json

frontend/
  src/
  public/
  package.json
  vite.config.ts

docs/
  01_Architecture.md
  02_Database.md
  ...
```

## Flujo de datos

1. El usuario interactúa con la UI web o móvil.
2. El frontend consulta o envía datos mediante Axios o repositorios.
3. El backend valida autenticación, permisos y entrada.
4. Los controladores usan Prisma para consultar o persistir datos en PostgreSQL.
5. Se emiten respuestas JSON y recursos estáticos (imágenes, PDFs, archivos adjuntos).
6. En entorno móvil, se usa sincronización local con cola de cambios y envío posterior al servidor.

## Modo de despliegue

El proyecto soporta varios patrones de despliegue:

- Web estándar en servidor propio
- Docker Compose para backend y base de datos
- Nginx como proxy inverso para frontend y API
- LAN local con IP privada para equipos del taller
- Supabase como entorno de datos migrado/alternativo para validación o transición

## Observaciones de arquitectura

- La API se publica por endpoint REST bajo `/api/*`.
- El frontend se sirve como aplicación SPA con Vite.
- Las fotos de productos se almacenan en `backend/uploads/products`; otros archivos se guardan en Cloudinary o en rutas públicas del backend según el caso.
- Las credenciales y secretos deben permanecer fuera del repositorio y gestionados por entorno.
- La app usa una arquitectura híbrida: web estándar y móvil con capacidades offline donde aplica.

## Referencias de implementación

- `backend/src/server.ts`
- `backend/prisma/schema.prisma`
- `frontend/src/`
- `backend/package.json`
- `frontend/package.json`
