import React from 'react';
import { GlassCard } from '../ui/GlassCard';
import { AlertTriangle } from 'lucide-react';
import clsx from 'clsx';

export const CostForecastCard = () => {
    return (
        <GlassCard className="h-full flex flex-col">
            <h3 className="text-sm font-medium text-slate-500 mb-1">30-day Cost Forecast</h3>
            <div className="flex items-baseline gap-2 mb-2">
                <span className="text-3xl font-light tracking-tight text-slate-800">$3,890</span>
            </div>
            
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-6">
                <div className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded flex items-center font-semibold">
                    <span className="text-[10px] mr-1">↑</span>12%
                </div>
                Projected spend for next 30 days
            </div>

            <div className="mt-auto">
                {/* Progress Bar Labeling */}
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-2 px-1">
                    <span style={{ width: '30%' }}>60%</span>
                    <span style={{ width: '25%' }}>30%</span>
                    <span style={{ width: '45%' }}>45%</span>
                </div>

                {/* Segmented Progress Bars */}
                <div className="flex gap-1.5 mb-4">
                    {/* Unused: Blue segments */}
                    <div className="flex gap-0.5" style={{ width: '30%' }}>
                        {[...Array(12)].map((_, i) => (
                            <div key={`u-${i}`} className="h-3 flex-1 bg-brand-400 rounded-sm"></div>
                        ))}
                    </div>
                    {/* Used: Orange segment */}
                    <div className="flex gap-0.5" style={{ width: '25%' }}>
                        <div className="h-3 flex-1 bg-orange-500 rounded-sm"></div>
                    </div>
                    {/* Reserved: Green segments */}
                    <div className="flex gap-0.5" style={{ width: '45%' }}>
                        {[...Array(6)].map((_, i) => (
                            <div key={`r-${i}`} className="h-3 flex-1 bg-green-500 rounded-sm"></div>
                        ))}
                    </div>
                </div>

                {/* Legend */}
                <div className="flex gap-4 text-xs font-medium text-slate-500 mb-4 px-1">
                    <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-brand-400"></div> Unused
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div> Used
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div> Reserved
                    </div>
                </div>

                {/* Confidence Footer */}
                <div className="bg-orange-50/50 border border-orange-200/50 rounded-xl p-3 flex justify-between items-center text-xs backdrop-blur-sm">
                    <div className="flex items-center gap-2 text-orange-700 font-medium">
                        <AlertTriangle className="w-4 h-4" /> Confidence:
                    </div>
                    <div className="font-semibold text-slate-700">
                        87% <span className="font-normal text-slate-400 ml-1">vs last month</span>
                    </div>
                </div>
            </div>
        </GlassCard>
    );
};
