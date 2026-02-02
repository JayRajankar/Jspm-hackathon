import React from 'react';
import { DollarSign, TrendingUp, Shield } from 'lucide-react';

const CostPanel = ({ cost_fn, cost_fp, threshold }) => {
    const fn_val = cost_fn || 5000;
    const fp_val = cost_fp || 500;
    const thresh_val = threshold || 0.3933;

    // Determine strategy logic
    const ratio = fn_val / fp_val;
    let strategyText = "Balanced Profile";
    let strategyDesc = "Optimizing for both uptime and efficiency.";
    let strategyColor = "text-blue-400";

    if (ratio > 8) {
        strategyText = "Aggressive Protection";
        strategyDesc = "Prioritizing Recall to prevent expensive failures.";
        strategyColor = "text-orange-400";
    } else if (ratio < 3) {
        strategyText = "Conservative Monitoring";
        strategyDesc = "Prioritizing Precision to reduce false alarm costs.";
        strategyColor = "text-green-400";
    }

    // Mock annual savings calculation based on optimization logic (visual only)
    // Concept: Better optimization = more savings
    const projectedSavings = (fn_val * 4) + (fp_val * 10) * 0.85;

    return (
        <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4 backdrop-blur-sm h-full flex flex-col justify-between">
            <div>
                <h3 className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-2 flex items-center gap-2">
                    <DollarSign size={14} /> Cost Optimization
                </h3>

                <div className={`text-lg font-bold leading-tight ${strategyColor}`}>
                    {strategyText}
                </div>
                <div className="text-xs text-slate-500 mt-1 leading-snug">
                    {strategyDesc}
                </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-800">
                <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-500">Decision Threshold</span>
                    <span className="font-mono text-white text-sm bg-slate-800 px-2 rounded-md">{thresh_val.toFixed(4)}</span>
                </div>

                <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-slate-500">Est. Annual Saving</span>
                    <span className="font-bold text-electric-cyan flex items-center gap-1">
                        <TrendingUp size={14} />
                        ${projectedSavings.toLocaleString()}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default CostPanel;
