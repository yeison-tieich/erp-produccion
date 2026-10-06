Plan de Implementación: Módulo de Gestión de Calidad (ISO 9001:2015) – ERP MECAYTRO
Resumen Ejecutivo
El objetivo es desarrollar e integrar un sistema integral de GESTIÓN DE CALIDAD basado en la norma ISO 9001:2015, concebido como una capa transversal que interconecta y retroalimenta de forma orgánica todos los módulos existentes del ERP MECAYTRO:

Producción y Órdenes de Trabajo (OT): Flujo de estados de calidad (PRODUCCIÓN → PENDIENTE DE INSPECCIÓN → INSPECCIÓN → APROBADA / LIBERADA o RECHAZADA / RETENIDA), bloqueo automático de despacho para OTs retenidas, registro de piezas conformes, rechazos y retrabajos.
Clientes y Pedidos: Registro de reclamos, devoluciones, no conformidades externas, trazabilidad de entregas e índices de satisfacción por cliente.
Compras, Inventario y Proveedores: Inspección de recepción de materia prima, evaluación y calificación automática de proveedores basada en recepciones, rechazos y NCs.
Mantenimiento: Correlación directa entre fallas de máquinas, paradas imprevistas y defectos de calidad generados en las OTs.
Finanzas: Cuantificación automatizada del Costo de No Calidad (material desperdiciado, horas-hombre y horas-máquina de retrabajo, devoluciones y reclamos) alimentando el resumen financiero del ERP.
Trazabilidad 360°: Visualización interactiva del hilo conductor completo desde el Cliente y Pedido hasta el Plano, Materia Prima, Lote, Proceso, Máquina, Operario, Mediciones, Inspección, Disposición y Despacho.
Revisión del Usuario Requerida
IMPORTANT

Compatibilidad y Cero Pérdida de Datos: Todas las adiciones al esquema de base de datos Prisma son incrementales y conservan intactas las tablas y registros actuales. En OrdenTrabajo, los nuevos campos de calidad tienen valores por defecto (estado_calidad: "Pendiente", cantidad_aprobada: 0, etc.), garantizando que ninguna orden histórica resulte afectada ni alterada.

NOTE

Bloqueo Operacional de Despacho: De acuerdo con el requerimiento del punto 9 y 19, una OT con estado de calidad RETENIDA no podrá ser finalizada para entrega/despacho hasta que exista una disposición válida y aprobada (retrabajo aprobado o concesión formal autorizada con registro de usuario y motivo).

Arquitectura y Entidades de Datos (Prisma)
Se incorporarán las entidades de Calidad en backend/prisma/schema.prisma manteniendo total relación relacional con los modelos existentes (Usuario, Personal, Producto, OrdenTrabajo, TareaProduccion, Cliente, Maquina, MateriaPrima, MovimientoInventarioMP, Pedido):

