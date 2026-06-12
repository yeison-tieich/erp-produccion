import axios from 'axios';
import { API_URL } from '../api';
import { syncQueueService } from './syncQueueService';
import { databaseService } from './databaseService';
import { ordenTrabajoRepository } from '../repositories/ordenTrabajoRepository';

class SyncService {
    private isSyncing = false;

    /**
     * Proceso principal de sincronización: Push -> Pull
     */
    async syncAll(): Promise<void> {
        if (this.isSyncing) return;
        this.isSyncing = true;

        try {
            console.log('[SyncService] Iniciando sincronización...');
            await this.pushChanges();
            await this.pullChanges();
            console.log('[SyncService] Sincronización completada con éxito.');
        } catch (error) {
            console.error('[SyncService] Error durante la sincronización:', error);
            throw error;
        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * Sube cambios locales al servidor
     */
    private async pushChanges(): Promise<void> {
        const pendingTasks = await syncQueueService.getPendingTasks();
        if (pendingTasks.length === 0) return;

        console.log(`[SyncService] Subiendo ${pendingTasks.length} cambios...`);

        try {
            const response = await axios.post(`${API_URL}/sync/push`, {
                changes: pendingTasks
            });

            const { results } = response.data;

            for (const res of results) {
                const task = pendingTasks.find(t => t.record_id_local === res.record_id_local);
                if (!task) continue;

                if (res.status === 'success') {
                    // 1. Actualizar el registro local con el id_server y marcar como synced
                    if (task.table_name === 'OrdenTrabajo') {
                        await databaseService.executeQuery(
                            `UPDATE OrdenTrabajo SET id_server = ?, sync_status = 'synced' WHERE id_local = ?`,
                            [res.id_server, res.record_id_local]
                        );
                    }
                    // 2. Eliminar de la cola
                    await syncQueueService.markAsSynced(task.id!);
                } else {
                    await syncQueueService.markAsFailed(task.id!, res.message);
                }
            }
        } catch (error) {
            console.error('[SyncService] Falló el push de cambios:', error);
            throw error;
        }
    }

    /**
     * Descarga cambios del servidor y los aplica localmente
     */
    private async pullChanges(): Promise<void> {
        const lastSync = localStorage.getItem('lastSyncTimestamp') || '0';
        
        try {
            const response = await axios.get(`${API_URL}/sync/pull`, {
                params: { lastSync }
            });

            const { changes, serverTime } = response.data;

            // 1. Procesar Órdenes de Trabajo
            if (changes.OrdenTrabajo) {
                for (const serverItem of changes.OrdenTrabajo) {
                    await this.mergeRecord('OrdenTrabajo', serverItem);
                }
            }

            // 2. Procesar Movimientos de Inventario
            if (changes.MovimientoInventarioMP) {
                for (const serverItem of changes.MovimientoInventarioMP) {
                    await this.mergeRecord('MovimientoInventarioMP', serverItem);
                }
            }

            // 3. Procesar Catálogo de Materia Prima
            if (changes.MateriaPrima) {
                for (const serverItem of changes.MateriaPrima) {
                    await this.mergeRecord('MateriaPrima', serverItem);
                }
            }

            // 4. Procesar Tareas
            if (changes.TareaProduccion) {
                for (const serverItem of changes.TareaProduccion) {
                    await this.mergeRecord('TareaProduccion', serverItem);
                }
            }

            localStorage.setItem('lastSyncTimestamp', serverTime.toString());
        } catch (error) {
            console.error('[SyncService] Falló el pull de cambios:', error);
            throw error;
        }
    }

    /**
     * Mezcla un registro del servidor con la base de datos local
     */
    private async mergeRecord(tableName: string, serverItem: any): Promise<void> {
        // Buscar si ya existe localmente por id_server
        const existing = await databaseService.executeQuery(
            `SELECT * FROM ${tableName} WHERE id_server = ?`,
            [serverItem.id]
        );

        const localRecord = existing.values?.[0];

        if (localRecord) {
            // Si existe localmente y no tiene cambios pendientes, lo actualizamos
            if (localRecord.sync_status === 'synced') {
                const cleanUpdates: any = {};
                Object.keys(serverItem).forEach(key => {
                    const val = serverItem[key];
                    if (key !== 'id' && (typeof val !== 'object' || val === null)) {
                        cleanUpdates[this.mapServerToLocalField(key)] = val;
                    }
                });

                const keys = Object.keys(cleanUpdates);
                const setClause = keys.map(k => `${k} = ?`).join(', ');
                const values = [...Object.values(cleanUpdates), serverItem.id, serverItem.id];
                
                await databaseService.executeQuery(
                    `UPDATE ${tableName} SET ${setClause}, id_server = ? WHERE id_server = ?`,
                    values
                );
            }
            // Si tiene cambios pendientes localmente, aquí es donde iría la lógica de resolución de conflictos.
            // "Last Write Wins" simplificado: El servidor suele ganar en pull si no hay conflicto local crítico.
        } else {
            // No existe localmente, insertar
            const id_local = crypto.randomUUID();
            
            // Filtrar cleanItem para que solo incluya valores primitivos (no objetos ni arreglos como 'producto')
            const cleanItem: any = {};
            Object.keys(serverItem).forEach(key => {
                const val = serverItem[key];
                if (key !== 'id' && (typeof val !== 'object' || val === null)) {
                    cleanItem[this.mapServerToLocalField(key)] = val;
                }
            });

            const fields = ['id_local', 'id_server', 'sync_status', 'updated_at', ...Object.keys(cleanItem)];
            const placeholders = fields.map(() => '?').join(', ');
            const values = [id_local, serverItem.id, 'synced', Date.now(), ...Object.values(cleanItem)];

            await databaseService.executeQuery(
                `INSERT INTO ${tableName} (${fields.join(', ')}) VALUES (${placeholders})`,
                values
            );
        }
    }

    private mapServerToLocalField(field: string): string {
        // Mapeo simple si los nombres difieren, por ahora coinciden mayormente
        if (field === 'updatedAt') return 'updated_at';
        return field;
    }
}

export const syncService = new SyncService();
