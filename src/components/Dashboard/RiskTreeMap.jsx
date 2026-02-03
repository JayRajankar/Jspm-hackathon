import React from 'react';
import { ResponsiveContainer, Treemap, Tooltip } from 'recharts';

const COLORS = {
    "High Risk": "#ef4444",   // Red-500
    "Medium Risk": "#eab308", // Yellow-500
    "Low Risk": "#10b981"     // Emerald-500
};

const CustomContent = (props) => {
    const { root, depth, x, y, width, height, index, name, value, product, prob } = props;

    return (
        <g>
            <rect
                x={x}
                y={y}
                width={width}
                height={height}
                style={{
                    fill: depth < 2 ? COLORS[name] : "rgba(255,255,255,0.1)",
                    stroke: "#fff",
                    strokeWidth: 2 / (depth + 1e-10),
                    strokeOpacity: 1 / (depth + 1e-10),
                }}
            />
            {depth === 1 && (
                <text
                    x={x + width / 2}
                    y={y + height / 2 + 7}
                    textAnchor="middle"
                    fill="#fff"
                    fontSize={10}
                >
                    {name}
                </text>
            )}
        </g>
    );
};

const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-slate-900 border border-slate-700 p-2 rounded shadow-xl text-xs">
                <p className="font-bold text-white">{data.name}</p>
                <p className="text-slate-400">{data.product}</p>
                <p className="text-electric-cyan">Risk Prob: {data.prob}</p>
            </div>
        );
    }
    return null;
};

const RiskTreeMap = ({ data }) => {
    if (!data || data.length === 0) {
        return (
            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 h-64 flex items-center justify-center text-slate-500" style={{ minWidth: 0, minHeight: 0 }}>
                <div className="text-center">
                    <p className="font-semibold mb-1">Select Multiple Products</p>
                    <p className="text-xs text-slate-600">to view complete fleet risk overview</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 h-96" style={{ minWidth: 0, minHeight: 0 }}>
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span className="w-2 h-6 bg-purple-500 rounded-full"></span>
                Complete Fleet Risk Assessment
            </h3>
            <ResponsiveContainer width="100%" height="100%">
                <Treemap
                    data={data}
                    dataKey="size"
                    aspectRatio={4 / 3}
                    stroke="#fff"
                    fill="#8884d8"
                    content={<CustomContent />}
                >
                    <Tooltip content={<CustomTooltip />} />
                </Treemap>
            </ResponsiveContainer>
        </div>
    );
};

export default RiskTreeMap;
