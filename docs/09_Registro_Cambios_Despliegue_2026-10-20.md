# Registro de cambios y despliegue — 2026-10-20 y 2026-11-05

## Resumen

Este documento registra la actualización del ERP Control MT publicada el 20 de octubre de 2026 y la publicación complementaria del flujo de planos PDF del 5 de noviembre de 2026 en el servidor LAN `srv-mecaytro` (`192.168.20.100`). Incluye cambios funcionales del backend y frontend, evolución de la base, operación de despliegue, el incidente de MIME de los assets y sus verificaciones.

La publicación inicial mantuvo PostgreSQL 16 y no ejecutó seeds. En la publicación complementaria se conservó el mismo PostgreSQL 16 y su volumen; Docker Compose recreó el contenedor de base de datos durante la actualización y volvió a quedar saludable. No se borraron volúmenes ni se ejecutaron migraciones de base de datos en esa publicación.

## Alcance funcional publicado

### Panel ejecutivo y navegación

- Se agregó un dashboard gerencial global que consolida producción, órdenes activas/atrasadas, inventario crítico, productos incompletos, indicadores de calidad y estado de máquinas.
- El dashboard actualiza el resumen periódicamente y presenta carga, error y reintento.
- Se ajustó la navegación y el layout del dashboard para mostrar módulos según el rol y los permisos del usuario.

### Usuarios y permisos

- Se amplió la administración de usuarios y roles con edición desde panel lateral (`SideDrawer`) y visualización/edición de la matriz de permisos.
- Se agregó una utilidad frontend para interpretar permisos por módulo y decidir visibilidad de navegación.
- En el backend se añadió `authorizeModulePermission`, que clasifica operaciones de consulta, creación, edición, eliminación y exportación; se conectó a inventario, órdenes, tareas, clientes, personal, máquinas/mantenimiento, proyectos especiales, herramientas/préstamos, pedidos y finanzas.
- Se ajustaron las rutas y respuestas de autenticación y usuarios para los datos de permisos y el acceso asociado a cuentas.
- Las rutas de Calidad siguen requiriendo autenticación. No se conectó a ellas el middleware de permisos por módulo en esta publicación; tenerlo en cuenta si Calidad debe tener permisos granulares distintos.

### Productos, inventario y captura de imágenes

- Se renovaron formularios y paneles de producto con paneles laterales y flujo de captura de imagen desde cámara o galería.
- Se incorporó almacenamiento local de imágenes de producto en `backend/uploads/products`, servido por `/uploads`.
- La carga de imágenes restringe tipos MIME admitidos y limita el tamaño del archivo a 10 MB.
- El 5 de noviembre se publicó el control visible de plano técnico PDF al crear y editar productos. El frontend valida extensión/tipo y limita el archivo a 24 MB; al crear un producto, primero crea el registro y luego adjunta el plano.
- La carga PDF ya no se envía a Cloudinary: Express comprueba la firma `%PDF-`, asigna un nombre aleatorio y guarda en `backend/uploads/products/plans`; `Producto.plano_pdf_url` guarda la ruta `/uploads/products/plans/<nombre>.pdf`. Al reemplazar un plano local anterior, limpia el archivo anterior. Las URLs Cloudinary históricas continúan válidas hasta reemplazarlas.
- Se configuró el volumen `./backend/uploads:/app/uploads` en el Compose versionado y el bind mount equivalente `/opt/mecaytro/backend/uploads:/app/uploads` en el Compose operativo del servidor. Antes de activarlo se respaldó el directorio del host y se preservó la única imagen de producto encontrada dentro del contenedor, sin sobrescribir archivos existentes.
- Se agregó el script `migrate:product-images` para copiar imágenes referenciadas desde Cloudinary al almacenamiento local. El script valida host y protocolo Cloudinary, tipo de contenido, evita sobrescritura y deja registro de fallos; no elimina los originales.
- Se añadieron utilidades compartidas de cámara para Android/Capacitor y navegador. El componente de inventario para entradas de stock permite adjuntar evidencia desde la cámara o galería.
- Se actualizaron vistas de inventario, existencias, productos y visualización de gráficos; también se ajustó la conversión de rutas de recursos para compatibilidad de imágenes históricas con el servidor actual.

