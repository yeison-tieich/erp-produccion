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
  fases: FaseProyecto[];
  historial: HistorialCambios[];
  archivos: ArchivoAdjunto[];
  notas: NotaTecnica[];
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

export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  rol: string;
}
