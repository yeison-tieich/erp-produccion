# 04. Funcionalidades de IA y Captura Digital - Control MT

El sistema integra capacidades de Inteligencia Artificial para automatizar tareas repetitivas y mejorar la precisión de los datos.

## 1. Smart PO Reader (Lector de OC)
Este módulo permite cargar una **Orden de Compra (OC)** en formato PDF y extraer automáticamente los datos relevantes para crear una Orden de Trabajo.

### Funcionamiento Técnico:
- **Extracción de Texto**: Utiliza `PdfReader` para obtener el texto del PDF preservando la estructura espacial (layout-aware).
- **Procesamiento Determinístico**: Actualmente el sistema utiliza un servicio de parsing (`poParserService`) que identifica patrones específicos de clientes para una extracción 100% precisa.
- **Procesamiento de IA (Opcional)**: El sistema está preparado para enviar texto no estructurado a modelos de IA (vía OpenRouter) para extraer datos en casos donde el formato es desconocido.

## 2. Generador Automático de Rutas
Permite generar una sugerencia de **Ruta de Fabricación** (secuencia de operaciones) a partir de la descripción técnica de un producto.

### Funcionamiento:
- Analiza la descripción del producto (ej: "Soporte en lámina de acero de 3mm con 2 dobleces y pintura electrostática").
- La IA propone una secuencia lógica de operaciones (ej: Corte Laser -> Doblez -> Soldadura -> Pintura).
- El supervisor puede revisar, ajustar y aprobar la ruta propuesta antes de guardarla.

## 3. Captura con Cámara (Proyectos Especiales)
Integración nativa con la cámara del dispositivo para facilitar la documentación visual de proyectos en el taller.

### Características:
- **Acceso Directo**: Permite abrir la cámara desde el formulario de nuevo proyecto o edición.
- **Previsualización Instantánea**: El usuario puede ver la foto antes de confirmarla.
- **Conversión de Imagen**: Captura cuadros de video (`Canvas API`) y los convierte a archivos `JPEG` compatibles con el backend.
- **Trazabilidad**: Las fotos se asocian al proyecto para referencia rápida durante la fabricación.

---

## Configuración de IA
Los modelos y las API Keys se gestionan desde el módulo de **Configuraciones**, permitiendo al administrador cambiar el modelo de OpenRouter (ej: Gemma, GPT-4, Claude) según sea necesario.