### Calidad

- Se ampliaron los servicios, rutas y pantallas de calidad para cubrir instrumentos de medición, control de cambios de ingeniería, costos de no calidad, aceptación de política ética, evaluación de contexto y compromisos de dirección.
- Se añadieron vistas de calidad para documentación SGC, inspecciones, riesgos/auditorías, proveedores y dashboard.
- Se actualizaron las relaciones y el modelo de datos para vincular instrumentos con mediciones, cambios de ingeniería con producto/BOM/rutas y costos con no conformidades o reclamos.
- Se incorporaron registros de auditoría y restricciones de inmutabilidad en las tablas de auditoría de calidad y costo de no calidad.

### Interfaz adicional

- Se agregó `SideDrawer` como componente reutilizable.
- Se actualizaron login, pedidos, configuración, usuarios, inventario, órdenes, productos y el layout general para alinear la experiencia visual y el acceso a las nuevas funciones.
- Se incorporaron ajustes de estilos globales, etiqueta de página y configuración de Capacitor para el modo de despliegue móvil actual.

## Cambios de datos

La migración aplicada en producción fue:

```text
backend/prisma/migrations/20261019_quality_controls/migration.sql
```

Esta migración:

- crea los enums `CategoriaMatriz`, `EstadoControlCambio` y `CategoriaCostoCalidad`;
- amplía `RiesgoCalidad` con clasificación de oportunidad y puntuaciones asociadas;
- amplía `Proveedor` con evaluación climática y ambiental;
- crea `InstrumentoMedicion`, `ControlCambioIngenieria`, `CostoNoCalidad`, `AceptacionEtica`, `EvaluacionContextoCalidad` y `CompromisoDireccionCalidad`;
- relaciona instrumentos con mediciones y cambios/costos/aceptaciones/compromisos con las entidades correspondientes;
- crea índices y claves foráneas;
- impide la mutación posterior de registros de auditoría y costo mediante triggers.

La migración fue aplicada con Prisma sobre la base configurada para producción. El resultado de `prisma migrate status` después del despliegue fue:

```text
4 migrations found in prisma/migrations
Database schema is up to date!
```

## Corrección posterior a la publicación: MIME de JavaScript

Tras actualizar el frontend, el navegador mostró:

```text
Failed to load module script: Expected a JavaScript-or-Wasm module script
but the server responded with a MIME type of "text/html".
```

La causa fue que la carpeta `assets` copiada con SCP tenía permisos `700`. Nginx no podía recorrerla/leer los archivos y la regla SPA devolvía `index.html` (`text/html`) al pedir un `.js`.

Correcciones publicadas:

1. Se aplicó `chmod -R a+rX /opt/mecaytro/frontend/dist`.
2. Se actualizó `frontend/nginx.conf`:
   - la raíz y `/index.html` envían `Cache-Control: no-store` para facilitar que el navegador reciba el HTML más reciente;
   - `/assets/` sirve archivos existentes directamente y responde `404` si faltan, sin reemplazarlos por el HTML;
   - los assets generados por Vite se pueden cachear como inmutables.
3. Se recreó el contenedor Nginx para tomar la nueva configuración y el directorio publicado.

## Publicación del flujo de planos PDF — 2026-11-05

- Se transfirieron `products.controller.ts` y `products.routes.ts`; el backend compiló en Docker y arrancó correctamente.
- Se publicó el build de frontend y se recreó únicamente el contenedor Nginx usando el overlay LAN. El Compose activo del backend quedó con almacenamiento persistente en `/opt/mecaytro/backend/uploads`.
- Se creó el respaldo previo en `/opt/mecaytro/backups/pdf-rollout-20261105-01/`, incluyendo el directorio `uploads`, el build del frontend, el Compose activo y las versiones anteriores de los archivos de productos. También se etiquetó la imagen de backend anterior como `mecaytro-backend:before-pdf-20261105`.
- El directorio del host contenía 74 archivos y el contenedor anterior tenía una imagen de producto adicional. Se conservaron los 75 archivos en el almacenamiento montado. No se sobrescribieron cargas, referencias de planos ni datos de producto.
- Verificaciones: página principal HTTP 200; bundle JavaScript HTTP 200 con `application/javascript`; API HTTP 200; imagen local HTTP 200; prueba estática temporal de PDF HTTP 200 con `application/pdf`; configuración Nginx válida; backend y PostgreSQL `16.15` activos y saludables. Se verificó que el bundle publicado contiene la etiqueta “Plano técnico PDF” y que un archivo en el host se lee desde `/app/uploads` con el mismo SHA-256.
- No se modificó ninguna referencia real de plano ni se hizo una carga autenticada de prueba contra un producto de producción. La verificación comprobó el build, el almacenamiento compartido y la entrega estática del PDF; la prueba funcional de carga debe hacerse desde la aplicación con un producto autorizado.

