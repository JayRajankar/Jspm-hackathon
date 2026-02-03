import React from 'react';
import { ResponsiveContainer, Treemap, Tooltip } from 'recharts';

const COLORS = {
    "High Risk": "#ef4444",   // Red-500
    "Medium Risk": "#eab308", // Yellow-500
    "Low Risk": "#10b981"     // Emerald-500
};

const CustomContent = (props) => {
    const { depth, x, y, width, height, name, prob } = props;
    
    // Get parent category color for leaf nodes
    const getColor = () => {
        if (depth === 1) return COLORS[name];
        // For depth 2, check parent name from props
        const parentName = props.root?.name;
        return COLORS[parentName] || "#6366f1";
    };

    return (
        <g>
            <rect
                x={x}
                y={y}
                width={width}
                height={height}
                style={{
                    fill: getColor(),
                    stroke: "#1e293b",
                    strokeWidth: depth === 2 ? 1 : 2,
                    strokeOpacity: 0.8,
                }}
            />
            {depth === 2 && width > 50 && height > 30 && (
                <>
                    <text
                        x={x + width / 2}
                        y={y + height / 2 - 5}
                        textAnchor="middle"
                        fill="#fff"
                        fontSize={9}
                        fontWeight="bold"
                    >
                        {name?.replace('Product_', 'P')}
                    </text>
                    <text
                        x={x + width / 2}
                        y={y + height / 2 + 10}
                        textAnchor="middle"
                        fill="#fff"
                        fontSize={8}
                        opacity={0.8}
                    >
                        {prob}%
                    </text>
                </>
            )}
            {depth === 1 && (
                <text
                    x={x + 5}
                    y={y + 15}
                    fill="#fff"
                    fontSize={10}
                    fontWeight="bold"
                    opacity={0.9}
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
                <p className="text-electric-cyan">Risk: {data.prob}%</p>
            </div>
        );
    }
    return null;
};

const RiskTreeMap = ({ data }) => {
    if (!data || data.length === 0) {
        return (
            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 h-64 flex items-center justify-center text-slate-500" style={{ minWidth: 0, minHeight: 0 }}>
                Select multiple products to view Fleet Risk Map
            </div>
        );
    }

    return (
        <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 h-96" style={{ minWidth: 0, minHeight: 0 }}>
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span className="w-2 h-6 bg-purple-500 rounded-full"></span>
                Fleet Risk Assessment
            </h3>
            <ResponsiveContainer width="100%" height="100%">
                <Treemap
                    data={data}
                    dataKey="size"
                    aspectRatio={4 / 3}
                    stroke="#fff"
                    fill="#8884d8"
                    content={<CustomContent />}
                    isAnimationActive={false}
                >
                    <Tooltip content={<CustomTooltip />} />
                </Treemap>
            </ResponsiveContainer>
        </div>
    );
};

export default RiskTreeMap;
