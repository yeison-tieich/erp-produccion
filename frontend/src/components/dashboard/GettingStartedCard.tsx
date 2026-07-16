import React from 'react';
import { GlassCard } from '../ui/GlassCard';
import { CheckCircle2, Circle } from 'lucide-react';

export const GettingStartedCard = () => {
    return (
        <GlassCard className="h-full flex flex-col justify-between">
            <div>
                <h3 className="text-lg font-semibold text-slate-800">Getting Started</h3>
                <p className="text-sm text-slate-500 mt-1 mb-4">
                    The list below highlights the missing information we need to complete
                </p>
                
                <div className="flex items-center gap-2 mb-6">
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden border border-black/5">
                        <div className="h-full bg-green-500 w-[30%] rounded-full"></div>
                    </div>
                    <span className="text-xs font-semibold text-green-600">30%</span>
                </div>

                <ul className="space-y-3">
                    <li className="flex items-center gap-3 text-sm text-slate-600">
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                        <span className="line-through text-slate-400">Create your first workspace</span>
                    </li>
                    <li className="flex items-center gap-3 text-sm text-slate-600">
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                        <span className="line-through text-slate-400">Deploy an AI agent</span>
                    </li>
                    <li className="flex items-center gap-3 text-sm text-slate-800 font-medium">
                        <Circle className="w-5 h-5 text-slate-300" />
                        <span>Configure data connectors</span>
                    </li>
                    <li className="flex items-center gap-3 text-sm text-slate-800 font-medium">
                        <Circle className="w-5 h-5 text-slate-300" />
                        <span>Set up approval workflows</span>
                    </li>
                </ul>
            </div>
        </GlassCard>
    );
};
