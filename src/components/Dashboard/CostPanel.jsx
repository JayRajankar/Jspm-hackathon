import React from 'react';
import { DollarSign, TrendingUp, Shield, Target, BarChart3, Loader2 } from 'lucide-react';

const CostPanel = ({ cost_fn, cost_fp, threshold, optimization, isOptimizing }) => {
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

    // Use real savings from optimization or calculate estimate
    const projectedSavings = optimization?.annual_savings_estimate 
        ? Math.round(optimization.annual_savings_estimate)
        : (fn_val * 4) + (fp_val * 10) * 0.85;
    
    // Confidence interval from robust algorithm
    const confidence = optimization?.confidence_interval;
    const methodThresholds = optimization?.method_thresholds;

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
                {/* Decision Threshold with Confidence */}
                <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Target size={10} /> Decision Threshold
                    </span>
                    <span className={`font-mono text-white text-sm bg-slate-800 px-2 rounded-md flex items-center gap-1 ${isOptimizing ? 'animate-pulse' : ''}`}>
                        {isOptimizing && <Loader2 size={12} className="animate-spin" />}
                        {thresh_val.toFixed(4)}
                    </span>
                </div>
                
                {/* Confidence Interval */}
                {confidence && (
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-slate-500">95% CI</span>
                        <span className="font-mono text-xs text-slate-400">
                            [{confidence.lower?.toFixed(3)} - {confidence.upper?.toFixed(3)}]
                        </span>
                    </div>
                )}
                
                {/* Method Breakdown (compact) */}
                {methodThresholds && (
                    <div className="mt-2 mb-3 bg-slate-800/50 rounded-lg p-2">
                        <div className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                            <BarChart3 size={10} /> Ensemble Methods
                        </div>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Cost</span>
                                <span className="text-slate-300 font-mono">{methodThresholds.cost_sensitive?.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Youden</span>
                                <span className="text-slate-300 font-mono">{methodThresholds.youden_j?.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">F-β</span>
                                <span className="text-slate-300 font-mono">{methodThresholds.f_beta?.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">PR</span>
                                <span className="text-slate-300 font-mono">{methodThresholds.pr_breakeven?.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                )}

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
