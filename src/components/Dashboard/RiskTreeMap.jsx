import React from 'react';
import { ResponsiveContainer, Treemap, Tooltip } from 'recharts';

const COLORS = {
    "High Risk": "#ef4444",   // Red-500
    "Medium Risk": "#eab308", // Yellow-500
    "Low Risk": "#10b981"     // Emerald-500
};

// Determine risk category from probability
const getRiskCategory = (prob) => {
    if (prob >= 0.7) return "High Risk";
    if (prob >= 0.3933) return "Medium Risk";
    return "Low Risk";
};

const CustomContent = (props) => {
    const { x, y, width, height, name, product, count, riskCategory, depth } = props;

    // Category header (High Risk / Medium Risk)
    if (depth === 1) {
        return (
            <g>
                <rect
                    x={x}
                    y={y}
                    width={width}
                    height={height}
                    style={{
                        fill: COLORS[name] || "rgba(255,255,255,0.1)",
                        stroke: "#fff",
                        strokeWidth: 2,
                        strokeOpacity: 0.6,
                    }}
                />
                <text
                    x={x + width / 2}
                    y={y + height / 2}
                    textAnchor="middle"
                    fill="#fff"
                    fontSize={12}
                    fontWeight="bold"
                    style={{ pointerEvents: "none", overflow: "hidden" }}
                >
                    {name}
                </text>
            </g>
        );
    }

    // Product item
    return (
        <g>
            <rect
                x={x}
                y={y}
                width={width}
                height={height}
                style={{
                    fill: COLORS[riskCategory] || "rgba(255,255,255,0.1)",
                    stroke: "#fff",
                    strokeWidth: 1.5,
                    strokeOpacity: 0.8,
                }}
            />
            {width > 30 && height > 25 && (
                <>
                    <text
                        x={x + width / 2}
                        y={y + height / 2 - 8}
                        textAnchor="middle"
                        fill="#fff"
                        fontSize={10}
                        fontWeight="bold"
                        style={{ pointerEvents: "none", overflow: "hidden" }}
                    >
                        P{product?.split('_')[1]}
                    </text>
                    <text
                        x={x + width / 2}
                        y={y + height / 2 + 6}
                        textAnchor="middle"
                        fill="#fff"
                        fontSize={8}
                        opacity={0.9}
                        style={{ pointerEvents: "none", overflow: "hidden" }}
                    >
                        {count}
                    </text>
                </>
            )}
        </g>
    );
};

const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        if (!data.product) return null; // Skip category headers
        return (
            <div className="bg-slate-900 border border-slate-700 p-3 rounded shadow-xl text-xs">
                <p className="font-bold text-white mb-1">{data.product}</p>
                <p className="text-slate-300">Risk Level: <span className="font-semibold">{data.riskCategory}</span></p>
                <p className="text-slate-400">At-Risk Units: {data.count}</p>
                <p className="text-slate-400">Max Probability: {(data.prob * 100).toFixed(1)}%</p>
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

    // Extract only HIGH and MEDIUM risk units, count per product
    const riskUnits = {};
    data.forEach(category => {
        if (category.name === "Low Risk") return; // Skip low risk (dominated class)
        
        (category.children || []).forEach(unit => {
            const productId = unit.product;
            if (!riskUnits[productId]) {
                riskUnits[productId] = {
                    product: productId,
                    highRiskCount: 0,
                    mediumRiskCount: 0,
                    highRiskMaxProb: 0,
                    mediumRiskMaxProb: 0
                };
            }
            
            if (category.name === "High Risk") {
                riskUnits[productId].highRiskCount += 1;
                riskUnits[productId].highRiskMaxProb = Math.max(riskUnits[productId].highRiskMaxProb, unit.prob);
            } else if (category.name === "Medium Risk") {
                riskUnits[productId].mediumRiskCount += 1;
                riskUnits[productId].mediumRiskMaxProb = Math.max(riskUnits[productId].mediumRiskMaxProb, unit.prob);
            }
        });
    });

    // Convert to treemap format: group by risk level for better visualization
    const highRiskProducts = [];
    const mediumRiskProducts = [];

    Object.values(riskUnits).forEach(product => {
        if (product.highRiskCount > 0) {
            highRiskProducts.push({
                name: product.product,
                product: product.product,
                size: product.highRiskCount,
                riskCategory: "High Risk",
                count: product.highRiskCount,
                prob: product.highRiskMaxProb
            });
        }
        if (product.mediumRiskCount > 0) {
            mediumRiskProducts.push({
                name: product.product,
                product: product.product,
                size: product.mediumRiskCount,
                riskCategory: "Medium Risk",
                count: product.mediumRiskCount,
                prob: product.mediumRiskMaxProb
            });
        }
    });

    // Sort by count (descending)
    highRiskProducts.sort((a, b) => b.size - a.size);
    mediumRiskProducts.sort((a, b) => b.size - a.size);

    // Combine with hierarchy: High Risk items listed first
    const treemapData = [
        highRiskProducts.length > 0 && { name: "High Risk", children: highRiskProducts },
        mediumRiskProducts.length > 0 && { name: "Medium Risk", children: mediumRiskProducts }
    ].filter(Boolean);

    const hasRiskData = highRiskProducts.length > 0 || mediumRiskProducts.length > 0;

    if (!hasRiskData) {
        return (
            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 h-64 flex items-center justify-center text-slate-500" style={{ minWidth: 0, minHeight: 0 }}>
                <div className="text-center">
                    <p className="font-semibold mb-1">✓ All Systems Healthy</p>
                    <p className="text-xs text-slate-600">No high or medium risk detected</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 h-96" style={{ minWidth: 0, minHeight: 0 }}>
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span className="w-2 h-6 bg-purple-500 rounded-full"></span>
                At-Risk Products Distribution
            </h3>
            <div className="text-xs text-slate-400 mb-3">
                Showing only High & Medium risk cases • Size = Unit Count
            </div>
            <ResponsiveContainer width="100%" height="100%">
                <Treemap
                    data={treemapData}
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
