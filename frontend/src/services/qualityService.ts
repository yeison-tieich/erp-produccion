import axios from 'axios';
import { API_URL } from '../api';

export interface QualityDashboardData {
    metricas: {
        otEnProceso: number;
        otPendientesInspeccion: number;
        otAprobadas: number;
        otRechazadas: number;
        otRetenidas: number;
        totalInspecciones: number;
        porcentajeAprobacion: number;
        porcentajeRechazo: number;
        ppmDefectos: number;
        totalNC: number;
        ncAbiertas: number;
        ncVencidas: number;
        acAbiertas: number;
        acVencidas: number;
        totalReclamos: number;
        reclamosAbiertos: number;
        devoluciones: number;
        costoNoCalidadTotal: number;
    };
    graficos: {
        defectosPorMaquina: { name: string; count: number }[];
        defectosPorTipo: { name: string; count: number }[];
        defectosPorProveedor: { name: string; count: number }[];
        reclamosPorCliente: { name: string; count: number }[];
        tendenciaMensual: { mes: string; count: number }[];
    };
}

export interface ControlPlan {
    id: number;
    producto_id: number;
    codigo: string;
    nombre: string;
    version: string;
    activo: boolean;
    notas?: string;
    producto?: {
        id: number;
        nombre_producto: string;
        sku_producto: string;
        plano_pdf_url?: string;
    };
    caracteristicas: ControlCharacteristic[];
    _count?: { inspecciones: number };
}

export interface ControlCharacteristic {
    id?: number;
    plan_control_id?: number;
    secuencia: number;
    caracteristica: string;
    cota_nominal?: number | null;
    tolerancia_min?: number | null;
    tolerancia_max?: number | null;
    unidad: string;
    instrumento: string;
    metodo_medicion?: string | null;
    frecuencia: string;
    criterio_aceptacion: string;
    es_critica: boolean;
}

export interface Inspection {
    id: number;
    codigo: string;
    tipo: 'RECEPCION' | 'EN_PROCESO' | 'FINAL' | 'DESPACHO' | 'ESPECIAL';
    orden_trabajo_id?: number;
    producto_id?: number;
    proveedor_id?: number;
    cliente_id?: number;
    maquina_id?: number;
    personal_id?: number;
    operario_id?: number;
    plan_control_id?: number;
    lote?: string;
    fecha_inspeccion: string;
    cantidad_inspeccionada: number;
    cantidad_aprobada: number;
    cantidad_rechazada: number;
    estado_resultado: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'RETENIDO' | 'CONDICIONAL';
    observaciones?: string;
    evidencias_url?: string;
    ordenTrabajo?: { id: number; numero_ot: string; estado_ot: string; estado_calidad: string };
    producto?: { id: number; nombre_producto: string; sku_producto: string; plano_pdf_url?: string };
    proveedor?: { id: number; nombre: string };
    cliente?: { id: number; nombre: string };
    maquina?: { id: number; codigo: string; nombre: string };
    inspector?: { id: number; nombre: string };
    operario?: { id: number; nombre: string };
    mediciones: InspectionMeasurement[];
    _count?: { noConformidades: number };
}

export interface InspectionMeasurement {
    id?: number;
    caracteristica_id?: number;
    nombre_caracteristica: string;
    especificacion?: string;
    cota_nominal?: number;
    tolerancia_min?: number;
    tolerancia_max?: number;
    instrumento?: string;
    valores_medidos: string | number[];
    promedio?: number;
    minimo?: number;
    maximo?: number;
    rango?: number;
    desviacion?: number;
    cumple: boolean;
    observacion?: string;
}

