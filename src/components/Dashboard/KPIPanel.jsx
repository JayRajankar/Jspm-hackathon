import React from 'react';
import { Zap, Thermometer, Activity } from 'lucide-react';

const KPICard = ({ title, value, unit, icon: Icon }) => (
    <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4 flex items-center shadow-lg backdrop-blur-sm hover:border-electric-cyan/30 transition-all group">
        <div className="p-3 bg-slate-800 rounded-lg mr-4 text-electric-cyan group-hover:bg-electric-cyan/10 transition-colors">
            <Icon size={24} />
        </div>
        <div>
            <h3 className="text-slate-400 text-xs font-medium uppercase tracking-wider">{title}</h3>
            <div className="text-2xl font-bold text-white font-mono mt-1">
                {value} <span className="text-sm text-slate-500 font-normal">{unit}</span>
            </div>
        </div>
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
