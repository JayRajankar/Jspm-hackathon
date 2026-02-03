import React from 'react';
import { Play, Pause, Settings, RefreshCw } from 'lucide-react';

const Sidebar = ({ data, onUpdate, onUpdateCost, isRunning, onToggle, selectedProducts = [], onToggleProduct, onSelectAll, onClearAll }) => {
    const Slider = ({ label, value, min, max, onChange, unit, step = 1 }) => (
        <div className="mb-6 group">
            <div className="flex justify-between mb-2">
                <label className="text-sm font-semibold text-slate-300 group-hover:text-white transition-colors">{label}</label>
                <span className="text-sm text-electric-cyan font-mono font-bold bg-slate-800/50 px-2 py-0.5 rounded-md border border-slate-700/50">
                    {Number(value).toFixed(1)} <span className="text-slate-500 text-xs">{unit}</span>
                </span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className="w-full h-2.5 bg-gradient-to-r from-slate-700 to-slate-600 rounded-lg appearance-none cursor-pointer accent-electric-cyan focus:outline-none focus:ring-2 focus:ring-electric-cyan/50 shadow-inner hover:shadow-lg transition-shadow"
            />
        </div>
    );

    const NumberInput = ({ label, value, min, max, onChange, unit }) => (
        <div className="mb-6 group">
            <label className="block text-sm font-semibold text-slate-300 mb-2 group-hover:text-white transition-colors">
                {label} <span className="text-xs text-slate-500">({unit})</span>
            </label>
            <input
                type="number"
                min={min}
                max={max}
                value={Math.round(value)}
                onChange={(e) => onChange(Number(e.target.value))}
                className="w-full bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/70 rounded-xl px-4 py-2.5 text-white focus:ring-2 focus:ring-electric-cyan/50 focus:border-electric-cyan/50 outline-none font-mono transition-all shadow-lg hover:shadow-electric-cyan/10"
            />
        </div>
    );

    return (
        <aside className="w-full lg:w-80 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-r border-slate-800/80 p-6 flex flex-col h-full overflow-y-auto z-20 shadow-2xl">
            <div className="flex items-center gap-3 mb-8 text-white">
                <div className="p-2.5 bg-gradient-to-br from-electric-cyan/20 to-blue-500/20 rounded-xl text-electric-cyan border border-electric-cyan/30 shadow-lg shadow-electric-cyan/20">
                    <Settings size={22} />
                </div>
                <div>
                    <h2 className="font-bold text-lg tracking-wide leading-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">Control Panel</h2>
                    <p className="text-xs text-slate-500 font-medium">Simulation Settings</p>
                </div>
            </div>

            <div className="mb-8">
                <button
                    onClick={onToggle}
                    className={`w-full py-3.5 px-4 rounded-xl flex items-center justify-center gap-3 font-bold transition-all shadow-xl active:scale-95 border-2 ${isRunning
                        ? 'bg-gradient-to-r from-red-500/20 to-rose-500/20 text-red-400 border-red-500/60 hover:from-red-500/30 hover:to-rose-500/30 hover:border-red-500/80 shadow-red-500/30'
                        : 'bg-gradient-to-r from-electric-cyan/20 to-blue-500/20 text-electric-cyan border-electric-cyan/60 hover:from-electric-cyan/30 hover:to-blue-500/30 hover:border-electric-cyan/80 shadow-electric-cyan/30'
                        }`}
                >
                    {isRunning ? <><Pause size={20} /> STOP SIMULATION</> : <><Play size={20} /> START LIVE DATA</>}
                </button>
            </div>

            <div className="mb-8 bg-slate-800/30 rounded-xl p-4 border border-slate-700/50 backdrop-blur-sm">
                <label className="block text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-gradient-to-b from-electric-cyan to-blue-500 rounded-full"></span>
                    Select Products (Fleet View)
                </label>
                <div className="grid grid-cols-5 gap-2">
                    {[...Array(10)].map((_, i) => {
                        const pid = i + 1;
                        const isSelected = selectedProducts?.includes(pid);
                        return (
                            <button
                                key={pid}
                                onClick={() => onToggleProduct(pid)}
                                className={`h-11 rounded-lg font-mono text-sm font-bold transition-all duration-200 border-2 shadow-md ${isSelected
                                    ? 'bg-gradient-to-br from-electric-cyan to-blue-500 text-slate-900 border-electric-cyan shadow-electric-cyan/50 scale-105'
                                    : 'bg-gradient-to-br from-slate-800 to-slate-900 text-slate-400 border-slate-700/70 hover:border-electric-cyan/60 hover:text-white hover:scale-105 hover:shadow-lg'
                                    }`}
                            >
                                {pid}
                            </button>
                        );
                    })}
                </div>
                <div className="mt-3 flex justify-between px-1">
                    <button onClick={onSelectAll} className="text-xs text-electric-cyan hover:text-electric-cyan/80 font-semibold transition-colors">Select All</button>
                    <button onClick={onClearAll} className="text-xs text-slate-500 hover:text-red-400 font-semibold transition-colors">Clear All</button>
                </div>
            </div>

            <div className="flex-1">
                <div className="flex items-center justify-between mb-6 bg-slate-800/30 px-4 py-3 rounded-xl border border-slate-700/50">
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                        <span className="w-1.5 h-4 bg-gradient-to-b from-purple-500 to-indigo-500 rounded-full"></span>
                        Business Cost Profile
                    </h3>
                    <Settings size={16} className="text-slate-500" />
                </div>

                <NumberInput
                    label="Cost of Missed Failure (FN)"
                    value={data.cost_fn || 5000}
                    min={100} max={50000}
                    unit="$"
                    onChange={(v) => onUpdateCost('cost_fn', v)}
                />

                <NumberInput
                    label="Cost of False Alarm (FP)"
                    value={data.cost_fp || 500}
                    min={10} max={5000}
                    unit="$"
                    onChange={(v) => onUpdateCost('cost_fp', v)}
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
