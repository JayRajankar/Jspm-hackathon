import React from 'react';
import { AlertTriangle, Info, CheckCircle, ShieldAlert } from 'lucide-react';

const AlertPanel = ({ logs }) => {
    const getIcon = (type) => {
        switch (type) {
            case 'danger': return <ShieldAlert size={16} />;
            case 'warning': return <AlertTriangle size={16} />;
            case 'success': return <CheckCircle size={16} />;
            default: return <Info size={16} />;
        }
    };

    const getColor = (type) => {
        switch (type) {
            case 'danger': return 'text-red-400 border-red-900/50 bg-red-900/10';
            case 'warning': return 'text-yellow-400 border-yellow-900/50 bg-yellow-900/10';
            case 'success': return 'text-green-400 border-green-900/50 bg-green-900/10';
            default: return 'text-blue-400 border-blue-900/50 bg-blue-900/10';
        }
    };

    return (
        <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4 backdrop-blur-sm h-72 flex flex-col shadow-lg">
            <h3 className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-4 flex items-center justify-between">
                <span>System Activity Log</span>
                <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full text-[10px]">{logs.length}</span>
            </h3>

            <div className="overflow-y-auto pr-2 space-y-2 flex-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                {logs.length === 0 ? (
                    <div className="text-slate-600 text-center text-sm py-10 italic">
                        System Initialized. No alerts.
                    </div>
                ) : (
                    logs.map(log => (
                        <div key={log.id} className={`p-3 rounded-lg border text-sm flex items-start gap-3 animate-slideIn ${getColor(log.type)}`}>
                            <span className="mt-0.5">{getIcon(log.type)}</span>
                            <div className="flex-1">
                                <div className="font-semibold">{log.message}</div>
                                <div className="text-[10px] opacity-70 mt-1 font-mono">
                                    {new Date(log.time).toLocaleTimeString()}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default AlertPanel;