export interface NonConformance {
    id: number;
    codigo: string;
    fecha: string;
    origen: string;
    tipo_defecto: string;
    descripcion: string;
    cantidad_afectada: number;
    costo_estimado: number;
    estado: 'ABIERTA' | 'EN_ANALISIS' | 'EN_ACCION' | 'VERIFICADA' | 'CERRADA' | 'ANULADA';
    disposicion?: 'RETRABAJO' | 'REPARACION' | 'RECLASIFICACION' | 'DEVOLUCION_PROVEEDOR' | 'DESCARTE' | 'CONCESION';
    autorizado_por?: string;
    justificacion_concesion?: string;
    fecha_limite?: string;
    fecha_cierre?: string;
    orden_trabajo_id?: number;
    producto_id?: number;
    inspeccion_id?: number;
    cliente_id?: number;
    proveedor_id?: number;
    maquina_id?: number;
    personal_id?: number;
    ordenTrabajo?: { id: number; numero_ot: string; estado_ot: string };
    producto?: { id: number; nombre_producto: string; sku_producto: string };
    proveedor?: { id: number; nombre: string };
    cliente?: { id: number; nombre: string };
    maquina?: { id: number; codigo: string; nombre: string };
    responsable?: { id: number; nombre: string; cargo: string };
    analisisCausa?: RootCauseAnalysis;
    accionesCorrectivas?: CorrectiveAction[];
}

export interface RootCauseAnalysis {
    id?: number;
    no_conformidad_id: number;
    metodo_analisis: '5_PORQUES' | 'ISHIKAWA' | 'AMBOS';
    porque_1?: string;
    porque_2?: string;
    porque_3?: string;
    porque_4?: string;
    porque_5?: string;
    causa_raiz?: string;
    ishikawa_maquina?: string;
    ishikawa_metodo?: string;
    ishikawa_mano_obra?: string;
    ishikawa_material?: string;
    ishikawa_medicion?: string;
    ishikawa_medio_ambiente?: string;
}

export interface CorrectiveAction {
    id: number;
    codigo: string;
    no_conformidad_id?: number;
    tipo: 'CORRECTIVA' | 'PREVENTIVA' | 'MEJORA';
    titulo: string;
    descripcion_problema: string;
    causa_raiz?: string;
    accion_propuesta: string;
    personal_id?: number;
    fecha_limite: string;
    fecha_implementacion?: string;
    fecha_verificacion?: string;
    estado: 'ABIERTA' | 'EN_PROCESO' | 'PENDIENTE_VERIFICACION' | 'EFICAZ' | 'NO_EFICAZ' | 'CERRADA';
    eficacia_evaluada?: boolean;
    observaciones_verificacion?: string;
    responsable?: { id: number; nombre: string; cargo: string };
    noConformidad?: { id: number; codigo: string; descripcion: string };
}

export interface QualityRisk {
    id: number;
    codigo: string;
    tipo: 'RIESGO' | 'OPORTUNIDAD';
    proceso: string;
    descripcion: string;
    causa?: string;
    consecuencia?: string;
    probabilidad: number;
    impacto: number;
    nivel_riesgo: number;
    estrategia?: string;
    plan_accion?: string;
    personal_id?: number;
    estado: string;
    responsable?: { id: number; nombre: string };
    maquina?: { id: number; codigo: string };
    producto?: { id: number; nombre_producto: string };
}

export interface CustomerClaim {
    id: number;
    codigo: string;
    cliente_id: number;
    producto_id?: number;
    orden_trabajo_id?: number;
    fecha_reclamo: string;
    motivo: string;
    descripcion: string;
    es_devolucion: boolean;
    cantidad_afectada: number;
    costo_estimado: number;
    accion_inmediata?: string;
    estado: 'ABIERTO' | 'EN_INVESTIGACION' | 'RESUELTO' | 'CERRADO';
    satisfaccion_cierre?: string;
    cliente?: { id: number; nombre: string };
    producto?: { id: number; nombre_producto: string; sku_producto: string };
    ordenTrabajo?: { id: number; numero_ot: string };
}

export interface Supplier {
    id: number;
    nombre: string;
    contacto?: string;
    telefono?: string;
    email?: string;
    direccion?: string;
    calificacion: number;
    activo: boolean;
    _count?: { inspecciones: number; noConformidades: number };
    evaluaciones?: { periodo: string; indice_calidad: number; estado_aprobacion: string }[];
}

