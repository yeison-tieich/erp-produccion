# 05. Frontend y UX - Control MT

El frontend de Control MT se basa en una arquitectura moderna y responsiva para operar tanto en escritorio como en tablet o entorno móvil. La estructura prioriza rapidez, claridad visual y consistencia operativa en un ambiente industrial.

## Stack frontend

- React 18
- Vite
- TypeScript
- Tailwind CSS 4
- Zustand
- Axios
- Recharts
- jsPDF / XLSX
- Capacitor para soporte móvil nativo

## Objetivos de UX

- reducir pasos para tareas repetitivas
- priorizar información crítica por módulo
- mantener navegación clara entre inventario, producción y proyectos
- facilitar trabajo desde computadores y tablets del taller
- ofrecer carga de archivos e inspecciones con pocas interrupciones

## Estructura de la capa frontend

### 1. Vistas y páginas
Se organiza por módulos funcionales:

- dashboard
- inventario
- productos
- OT
- proyectos
- personal
- mantenimiento
- calidad
- herramientas
- finanzas

### 2. Componentes reutilizables
Los componentes visuales permiten mantener consistencia en:

- tablas y listados
- filtros y búsqueda
- paneles de detalle
- formularios
- modales de edición
- indicadores de estado
- upload y preview de archivos

### 3. Estado global con Zustand
Zustand centraliza la información volátil y compartida, evitando lógica duplicada entre vistas.

### 4. Repositorios y acceso a datos
La capa de repositorio abstrae la fuente de datos para que la UI no necesite saber si se conecta a API web o a un backend local/capacitor.

## Patrones de interfaz

### Layout principal
El panel central usa estructura tipo dashboard con navegación lateral y contenido principal claro. Esto ayuda a operar el ERP sin perder contexto de cada módulo.

### Formularios operativos
Los formularios se diseñan para trabajo rápido y trazabilidad:

- campos críticos visibles
- validación clara
- carga de archivos integrada
- resúmenes de operación según el caso

### Tablas y filtros
La UI favorece tablas con filtros, ordenamiento y acciones rápidas, especialmente en los módulos de inventario y producción.

## Modo móvil y trabajo offline

Cuando la app se ejecuta en un dispositivo nativo con Capacitor, se habilita un flujo híbrido:

- trabajo local sin conexión
- almacenamiento temporal en SQLite
- cola de sincronización de cambios
- envío posterior al backend cuando exista conectividad

Esto permite al personal del taller registrar eventos sin interrumpir la operación.

## Feedback y estado visual

El frontend informa al usuario en tiempo real con:

- indicadores de carga
- toasts o mensajes de confirmación
- estados de sincronización
- alertas de inventario o mantenimiento
- evidencias y archivos visuales asociados a registros

## Recomendaciones UX

- priorizar tareas de una sola pantalla para operación rápida
- evitar exceso de modales en flujos complejos
- mantener consistencia en nomenclatura y estados
- usar colores y etiquetas legibles para operarios de planta
- reforzar trazabilidad del trabajo en producción

## Referencias

- `frontend/src/`
- `frontend/package.json`
- `backend/src/server.ts`
- `docs/06_Operations_Guide.md`