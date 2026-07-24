# Control MT - Sistema de Gestión de Producción Industrial

Bienvenido a la documentación oficial de **Control MT**, una solución integral para el control de planta, inventarios y proyectos especiales metalmecánicos.

## 📁 Índice de Documentación Detallada

Para una comprensión profunda del sistema, consulte los siguientes documentos en la carpeta `/docs`:

1.  **[01. Arquitectura del Sistema](docs/01_Architecture.md)**: Resumen del stack tecnológico (Node, React, SQLite, Prisma).
2.  **[02. Base de Datos](docs/02_Database.md)**: Detalle del modelo de datos y relaciones fundamentales.
3.  **[03. Guía de Módulo](docs/03_Modules.md)**: Descripción funcional de Inventario, OTs, Proyectos, Personal y Herramientas.
4.  **[04. Funcionalidades de IA](docs/04_AI_Features.md)**: Guía sobre el Lector de OC (Smart PO), Generador de Rutas y Captura Digital.
5.  **[05. Frontend y UX](docs/05_Frontend_UX.md)**: Patrones de diseño, estado global (Zustand) y experiencia de usuario.
6.  **[06. Guía de Operación](docs/06_Operations_Guide.md)**: Instrucciones de instalación, configuración (.env) y despliegue.

---

## 🚀 Inicio Rápido (Desarrollo)

### Backend
1. Ir a la carpeta `backend/`.
2. Crear un archivo `.env` basado en la [Guía de Operación](docs/06_Operations_Guide.md).
3. Ejecutar `npm install` y `npm run dev`.

### Frontend
1. Ir a la carpeta `frontend/`.
2. Ejecutar `npm install` y `npm run dev`.
3. Abrir `http://localhost:5173` en el navegador.

---

## 🛠 Características Destacadas
- **Control de Proyectos Especiales**: Seguimiento granular de fases y piezas.
- **Mantenimiento Preventivo**: Alertas automáticas para cuidado de maquinaria.
- **Arquitectura Offline-First**: Funcionalidad completa en dispositivos móviles sin conexión, con sincronización automática al recuperar internet.
- **Control de Inventario Métrico**: Cálculo automático de pesos para láminas y perfiles.

---
© 2026 Control MT - Todos los derechos reservados.
