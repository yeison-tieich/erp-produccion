import React from 'react';
import { GlassCard } from '../ui/GlassCard';
import clsx from 'clsx';

const mockRuns = [
    { id: 1, name: 'Claims-Checker', time: '2 min ago', latency: '2.5s', status: 'Live' },
    { id: 2, name: 'KYC-Validator', time: '5 min ago', latency: '1.2s', status: 'Live' },
    { id: 3, name: 'Fraud-Monitor', time: '2 min ago', latency: '3.8s', status: 'Closed' },
    { id: 4, name: 'Swift-Analyzer', time: '10 min ago', latency: '1.2s', status: 'Live' },
];

export const LiveRunsStream = () => {
    return (
        <GlassCard className="h-full flex flex-col">
            <div className="flex items-center gap-2 mb-4 px-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <h3 className="text-sm font-semibold text-slate-800">Live Runs Stream</h3>
            </div>

            <div className="flex-1 overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-400 font-medium border-b border-black/5">
                        <tr>
                            <th className="px-4 py-3 font-medium">Name</th>
                            <th className="px-4 py-3 font-medium text-center">Time</th>
                            <th className="px-4 py-3 font-medium text-center">Latency</th>
                            <th className="px-4 py-3 font-medium text-right">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5">
                        {mockRuns.map((run) => (
                            <tr key={run.id} className="hover:bg-white/40 transition-colors">
                                <td className="px-4 py-3 font-medium text-slate-700">{run.name}</td>
                                <td className="px-4 py-3 text-slate-500 text-center">{run.time}</td>
                                <td className="px-4 py-3 text-slate-500 text-center">{run.latency}</td>
                                <td className="px-4 py-3 text-right">
                                    <span className={clsx(
                                        "px-2 py-1 rounded-md text-xs font-semibold inline-block min-w-[60px] text-center",
                                        run.status === 'Live' ? "bg-green-50 text-green-600 border border-green-200/50" : "bg-red-50 text-red-600 border border-red-200/50"
                                    )}>
                                        {run.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </GlassCard>
    );
};
