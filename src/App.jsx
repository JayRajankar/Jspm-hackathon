import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import RadialGauge from './components/Dashboard/RadialGauge';
import KPIPanel from './components/Dashboard/KPIPanel';
import TrendGraph from './components/Dashboard/TrendGraph';
import CostPanel from './components/Dashboard/CostPanel';
import AlertPanel from './components/Dashboard/AlertPanel';
import RiskTreeMap from './components/Dashboard/RiskTreeMap';
import { useSensorSimulation } from './hooks/useSensorSimulation';
import TurbineDashboard from './components/TurbineDashboard';

function App() {
  const [activeTab, setActiveTab] = useState('equipment'); // 'equipment' or 'turbine'
  
  const {
    data,
    history,
    multiHistory,
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

  // Email test state
  const [emailStatus, setEmailStatus] = useState(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const testEmailAlert = async () => {
    setIsSendingEmail(true);
    setEmailStatus(null);
    try {
      const response = await fetch('http://localhost:8000/alert/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: selectedProducts.length > 0 ? `Product_${selectedProducts[0]}` : "Test_Product",
          risk_value: riskAnalysis.risk || 75,
          sensor_data: {
            air_temp: data.airTemp,
            proc_temp: data.processTemp,
            rpm: data.rpm,
            torque: data.torque,
            tool_wear: data.toolWear
          }
        })
      });
      const result = await response.json();
      setEmailStatus({ success: true, message: "Email alert sent!" });
    } catch (err) {
      setEmailStatus({ success: false, message: "Failed to send email" });
    }
    setIsSendingEmail(false);
    setTimeout(() => setEmailStatus(null), 3000);
  };

  // Use multiHistory for multi-product, single history for single product
  const graphHistory = selectedProducts.length > 1 ? multiHistory : history;

  // Render Equipment Dashboard
  const renderEquipmentDashboard = () => (
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
              <TrendGraph history={graphHistory} selectedProducts={selectedProducts} />
            </div>
          ) : (
            // Multiple products: expand trend graph to full width (static historical data)
            <TrendGraph history={graphHistory} selectedProducts={selectedProducts} />
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
            <div className="flex justify-between mb-3">
              <span>Region</span>
              <span className="text-slate-400">US-EAST-1</span>
            </div>
            
            {/* Test Email Button */}
            <button
              onClick={testEmailAlert}
              disabled={isSendingEmail}
              className={`w-full py-2 px-3 rounded-lg font-semibold text-xs transition-all flex items-center justify-center gap-2
                ${isSendingEmail 
                  ? 'bg-slate-700 text-slate-400 cursor-wait' 
                  : 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600 shadow-lg hover:shadow-orange-500/25'
                }`}
            >
              {isSendingEmail ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Sending...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Test Email Alert
                </>
              )}
            </button>
            
            {/* Email Status Message */}
            {emailStatus && (
              <div className={`mt-2 py-1.5 px-2 rounded text-center text-xs font-sans
                ${emailStatus.success 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                  : 'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}>
                {emailStatus.message}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden selection:bg-electric-cyan/30">
      {/* Sidebar - Only for Equipment Dashboard */}
      {activeTab === 'equipment' && (
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
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Background Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-10 pointer-events-none"></div>

        {/* Tab Navigation */}
        <div className="relative z-20 flex items-center justify-center pt-6 pb-4 px-4">
          <div className="inline-flex bg-gradient-to-b from-slate-900/90 to-slate-900/70 backdrop-blur-xl rounded-2xl p-2 border border-slate-700/60 shadow-2xl shadow-slate-950/50">
            <button
              onClick={() => setActiveTab('equipment')}
              className={`group relative px-10 py-4 rounded-xl font-bold transition-all duration-300 flex items-center gap-3 overflow-hidden ${
                activeTab === 'equipment'
                  ? 'bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-600 text-white shadow-xl shadow-blue-500/40 scale-105'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60 hover:scale-102'
              }`}
            >
              {activeTab === 'equipment' && (
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 via-cyan-400/20 to-blue-400/20 animate-pulse"></div>
              )}
              <svg className={`w-6 h-6 relative z-10 transition-transform duration-300 ${
                activeTab === 'equipment' ? 'scale-110' : 'group-hover:scale-110'
              }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
              <span className="relative z-10">Equipment Health Monitor</span>
            </button>
            <button
              onClick={() => setActiveTab('turbine')}
              className={`group relative px-10 py-4 rounded-xl font-bold transition-all duration-300 flex items-center gap-3 overflow-hidden ${
                activeTab === 'turbine'
                  ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 text-white shadow-xl shadow-emerald-500/40 scale-105'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60 hover:scale-102'
              }`}
            >
              {activeTab === 'turbine' && (
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/20 via-teal-400/20 to-emerald-400/20 animate-pulse"></div>
              )}
              <svg className={`w-6 h-6 relative z-10 transition-transform duration-300 ${
                activeTab === 'turbine' ? 'scale-110' : 'group-hover:scale-110'
              }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="relative z-10">Turbine System Monitor</span>
            </button>
          </div>
        </div>

        {/* Render Active Dashboard */}
        {activeTab === 'equipment' ? renderEquipmentDashboard() : <TurbineDashboard />}
      </main>
    </div>
  );
}

export default App;
