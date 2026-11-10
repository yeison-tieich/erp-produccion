# 04. Documentación Digital y Automatización - Control MT

Este documento describe la funcionalidad real y vigente del sistema en materia de captura digital, documentación y automatización. Es importante aclarar que la implementación actual no incluye un módulo productivo de IA generativa ni OCR automático de documentos en producción.

## Estado actual de IA y automatización

Durante la revisión del repositorio y la documentación operativa, quedó claro que:

- no hay un backend activo con integración productiva a OpenRouter, Gemini o modelos LLM para extracción automática de órdenes o rutas
- no existe un servicio de OCR/IA automatizado en el flujo principal del ERP
- los módulos de IA que aparecían en documentación histórica no están implementados o no están activos en la versión actual del sistema

Esto no significa que el proyecto no pueda evolucionar en ese sentido: solo indica que la versión actual operativa prioriza una capa estable de gestión industrial, captura documental y reportes automatizados sin depender de modelos externos.

## 1. Captura de imágenes y documentación visual

El sistema admite documentación visual de procesos, proyectos y materiales mediante cámara o archivos locales.

### Funciones vigentes
- toma de fotos desde el navegador o el app móvil
- previsualización antes de guardar
- envío y almacenamiento de archivos a Cloudinary o rutas del backend
- asociación de archivos a proyectos, productos y OT
- trazabilidad visual para seguimiento operativo y soporte de calidad

### Uso típico
- fotos de piezas especiales
- documentación de fases de proyecto
- registro gráfico de problemas o inspección
- evidencia de materiales y entregas

## 2. Generación de reportes PDF y Excel

El frontend usa librerías cliente para exportar información en formatos útiles para operación y administración.

### Reportes y exportaciones disponibles
- OT con detalle y BOM
- exportación de inventario
- reportes mensuales y financieros
- listados de clientes, proveedores, productos y herramientas
- exportación a Excel para análisis en plantillas externas

### Tecnologías implicadas
- `jsPDF`
- `jspdf-autotable`
- `xlsx`

## 3. Documentos y archivos del negocio

La aplicación gestiona distintos tipos de archivos, como:

- PDFs de ordenes de compra
- planos técnicos
- imágenes de productos y proyectos
- documentos asociados a calidad e inspección
- material visual de procesos o referencias técnicas

Estos documentos se gestionan a través del backend y en algunos casos se publican como recursos estáticos o se alojan en Cloudinary.

## 4. Integraciones reales del proyecto

La integración actual más relevante es la de contenidos de negocio y documentos, no una IA operativa generativa. En la práctica, el proyecto usa:

- Cloudinary para almacenamiento de archivos visuales y documentos
- backend express para recibir, validar y servir archivos
- frontend para renderización, carga, descarga y generación de reportes

## 5. Recomendación para futuras mejoras

Si el negocio desea incorporar IA en el futuro, lo recomendable es:

1. aislar una feature de IA en un servicio específico
2. validar su necesidad con un caso real de uso
3. mantener la integración desacoplada del core del ERP
4. documentar modelos, prompts, costos y restricciones de uso
5. no introducir IA como dependencia crítica del flujo principal sin prueba operativa

## Conclusión

La documentación histórica de IA no refleja la implementación actual del proyecto. La versión operativa está orientada a digitalización, trazabilidad documental y reportes automáticos, con un diseño sólido y estable para producción industrial.

