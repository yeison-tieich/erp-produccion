import axios from 'axios';
import { Capacitor } from '@capacitor/core';
import { databaseService } from '../services/databaseService';
import { syncQueueService } from '../services/syncQueueService';
import { API_URL } from '../api';

export interface MateriaPrimaLocal {
    id_local?: string;
    id?: number;
    id_server?: number;
    sku_mp: string;
    nombre_mp: string;
    categoria_mp: string;
    unidad_medida_stock: string;
    stock_actual: number;
    stock_reservado: number;
    devoluciones?: number;
    punto_reorden: number;
    espesor?: number;
    ancho?: number;
    largo?: number;
    densidad?: number;
    peso_unitario?: number;
    costo_unitario?: number;
    sync_status?: 'synced' | 'pending_insert' | 'pending_update' | 'pending_delete';
    updated_at?: number;
    deleted?: number;
}

class MateriaPrimaRepository {
    private readonly TABLE = 'MateriaPrima';
    private isNative = Capacitor.isNativePlatform();

    async getAll(): Promise<MateriaPrimaLocal[]> {
        if (!this.isNative) {
            const res = await axios.get(`${API_URL}/inventory`);
            return res.data;
        }

        const sql = `SELECT * FROM ${this.TABLE} WHERE deleted = 0 ORDER BY nombre_mp ASC;`;
        const result = await databaseService.executeQuery(sql);
        return result.values || [];
    }

    async getById(id_local: string): Promise<MateriaPrimaLocal | null> {
        const result = await databaseService.executeQuery(`SELECT * FROM ${this.TABLE} WHERE id_local = ?;`, [id_local]);
        return result.values?.[0] || null;
    }

    async create(data: Partial<MateriaPrimaLocal>): Promise<any> {
        if (!this.isNative) {
            const res = await axios.post(`${API_URL}/inventory`, data);
            return res.data;
        }

        const id_local = crypto.randomUUID();
        const now = Date.now();
        
        const record: any = {
            ...data,
            id_local,
            sync_status: 'pending_insert',
            updated_at: now,
            deleted: 0
        };

        const keys = Object.keys(record).filter(k => record[k] !== undefined);
        const placeholders = keys.map(() => '?').join(', ');
        const values = keys.map(k => record[k]);

        const sql = `INSERT INTO ${this.TABLE} (${keys.join(', ')}) VALUES (${placeholders});`;
        await databaseService.executeQuery(sql, values);
        await syncQueueService.addToQueue(this.TABLE, id_local, 'INSERT', record);

        return record;
    }

    async update(id_local: string, id_server: number | undefined, data: Partial<MateriaPrimaLocal>): Promise<void> {
        if (!this.isNative) {
            await axios.put(`${API_URL}/inventory/${id_server}`, data);
            return;
        }

        const now = Date.now();
        const existing = await this.getById(id_local);
        if (!existing) throw new Error('Material no encontrado');

        const newStatus = existing.sync_status === 'pending_insert' ? 'pending_insert' : 'pending_update';
        
        const updates: any = {
            ...data,
            sync_status: newStatus,
            updated_at: now
        };

        const keys = Object.keys(updates);
        const setClause = keys.map(k => `${k} = ?`).join(', ');
        const values = [...Object.values(updates), id_local];

        const sql = `UPDATE ${this.TABLE} SET ${setClause} WHERE id_local = ?;`;
        await databaseService.executeQuery(sql, values);
        
        const action = newStatus === 'pending_insert' ? 'INSERT' : 'UPDATE';
        await syncQueueService.addToQueue(this.TABLE, id_local, action, { ...existing, ...updates });
    }
}

export const materiaPrimaRepository = new MateriaPrimaRepository();
