import React from 'react';
import { useGeneratorSimulation } from '../hooks/useGeneratorSimulation';
import TrendGraph from '../components/Dashboard/TrendGraph';
import RadialGauge from '../components/Dashboard/RadialGauge';
import RiskTreeMap from '../components/Dashboard/RiskTreeMap';
import AlertPanel from '../components/Dashboard/AlertPanel';
import CostPanel from '../components/Dashboard/CostPanel';
import { Thermometer, Wind, Gauge, Wrench, Cog } from 'lucide-react';

// Custom KPI Card for Generator
const GeneratorKPICard = ({ title, value, unit, icon: Icon }) => (
    <div className="group relative bg-gradient-to-br from-slate-900/80 to-slate-800/40 border border-slate-700/50 rounded-2xl p-5 flex items-center shadow-xl backdrop-blur-md hover:border-purple-500/50 hover:shadow-purple-500/10 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        
        {/* Icon container with glow effect */}
        <div className="relative p-4 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl mr-5 text-purple-400 group-hover:from-purple-500/20 group-hover:to-pink-500/20 transition-all duration-300 group-hover:shadow-lg group-hover:shadow-purple-500/30 group-hover:scale-110">
            <Icon size={26} className="relative z-10" />
            <div className="absolute inset-0 bg-purple-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        </div>
        
        <div className="relative z-10 flex-1">
            <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-1.5 group-hover:text-slate-300 transition-colors">{title}</h3>
            <div className="text-3xl font-bold text-white font-mono">
                <span className="bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent">{value}</span>
                <span className="text-sm text-slate-500 font-normal ml-1.5">{unit}</span>
            </div>
        </div>
        
        {/* Corner accent */}
        <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-purple-500/10 to-transparent rounded-bl-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
    </div>
);

