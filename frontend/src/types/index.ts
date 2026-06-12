export interface ProyectoEspecial {
  id: number;
  codigo: string;
  cliente: string;
  descripcion_tecnica: string;
  tipo_proyecto: string;
  responsable_tecnico: string;
  fecha_inicio: string;
  fecha_compromiso: string;
  estado: string;
  prioridad: string;
  penalidad_retraso?: string;
  porcentaje_avance: number;
  indicador_riesgo: string;
  bloqueado: boolean;
  foto_referencia_url?: string;
  plano_pdf_url?: string;
  fases: FaseProyecto[];
  historial: HistorialCambios[];
  archivos: ArchivoAdjunto[];
  notas: NotaTecnica[];
  materiales: MaterialRequeridoProyecto[];
  piezas?: PiezaProyecto[];
  cargas_maquina: CargaMaquina[];
  createdAt: string;
  updatedAt: string;
}

export interface FaseProyecto {
  id: number;
  proyecto_id: number;
  nombre: string;
  responsable: string;
  horas_estimadas: number;
  horas_reales?: number;
  fecha_inicio: string;
  fecha_fin?: string;
  estado: string;
  observaciones?: string;
  maquina_id?: number;
  maquina?: Maquina;
  personal_id?: number;
  personal?: Personal;
  costo_operacion?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CargaMaquina {
  id: number;
  maquina_id: number;
  maquina: Maquina;
  proyecto_id?: number;
  horas_asignadas: number;
  semana: number;
  ano: number;
}

export interface Maquina {
  id: number;
  codigo: string;
  descripcion: string;
  estado: string;
  horas_disponibles_semana?: number;
}

export interface HistorialCambios {
  id: number;
  proyecto_id: number;
  usuario_id: number;
  usuario: Usuario;
  fecha: string;
  descripcion: string;
}

export interface ArchivoAdjunto {
  id: number;
  proyecto_id: number;
  nombre_archivo: string;
  url_archivo: string;
  fecha_carga: string;
}

export interface NotaTecnica {
  id: number;
  proyecto_id: number;
  autor: string;
  fecha: string;
  contenido: string;
}

export interface MaterialRequeridoProyecto {
  id: number;
  proyecto_id: number;
  descripcion: string;
  tipo?: string;
  cantidad: number;
  peso_kg: number;
  estado: string;
  observaciones?: string;
}

export interface PiezaProyecto {
  id: number;
  proyecto_id: number;
  nombre: string;
  cantidad: number;
  avance_fabricacion: number;
  requiere_montaje: boolean;
  estado_montaje: string;
  observaciones?: string;
  plano_url_1?: string;
  plano_url_2?: string;
  tipo_material?: string;
  largo?: number | string;
  ancho?: number | string;
  espesor?: number | string;
  diametro?: number | string;
  registros?: RegistroPieza[];
}

export interface RegistroPieza {
  id: number;
  pieza_id: number;
  tipo: string;
  fecha: string;
  descripcion: string;
  avance_reportado?: number;
}

export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  rol: string;
}

export interface Personal {
  id: number;
  nombre: string;
  cedula: string;
  cargo: string;
  kpi_puntualidad?: number;
  salario?: number;
  calificacion?: string;
  eficiencia?: number;
  productividad?: number;
}