## Inventario de archivos modificados

### Backend

- `backend/package.json`
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/20261019_quality_controls/migration.sql`
- `backend/scripts/migrate-product-images-to-local.ts`
- `docker-compose.yml` (montaje persistente de `backend/uploads`)
- `backend/src/controllers/`: autenticación, dashboard, finanzas, productos, calidad, configuración y usuarios.
- `backend/src/middleware/auth.middleware.ts`
- `backend/src/middleware/modulePermissions.middleware.ts`
- `backend/src/routes/`: dashboard, productos, calidad y usuarios.
- `backend/src/server.ts`

### Frontend

- Aplicación y navegación: `frontend/src/App.tsx`, `frontend/src/layouts/DashboardLayout.tsx`, `frontend/src/pages/GlobalMasterDashboard.tsx`.
- Componentes y utilidades: `frontend/src/components/ui/SideDrawer.tsx`, componentes de inventario y productos, `frontend/src/utils/camera.ts`, `frontend/src/utils/permissions.ts`.
- Formulario de productos: selección de plano PDF al crear/editar, vista de plano existente y estado del archivo seleccionado.
- Páginas: login, inventario, órdenes, productos, configuración, usuarios y pantallas de calidad.
- Datos y estado: `frontend/src/api.ts`, `frontend/src/services/qualityService.ts`, stores de autenticación y configuración.
- Estilos y recursos: `frontend/src/index.css`, `frontend/index.html`, `frontend/capacitor.config.ts`, `frontend/.env.production`, `frontend/nginx.conf`.
- Dependencias: `frontend/package.json` y `frontend/package-lock.json`.

### Documentación

- Se revisaron README y guías de arquitectura, base de datos, módulos, automatización, UX, operación y despliegue.
- Se actualizó la guía de migración/despliegue LAN para registrar el estado real, precauciones de permisos de assets y validación de esta publicación.
- Los manuales operativos están en `docs/manuales/`.
- El manual de subida al servidor documenta el volumen persistente y el flujo de carga del plano PDF.

## Infraestructura y respaldo

- Servidor: `srv-mecaytro`, acceso LAN por `192.168.20.100`.
- Backend: contenedor `mecaytro-backend`, puerto publicado solo en `127.0.0.1:3000`.
- Frontend: Nginx `mecaytro-frontend`, publicado en el puerto 80.
- Base: contenedor `mecaytro-postgres`, imagen `postgres:16-alpine`; se mantuvo el volumen existente.
- Respaldo previo a migración/publicación:
  - servidor: `/opt/mecaytro/backups/mecaytro-predeploy-20261020-1142.dump`;
  - PC de despliegue: `C:\Users\ADMINISTRACION\Documents\mecaytro-predeploy-20261020-1142.dump`;
  - SHA-256 verificado en ambas copias: `23b4609a11c7aca9d8a7223462acef7ae248ec1d65d7d93cafdb0d4c939eae7a`.
- Build web anterior conservado en: `/opt/mecaytro/frontend/dist.previous-20261020-1142-current`.
- También se creó `/opt/mecaytro/backups/source-predeploy-20261020-1142.tar.gz`, con una copia previa del backend fuente, esquema/migraciones Prisma, recursos públicos y build/configuración Nginx del frontend. No contiene los archivos `.env`.
- Los archivos `.env` del servidor fueron ajustados a permisos `600`; sus valores no se documentan aquí.

## Validaciones de despliegue

| Comprobación | Resultado |
|---|---|
| `npm run build` del backend | Correcto |
| `npm run build` del frontend | Correcto; Vite advirtió sobre el tamaño del bundle principal |
| `prisma validate` | Esquema válido |
| `prisma migrate deploy` | Aplicó `20261019_quality_controls` |
| `prisma migrate status` posterior | Base al día |
| Web `http://192.168.20.100/` | HTTP 200 |
| Bundle JavaScript principal | HTTP 200, `application/javascript` |
| Hoja CSS principal | HTTP 200, `text/css` |
| Asset inexistente | HTTP 404, no responde con la SPA |
| Ruta API de calidad sin autenticación | HTTP 401, acceso protegido |
| ESLint | No ejecutable: ESLint 9 no encuentra `eslint.config.*` |

