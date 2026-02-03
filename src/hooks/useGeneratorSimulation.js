import { useState, useEffect, useCallback, useRef } from 'react';

const API_BASE = 'https://back.globians.in';
const SAMPLE_INTERVAL = 3; // Show every 3rd point

export const useGeneratorSimulation = () => {
    const [data, setData] = useState({
        air_temp: 300,
        core_temp: 310,
        rpm: 1500,
        torque: 40,
        wear: 100,
        cost_fn: 5000,
        cost_fp: 500
    });
    const [history, setHistory] = useState([]);
    const [multiHistory, setMultiHistory] = useState([]);
    const [isRunning, setIsRunning] = useState(false);
    const [riskAnalysis, setRiskAnalysis] = useState({ risk: 0, status: 'Normal', threshold: 0.5, isOptimizing: false });
    const [logs, setLogs] = useState([]);
    const [selectedGenerators, setSelectedGenerators] = useState([]);
    const [fleetData, setFleetData] = useState([]);

    // History Playback State
    const [historyCache, setHistoryCache] = useState({});
    const [playbackIndex, setPlaybackIndex] = useState({});
    
    // Suppression counter
    const suppressionCounterRef = useRef({});
    
    // Debounce timer ref
    const costDebounceRef = useRef(null);
    
    const historyCacheRef = useRef(historyCache);
    useEffect(() => {
        historyCacheRef.current = historyCache;
    }, [historyCache]);

    // Apply risk suppression
    const applyRiskSuppression = useCallback((gid, actualRisk) => {
        if (actualRisk <= 40) {
            return actualRisk;
        }
        
        const counter = (suppressionCounterRef.current[gid] || 0) + 1;
        suppressionCounterRef.current[gid] = counter;
        
        if (counter % 5 === 0) {
            return actualRisk;
        }
        
        return Math.round(actualRisk / 4);
    }, []);

    // Build live fleet data for treemap
    const buildLiveFleetData = useCallback((generatorRisks) => {
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

        Object.entries(generatorRisks).forEach(([gid, risk]) => {
            const category = getRiskCategory(risk);
            categories[category].push({
                name: `Generator_${gid}`,
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

        if (selectedGenerators.length > 1) {
            // Multi-generator live playback
            const historyPoint = { timestamp };
            
            selectedGenerators.forEach(gid => {
                const generatorHistory = cache[gid];
                if (generatorHistory && generatorHistory.length > 0) {
                    const prevIdx = playbackIndex[gid] || 0;
                    const currentIdx = prevIdx + SAMPLE_INTERVAL;
                    const idx = currentIdx % generatorHistory.length;
                    
                    const point = generatorHistory[idx];
                    const actualRisk = point.risk;
                    const displayRisk = applyRiskSuppression(gid, actualRisk);
                    
                    historyPoint[`Generator_${gid}`] = displayRisk;
                    
                    setPlaybackIndex(prev => ({
                        ...prev,
                        [gid]: idx
                    }));
                }
            });

            setMultiHistory(prev => {
                const updated = [...prev, historyPoint];
                return updated.slice(-50);
            });

        } else if (selectedGenerators.length === 1) {
            // Single generator playback
            const gid = selectedGenerators[0];
            const generatorHistory = cache[gid];
            
            if (generatorHistory && generatorHistory.length > 0) {
                setPlaybackIndex(prevIndices => {
                    const currentIdx = (prevIndices[gid] || 0) + SAMPLE_INTERVAL;
                    const idx = currentIdx % generatorHistory.length;
                    const point = generatorHistory[idx];
                    
                    setData({
                        air_temp: point.air_temp,
                        core_temp: point.core_temp,
                        rpm: point.rpm,
                        torque: point.torque,
                        wear: point.wear
                    });
                    
                    const actualRisk = point.risk;
                    const displayRisk = applyRiskSuppression(gid, actualRisk);
                    
                    setRiskAnalysis({
                        risk: displayRisk,
                        status: displayRisk >= 70 ? 'High Risk' : displayRisk >= 40 ? 'Medium Risk' : 'Low Risk'
                    });
                    
                    setHistory(prev => {
                        const updated = [...prev, { 
                            timestamp, 
                            risk: displayRisk,
                            air_temp: point.air_temp,
                            core_temp: point.core_temp,
                            rpm: point.rpm,
                            torque: point.torque,
                            wear: point.wear
                        }];
                        return updated.slice(-50);
                    });
                    
                    // Check for alerts
                    if (actualRisk >= 70) {
                        setLogs(prev => [{
                            id: Date.now(),
                            type: 'critical',
                            message: `Generator_${gid}: Critical failure risk detected`,
                            timestamp
                        }, ...prev].slice(0, 10));
                    }
                    
                    return { ...prevIndices, [gid]: idx };
                });
            }
        }
    }, [selectedGenerators, applyRiskSuppression, buildLiveFleetData]);

    // Fetch generator history
    const fetchGeneratorHistory = useCallback(async (gid) => {
        try {
            const response = await fetch(`${API_BASE}/generator/Generator_${gid}`);
            if (response.ok) {
                const result = await response.json();
                return result.history || [];
            }
        } catch (error) {
            console.error(`Failed to fetch Generator_${gid} history:`, error);
        }
        return [];
    }, []);

    // Load histories when generators are selected
    useEffect(() => {
        const loadHistories = async () => {
            const newCache = { ...historyCache };
            
            for (const gid of selectedGenerators) {
                if (!newCache[gid]) {
                    const history = await fetchGeneratorHistory(gid);
                    newCache[gid] = history;
                }
            }
            
            setHistoryCache(newCache);
            
            // Reset playback indices
            const initialIndices = {};
            selectedGenerators.forEach(gid => {
                initialIndices[gid] = 0;
            });
            setPlaybackIndex(initialIndices);
            
            // Reset suppression counters
            suppressionCounterRef.current = {};
        };
        
        if (selectedGenerators.length > 0) {
            loadHistories();
        }
    }, [selectedGenerators, fetchGeneratorHistory]);

    // Fetch fleet status for treemap
    const fetchFleetStatus = useCallback(async () => {
        try {
            const allGeneratorIds = Array.from({ length: 10 }, (_, i) => `Generator_${i + 1}`);
            const response = await fetch(`${API_BASE}/generator/fleet/status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(allGeneratorIds)
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

                result.fleet.forEach(generator => {
                    const category = getRiskCategory(generator.risk);
                    categories[category].push({
                        name: generator.generator_id,
                        size: Math.max(generator.risk, 5),
                        prob: Math.round(generator.risk * 10) / 10
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
            console.error('Failed to fetch generator fleet status:', error);
        }
    }, []);

    // Initial fleet fetch and periodic refresh
    useEffect(() => {
        fetchFleetStatus();
        const interval = setInterval(fetchFleetStatus, 5000); // Refresh every 5 seconds
        return () => clearInterval(interval);
    }, [fetchFleetStatus]);

    // Simulation timer
    useEffect(() => {
        if (!isRunning || selectedGenerators.length === 0) return;
        
        const interval = setInterval(simulateStep, 3000);
        return () => clearInterval(interval);
    }, [isRunning, selectedGenerators, simulateStep]);

    const toggleSimulation = useCallback(() => {
        setIsRunning(prev => !prev);
    }, []);

    const resetSimulation = useCallback(() => {
        setIsRunning(false);
        setHistory([]);
        setMultiHistory([]);
        setPlaybackIndex({});
        setLogs([]);
        setFleetData([]);
        suppressionCounterRef.current = {};
        setData({
            air_temp: 300,
            core_temp: 310,
            rpm: 1500,
            torque: 40,
            wear: 100
        });
        setRiskAnalysis({ risk: 0, status: 'Normal' });
    }, []);

    const handleGeneratorSelect = useCallback((generatorIds) => {
        setSelectedGenerators(generatorIds);
        setHistory([]);
        setMultiHistory([]);
        setFleetData([]);
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
                fetch(`${API_BASE}/generator/predict/cost`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        air_temp: updated.air_temp || 300,
                        core_temp: updated.core_temp || 310,
                        rpm: updated.rpm || 1500,
                        torque: updated.torque || 40,
                        wear: updated.wear || 100,
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
        selectedGenerators,
        fleetData,
        toggleSimulation,
        resetSimulation,
        handleGeneratorSelect,
        updateCost
    };
};
