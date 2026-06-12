import axios from 'axios';
import { Capacitor } from '@capacitor/core';
import { databaseService } from '../services/databaseService';
import { syncQueueService } from '../services/syncQueueService';
import { API_URL } from '../api';

export interface TaskLocal {
    id_local?: string;
    id?: number;
    id_server?: number;
    orden_trabajo_id: number;
    ruta_fabricacion_id: number;
    personal_id?: number;
    maquina_id?: number;
    estado_tarea: 'Pendiente' | 'En Progreso' | 'Completada';
    fecha_hora_inicio?: string;
    fecha_hora_fin?: string;
    cantidad_buena?: number;
    cantidad_mala?: number;
    tiempo_parada_min?: number;
    duracion_real_min?: number;
    
    // Virtual fields for UI (from include)
    ordenTrabajo?: any;
    rutaFabricacion?: any;
    personal?: any;
    maquina?: any;
    
    sync_status?: 'synced' | 'pending_insert' | 'pending_update' | 'pending_delete';
    updated_at?: number;
}

class TaskRepository {
    private readonly TABLE = 'TareaProduccion';
    private isNative = Capacitor.isNativePlatform();

    async getAll(): Promise<TaskLocal[]> {
        if (!this.isNative) {
            const res = await axios.get(`${API_URL}/tasks`);
            return res.data;
        }

        // SQLite query with joins for UI consistency
        const sql = `
            SELECT t.*, 
                   ot.numero_ot as ot_numero,
                   rf.nombre_operacion as op_nombre,
                   rf.centro_trabajo as op_centro,
                   p.nombre_producto as prod_nombre
            FROM ${this.TABLE} t
            LEFT JOIN OrdenTrabajo ot ON t.orden_trabajo_id = ot.id_server OR t.orden_trabajo_id = ot.id
            LEFT JOIN RutaFabricacion rf ON t.ruta_fabricacion_id = rf.id_server OR t.ruta_fabricacion_id = rf.id
            WHERE t.deleted = 0;
        `;
        // NOTE: This requires OrdenTrabajo and RutaFabricacion tables to exist and be populated.
        // For now, simpler query:
        const simpleSql = `SELECT * FROM ${this.TABLE} WHERE deleted = 0;`;
        const result = await databaseService.executeQuery(simpleSql);
        return result.values || [];
    }

    async startTask(id_local: string, id_server: number | undefined): Promise<void> {
        if (!this.isNative) {
            await axios.post(`${API_URL}/tasks/${id_server}/start`);
            return;
        }

        const now = new Date().toISOString();
        const updates = {
            estado_tarea: 'En Progreso',
            fecha_hora_inicio: now,
            sync_status: 'pending_update',
            updated_at: Date.now()
        };

        const sql = `UPDATE ${this.TABLE} SET estado_tarea = ?, fecha_hora_inicio = ?, sync_status = ?, updated_at = ? WHERE id_local = ?;`;
        await databaseService.executeQuery(sql, [updates.estado_tarea, updates.fecha_hora_inicio, updates.sync_status, updates.updated_at, id_local]);
        
        await syncQueueService.addToQueue(this.TABLE, id_local, 'UPDATE', updates);
    }

    async finishTask(id_local: string, id_server: number | undefined, data: any): Promise<void> {
        if (!this.isNative) {
            await axios.post(`${API_URL}/tasks/${id_server}/finish`, data);
            return;
        }

        const now = new Date().toISOString();
        const updates = {
            ...data,
            estado_tarea: 'Completada',
            fecha_hora_fin: now,
            sync_status: 'pending_update',
            updated_at: Date.now()
        };

        const keys = Object.keys(updates);
        const setClause = keys.map(k => `${k} = ?`).join(', ');
        const sql = `UPDATE ${this.TABLE} SET ${setClause} WHERE id_local = ?;`;
        await databaseService.executeQuery(sql, [...Object.values(updates), id_local]);
        
        await syncQueueService.addToQueue(this.TABLE, id_local, 'UPDATE', updates);
    }
}

export const taskRepository = new TaskRepository();
