import React from 'react';
import { GlassCard } from '../ui/GlassCard';
import { BarChart, Bar, ResponsiveContainer, YAxis } from 'recharts';
import { TrendingUp, TrendingDown, MoreHorizontal } from 'lucide-react';
import clsx from 'clsx';

interface KpiCardProps {
    title: string;
    value: string;
    trend: number;
    trendLabel: string;
    data: { value: number }[];
    color: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({ title, value, trend, trendLabel, data, color }) => {
    const isPositive = trend >= 0;

    return (
        <GlassCard className="flex flex-col justify-between">
            <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-medium text-slate-500">{title}</span>
                <button className="text-slate-400 hover:text-slate-600 transition-colors">
                    <MoreHorizontal className="w-4 h-4" />
                </button>
            </div>
            
            <div className="flex items-baseline gap-3 mb-1">
                <span className="text-3xl font-light tracking-tight text-slate-800">{value}</span>
                <div className={clsx(
                    "flex items-center text-xs font-semibold px-1.5 py-0.5 rounded-md bg-white/50 border border-white/60",
                    isPositive ? "text-green-600" : "text-red-500"
                )}>
                    {isPositive ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                    {Math.abs(trend)}%
                </div>
            </div>
            <span className="text-xs text-slate-400 mb-4">{trendLabel}</span>

            <div className="h-12 w-full mt-auto">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data}>
                        <Bar dataKey="value" fill={color} radius={[2, 2, 0, 0]} barSize={4} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </GlassCard>
    );
};
