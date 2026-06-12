import React from 'react';
import { Package, AlertTriangle, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';

interface StatsProps {
    totalItems: number;
    lowStockCount: number;
    totalWeight: number;
    monthlyMovements: number;
}

export const InventoryStats: React.FC<StatsProps> = ({ 
    totalItems, 
    lowStockCount, 
    totalWeight, 
    monthlyMovements 
}) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition cursor-default">
                <div className="bg-brand-50 p-3 rounded-xl">
                    <Package className="w-6 h-6 text-brand-600" />
                </div>
                <div>
                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Items</p>
                    <div className="flex items-baseline gap-2">
                        <h3 className="text-2xl font-bold text-gray-900">{totalItems.toLocaleString()}</h3>
                        <span className="text-xs font-medium text-green-600 bg-green-50 px-1.5 py-0.5 rounded">+42 New</span>
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition cursor-default">
                <div className="bg-red-50 p-3 rounded-xl">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Bajo Stock</p>
                    <div className="flex items-baseline gap-2">
                        <h3 className="text-2xl font-bold text-gray-900">{lowStockCount}</h3>
                        <span className="text-xs font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded">Requerido</span>
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition cursor-default">
                <div className="bg-blue-50 p-3 rounded-xl">
                    <ArrowUpCircle className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Peso Estimado</p>
                    <div className="flex items-baseline gap-2">
                        <h3 className="text-2xl font-bold text-gray-900">{totalWeight.toFixed(1)}</h3>
                        <span className="text-sm font-bold text-gray-600">Kg</span>
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition cursor-default">
                <div className="bg-green-50 p-3 rounded-xl">
                    <ArrowDownCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Ingresos Mes</p>
                    <div className="flex items-baseline gap-2">
                        <h3 className="text-2xl font-bold text-gray-900">{monthlyMovements}</h3>
                        <span className="text-xs font-medium text-green-600 bg-green-50 px-1.5 py-0.5 rounded">Entradas</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
