import React from 'react';
import { useTurbineSimulation } from '../hooks/useTurbineSimulation';
import TrendGraph from '../components/Dashboard/TrendGraph';
import RadialGauge from '../components/Dashboard/RadialGauge';
import RiskTreeMap from '../components/Dashboard/RiskTreeMap';
import AlertPanel from '../components/Dashboard/AlertPanel';
import CostPanel from '../components/Dashboard/CostPanel';
import { Thermometer, Zap, Gauge, Droplets } from 'lucide-react';

// Custom KPI Card for Turbine
const TurbineKPICard = ({ title, value, unit, icon: Icon }) => (
    <div className="group relative bg-gradient-to-br from-slate-900/80 to-slate-800/40 border border-slate-700/50 rounded-2xl p-5 flex items-center shadow-xl backdrop-blur-md hover:border-emerald-500/50 hover:shadow-emerald-500/10 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        
        {/* Icon container with glow effect */}
        <div className="relative p-4 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl mr-5 text-emerald-400 group-hover:from-emerald-500/20 group-hover:to-teal-500/20 transition-all duration-300 group-hover:shadow-lg group-hover:shadow-emerald-500/30 group-hover:scale-110">
            <Icon size={26} className="relative z-10" />
            <div className="absolute inset-0 bg-emerald-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        </div>
        
        <div className="relative z-10 flex-1">
            <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-1.5 group-hover:text-slate-300 transition-colors">{title}</h3>
            <div className="text-3xl font-bold text-white font-mono">
                <span className="bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent">{value}</span>
                <span className="text-sm text-slate-500 font-normal ml-1.5">{unit}</span>
            </div>
        </div>
        
        {/* Corner accent */}
        <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-bl-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
    </div>
);

