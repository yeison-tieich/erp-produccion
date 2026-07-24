# 04. Captura Digital y Documentación Visual - Control MT

Este documento describe las funcionalidades de captura digital y documentación visual disponibles en el sistema.

> **Nota histórica**: Los módulos de IA (Smart PO Reader, Generador Automático de Rutas, integración con OpenRouter/Gemini) y extracción de datos desde PDFs fueron eliminados durante la auditoría de julio 2026 por no estar en uso productivo. En caso de requerir estas funcionalidades en el futuro, se recomienda implementarlas desde cero con una arquitectura más ligera.

## 1. Captura con Cámara (Proyectos Especiales)
Integración nativa con la cámara del dispositivo para facilitar la documentación visual de proyectos en el taller.

### Características:
- **Acceso Directo**: Permite abrir la cámara desde el formulario de nuevo proyecto o edición.
- **Previsualización Instantánea**: El usuario puede ver la foto antes de confirmarla.
- **Conversión de Imagen**: Captura cuadros de video (`Canvas API`) y los convierte a archivos `JPEG` compatibles con el backend.
- **Almacenamiento en Nube**: Las imágenes se suben a **Cloudinary** para persistencia y acceso rápido.
- **Trazabilidad**: Las fotos se asocian al proyecto para referencia rápida durante la fabricación.

## 2. Generación de Reportes PDF (Frontend)
El sistema genera reportes PDF directamente en el navegador del usuario utilizando **jsPDF** y **jsPDF-AutoTable**.

### Reportes disponibles:
- **Orden de Trabajo**: Documento con detalles de la OT, BOM y ruta de fabricación.
- **Reporte Mensual**: Resumen de producción, eficiencia y costos del período seleccionado.
- **Exportación de Inventario**: Listado de materia prima con stock actual.
