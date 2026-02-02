import React from 'react';
import { Play, Pause, Settings, RefreshCw } from 'lucide-react';

const Sidebar = ({ data, onUpdate, isRunning, onToggle, selectedProducts = [], onToggleProduct, onSelectAll, onClearAll }) => {
    const Slider = ({ label, value, min, max, onChange, unit, step = 1 }) => (
        <div className="mb-6">
            <div className="flex justify-between mb-2">
                <label className="text-sm font-medium text-slate-400">{label}</label>
                <span className="text-sm text-electric-cyan font-mono">{Number(value).toFixed(1)} <span className="text-slate-600 text-xs">{unit}</span></span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-electric-cyan focus:outline-none focus:ring-2 focus:ring-electric-cyan/50"
            />
        </div>
    );

    const NumberInput = ({ label, value, min, max, onChange, unit }) => (
        <div className="mb-6">
            <label className="block text-sm font-medium text-slate-400 mb-2">{label} <span className="text-xs text-slate-600">({unit})</span></label>
            <input
                type="number"
                min={min}
                max={max}
                value={Math.round(value)}
                onChange={(e) => onChange(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-electric-cyan outline-none font-mono transition-shadow shadow-sm"
            />
        </div>
    );

    return (
        <aside className="w-full lg:w-80 bg-slate-900 border-r border-slate-800 p-6 flex flex-col h-full overflow-y-auto z-20 shadow-xl">
            <div className="flex items-center gap-3 mb-8 text-white">
                <div className="p-2 bg-white/5 rounded-lg text-electric-cyan border border-white/10">
                    <Settings size={20} />
                </div>
                <div>
                    <h2 className="font-bold text-lg tracking-wide leading-tight">Control Panel</h2>
                    <p className="text-xs text-slate-500">Simulation Settings</p>
                </div>
            </div>

            <div className="mb-8">
                <button
                    onClick={onToggle}
                    className={`w-full py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-bold transition-all shadow-lg active:scale-95 ${isRunning
                        ? 'bg-red-500/10 text-red-500 border border-red-500/50 hover:bg-red-500/20'
                        : 'bg-electric-cyan/10 text-electric-cyan border border-electric-cyan/50 hover:bg-electric-cyan/20'
                        }`}
                >
                    {isRunning ? <><Pause size={18} /> STOP SIMULATION</> : <><Play size={18} /> START LIVE DATA</>}
                </button>
            </div>

            <div className="mb-6">
                <label className="block text-sm font-medium text-slate-400 mb-2">Select Products (Fleet View)</label>
                <div className="grid grid-cols-5 gap-2">
                    {[...Array(10)].map((_, i) => {
                        const pid = i + 1;
                        const isSelected = selectedProducts?.includes(pid);
                        return (
                            <button
                                key={pid}
                                onClick={() => onToggleProduct(pid)}
                                className={`h-10 rounded-lg font-mono text-sm font-bold transition-all border ${isSelected
                                    ? 'bg-electric-cyan text-slate-900 border-electric-cyan'
                                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-electric-cyan/50'
                                    }`}
                            >
                                {pid}
                            </button>
                        );
                    })}
                </div>
                <div className="mt-2 flex justify-between">
                    <button onClick={onSelectAll} className="text-xs text-electric-cyan hover:underline">Select All</button>
                    <button onClick={onClearAll} className="text-xs text-slate-500 hover:text-white">Clear</button>
                </div>
            </div>

            <div className="flex-1">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Business Cost Profile</h3>
                    <Settings size={14} className="text-slate-600" />
                </div>

                <NumberInput
                    label="Cost of Missed Failure (FN)"
                    value={data.cost_fn || 5000}
                    min={100} max={50000}
                    unit="$"
                    onChange={(v) => onUpdate('cost_fn', v)}
                />

                <NumberInput
                    label="Cost of False Alarm (FP)"
                    value={data.cost_fp || 500}
                    min={10} max={5000}
                    unit="$"
                    onChange={(v) => onUpdate('cost_fp', v)}
                />

                <div className="h-px bg-slate-800 my-6"></div>

                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Sensor Inputs</h3>
                    <RefreshCw size={14} className="text-slate-600" />
                </div>

                <Slider
                    label="Air Temperature"
                    value={data.airTemp}
                    min={290} max={310}
                    step={0.1}
                    unit="K"
                    onChange={(v) => onUpdate('airTemp', v)}
                />

                <Slider
                    label="Process Temperature"
                    value={data.processTemp}
                    min={300} max={320}
                    step={0.1}
                    unit="K"
                    onChange={(v) => onUpdate('processTemp', v)}
                />

                <NumberInput
                    label="Rotational Speed"
                    value={data.rpm}
                    min={1000} max={3000}
                    unit="RPM"
                    onChange={(v) => onUpdate('rpm', v)}
                />

                <NumberInput
                    label="Torque"
                    value={data.torque}
                    min={0} max={100}
                    unit="Nm"
                    onChange={(v) => onUpdate('torque', v)}
                />

                <Slider
                    label="Tool Wear"
                    value={data.toolWear}
                    min={0} max={300}
                    step={1}
                    unit="min"
                    onChange={(v) => onUpdate('toolWear', v)}
                />
            </div>

            <div className="mt-8 pt-6 border-t border-slate-800 flex flex-col gap-2">
                <div className="flex justify-between text-xs text-slate-500">
                    <span>Latency</span>
                    <span className="text-green-400">12ms</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                    <span>Connection</span>
                    <span className="text-green-400">Stable</span>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