const GeneratorDashboard = () => {
    const {
        data,
        history,
        multiHistory,
        isRunning,
        riskAnalysis,
        logs,
        selectedGenerators,
        fleetData,
        toggleSimulation,
        resetSimulation,
        handleGeneratorSelect
    } = useGeneratorSimulation();

    // Define generator IDs (1-10)
    const generatorIds = Array.from({ length: 10 }, (_, i) => (i + 1).toString());

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
                                <h1 className="text-3xl font-black bg-gradient-to-r from-purple-400 via-pink-300 to-purple-400 bg-clip-text text-transparent mb-2">
                                    Generator System Monitor
                                </h1>
                                <p className="text-slate-400 text-sm">Real-time generator health monitoring and predictive analytics</p>
                            </div>
                            <div className="flex items-center space-x-4">
                                <div className="flex items-center space-x-3 bg-slate-800/50 px-5 py-3 rounded-xl border border-slate-700/50">
                                    <div className="relative">
                                        <div className={`w-3 h-3 rounded-full ${isRunning ? 'bg-purple-500' : 'bg-gray-500'}`}></div>
                                        {isRunning && <div className="absolute inset-0 w-3 h-3 rounded-full bg-purple-500 animate-ping"></div>}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-white font-bold text-sm">
                                            {isRunning ? 'Live Monitoring' : 'Paused'}
                                        </span>
                                        {selectedGenerators.length > 0 && (
                                            <span className="text-slate-400 text-xs">
                                                {selectedGenerators.length} generator{selectedGenerators.length > 1 ? 's' : ''} active
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
                        {/* Generator KPIs in grid layout matching equipment */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                            <GeneratorKPICard 
                                title="Air Temp"
                                value={data.air_temp?.toFixed(1) || '0.0'}
                                unit="°C"
                                icon={Thermometer}
                            />
                            <GeneratorKPICard 
                                title="Core Temp"
                                value={data.core_temp?.toFixed(1) || '0.0'}
                                unit="°C"
                                icon={Wind}
                            />
                            <GeneratorKPICard 
                                title="RPM"
                                value={data.rpm?.toFixed(0) || '0'}
                                unit="rpm"
                                icon={Gauge}
                            />
                            <GeneratorKPICard 
                                title="Torque"
                                value={data.torque?.toFixed(1) || '0.0'}
                                unit="Nm"
                                icon={Wrench}
                            />
                            <GeneratorKPICard 
                                title="Wear"
                                value={data.wear?.toFixed(0) || '0'}
                                unit="min"
                                icon={Cog}
                            />
                        </div>

                        {selectedGenerators.length === 1 ? (
                            // Single generator: show gauge + trend graph side by side
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <RadialGauge value={riskAnalysis.risk} label="Failure Probability" />
                                <TrendGraph history={selectedGenerators.length > 1 ? multiHistory : history} selectedProducts={selectedGenerators} />
                            </div>
                        ) : (
                            // Multiple generators: expand trend graph to full width
                            <TrendGraph history={selectedGenerators.length > 1 ? multiHistory : history} selectedProducts={selectedGenerators} />
                        )}

                        {/* Fleet Risk Map */}
                        <div className="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-sm min-h-[400px] shadow-2xl">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold text-white flex items-center gap-3">
                                    <span className="w-2 h-8 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full"></span>
                                    Generator Fleet Risk Overview
                                </h2>
                                {selectedGenerators.length > 0 && (
                                    <span className="px-3 py-1 bg-slate-800 rounded-full text-xs font-mono text-slate-400 border border-slate-700">
                                        {selectedGenerators.length} Generators Monitored
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

                        <div className="h-40">
                            <CostPanel
                                cost_fn={data.cost_fn}
                                cost_fp={data.cost_fp}
                                threshold={riskAnalysis.threshold}
                            />
                        </div>

                        {/* Generator Control Panel */}
                        <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4 backdrop-blur-sm space-y-4">
                            <h3 className="text-slate-400 text-xs font-medium uppercase tracking-wider">Generator Controls</h3>
                            
                            {/* Generator Selector */}
                            <div className="flex flex-col">
                                <label className="text-xs text-slate-300 font-semibold mb-2">Select Generator(s)</label>
                                <select
                                    multiple
                                    value={selectedGenerators}
                                    onChange={(e) => {
                                        const selected = Array.from(e.target.selectedOptions, option => option.value);
                                        handleGeneratorSelect(selected);
                                    }}
                                    className="bg-gradient-to-br from-slate-800 to-slate-900 text-white px-3 py-2 rounded-xl border border-slate-600/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500/50 h-[120px] shadow-inner transition-all duration-300 hover:border-purple-500/30 text-sm"
                                >
                                    {generatorIds.map(gid => (
                                        <option key={gid} value={gid} className="py-1">
                                            Generator_{gid}
                                        </option>
                                    ))}
                                </select>
                                <span className="text-xs text-slate-500 mt-1.5">Hold Ctrl/Cmd for multiple</span>
                            </div>

                            {/* Control Buttons */}
                            <button
                                onClick={toggleSimulation}
                                disabled={selectedGenerators.length === 0}
                                className={`w-full py-3 px-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                                    selectedGenerators.length === 0
                                        ? 'bg-gray-700/50 text-gray-500 cursor-not-allowed border border-gray-600/50'
                                        : isRunning
                                        ? 'bg-red-500/10 text-red-400 border border-red-500/50 hover:bg-red-500/20'
                                        : 'bg-purple-500/10 text-purple-400 border border-purple-500/50 hover:bg-purple-500/20'
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
                                <span className="text-slate-400">RandomForest_v3</span>
                            </div>
                            <div className="flex justify-between mb-1">
                                <span>Uptime</span>
                                <span className="text-slate-400">99.97%</span>
                            </div>
                            <div className="flex justify-between mb-3">
                                <span>Region</span>
                                <span className="text-slate-400">AP-SOUTH-1</span>
                            </div>
                            <div className="h-px bg-slate-700/50 mb-3"></div>
                            <div className="flex justify-between">
                                <span>Model</span>
                                <span className="text-purple-400">Generator ML</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default GeneratorDashboard;
