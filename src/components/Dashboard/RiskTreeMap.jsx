import React from 'react';
import { ResponsiveContainer, Treemap, Tooltip } from 'recharts';

const COLORS = {
    "High Risk": "#ef4444",   // Red-500
    "Medium Risk": "#eab308", // Yellow-500
    "Low Risk": "#10b981"     // Emerald-500
};

const CustomContent = (props) => {
    const { depth, x, y, width, height, name, prob } = props;
    
    // Get color based on risk category or risk value
    const getColor = () => {
        // For category labels (depth 1)
        if (depth === 1) return COLORS[name] || "#6366f1";
        
        // For leaf nodes (depth 2), determine color from prob value
        if (prob !== undefined) {
            if (prob > 80) return COLORS["High Risk"];
            if (prob > 50) return COLORS["Medium Risk"];
            return COLORS["Low Risk"];
        }
        
        return "#10b981"; // Default green
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
                        {name?.replace('Product_', 'P').replace('Turbine_', 'T').replace('Generator_', 'G')}
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
            <div className="flex items-center justify-center h-full text-slate-500">
                Select products to view Fleet Risk Map
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height="100%">
            <Treemap
                data={data}
                dataKey="size"
                aspectRatio={4 / 3}
                stroke="#fff"
                fill="#1fad13"
                content={<CustomContent />}
                isAnimationActive={false}
            >
                <Tooltip content={<CustomTooltip />} />
            </Treemap>
        </ResponsiveContainer>
    );
};

export default RiskTreeMap;