Durante el build de backend, npm reportó 14 vulnerabilidades en dependencias (1 baja, 2 moderadas, 10 altas y 1 crítica). No se ejecutó una actualización automática de dependencias durante este despliegue. Se recomienda revisar el árbol con `npm audit` en una tarea separada y corregirlo con pruebas.

## Rollback y operación

La versión anterior del frontend sigue disponible en el directorio indicado arriba. Para restaurarla manualmente, detener/recrear Nginx según el procedimiento del host, cambiando el directorio `dist` activo a la copia preservada; no borrar la copia actual ni el backup de PostgreSQL hasta completar la validación funcional.

La migración de calidad ya aplicada no se revierte automáticamente con el rollback del frontend/backend. Antes de considerar restaurar PostgreSQL, evaluar impacto y utilizar el backup validado junto con el procedimiento de recuperación aprobado.

## Referencias

- [07_Despliegue_Servidor_Propio.md](./07_Despliegue_Servidor_Propio.md)
- [08_Migracion_Supabase_y_Despliegue_LAN.md](./08_Migracion_Supabase_y_Despliegue_LAN.md)
- `backend/prisma/schema.prisma`
- `frontend/nginx.conf`

## Publicación del 2026-11-09

- Se conservó PostgreSQL `16-alpine` y su volumen persistente. El Compose activo se ajustó solo para construir el backend desde la raíz del proyecto y usar `backend/Dockerfile`; no se reemplazó por el Compose local que define PostgreSQL 18.
- Antes del despliegue se creó `/opt/mecaytro/backups/predeploy-20261109-181050/` con un dump PostgreSQL custom validado con `pg_restore --list`, el frontend anterior, el Compose, la configuración Nginx y una copia de fuentes/migraciones. La imagen anterior quedó etiquetada como `mecaytro-mecaytro-backend:before-20261109-181050`.
- Se corrigió el Docker build para incluir `backend/tsconfig.json`; `.dockerignore` ahora excluye uploads/backups y conserva los SQL versionados de las migraciones Prisma.
- Se aplicó `20261106150000_fix_finished_product_duplication`. Prisma reportó siete migraciones y `Database schema is up to date!`.
- El backend nuevo responde HTTP 200 y el volumen `/app/uploads` es escribible. El frontend responde HTTP 200; el bundle JavaScript y la hoja CSS responden HTTP 200 con sus MIME correctos. La ruta protegida `/api/quality/dashboard` devuelve HTTP 401 sin token, como se espera.
- El build de frontend pasó con la advertencia de bundle principal grande. El lint no se ejecutó porque ESLint 9 no encuentra `eslint.config.*`. El build del backend reportó vulnerabilidades de dependencias; no se ejecutó `npm audit fix`.
- No se ejecutó la suite de pruebas que crea productos y órdenes contra datos persistentes de producción.

## Corrección de órdenes del 2026-11-10

- La API de órdenes devolvía HTTP 500 con Prisma `P2022`: faltaban `TareaProduccion.usuario_ultima_edicion` y `TareaProduccion.fecha_ultima_edicion` en la base.
- Se añadió y aplicó `20261109142200_add_task_editor_metadata`, que agrega ambas columnas de forma idempotente sin eliminar ni modificar registros existentes. Prisma confirma que el esquema está al día.
- Se reconstruyó y recreó solo el backend; no se reinició ni modificó PostgreSQL. La API autenticada responde HTTP 200 y entrega las 62 órdenes existentes (1 pendiente, 2 en progreso y 59 completadas).
