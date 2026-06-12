import React from 'react';
import { Cloud, CloudOff, RefreshCw, AlertCircle } from 'lucide-react';
import { useOrdersStore } from '../store/orders.store';
import clsx from 'clsx';
import { Capacitor } from '@capacitor/core';

export const SyncIndicator = () => {
    const { isSyncing, sync, error, orders } = useOrdersStore();
    const isNative = Capacitor.isNativePlatform();

    // Si no es nativo (Web), no mostramos el indicador de sync local
    if (!isNative) return null;

    const pendingCount = orders.filter(o => o.sync_status !== 'synced').length;

    return (
        <div className="flex items-center gap-2">
            <button
                onClick={() => sync()}
                disabled={isSyncing}
                className={clsx(
                    "relative p-2 rounded-xl transition-all duration-300 group",
                    isSyncing ? "bg-brand-50 text-brand-600" : "bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600",
                    error && "bg-red-50 text-red-600"
                )}
                title={error ? `Error: ${error}` : isSyncing ? "Sincronizando..." : "Sincronizar ahora"}
            >
                {isSyncing ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                ) : error ? (
                    <AlertCircle className="w-5 h-5" />
                ) : pendingCount > 0 ? (
                    <Cloud className="w-5 h-5 text-orange-500" />
                ) : (
                    <Cloud className="w-5 h-5" />
                )}

                {pendingCount > 0 && !isSyncing && (
                    <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">
                        {pendingCount}
                    </span>
                )}
            </button>
            
            <div className="hidden sm:flex flex-col">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">
                    {isSyncing ? "Sincronizando" : error ? "Fallo de Red" : "Estado Local"}
                </span>
                <span className={clsx(
                    "text-xs font-bold",
                    isSyncing ? "text-brand-600" : error ? "text-red-500" : pendingCount > 0 ? "text-orange-500" : "text-gray-500"
                )}>
                    {isSyncing ? "En progreso..." : error ? "Sin conexión" : pendingCount > 0 ? `${pendingCount} pendientes` : "Al día"}
                </span>
            </div>
        </div>
    );
};
