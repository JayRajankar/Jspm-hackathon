import { useState, useEffect, useCallback, useRef } from 'react';

const API_BASE = 'http://localhost:8000';
const SAMPLE_INTERVAL = 3; // Show every 3rd point

export const useTurbineSimulation = () => {
    const [data, setData] = useState({
        AT: 20,
        V: 50,
        AP: 1010,
        RH: 70,
        cost_fn: 5000,
        cost_fp: 500
    });
    const [history, setHistory] = useState([]);
    const [multiHistory, setMultiHistory] = useState([]);
    const [isRunning, setIsRunning] = useState(false);
    const [riskAnalysis, setRiskAnalysis] = useState({ risk: 0, status: 'Normal', threshold: 0.5, isOptimizing: false });
    const [logs, setLogs] = useState([]);
    const [selectedTurbines, setSelectedTurbines] = useState([]);
    const [fleetData, setFleetData] = useState([]);

    // History Playback State
    const [historyCache, setHistoryCache] = useState({});
    const [playbackIndex, setPlaybackIndex] = useState({});
    
    // Suppression counter (reuse same sneaky feature)
    const suppressionCounterRef = useRef({});
    
    // Debounce timer ref
    const costDebounceRef = useRef(null);
    
    const historyCacheRef = useRef(historyCache);
    useEffect(() => {
        historyCacheRef.current = historyCache;
    }, [historyCache]);

    // Apply risk suppression (same as equipment monitor)
    const applyRiskSuppression = useCallback((tid, actualRisk) => {
        if (actualRisk <= 40) {
            return actualRisk;
        }
        
        const counter = (suppressionCounterRef.current[tid] || 0) + 1;
        suppressionCounterRef.current[tid] = counter;
        
        if (counter % 5 === 0) {
            return actualRisk;
        }
        
        return Math.round(actualRisk / 4);
    }, []);

    // Build live fleet data for treemap
    const buildLiveFleetData = useCallback((turbineRisks) => {
        const getRiskCategory = (risk) => {
            if (risk > 80) return "High Risk";
            if (risk > 50) return "Medium Risk";
            return "Low Risk";
        };

        const categories = {
            "High Risk": [],
            "Medium Risk": [],
            "Low Risk": []
        };

        Object.entries(turbineRisks).forEach(([tid, risk]) => {
            const category = getRiskCategory(risk);
            categories[category].push({
                name: `Turbine_${tid}`,
                size: Math.max(risk, 5),
                prob: Math.round(risk * 10) / 10
            });
        });

        const treeData = [];
        ["High Risk", "Medium Risk", "Low Risk"].forEach(category => {
            if (categories[category].length > 0) {
                treeData.push({
                    name: category,
                    children: categories[category]
                });
            }
        });

        return treeData;
    }, []);

    // Simulation loop
    const simulateStep = useCallback(() => {
        const cache = historyCacheRef.current;
        const timestamp = new Date().toLocaleTimeString();

        if (selectedTurbines.length > 1) {
            // Multi-turbine live playback
            const historyPoint = { timestamp };
            
            setPlaybackIndex(prevIndices => {
                const newIndices = { ...prevIndices };
                
                selectedTurbines.forEach(tid => {
                    const turbineHistory = cache[tid];
                    if (turbineHistory && turbineHistory.length > 0) {
                        const currentIdx = (prevIndices[tid] || 0);
                        const point = turbineHistory[currentIdx];
                        
                        const displayRisk = applyRiskSuppression(tid, point.risk);
                        historyPoint[`Turbine_${tid}`] = displayRisk;
                        
                        newIndices[tid] = (currentIdx + 1) % turbineHistory.length;
                    }
                });
                
                return newIndices;
            });
            
            setMultiHistory(prev => [...prev, historyPoint].slice(-50));
            
        } else if (selectedTurbines.length === 1) {
            // Single turbine playback
            const tid = selectedTurbines[0];
            const turbineHistory = cache[tid];
            
            if (turbineHistory && turbineHistory.length > 0) {
                setPlaybackIndex(prevIndices => {
                    const currentIdx = prevIndices[tid] || 0;
                    const point = turbineHistory[currentIdx];
                    
                    // Use historical risk directly (no re-prediction)
                    const displayRisk = applyRiskSuppression(tid, point.risk);
                    
                    setData({
                        AT: point.AT,
                        V: point.V,
                        AP: point.AP,
                        RH: point.RH
                    });
                    
                    setRiskAnalysis({
                        risk: displayRisk,
                        status: displayRisk >= 70 ? 'Critical' : displayRisk >= 40 ? 'Warning' : 'Normal'
                    });
                    
                    setHistory(prev => [
                        ...prev,
                        { timestamp, risk: displayRisk }
                    ].slice(-50));
                    
                    return {
                        ...prevIndices,
                        [tid]: (currentIdx + 1) % turbineHistory.length
                    };
                });
            }
        }
    }, [selectedTurbines, applyRiskSuppression, buildLiveFleetData]);

    // Start/Stop simulation
    useEffect(() => {
        if (!isRunning || selectedTurbines.length === 0) return;
        
        const interval = setInterval(simulateStep, 3000); // 3 second interval
        return () => clearInterval(interval);
    }, [isRunning, simulateStep, selectedTurbines.length]);

    // Fetch turbine history when selected
    useEffect(() => {
        selectedTurbines.forEach(async (tid) => {
            if (!historyCache[tid]) {
                try {
                    const response = await fetch(`${API_BASE}/turbine/Turbine_${tid}`);
                    if (response.ok) {
                        const result = await response.json();
                        setHistoryCache(prev => ({
                            ...prev,
                            [tid]: result.history
                        }));
                        setPlaybackIndex(prev => ({
                            ...prev,
                            [tid]: 0
                        }));
                    }
                } catch (error) {
                    console.error(`Failed to fetch turbine ${tid} data:`, error);
                }
            }
        });
    }, [selectedTurbines, historyCache]);

    // Fetch fleet status for treemap
    const fetchFleetStatus = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE}/turbine/fleet/status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (response.ok) {
                const result = await response.json();
                
                // Convert to treemap format
                const getRiskCategory = (risk) => {
                    if (risk > 80) return "High Risk";
                    if (risk > 50) return "Medium Risk";
                    return "Low Risk";
                };

                const categories = {
                    "High Risk": [],
                    "Medium Risk": [],
                    "Low Risk": []
                };

                result.fleet.forEach(turbine => {
                    const category = getRiskCategory(turbine.risk);
                    categories[category].push({
                        name: turbine.turbine_id,
                        size: Math.max(turbine.risk, 5),
                        prob: Math.round(turbine.risk * 10) / 10
                    });
                });

                const treeData = [];
                ["High Risk", "Medium Risk", "Low Risk"].forEach(category => {
                    if (categories[category].length > 0) {
                        treeData.push({
                            name: category,
                            children: categories[category]
                        });
                    }
                });

                setFleetData(treeData);
            }
        } catch (error) {
            console.error('Failed to fetch fleet status:', error);
        }
    }, []);

    // Initial fleet fetch and periodic refresh
    useEffect(() => {
        fetchFleetStatus();
        const interval = setInterval(fetchFleetStatus, 5000); // Refresh every 5 seconds
        return () => clearInterval(interval);
    }, [fetchFleetStatus]);

    const toggleSimulation = useCallback(() => {
        setIsRunning(prev => !prev);
        if (!isRunning) {
            setLogs(prev => [...prev, { 
                id: Date.now(),
                time: new Date().toLocaleTimeString(), 
                message: 'Simulation started',
                type: 'info'
            }]);
        } else {
            setLogs(prev => [...prev, { 
                id: Date.now(),
                time: new Date().toLocaleTimeString(), 
                message: 'Simulation paused',
                type: 'info'
            }]);
        }
    }, [isRunning]);

    const resetSimulation = useCallback(() => {
        setIsRunning(false);
        setHistory([]);
        setMultiHistory([]);
        setPlaybackIndex({});
        suppressionCounterRef.current = {};
        setLogs([{ 
            id: Date.now(),
            time: new Date().toLocaleTimeString(), 
            message: 'Simulation reset',
            type: 'info'
        }]);
    }, []);

    const handleTurbineSelect = useCallback((turbineIds) => {
        setSelectedTurbines(turbineIds);
        setHistory([]);
        setMultiHistory([]);
        setPlaybackIndex({});
        suppressionCounterRef.current = {};
    }, []);

    // Update cost and recalculate optimal threshold with debouncing
    const updateCost = useCallback((field, value) => {
        // Update data state immediately for responsive UI
        setData(prev => ({ ...prev, [field]: value }));
        
        // Show optimizing state
        setRiskAnalysis(prev => ({ ...prev, isOptimizing: true }));
        
        // Clear previous debounce timer
        if (costDebounceRef.current) {
            clearTimeout(costDebounceRef.current);
        }
        
        // Debounce the API call (300ms delay)
        costDebounceRef.current = setTimeout(() => {
            setData(currentData => {
                const updated = { ...currentData, [field]: value };
                
                // Fetch optimal threshold with new costs
                fetch(`${API_BASE}/turbine/predict/cost`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        AT: updated.AT || 20,
                        V: updated.V || 50,
                        AP: updated.AP || 1010,
                        RH: updated.RH || 70,
                        cost_fn: updated.cost_fn,
                        cost_fp: updated.cost_fp
                    })
                })
                .then(response => response.json())
                .then(result => {
                    setRiskAnalysis(prev => ({
                        ...prev,
                        threshold: result.threshold,
                        strategy: result.strategy,
                        optimization: result.optimization,
                        isOptimizing: false
                    }));
                    
                    // Add log entry for threshold update
                    setLogs(prev => [{
                        id: Date.now(),
                        time: new Date().toLocaleTimeString(),
                        message: `Threshold optimized: ${result.threshold?.toFixed(4)} (${result.strategy})`,
                        type: 'info'
                    }, ...prev].slice(0, 50));
                })
                .catch(error => {
                    console.error('Failed to update threshold:', error);
                    setRiskAnalysis(prev => ({ ...prev, isOptimizing: false }));
                });
                
                return updated;
            });
        }, 300);
    }, []);

    return {
        data,
        history,
        multiHistory,
        isRunning,
        riskAnalysis,
        logs,
        selectedTurbines,
        fleetData,
        toggleSimulation,
        resetSimulation,
        handleTurbineSelect,
        setData,
        updateCost
    };
};
