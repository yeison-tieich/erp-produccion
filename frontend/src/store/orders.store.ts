import { create } from 'zustand';
import { ordenTrabajoRepository, OrdenTrabajoLocal } from '../repositories/ordenTrabajoRepository';
import { syncService } from '../services/syncService';
import axios from 'axios';
import { API_URL } from '../api';

interface OrdersState {
    orders: OrdenTrabajoLocal[];
    isLoading: boolean;
    isSyncing: boolean;
    error: string | null;

    // Acciones
    fetchOrders: () => Promise<void>;
    createOrdenOffline: (data: Partial<OrdenTrabajoLocal>) => Promise<void>;
    updateOrden: (id_local: string, id_server: number | undefined, data: Partial<OrdenTrabajoLocal>) => Promise<void>;
    updateOrdenStatus: (id_local: string, id_server: number | undefined, status: string) => Promise<void>;
    deleteOrden: (id_local: string, id_server: number | undefined) => Promise<void>;
    duplicateOrder: (id_server: number) => Promise<void>;
    
    // Sincronización
    sync: () => Promise<void>;
}

export const useOrdersStore = create<OrdersState>((set, get) => ({
    orders: [],
    isLoading: false,
    isSyncing: false,
    error: null,

    /**
     * Carga las órdenes desde la fuente de verdad (Repositiorio Híbrido).
     * En móvil lee SQLite, en Web lee API.
     */
    fetchOrders: async () => {
        set({ isLoading: true, error: null });
        try {
            const data = await ordenTrabajoRepository.getAll();
            set({ orders: data, isLoading: false });
        } catch (err: any) {
            set({ error: err.message, isLoading: false });
        }
    },

    /**
     * Crea una orden.
     * En móvil se guarda en SQLite + SyncQueue inmediatamente.
     */
    createOrdenOffline: async (data) => {
        set({ isLoading: true });
        try {
            await ordenTrabajoRepository.create(data);
            await get().fetchOrders();
        } catch (err: any) {
            set({ error: err.message, isLoading: false });
        }
    },

    /**
     * Actualiza una orden completa.
     */
    updateOrden: async (id_local, id_server, data) => {
        set({ isLoading: true });
        try {
            await ordenTrabajoRepository.update(id_local, id_server, data);
            await get().fetchOrders();
        } catch (err: any) {
            set({ error: err.message, isLoading: false });
        }
    },

    /**
     * Actualiza solo el estado de una orden.
     */
    updateOrdenStatus: async (id_local, id_server, status) => {
        try {
            await ordenTrabajoRepository.update(id_local, id_server, { estado_ot: status });
            await get().fetchOrders();
        } catch (err: any) {
            set({ error: err.message });
        }
    },

    /**
     * Duplica una orden (Solo Web por ahora, o requiere lógica compleja en SQLite).
     */
    duplicateOrder: async (id_server) => {
        set({ isLoading: true });
        try {
            await axios.post(`${API_URL}/orders/${id_server}/duplicate`);
            await get().fetchOrders();
        } catch (err: any) {
            set({ error: err.message, isLoading: false });
        }
    },

    /**
     * Elimina una orden (Soft Delete).
     */
    deleteOrden: async (id_local, id_server) => {
        try {
            await ordenTrabajoRepository.delete(id_local, id_server);
            await get().fetchOrders();
        } catch (err: any) {
            set({ error: err.message });
        }
    },

    /**
     * Dispara el proceso de sincronización completa.
     */
    sync: async () => {
        set({ isSyncing: true });
        try {
            await syncService.syncAll();
            await get().fetchOrders();
        } catch (err: any) {
            set({ error: `Sync failed: ${err.message}` });
        } finally {
            set({ isSyncing: false });
        }
    }
}));
