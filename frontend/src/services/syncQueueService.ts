import { databaseService } from './databaseService';

export interface SyncTask {
    id?: number;
    table_name: string;
    record_id_local: string;
    action: 'INSERT' | 'UPDATE' | 'DELETE';
    payload: string;
    attempts: number;
    last_error?: string;
    created_at: number;
}

class SyncQueueService {
    /**
     * Agrega una operación a la cola de sincronización.
     */
    async addToQueue(
        tableName: string, 
        recordIdLocal: string, 
        action: 'INSERT' | 'UPDATE' | 'DELETE', 
        data: any
    ): Promise<void> {
        const payload = JSON.stringify(data);
        const createdAt = Date.now();

        const sql = `
            INSERT INTO SyncQueue (table_name, record_id_local, action, payload, created_at)
            VALUES (?, ?, ?, ?, ?);
        `;

        try {
            await databaseService.executeQuery(sql, [tableName, recordIdLocal, action, payload, createdAt]);
            console.log(`[SyncQueue] Operación ${action} en ${tableName} agregada a la cola.`);
        } catch (error) {
            console.error('[SyncQueue] Error al agregar a la cola:', error);
            throw error;
        }
    }

    /**
     * Obtiene todas las tareas pendientes de sincronización.
     */
    async getPendingTasks(): Promise<SyncTask[]> {
        const sql = `SELECT * FROM SyncQueue ORDER BY created_at ASC;`;
        try {
            const result = await databaseService.executeQuery(sql);
            return result.values || [];
        } catch (error) {
            console.error('[SyncQueue] Error al obtener tareas pendientes:', error);
            return [];
        }
    }

    /**
     * Elimina una tarea de la cola una vez procesada con éxito.
     */
    async markAsSynced(queueId: number): Promise<void> {
        const sql = `DELETE FROM SyncQueue WHERE id = ?;`;
        try {
            await databaseService.executeQuery(sql, [queueId]);
        } catch (error) {
            console.error('[SyncQueue] Error al eliminar tarea sincronizada:', error);
        }
    }

    /**
     * Registra un error y aumenta el contador de intentos.
     */
    async markAsFailed(queueId: number, error: string): Promise<void> {
        const sql = `
            UPDATE SyncQueue 
            SET attempts = attempts + 1, last_error = ? 
            WHERE id = ?;
        `;
        try {
            await databaseService.executeQuery(sql, [error, queueId]);
        } catch (err) {
            console.error('[SyncQueue] Error al actualizar fallo de tarea:', err);
        }
    }
}

export const syncQueueService = new SyncQueueService();
