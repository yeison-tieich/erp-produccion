import axios from 'axios';
import { Capacitor } from '@capacitor/core';
import { databaseService } from '../services/databaseService';
import { syncQueueService } from '../services/syncQueueService';
import { API_URL } from '../api';

export interface OrdenTrabajoLocal {
    id_local?: string;
    id?: number; // Representa id_server en la lógica de negocio
    id_server?: number;
    numero_ot: string;
    tipo_orden?: string;
    producto_id?: number;
    cantidad_pedido?: number;
    cantidad_fabricar?: number;
    descripcion_proyecto?: string;
    cliente?: string;
    orden_compra_cliente?: string;
    prioridad?: string;
    estado_ot?: string;
    fecha_entrega_req?: string;
    producto?: any;
    tareas?: any[];
    sync_status?: 'synced' | 'pending_insert' | 'pending_update' | 'pending_delete';
    updated_at?: number;
    deleted?: number;
    version?: number;
}

class OrdenTrabajoRepository {
    private readonly TABLE = 'OrdenTrabajo';
    private isNative = Capacitor.isNativePlatform();

    /**
     * Obtiene todas las OT.
     * Web: Desde API
     * Native: Desde SQLite
     */
    async getAll(): Promise<OrdenTrabajoLocal[]> {
        if (!this.isNative) {
            const res = await axios.get(`${API_URL}/orders`);
            return res.data;
        }

        const sql = `SELECT * FROM ${this.TABLE} WHERE deleted = 0 ORDER BY updated_at DESC;`;
        const result = await databaseService.executeQuery(sql);
        return result.values || [];
    }

    /**
     * Crea una nueva OT.
     */
    async create(data: Partial<OrdenTrabajoLocal>): Promise<any> {
        if (!this.isNative) {
            const res = await axios.post(`${API_URL}/orders`, data);
            return res.data;
        }

        const id_local = crypto.randomUUID();
        const now = Date.now();
        
        const record: OrdenTrabajoLocal = {
            ...data as any,
            id_local,
            sync_status: 'pending_insert',
            updated_at: now,
            deleted: 0,
            version: 1,
            numero_ot: data.numero_ot || `OT-TEMP-${now}`
        };

        const keys = Object.keys(record).filter(k => record[k as keyof OrdenTrabajoLocal] !== undefined);
        const placeholders = keys.map(() => '?').join(', ');
        const values = keys.map(k => record[k as keyof OrdenTrabajoLocal]);

        const sql = `INSERT INTO ${this.TABLE} (${keys.join(', ')}) VALUES (${placeholders});`;

        await databaseService.executeQuery(sql, values);
        await syncQueueService.addToQueue(this.TABLE, id_local, 'INSERT', record);

        return record;
    }

    /**
     * Actualiza una OT.
     */
    async update(id_local: string, id_server: number | undefined, data: Partial<OrdenTrabajoLocal>): Promise<void> {
        if (!this.isNative) {
            await axios.put(`${API_URL}/orders/${id_server}`, data);
            return;
        }

        const now = Date.now();
        const existing = await this.getById(id_local);
        
        if (!existing) throw new Error('Registro no encontrado');

        const newStatus = existing.sync_status === 'pending_insert' ? 'pending_insert' : 'pending_update';
        
        const updates: any = {
            ...data,
            sync_status: newStatus,
            updated_at: now,
            version: (existing.version || 1) + 1
        };

        const keys = Object.keys(updates);
        const setClause = keys.map(k => `${k} = ?`).join(', ');
        const values = [...Object.values(updates), id_local];

        const sql = `UPDATE ${this.TABLE} SET ${setClause} WHERE id_local = ?;`;

        await databaseService.executeQuery(sql, values);
        const action = newStatus === 'pending_insert' ? 'INSERT' : 'UPDATE';
        await syncQueueService.addToQueue(this.TABLE, id_local, action, { ...existing, ...updates });
    }

    /**
     * Elimina una OT.
     */
    async delete(id_local: string, id_server: number | undefined): Promise<void> {
        if (!this.isNative) {
            await axios.delete(`${API_URL}/orders/${id_server}`);
            return;
        }

        const now = Date.now();
        const existing = await this.getById(id_local);

        if (!existing) return;

        if (existing.sync_status === 'pending_insert') {
            await databaseService.executeQuery(`DELETE FROM ${this.TABLE} WHERE id_local = ?;`, [id_local]);
            return;
        }

        const sql = `UPDATE ${this.TABLE} SET deleted = 1, sync_status = 'pending_delete', updated_at = ? WHERE id_local = ?;`;
        await databaseService.executeQuery(sql, [now, id_local]);

        await syncQueueService.addToQueue(this.TABLE, id_local, 'DELETE', { id_server: existing.id_server });
    }

    async getById(id_local: string): Promise<OrdenTrabajoLocal | null> {
        const result = await databaseService.executeQuery(`SELECT * FROM ${this.TABLE} WHERE id_local = ?;`, [id_local]);
        return result.values?.[0] || null;
    }
}

export const ordenTrabajoRepository = new OrdenTrabajoRepository();