export interface Audit {
    id: number;
    codigo: string;
    tipo: string;
    titulo: string;
    proceso_area: string;
    auditor_lider: string;
    equipo_auditor?: string;
    fecha_programada: string;
    fecha_ejecucion?: string;
    estado: string;
    criterios?: string;
    hallazgos?: {
        id: number;
        tipo_hallazgo: string;
        descripcion: string;
        clausula_iso?: string;
    }[];
}

export interface DocumentSGC {
    id: number;
    codigo: string;
    nombre: string;
    tipo: string;
    proceso: string;
    version_actual: string;
    estado: 'VIGENTE' | 'EN_REVISION' | 'OBSOLETO';
    responsable: string;
    fecha_aprobacion: string;
    fecha_proxima_rev?: string;
    archivo_url?: string;
    descripcion?: string;
    versiones?: {
        id: number;
        version: string;
        fecha: string;
        usuario_nombre: string;
        cambio_realizado: string;
        motivo_cambio: string;
    }[];
}

export const qualityService = {
    // Dashboard
    getDashboard: async (): Promise<QualityDashboardData> => {
        const res = await axios.get(`${API_URL}/quality/dashboard`);
        return res.data;
    },

    // Planes de Control
    getControlPlans: async (productoId?: number): Promise<ControlPlan[]> => {
        const res = await axios.get(`${API_URL}/quality/control-plans`, { params: { producto_id: productoId } });
        return res.data;
    },
    getControlPlanById: async (id: number): Promise<ControlPlan> => {
        const res = await axios.get(`${API_URL}/quality/control-plans/${id}`);
        return res.data;
    },
    createControlPlan: async (data: any): Promise<ControlPlan> => {
        const res = await axios.post(`${API_URL}/quality/control-plans`, data);
        return res.data;
    },
    updateControlPlan: async (id: number, data: any): Promise<ControlPlan> => {
        const res = await axios.put(`${API_URL}/quality/control-plans/${id}`, data);
        return res.data;
    },
    deleteControlPlan: async (id: number): Promise<void> => {
        await axios.delete(`${API_URL}/quality/control-plans/${id}`);
    },

    // Inspecciones
    getInspections: async (params?: any): Promise<Inspection[]> => {
        const res = await axios.get(`${API_URL}/quality/inspections`, { params });
        return res.data;
    },
    getInspectionById: async (id: number): Promise<Inspection> => {
        const res = await axios.get(`${API_URL}/quality/inspections/${id}`);
        return res.data;
    },
    createInspection: async (data: any): Promise<Inspection> => {
        const res = await axios.post(`${API_URL}/quality/inspections`, data);
        return res.data;
    },
    updateInspection: async (id: number, data: any): Promise<Inspection> => {
        const res = await axios.put(`${API_URL}/quality/inspections/${id}`, data);
        return res.data;
    },

    // No Conformidades
    getNonConformances: async (params?: any): Promise<NonConformance[]> => {
        const res = await axios.get(`${API_URL}/quality/non-conformances`, { params });
        return res.data;
    },
    getNonConformanceById: async (id: number): Promise<NonConformance> => {
        const res = await axios.get(`${API_URL}/quality/non-conformances/${id}`);
        return res.data;
    },
    createNonConformance: async (data: any): Promise<NonConformance> => {
        const res = await axios.post(`${API_URL}/quality/non-conformances`, data);
        return res.data;
    },
    updateNCDisposition: async (id: number, data: any): Promise<NonConformance> => {
        const res = await axios.put(`${API_URL}/quality/non-conformances/${id}/disposition`, data);
        return res.data;
    },
    closeNonConformance: async (id: number): Promise<NonConformance> => {
        const res = await axios.put(`${API_URL}/quality/non-conformances/${id}/close`);
        return res.data;
    },
    saveNCRootCause: async (id: number, data: any): Promise<RootCauseAnalysis> => {
        const res = await axios.post(`${API_URL}/quality/non-conformances/${id}/root-cause`, data);
        return res.data;
    },

    // Acciones Correctivas
    getCorrectiveActions: async (params?: any): Promise<CorrectiveAction[]> => {
        const res = await axios.get(`${API_URL}/quality/corrective-actions`, { params });
        return res.data;
    },
    createCorrectiveAction: async (data: any): Promise<CorrectiveAction> => {
        const res = await axios.post(`${API_URL}/quality/corrective-actions`, data);
        return res.data;
    },
    updateCorrectiveAction: async (id: number, data: any): Promise<CorrectiveAction> => {
        const res = await axios.put(`${API_URL}/quality/corrective-actions/${id}`, data);
        return res.data;
    },

    // Riesgos
    getRisks: async (params?: any): Promise<QualityRisk[]> => {
        const res = await axios.get(`${API_URL}/quality/risks`, { params });
        return res.data;
    },
    createRisk: async (data: any): Promise<QualityRisk> => {
        const res = await axios.post(`${API_URL}/quality/risks`, data);
        return res.data;
    },
    updateRisk: async (id: number, data: any): Promise<QualityRisk> => {
        const res = await axios.put(`${API_URL}/quality/risks/${id}`, data);
        return res.data;
    },

    // Reclamos
    getClaims: async (params?: any): Promise<CustomerClaim[]> => {
        const res = await axios.get(`${API_URL}/quality/claims`, { params });
        return res.data;
    },
    createClaim: async (data: any): Promise<CustomerClaim> => {
        const res = await axios.post(`${API_URL}/quality/claims`, data);
        return res.data;
    },
    updateClaim: async (id: number, data: any): Promise<CustomerClaim> => {
        const res = await axios.put(`${API_URL}/quality/claims/${id}`, data);
        return res.data;
    },

    // Proveedores
    getSuppliers: async (): Promise<Supplier[]> => {
        const res = await axios.get(`${API_URL}/quality/suppliers`);
        return res.data;
    },
    createSupplier: async (data: any): Promise<Supplier> => {
        const res = await axios.post(`${API_URL}/quality/suppliers`, data);
        return res.data;
    },
    updateSupplier: async (id: number, data: any): Promise<Supplier> => {
        const res = await axios.put(`${API_URL}/quality/suppliers/${id}`, data);
        return res.data;
    },
    evaluateSupplier: async (id: number, periodo?: string): Promise<any> => {
        const res = await axios.post(`${API_URL}/quality/suppliers/${id}/evaluate`, { periodo });
        return res.data;
    },

    // Auditorías
    getAudits: async (): Promise<Audit[]> => {
        const res = await axios.get(`${API_URL}/quality/audits`);
        return res.data;
    },
    createAudit: async (data: any): Promise<Audit> => {
        const res = await axios.post(`${API_URL}/quality/audits`, data);
        return res.data;
    },
    addAuditFinding: async (id: number, data: any): Promise<any> => {
        const res = await axios.post(`${API_URL}/quality/audits/${id}/findings`, data);
        return res.data;
    },

    // Documentos SGC
    getDocuments: async (params?: any): Promise<DocumentSGC[]> => {
        const res = await axios.get(`${API_URL}/quality/documents`, { params });
        return res.data;
    },
    createDocument: async (data: any): Promise<DocumentSGC> => {
        const res = await axios.post(`${API_URL}/quality/documents`, data);
        return res.data;
    },
    createDocumentVersion: async (id: number, data: any): Promise<DocumentSGC> => {
        const res = await axios.post(`${API_URL}/quality/documents/${id}/version`, data);
        return res.data;
    },

    // Trazabilidad 360°
    getTraceability: async (otId: number): Promise<any> => {
        const res = await axios.get(`${API_URL}/quality/traceability/${otId}`);
        return res.data;
    },

    // Auditoría de Calidad
    getAuditLogs: async (limit = 100): Promise<any[]> => {
        const res = await axios.get(`${API_URL}/quality/audit-logs`, { params: { limit } });
        return res.data;
    }
};
