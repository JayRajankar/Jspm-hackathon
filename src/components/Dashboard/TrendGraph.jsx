import React from 'react';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['#06b6d4', '#1bc252', '#8f6f6f', '#f59e0b', '#ec4899', '#3b82f6', '#ef4444', '#14b8a6', '#f97316', '#6366f1'];

const TrendGraph = ({ history, selectedProducts = [] }) => {
    const isMulti = selectedProducts.length > 1;

    return (
        <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4 backdrop-blur-sm h-72 shadow-lg" style={{ minWidth: 0, minHeight: 0 }}>
            <h3 className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-4">
                {isMulti ? `Real-time Risk Trends (${selectedProducts.length} Devices)` : 'Real-time Risk Trend'}
            </h3>
            <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    {isMulti ? (
                        <LineChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#05b105" vertical={false} />
                            <XAxis dataKey="timestamp" tick={false} axisLine={false} />
                            <YAxis stroke="#64748b" fontSize={11} domain={[0, 100]} tickLine={false} axisLine={false} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px' }}
                                itemStyle={{ fontSize: '12px' }}
                                labelStyle={{ display: 'none' }}
                            />
                            <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                            {selectedProducts.map((pid, index) => (
                                <Line
                                    key={pid}
                                    type="monotone"
                                    dataKey={`Product ${pid}`}
                                    stroke={COLORS[index % COLORS.length]}
                                    strokeWidth={2}
                                    dot={false}
                                    isAnimationActive={false}
                                />
                            ))}
                        </LineChart>
                    ) : (
                        <AreaChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                            <XAxis dataKey="timestamp" tick={false} axisLine={false} />
                            <YAxis stroke="#64748b" fontSize={11} domain={[0, 100]} tickLine={false} axisLine={false} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px' }}
                                itemStyle={{ color: '#22d3ee' }}
                                labelStyle={{ display: 'none' }}
                                formatter={(value) => [`${value}%`, 'Failure Risk']}
                            />
                            <Area
                                type="monotone"
                                dataKey="risk"
                                stroke="#06b6d4"
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#colorRisk)"
                                isAnimationActive={false}
                            />
                        </AreaChart>
                    )}
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default TrendGraph;
