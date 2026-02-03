import React from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import RadialGauge from './components/Dashboard/RadialGauge';
import KPIPanel from './components/Dashboard/KPIPanel';
import TrendGraph from './components/Dashboard/TrendGraph';
import CostPanel from './components/Dashboard/CostPanel';
import AlertPanel from './components/Dashboard/AlertPanel';
import { useSensorSimulation } from './hooks/useSensorSimulation';

import RiskTreeMap from './components/Dashboard/RiskTreeMap';

function App() {
  const {
    data,
    history,
    riskAnalysis,
    isRunning,
    toggleSimulation,
    updateSensor,
    logs,
    selectedProducts,
    fleetData,
    toggleProduct,
    selectAllProducts,
    clearAllProducts
  } = useSensorSimulation();



  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden selection:bg-electric-cyan/30">
      {/* Sidebar - Mobile Drawer / Desktop Sidebar */}
      <div className="hidden lg:block h-full shadow-2xl z-20">
        <Sidebar
          data={data}
          onUpdate={updateSensor}
          isRunning={isRunning}
          onToggle={toggleSimulation}
          selectedProducts={selectedProducts}
          onToggleProduct={toggleProduct}
          onSelectAll={selectAllProducts}
          onClearAll={clearAllProducts}
        />
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Background Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-10 pointer-events-none"></div>

        <div className="relative z-10 flex-1 overflow-y-auto p-4 md:p-8 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
          <Header status={riskAnalysis} />

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 max-w-7xl mx-auto">

            {/* Left Column: Gauges & KPIs & TreeMap */}
            <div className="xl:col-span-2 space-y-6">
              <KPIPanel data={data} riskAnalysis={riskAnalysis} />

              {selectedProducts.length === 1 ? (
                // Single product: show gauge + trend graph side by side
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <RadialGauge value={riskAnalysis.risk} label="Failure Probability" />
                  <TrendGraph history={history} selectedProducts={selectedProducts} />
                </div>
              ) : (
                // Multiple products: expand trend graph to full width
                <TrendGraph history={history} selectedProducts={selectedProducts} />
              )}

              {/* Fleet Risk Map - Always visible if products selected, or just placeholder */}
              <div className="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-sm min-h-[400px] shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-white flex items-center gap-3">
                    <span className="w-2 h-8 bg-gradient-to-b from-purple-500 to-indigo-500 rounded-full"></span>
                    Fleet Risk Overview
                  </h2>
                  {selectedProducts.length > 0 && (
                    <span className="px-3 py-1 bg-slate-800 rounded-full text-xs font-mono text-slate-400 border border-slate-700">
                      {selectedProducts.length} Products Monitored
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

              {/* Mobile Sidebar Controls (Visible only on small screens) */}
              <div className="lg:hidden">
                <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4 backdrop-blur-sm">
                  <h3 className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-4">Manual Controls</h3>
                  <button
                    onClick={toggleSimulation}
                    className={`w-full py-3 px-4 rounded-xl font-bold transition-all mb-4 flex items-center justify-center gap-2 ${isRunning
                      ? 'bg-red-500/10 text-red-400 border border-red-500/50'
                      : 'bg-electric-cyan/10 text-electric-cyan border border-electric-cyan/50'
                      }`}
                  >
                    {isRunning ? "STOP SIMULATION" : "START LIVE DATA"}
                  </button>
                  <p className="text-xs text-slate-500 text-center">Switch to Desktop for granular control.</p>
                </div>
              </div>

              {/* System Info Panel */}
              <div className="bg-slate-900/30 border border-slate-700/30 rounded-xl p-4 text-xs text-slate-500 font-mono">
                <div className="flex justify-between mb-1">
                  <span>Engine</span>
                  <span className="text-slate-400">RandomForest_v4</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span>Uptime</span>
                  <span className="text-slate-400">99.98%</span>
                </div>
                <div className="flex justify-between">
                  <span>Region</span>
                  <span className="text-slate-400">US-EAST-1</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
