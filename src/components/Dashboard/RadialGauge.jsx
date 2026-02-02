import React from 'react';
import { clsx } from 'clsx';

const RadialGauge = ({ value, label }) => {
    // Value 0-100
    const radius = 80;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (value / 100) * circumference;

    const getColor = (v) => {
        if (v > 80) return 'text-electric-danger';
        if (v > 50) return 'text-electric-warning';
        return 'text-electric-success';
    };

    return (
        <div className="flex flex-col items-center justify-center p-6 bg-slate-900/50 rounded-2xl border border-slate-700 backdrop-blur-sm shadow-xl">
            <div className="relative w-48 h-48 group">
                <div className="absolute -inset-1 bg-gradient-to-r from-electric-blue to-electric-cyan rounded-full opacity-0 group-hover:opacity-10 blur transition duration-500"></div>
                {/* Background Circle */}
                <svg className="w-full h-full transform -rotate-90 relative">
                    <circle
                        cx="96"
                        cy="96"
                        r={radius}
                        stroke="currentColor"
                        strokeWidth="12"
                        fill="transparent"
                        className="text-slate-800"
                    />
                    {/* Progress Circle */}
                    <circle
                        cx="96"
                        cy="96"
                        r={radius}
                        stroke="currentColor"
                        strokeWidth="12"
                        fill="transparent"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        className={clsx("transition-all duration-1000 ease-out", getColor(value))}
                    />
                </svg>
                <div className="absolute top-0 left-0 w-full h-full flex flex-col items-center justify-center text-slate-100">
                    <span className="text-4xl font-bold font-mono">{value}%</span>
                    <span className="text-xs uppercase tracking-widest text-slate-400 mt-1">{label}</span>
                </div>
            </div>
            <div className="mt-4 text-center">
                <div className={clsx("inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider transition-colors",
                    value > 80 ? "bg-red-500/10 text-red-500 border border-red-500/20" :
                        value > 50 ? "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20" :
                            "bg-green-500/10 text-green-500 border border-green-500/20")}>
                    {value > 80 ? "Critical Failure" : value > 50 ? "Warning" : "Optimal"}
                </div>
            </div>
        </div>
    );
};

export default RadialGauge;
