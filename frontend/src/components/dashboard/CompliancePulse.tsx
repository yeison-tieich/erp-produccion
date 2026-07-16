import React from 'react';
import { GlassCard } from '../ui/GlassCard';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { MoreHorizontal } from 'lucide-react';
import clsx from 'clsx';

const data = [
    { name: 'Active', value: 94, color: '#f59e0b' }, // orange
    { name: 'Draft', value: 6, color: '#3b82f6' }, // blue
];

// Using a semi-circle gauge approach
const gaugeData = [
    { name: 'A', value: 25, color: '#f59e0b' }, // Orange segment
    { name: 'B', value: 69, color: '#22c55e' }, // Green segment
    { name: 'C', value: 6, color: '#3b82f6' },  // Blue segment
];

export const CompliancePulse = () => {
    return (
        <GlassCard className="h-full flex flex-col">
            <div className="flex justify-between items-start mb-4">
                <h3 className="text-sm font-medium text-slate-800">Compliance pulse</h3>
                <button className="text-slate-400 hover:text-slate-600 transition-colors">
                    <MoreHorizontal className="w-4 h-4" />
                </button>
            </div>

            <div className="relative h-32 w-full mb-6">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={gaugeData}
                            cx="50%"
                            cy="100%"
                            startAngle={180}
                            endAngle={0}
                            innerRadius={70}
                            outerRadius={85}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                            cornerRadius={8}
                        >
                            {gaugeData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>
                
                <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
                    <span className="text-xs text-slate-500 font-medium">Policy Coverage</span>
                    <span className="text-4xl font-light text-slate-800 tracking-tight">94%</span>
                </div>
            </div>

            <div className="space-y-3 mt-auto">
                <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Data Privacy (DAT-001)</span>
                    <span className="text-green-600 font-medium">Active</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Approval Gates (APR-002)</span>
                    <span className="text-green-600 font-medium">Active</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Security Training (SEC-003)</span>
                    <span className="text-orange-500 font-medium">Draft</span>
                </div>
            </div>
        </GlassCard>
    );
};
