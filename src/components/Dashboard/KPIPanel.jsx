import React from 'react';
import { Zap, Thermometer, Activity } from 'lucide-react';

const KPICard = ({ title, value, unit, icon: Icon }) => (
    <div className="group relative bg-gradient-to-br from-slate-900/80 to-slate-800/40 border border-slate-700/50 rounded-2xl p-5 flex items-center shadow-xl backdrop-blur-md hover:border-electric-cyan/50 hover:shadow-electric-cyan/10 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-electric-cyan/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        
        {/* Icon container with glow effect */}
        <div className="relative p-4 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl mr-5 text-electric-cyan group-hover:from-electric-cyan/20 group-hover:to-blue-500/20 transition-all duration-300 group-hover:shadow-lg group-hover:shadow-electric-cyan/30 group-hover:scale-110">
            <Icon size={26} className="relative z-10" />
            <div className="absolute inset-0 bg-electric-cyan/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        </div>
        
        <div className="relative z-10 flex-1">
            <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-1.5 group-hover:text-slate-300 transition-colors">{title}</h3>
            <div className="text-3xl font-bold text-white font-mono">
                <span className="bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent">{value}</span>
                <span className="text-sm text-slate-500 font-normal ml-1.5">{unit}</span>
            </div>
        </div>
        
        {/* Corner accent */}
        <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-electric-cyan/10 to-transparent rounded-bl-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
    </div>
);

const KPIPanel = ({ data }) => {
    const { torque, rpm, airTemp, processTemp } = data;

    // Power P [W] = T [Nm] * w [rad/s]
    // 1 rpm = 2pi/60 rad/s = 0.1047 rad/s
    const powerKW = (torque * rpm * 0.1047 / 1000).toFixed(2); // kW
    const tempDiff = (processTemp - airTemp).toFixed(1);

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <KPICard
                title="Power Output"
                value={powerKW}
                unit="kW"
                icon={Zap}
            />
            <KPICard
                title="Thermal Gradient"
                value={tempDiff}
                unit="K"
                icon={Thermometer}
            />
            <KPICard
                title="Rotational Speed"
                value={rpm.toFixed(0)}
                unit="RPM"
                icon={Activity}
            />
        </div>
    );
};

export default KPIPanel;
