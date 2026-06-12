import axios from 'axios';
import { Capacitor } from '@capacitor/core';
import { databaseService } from '../services/databaseService';
import { syncQueueService } from '../services/syncQueueService';
import { API_URL } from '../api';

export interface MovimientoInventarioLocal {
    id_local?: string;
    id?: number;
    id_server?: number;
    materia_prima_id: number;
    cantidad: number;
    tipo_movimiento: string;
    fecha_hora: string;
    referencia_id?: string;
    orden_trabajo_id?: number;
    sync_status?: 'synced' | 'pending_insert' | 'pending_update' | 'pending_delete';
    updated_at?: number;
    deleted?: number;
    version?: number;
}

class InventarioRepository {
    private readonly TABLE = 'MovimientoInventarioMP';
    private isNative = Capacitor.isNativePlatform();

    async getAll(): Promise<MovimientoInventarioLocal[]> {
        if (!this.isNative) {
            const res = await axios.get(`${API_URL}/inventory/movements`); // Ajustar según tu ruta real
            return res.data;
        }

        const sql = `SELECT * FROM ${this.TABLE} WHERE deleted = 0 ORDER BY updated_at DESC;`;
        const result = await databaseService.executeQuery(sql);
        return result.values || [];
    }

    async create(data: Partial<MovimientoInventarioLocal>): Promise<any> {
        if (!this.isNative) {
            const res = await axios.post(`${API_URL}/inventory/movements`, data);
            return res.data;
        }

        const id_local = crypto.randomUUID();
        const now = Date.now();
        
        const record: MovimientoInventarioLocal = {
            ...data as any,
            id_local,
            sync_status: 'pending_insert',
            updated_at: now,
            deleted: 0,
            version: 1,
            fecha_hora: data.fecha_hora || new Date().toISOString()
        };

        const keys = Object.keys(record).filter(k => record[k as keyof MovimientoInventarioLocal] !== undefined);
        const placeholders = keys.map(() => '?').join(', ');
        const values = keys.map(k => record[k as keyof MovimientoInventarioLocal]);

        const sql = `INSERT INTO ${this.TABLE} (${keys.join(', ')}) VALUES (${placeholders});`;

        await databaseService.executeQuery(sql, values);
        await syncQueueService.addToQueue(this.TABLE, id_local, 'INSERT', record);

        return record;
    }

    async delete(id_local: string, id_server: number | undefined): Promise<void> {
        if (!this.isNative) {
            await axios.delete(`${API_URL}/inventory/movements/${id_server}`);
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

    async getById(id_local: string): Promise<MovimientoInventarioLocal | null> {
        const result = await databaseService.executeQuery(`SELECT * FROM ${this.TABLE} WHERE id_local = ?;`, [id_local]);
        return result.values?.[0] || null;
    }
}

export const inventarioRepository = new InventarioRepository();