const TurbineDashboard = () => {
    const {
        data,
        history,
        multiHistory,
        isRunning,
        riskAnalysis,
        logs,
        selectedTurbines,
        fleetData,
        toggleSimulation,
        resetSimulation,
        handleTurbineSelect,
        updateCost
    } = useTurbineSimulation();

    // Define turbine IDs (1-10)
    const turbineIds = Array.from({ length: 10 }, (_, i) => (i + 1).toString());

    return (
        <>
            {/* Background Grid Pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-10 pointer-events-none"></div>

            {/* Main Dashboard Content */}
            <div className="relative z-10 flex-1 overflow-y-auto p-4 md:p-8 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
                {/* Header with Status */}
                <div className="mb-8 max-w-7xl mx-auto">
                    <div className="bg-gradient-to-r from-slate-900/80 via-slate-800/50 to-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 shadow-2xl">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-3xl font-black bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent mb-2">
                                    Turbine System Monitor
                                </h1>
                                <p className="text-slate-400 text-sm">Real-time turbine health monitoring and predictive analytics</p>
                            </div>
                            <div className="flex items-center space-x-4">
                                <div className="flex items-center space-x-3 bg-slate-800/50 px-5 py-3 rounded-xl border border-slate-700/50">
                                    <div className="relative">
                                        <div className={`w-3 h-3 rounded-full ${isRunning ? 'bg-emerald-500' : 'bg-gray-500'}`}></div>
                                        {isRunning && <div className="absolute inset-0 w-3 h-3 rounded-full bg-emerald-500 animate-ping"></div>}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-white font-bold text-sm">
                                            {isRunning ? 'Live Monitoring' : 'Paused'}
                                        </span>
                                        {selectedTurbines.length > 0 && (
                                            <span className="text-slate-400 text-xs">
                                                {selectedTurbines.length} turbine{selectedTurbines.length > 1 ? 's' : ''} active
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 max-w-7xl mx-auto">
                    {/* Left Column: Gauges & KPIs & TreeMap */}
                    <div className="xl:col-span-2 space-y-6">
                        {/* Turbine KPIs in grid layout matching equipment */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <TurbineKPICard 
                                title="Air Temperature"
                                value={data.AT?.toFixed(1) || '0.0'}
                                unit="°C"
                                icon={Thermometer}
                            />
                            <TurbineKPICard 
                                title="Voltage"
                                value={data.V?.toFixed(1) || '0.0'}
                                unit="V"
                                icon={Zap}
                            />
                            <TurbineKPICard 
                                title="Air Pressure"
                                value={data.AP?.toFixed(1) || '0.0'}
                                unit="mbar"
                                icon={Gauge}
                            />
                            <TurbineKPICard 
                                title="Humidity"
                                value={data.RH?.toFixed(1) || '0.0'}
                                unit="%"
                                icon={Droplets}
                            />
                        </div>

                        {selectedTurbines.length === 1 ? (
                            // Single turbine: show gauge + trend graph side by side
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <RadialGauge value={riskAnalysis.risk} label="Failure Probability" />
                                <TrendGraph history={selectedTurbines.length > 1 ? multiHistory : history} selectedProducts={selectedTurbines} />
                            </div>
                        ) : (
                            // Multiple turbines: expand trend graph to full width
                            <TrendGraph history={selectedTurbines.length > 1 ? multiHistory : history} selectedProducts={selectedTurbines} />
                        )}

                        {/* Fleet Risk Map */}
                        <div className="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-sm min-h-[400px] shadow-2xl">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold text-white flex items-center gap-3">
                                    <span className="w-2 h-8 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-full"></span>
                                    Turbine Fleet Risk Overview
                                </h2>
                                {selectedTurbines.length > 0 && (
                                    <span className="px-3 py-1 bg-slate-800 rounded-full text-xs font-mono text-slate-400 border border-slate-700">
                                        {selectedTurbines.length} Turbines Monitored
                                    </span>
                                )}
                            </div>
                            <div className="h-[300px]">
                                <RiskTreeMap data={fleetData} />
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Alerts & Logs */}
                    <div className="xl:col-span-1 space-y-6">
                        <AlertPanel logs={logs} />

                        <div className="h-auto min-h-40">
                            <CostPanel
                                cost_fn={data.cost_fn}
                                cost_fp={data.cost_fp}
                                threshold={riskAnalysis.threshold}
                                optimization={riskAnalysis.optimization}
                                isOptimizing={riskAnalysis.isOptimizing}
                            />
                        </div>

                        {/* Cost Optimization Panel */}
                        <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4 backdrop-blur-sm space-y-4">
                            <h3 className="text-slate-400 text-xs font-medium uppercase tracking-wider">Cost Optimization</h3>
                            
                            {/* Cost of Failure (FN) Slider */}
                            <div className="flex flex-col">
                                <label className="text-xs text-slate-300 font-semibold mb-2">Cost of Missed Failure (FN)</label>
                                <input
                                    type="range"
                                    min="1000"
                                    max="10000"
                                    step="500"
                                    value={data.cost_fn}
                                    onChange={(e) => updateCost('cost_fn', parseInt(e.target.value))}
                                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                />
                                <div className="flex justify-between text-xs text-slate-500 mt-1">
                                    <span>$1,000</span>
                                    <span className="text-emerald-400 font-mono">${data.cost_fn.toLocaleString()}</span>
                                    <span>$10,000</span>
                                </div>
                            </div>

                            {/* Cost of False Positive (FP) Slider */}
                            <div className="flex flex-col">
                                <label className="text-xs text-slate-300 font-semibold mb-2">Cost of False Positive (FP)</label>
                                <input
                                    type="range"
                                    min="100"
                                    max="2000"
                                    step="100"
                                    value={data.cost_fp}
                                    onChange={(e) => updateCost('cost_fp', parseInt(e.target.value))}
                                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                />
                                <div className="flex justify-between text-xs text-slate-500 mt-1">
                                    <span>$100</span>
                                    <span className="text-emerald-400 font-mono">${data.cost_fp.toLocaleString()}</span>
                                    <span>$2,000</span>
                                </div>
                            </div>

                            <div className="h-px bg-slate-700/50"></div>
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-500">Cost Ratio (FN:FP)</span>
                                <span className="text-emerald-400 font-mono">{(data.cost_fn / data.cost_fp).toFixed(1)}:1</span>
                            </div>
                        </div>

                        {/* Turbine Control Panel */}
                        <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4 backdrop-blur-sm space-y-4">
                            <h3 className="text-slate-400 text-xs font-medium uppercase tracking-wider">Turbine Controls</h3>
                            
                            {/* Turbine Selector */}
                            <div className="flex flex-col">
                                <label className="text-xs text-slate-300 font-semibold mb-2">Select Turbine(s)</label>
                                <select
                                    multiple
                                    value={selectedTurbines}
                                    onChange={(e) => {
                                        const selected = Array.from(e.target.selectedOptions, option => option.value);
                                        handleTurbineSelect(selected);
                                    }}
                                    className="bg-gradient-to-br from-slate-800 to-slate-900 text-white px-3 py-2 rounded-xl border border-slate-600/50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500/50 h-[120px] shadow-inner transition-all duration-300 hover:border-emerald-500/30 text-sm"
                                >
                                    {turbineIds.map(tid => (
                                        <option key={tid} value={tid} className="py-1">
                                            Turbine_{tid}
                                        </option>
                                    ))}
                                </select>
                                <span className="text-xs text-slate-500 mt-1.5">Hold Ctrl/Cmd for multiple</span>
                            </div>

                            {/* Control Buttons */}
                            <button
                                onClick={toggleSimulation}
                                disabled={selectedTurbines.length === 0}
                                className={`w-full py-3 px-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                                    selectedTurbines.length === 0
                                        ? 'bg-gray-700/50 text-gray-500 cursor-not-allowed border border-gray-600/50'
                                        : isRunning
                                        ? 'bg-red-500/10 text-red-400 border border-red-500/50 hover:bg-red-500/20'
                                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/50 hover:bg-emerald-500/20'
                                }`}
                            >
                                {isRunning ? "STOP MONITORING" : "START LIVE DATA"}
                            </button>

                            <button
                                onClick={resetSimulation}
                                className="w-full py-2 px-4 bg-slate-800/50 text-slate-400 rounded-xl font-semibold text-sm transition-all border border-slate-700/50 hover:bg-slate-700/50 hover:text-white flex items-center justify-center gap-2"
                            >
                                🔄 Reset Simulation
                            </button>
                        </div>

                        {/* System Info Panel */}
                        <div className="bg-slate-900/30 border border-slate-700/30 rounded-xl p-4 text-xs text-slate-500 font-mono">
                            <div className="flex justify-between mb-1">
                                <span>Engine</span>
                                <span className="text-slate-400">RandomForest_v2</span>
                            </div>
                            <div className="flex justify-between mb-1">
                                <span>Uptime</span>
                                <span className="text-slate-400">99.95%</span>
                            </div>
                            <div className="flex justify-between mb-3">
                                <span>Region</span>
                                <span className="text-slate-400">EU-WEST-1</span>
                            </div>
                            <div className="h-px bg-slate-700/50 mb-3"></div>
                            <div className="flex justify-between">
                                <span>Model</span>
                                <span className="text-emerald-400">Turbine ML</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default TurbineDashboard;
