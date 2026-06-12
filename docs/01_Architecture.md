# 01. Arquitectura del Sistema - Control MT

Control MT es un sistema de gestión de producción (ERP/MES) diseñado para optimizar el control de inventarios, órdenes de trabajo, mantenimiento y proyectos especiales en una planta metalmecánica.

## Stack Tecnológico

### Backend
- **Entorno**: Node.js v18+ 
- **Framework**: Express.js (TypeScript)
- **Base de Datos**: SQLite
- **ORM**: Prisma
- **Autenticación**: JWT (JsonWebToken)
- **CORS**: Configurado para dominios específicos (Vercel, localhost, IP local)
- **Manejo de Archivos**: Multer para subida de planos (PDF) e imágenes.

### Frontend
- **Librería**: React.js 18
- **Construcción**: Vite
- **Mobile Persistence**: @capacitor-community/sqlite (Offline-First)
- **Capa de Datos**: Repositorios (Patrón Repository) para abstracción de fuente.
- **Sincronización**: Sync Queue (Cola de cambios atómica)
- **Estilos**: Tailwind CSS 4.0
- **Iconos**: Lucide React
- **Estado**: Zustand (Tiendas ligeras y reactivas)
- **Gráficos**: Recharts
- **PDFs**: jsPDF / jsPDF-AutoTable (para reportes de OT)

---

## Arquitectura de Capas

### Backend (src/)
1. **Controllers**: Gestionan la lógica de negocio y las respuestas HTTP.
2. **Routes**: Definen los endpoints de la API (ej. `/api/orders`, `/api/inventory`).
3. **Services**: Abstraen lógica compleja, como la integración con modelos de IA.
4. **Middleware**: Validaciones, autenticación y procesamiento de archivos.
5. **Utils**: Funciones de ayuda compartidas.

### Frontend (src/)
1. **Pages**: Vistas principales de la aplicación.
2. **Components**: UI reutilizable (Modales, Tablas, Layouts).
3. **Repositories**: Abstraen el acceso a datos. Detectan si la plataforma es nativa para usar SQLite o axios.
4. **Services**: Servicios core como `databaseService` (SQLite) y `syncQueueService`.
5. **Store**: Gestión de estado global mediante Zustand, ahora delegando la persistencia a los Repositorios.
6. **Api**: Configuración de Axios para peticiones directas al backend (usado principalmente en Web).

---

## Flujo de Datos
1. El usuario interactúa con la interfaz (React).
2. Se disparan acciones en las tiendas de **Zustand**.
3. Las tiendas realizan peticiones `HTTP` vía **Axios** al backend.
4. El backend (Express) valida la sesión via `JWT`.
5. El **Controller** procesa la solicitud usando **Prisma** para interactuar con **SQLite**.
6. La respuesta viaja de vuelta al frontend para actualizar la UI.
## Arquitectura Híbrida Offline-First

Control MT utiliza una arquitectura híbrida que se adapta al entorno de ejecución:

1.  **Entorno Web**: La aplicación funciona de manera tradicional, realizando peticiones HTTP directas a la API del backend.
2.  **Entorno Móvil (Capacitor)**:
    -   **Persistencia Local**: Los datos se almacenan en una base de datos SQLite local dentro del dispositivo.
    -   **Operatividad Offline**: El usuario puede crear OTs, registrar movimientos de inventario y completar tareas sin conexión a internet.
    -   **Cola de Sincronización (Sync Queue)**: Cada cambio local se registra en una cola. Cuando se detecta conexión, el sistema intenta sincronizar estos cambios de forma atómica y ordenada con el servidor.
    -   **Conflictos**: Se utiliza una estrategia de "Última escritura gana" con marcas de tiempo para resolver conflictos básicos de sincronización.
