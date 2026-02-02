import React from 'react';
import { ShieldCheck, Activity } from 'lucide-react';

const Header = ({ status }) => {
    // status: { risk: number, label: string, reason: string }
    const getStatusColor = () => {
        if (status.risk > 80) return 'bg-red-500 shadow-red-500/50';
        if (status.risk > 50) return 'bg-yellow-500 shadow-yellow-500/50';
        return 'bg-green-500 shadow-green-500/50';
    };

    return (
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                    Industrial AI: Equipment Health Monitor
                </h1>
                <div className="flex items-center gap-2 text-slate-500 text-sm mt-1">
                    <ShieldCheck size={14} className="text-electric-cyan" />
                    <span>Predictive Maintenance System v2.0 (AI4I 2020)</span>
                </div>
            </div>

            <div className="flex items-center gap-4 bg-slate-900/80 p-3 rounded-xl border border-slate-800 backdrop-blur-sm">
                <div className="text-right hidden md:block">
                    <div className="text-xs text-slate-400 uppercase tracking-widest">System Status</div>
                    <div className="font-mono font-bold text-white leading-tight">{status.label}</div>
                    {status.reason && (
                        <div className="text-[10px] text-electric-cyan mt-1 max-w-[200px] leading-tight">
                            {status.reason}
                        </div>
                    )}
                </div>
                <div className="relative mx-2">
                    <div className={`w-3 h-3 rounded-full ${getStatusColor()} shadow-lg animate-pulse`}></div>
                    <div className={`absolute inset-0 w-3 h-3 rounded-full ${getStatusColor()} animate-ping opacity-75`}></div>
                </div>
            </div>
        </header>
    );
};

export default Header;