posee
registra
fabricado en
tiene especificación
inspeccionada en
genera
materia prima
reclamo proveedor
falla asociada
contiene cotas
5 Por Qués e Ishikawa
genera CAPA
control cambios
Cliente
OrdenTrabajo
ReclamoCliente
Producto
PlanControl
InspeccionCalidad
NoConformidad
Proveedor
Maquina
MedicionInspeccion
AnalisisCausaNC
AccionCorrectiva
DocumentoSGC
HistorialVersionDocumento
Modelos a incorporar:
Proveedor & MateriaPrimaProveedor:
Datos del proveedor (nombre, contacto, teléfono, calificación, estado).
Catálogo de materiales suministrados.
PlanControl & CaracteristicaControl:
Por producto: Característica (ej. Diámetro, Rugosidad), cota nominal, tolerancias (mín/máx), unidad, instrumento (Micrómetro, Calibrador, etc.), método, frecuencia (100%, 1/5) y criticidad.
InspeccionCalidad & MedicionInspeccion:
Tipos: RECEPCION, EN_PROCESO, FINAL, DESPACHO, ESPECIAL.
Vínculos directos a OT, Producto, Cliente, Proveedor, Máquina, Operario, Inspector.
Mediciones reales numéricas: cálculo dinámico en servidor y cliente de Promedio, Mínimo, Máximo, Rango, Desviación Estándar y veredicto automático (Cumple / Fuera de Tolerancia).
NoConformidad:
Orígenes: Inspección, Producción, Cliente, Proveedor, Materia Prima, Mantenimiento, Auditoría, Reclamo.
Clasificación de defectos configurable: Dimensional, Visual, Material, Soldadura, Rugosidad, Acabado, Funcional, Documental, Montaje, Daño.
Disposición del producto no conforme: Retrabajo, Reparación, Reclasificación, Devolución a proveedor, Descarte, Concesión (con usuario autorizador y justificación).
Costo estimado e impacto en Finanzas.
AnalisisCausaNC:
Soporte para 5 Por Qués (1 al 5 y conclusión de causa raíz).
Diagrama de Causa y Efecto Ishikawa 6M (Máquina, Método, Mano de Obra, Material, Medición, Medio Ambiente).
AccionCorrectiva (CAPA):
Tipo: Correctiva, Preventiva, Mejora.
Responsable, fecha límite, acciones inmediatas y de fondo, verificación y evaluación de eficacia (ABIERTA, EN_PROCESO, PENDIENTE_VERIFICACION, EFICAZ, NO_EFICAZ, CERRADA).
RiesgoCalidad:
Matriz ISO 9001 (Riesgos y Oportunidades).
Proceso, Probabilidad (1-5), Impacto (1-5), Nivel = P × I, Estrategia, Plan de Acción, Responsable y Estado.
ReclamoCliente:
Reclamos y devoluciones vinculados a Cliente, Producto y OT, con acciones correctivas inmediatas y satisfacción de cierre.
AuditoriaCalidad & HallazgoAuditoria:
Auditorías internas, externas, a proveedores y de proceso con registro de hallazgos por cláusula ISO.
DocumentoSGC & HistorialVersionDocumento:
Procedimientos, instructivos, manuales, políticas y formatos con código, versión, estado (Vigente, En revisión, Obsoleto), archivo adjunto y registro histórico estricto de control de cambios.
AuditoriaRegistroCalidad:
Registro inmutable de trazabilidad ISO (usuario, fecha/hora, acción, tabla, valores anteriores y nuevos) ante aprobaciones, rechazos, liberaciones y concesiones.
Cambios Propuestos
Backend
Base de Datos & Prisma
[MODIFY] backend/prisma/schema.prisma:
Incorporar los nuevos modelos descritos.
Agregar campos de calidad y relaciones a OrdenTrabajo, Producto, MateriaPrima, Maquina, Cliente, Personal y Usuario.
Ejecutar migración controlada con npx prisma db push o generación del cliente npx prisma generate.
Rutas y Controladores Backend (backend/src/)
[NEW] backend/src/routes/quality.routes.ts:
Definición unificada de endpoints REST para inspecciones, planes de control, no conformidades, acciones correctivas, riesgos, reclamos, auditorías, documentos y reportes ejecutivos.
[NEW] backend/src/controllers/quality.controller.ts:
getQualityDashboard: Métricas globales, OTs pendientes/aprobadas/retenidas, NCs abiertas/vencidas, PPM, % rechazo, costo de no calidad y distribuciones por máquina/proceso/proveedor/cliente.
CRUD de PlanControl y características por producto.
CRUD de InspeccionCalidad con auto-evaluación estadística de cotas medidas e integración automática con la OT (cambio a Aprobada/Liberada o Rechazada/Retenida).
CRUD de NoConformidad con soporte para disposición, asignación de retrabajo y vinculación a mantenimiento.
AnalisisCausa: Registro y consulta de 5 Por Qués e Ishikawa 6M.
CRUD de AccionCorrectiva (CAPA) con seguimiento de eficacia.
CRUD de RiesgoCalidad con matriz de calor de riesgo.
CRUD de ReclamoCliente y evaluación de proveedores.
CRUD de DocumentoSGC con versionamiento estricto e historial inmutable.
getTraceabilityTree(otId): Generación del grafo completo de trazabilidad desde el cliente hasta el despacho.
[MODIFY] backend/src/controllers/orders.controller.ts:
Integrar el flujo de calidad: cuando una OT finaliza producción, emitir estado Pendiente de Inspección.
Impedir entrega/despacho de una OT con estado Retenida.
[MODIFY] backend/src/controllers/finances.controller.ts:
Incorporar el cálculo real de Costo de No Calidad al resumen financiero (desperdicios + horas de retrabajo + reclamos + devoluciones).
[MODIFY] backend/src/server.ts:
Montar /api/quality con middleware de autenticación y autorización.
Frontend
Navegación y Rutas (frontend/src/)
[MODIFY] frontend/src/layouts/DashboardLayout.tsx:
Incorporar la sección principal Calidad con submenús desplegables:
Dashboard de Calidad
Inspecciones
No Conformidades (NC)
Acciones Correctivas (CAPA)
Planes de Control
Riesgos y Oportunidades
Calidad Proveedores
Reclamos de Clientes
Trazabilidad 360°
Auditorías e Indicadores ISO
Información Documentada (SGC)
Permisos adaptados para los roles existentes (Administrador, Calidad, Supervisor, Producción, Gerencia).
[MODIFY] frontend/src/App.tsx:
Registrar las rutas /quality, /quality/inspections, /quality/nc, /quality/capa, /quality/control-plans, /quality/risks, /quality/traceability/:id?, /quality/documents, etc.
Páginas y Componentes de Calidad (frontend/src/pages/quality/)
[NEW] frontend/src/pages/quality/QualityDashboard.tsx:
KPIs ejecutivos en tiempo real (% aprobación, PPM, NC abiertas, OTs retenidas, costo de no calidad).
Gráficos interactivos Recharts (Tendencia mensual, defectos por máquina/proceso, reclamos por cliente).
[NEW] frontend/src/pages/quality/InspectionsPage.tsx:
Listado con filtros avanzados (Tipo, OT, Estado, Inspector).
Modal de Inspección Digital: visualización del Plano PDF del producto, carga de cotas con tolerancias del plan de control, captura dinámica de mediciones de muestra, auto-cálculo de Promedio, Rango, Desviación Estándar y alerta visual inmediata de aprobación/rechazo.
Generación de informe PDF oficial de inspección de calidad listo para cliente o archivo.
[NEW] frontend/src/pages/quality/NonConformancesPage.tsx:
Gestión integral de NCs con badges de severidad, estado y origen.
Formulario de Disposición (Retrabajo, Descarte, Concesión con firma de usuario y motivo).
Modal interactivo de Análisis de Causa Raíz:
Componente visual interactivo de 5 Por Qués.
Diagrama visual de Ishikawa (Espina de Pescado) clasificando las 6M.
[NEW] frontend/src/pages/quality/CorrectiveActionsPage.tsx:
Ciclo de vida CAPA (Abierta → En proceso → Verificación → Eficaz/Cerrada).
[NEW] frontend/src/pages/quality/ControlPlansPage.tsx:
Configuración de planes de control por producto, cotas nominales, tolerancias e instrumentos de medición.
[NEW] frontend/src/pages/quality/TraceabilityPage.tsx:
Búsqueda por número de OT, producto o lote con visualizador cronológico y jerárquico paso a paso: Cliente → Pedido → Producto → Plano → Materia Prima/Lote → Máquinas → Operarios → Inspecciones → Resultados → NC/Retrabajos → Liberación/Despacho.
[NEW] frontend/src/pages/quality/DocumentsSGCPage.tsx:
Repositorio digital de información documentada ISO con control de versiones, fecha de revisión y bitácora de cambios.
[NEW] frontend/src/pages/quality/RisksAndAuditsPage.tsx:
Matriz de calor de riesgos y registro de auditorías con hallazgos ISO.
[MODIFY] frontend/src/pages/Orders.tsx:
Añadir badge de Estado de Calidad en la tabla de OTs y botón directo para inspeccionar o consultar trazabilidad.
Plan de Verificación
Pruebas Automatizadas y de Base de Datos
Ejecución de npx prisma validate y sincronización con PostgreSQL.
Script de prueba integral test_quality_flow.ts que valida programáticamente:
Creación de plan de control con tolerancias nominales.
Generación de orden de trabajo vinculada a producto.
Ejecución de inspección con registro de cotas (promedio, mín, máx, desviación).
Disparo automático de No Conformidad en cota fuera de tolerancia.
Registro de 5 Por Qués e Ishikawa.
Emisión de Acción Correctiva y cierre.
Cálculo automático del Costo de No Calidad e impacto en el módulo financiero.
Verificación Manual y Visual
Validación en navegador de la interfaz de usuario:
Navegación fluida por todas las pestañas de Calidad.
Visualización del Dashboard con métricas y gráficas Recharts.
Registro de inspección con cálculo dinámico en vivo de tolerancias.
Diagrama visual de Ishikawa y árbol de trazabilidad 360°.
Verificación del bloqueo de despacho en OTs retenidas.