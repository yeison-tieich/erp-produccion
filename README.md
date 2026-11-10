# Control MT - Sistema de Gestión de Producción Industrial

Bienvenido a la documentación oficial de **Control MT**. Este repositorio contiene la implementación actual del ERP/MES de producción metalmecánica, con backend en Node.js/TypeScript, frontend en React/Vite y base de datos PostgreSQL gestionada con Prisma.

## Índice de documentación

La documentación base de la solución está en la carpeta `docs/` y está organizada por dominio:

También se incluye un conjunto operativo específico en [docs/manuales/00_Indice_Manuales.md](docs/manuales/00_Indice_Manuales.md), con procedimientos para usuario, pruebas, modo de trabajo, despliegue y compilación del APK.

1. [01. Arquitectura del Sistema](docs/01_Architecture.md) — stack técnico, flujo de datos y despliegues soportados.
2. [02. Base de Datos](docs/02_Database.md) — modelo Prisma, entidades principales y relaciones.
3. [03. Guía de Módulos](docs/03_Modules.md) — funciones operativas del ERP por área.
4. [04. Documentación Digital y Automatización](docs/04_AI_Features.md) — captura de imágenes, exportación PDF y estado real de automatizaciones IA.
5. [05. Frontend y UX](docs/05_Frontend_UX.md) — patrones de diseño, estado global y experiencia de usuario.
6. [06. Guía de Operación](docs/06_Operations_Guide.md) — configuración, arranque local, build, migraciones y despliegue.
7. [07. Despliegue en Servidor Propio](docs/07_Despliegue_Servidor_Propio.md) — guía de instalación en infraestructura Linux propia.
8. [08. Migración a Supabase y Despliegue LAN](docs/08_Migracion_Supabase_y_Despliegue_LAN.md) — procedimiento operativo para migración y despliegue local.
9. [09. Registro de cambios y despliegue del 2026-10-20](docs/09_Registro_Cambios_Despliegue_2026-10-20.md) — resumen funcional y técnico de la versión publicada, migración de base, corrección de assets y validaciones.

## Estado actual del proyecto

La versión activa del proyecto se apoya en:

- Backend: Node.js + Express + TypeScript
- Base de datos: PostgreSQL + Prisma ORM
- Frontend: React + Vite + TypeScript + Tailwind CSS
- Almacenamiento de imágenes de productos: disco persistente del servidor; otros archivos usan Cloudinary
- Autenticación: JWT
- Descarga/Documentación: PDF, XLSX y exportación web
- Móvil: Capacitor con sincronización local/online cuando la app se ejecuta en dispositivo nativo

Importante: la versión actual no usa SQLite como base de datos principal para producción ni para el backend del ERP. La documentación antigua que mencionaba SQLite debe considerarse obsoleta y fue reemplazada por la guía actual de PostgreSQL/Prisma.

## Inicio rápido

### Backend

```bash
cd backend
npm install
cp .env.example .env
# ajustar DATABASE_URL, JWT_SECRET, FRONTEND_URL, Cloudinary
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

La app web normalmente se abre en `http://localhost:5173`.

## Funcionalidades destacadas

- Control de inventario y materiales por SKU y stock resolviendo consumo, reserva y movimientos.
- Gestión de órdenes de trabajo, rutas y seguimiento de producción.
- Proyectos especiales con fases, piezas y trazabilidad técnica.
- Mantenimiento preventivo y control de recursos.
- Herramientas, préstamos y control de dotación.
- Calidad, inspecciones y no conformidades.
- Reportes PDF, exportaciones y dashboard ejecutivo.

## Recomendación de lectura

Para poner en marcha el entorno, comenzar por:

1. [06. Guía de Operación](docs/06_Operations_Guide.md)
2. [07. Despliegue en Servidor Propio](docs/07_Despliegue_Servidor_Propio.md)
3. [08. Migración a Supabase y Despliegue LAN](docs/08_Migracion_Supabase_y_Despliegue_LAN.md)

---

© 2026 Control MT - Todos los derechos reservados.
