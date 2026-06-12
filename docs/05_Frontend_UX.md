# 05. Frontend y Experiencia de Usuario (UX) - Control MT

El frontend está diseñado para ser rápido, intuitivo y visualmente premium, facilitando el uso tanto en computadoras de oficina como en dispositivos móviles en el taller.

## Diseño Visual
- **Framework**: Tailwind CSS (Utilizando la versión 4.0 para mayor rendimiento).
- **Estética**: Estilo "Glassmorphism" con fondos desenfocados, bordes redondeados (`rounded-2xl`, `rounded-3xl`) y sombras sutiles.
- **Paleta de Colores**: Basada en tonos "Brand" (asociados a la identidad corporativa de MT) y colores de estado claros para prioridad y progreso.
- **Responsividad**: Diseño móvil-primero para que los operarios puedan reportar tareas desde tablets o celulares.

## Gestión de Estado y Datos
Se utiliza **Zustand** para la gestión de estados volátiles y la UI, apoyado por una capa de **Repositorios** para la persistencia.

- **Patrón Repository**: Actúa como fuente única de verdad. Decide si los datos provienen de la API (Web) o de SQLite (Mobile).
- **SyncQueue Service**: Gestiona la cola de operaciones pendientes de sincronización.
- **Auth Store**: Gestiona el usuario actual y la persistencia del token JWT.
- **Orders Store**: Centraliza la lógica de OTs, integrando con el repositorio de órdenes.
- **Inventory Store**: Gestiona el stock, delegando el guardado al `materiaPrimaRepository`.

### Interceptores de Axios
- El sistema incluye un interceptor que inyecta automáticamente el `Bearer Token` en cada petición saliente, garantizando que el usuario esté siempre autenticado ante el servidor.

## Patrones de Navegación
- **Dashboard Layout**: Una barra lateral persistente (Sidebar) con acceso rápido a todos los módulos.
- **Modales de Acción**: Las ediciones y creaciones rápidas se realizan a través de modales (`fixed inset-0`) para mantener el contexto del usuario.
- **Filtros Dinámicos**: Búsqueda instantánea en tablas y filtrado por estados (Activo, Pendiente, Terminado).

## Sincronización y Estado Offline
Para mejorar la transparencia hacia el usuario, el sistema incluye:
- **Sync Indicator**: Un componente visual en el encabezado que muestra el estado de la sincronización (Sincronizado, Pendiente, Sincronizando).
- **Offline Badges**: Etiquetas visuales que indican si un registro fue creado localmente y aún no ha sido subido al servidor.
- **Optimistic UI**: Las operaciones locales se reflejan instantáneamente en la interfaz antes de que se complete la sincronización con el servidor.

## Retroalimentación al Usuario
- **Skeleton Loaders**: Estados de carga visual para evitar saltos de contenido.
- **Confirmaciones Premium**: Diálogos de confirmación estilizados para acciones críticas.
- **Indicadores de Progreso Real-Time**: Barras de progreso visuales para OTs y fases de proyectos especiales.
