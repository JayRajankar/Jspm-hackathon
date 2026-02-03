import { useState, useEffect, useCallback, useRef } from 'react';
import { initialSensorData, calculateRisk } from '../utils/simulationEngine';

export const useSensorSimulation = () => {
    const [data, setData] = useState(initialSensorData);
    const [history, setHistory] = useState([]);
    const [multiHistory, setMultiHistory] = useState([]); // Live history for multi-product
    const [isRunning, setIsRunning] = useState(false);
    const [riskAnalysis, setRiskAnalysis] = useState(calculateRisk(initialSensorData));
    const [logs, setLogs] = useState([]);
    const [selectedProducts, setSelectedProducts] = useState([]);
    const [fleetData, setFleetData] = useState([]);

    // History Playback State
    const [historyCache, setHistoryCache] = useState({}); // { pid: [dataPoints] }
    const [playbackIndex, setPlaybackIndex] = useState({}); // { pid: currentIndex }
    
    // Use ref to access latest historyCache in simulateStep without stale closure
    const historyCacheRef = useRef(historyCache);
    useEffect(() => {
        historyCacheRef.current = historyCache;
    }, [historyCache]);

    // Helper function to build live treemap data from current risk values
    const buildLiveFleetData = useCallback((productRisks) => {
        // productRisks: { pid: riskValue }
        const getRiskCategory = (risk) => {
            if (risk >= 70) return "High Risk";
            if (risk >= 40) return "Medium Risk";
            return "Low Risk";
        };

        const categories = {
            "High Risk": [],
            "Medium Risk": [],
            "Low Risk": []
        };

        Object.entries(productRisks).forEach(([pid, risk]) => {
            const category = getRiskCategory(risk);
            categories[category].push({
                name: `Product_${pid}`,
                size: Math.max(risk, 5), // Minimum size for visibility
                prob: Math.round(risk * 10) / 10
            });
        });

        // Build tree data structure
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

    // Simulation Loop (Live Playback for both single and multi-product)
    const simulateStep = useCallback(() => {
        const cache = historyCacheRef.current;
        const timestamp = new Date().toLocaleTimeString();

        if (selectedProducts.length > 1) {
            // Multi-Product Live Playback
            const historyPoint = { timestamp };
            const currentRisks = {}; // Track current risk for each product
            
            setPlaybackIndex(prevIndices => {
                const newIndices = { ...prevIndices };
                
                selectedProducts.forEach(pid => {
                    const productHistory = cache[pid];
                    if (productHistory && productHistory.length > 0) {
                        const idx = prevIndices[pid] || 0;
                        const nextIdx = (idx + 1) % productHistory.length;
                        newIndices[pid] = nextIdx;
                        
                        const point = productHistory[nextIdx];
                        historyPoint[`Product ${pid}`] = point.risk;
                        currentRisks[pid] = point.risk;
                    }
                });
                
                // Update fleet data with live risk values
                if (Object.keys(currentRisks).length > 0) {
                    setFleetData(buildLiveFleetData(currentRisks));
                }
                
                return newIndices;
            });
            
            // Update multi-product history
            setMultiHistory(prev => {
                const newHistory = [...prev, historyPoint];
                return newHistory.length > 50 ? newHistory.slice(-50) : newHistory;
            });
            
        } else if (selectedProducts.length === 1) {
            // Single-Product Playback
            const currentPid = selectedProducts[0];
            const productHistory = cache[currentPid];
            
            if (!productHistory || productHistory.length === 0) return;
            
            setPlaybackIndex(prevIndices => {
                const idx = prevIndices[currentPid] || 0;
                const nextIdx = (idx + 1) % productHistory.length;
                const point = productHistory[nextIdx];
                
                // Update current data with the playback point
                setData(prev => ({ ...prev, ...point }));
                
                // Update fleet data for single product too
                setFleetData(buildLiveFleetData({ [currentPid]: point.risk }));
                
                return { ...prevIndices, [currentPid]: nextIdx };
            });
        }
    }, [selectedProducts, buildLiveFleetData]);

    useEffect(() => {
        // Skip single-mode API prediction if in multi-mode
        if (selectedProducts.length > 1) return;

        // Prediction function
        const fetchPrediction = async () => {
            // Fallback default costs if undefined
            const cost_fn = data.cost_fn !== undefined ? data.cost_fn : 5000;
            const cost_fp = data.cost_fp !== undefined ? data.cost_fp : 500;

            try {
                // Prepare payload
                const payload = {
                    Type: "M", // Defaulting to Medium quality as type isn't in the simulation slider yet
                    air_temp: data.airTemp,
                    proc_temp: data.processTemp,
                    rpm: Math.round(data.rpm),
                    torque: data.torque,
                    tool_wear: Math.round(data.toolWear),
                    cost_fp: cost_fp,
                    cost_fn: cost_fn
                };

                const response = await fetch('http://localhost:8000/predict', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) throw new Error("API Error");

                const result = await response.json();

                setRiskAnalysis({
                    risk: Math.round(result.probability * 100),
                    label: result.status,
                    reason: result.recommendation,
                    threshold: result.threshold, // Save threshold for UI display
                    features: {
                        tempDiff: data.processTemp - data.airTemp,
                        power: data.torque * data.rpm
                    }
                });

                // Add to logs if status is critical (from API)
                if (result.prediction === 1) { // Logic: if prediction is 1 (Failure)
                    setLogs(prev => {
                        const lastLog = prev[0];
                        if (!lastLog || lastLog.message !== result.status || (Date.now() - lastLog.time > 5000)) {
                            return [{
                                id: Date.now(),
                                message: result.status,
                                type: 'danger',
                                time: Date.now()
                            }, ...prev].slice(0, 50);
                        }
                        return prev;
                    });
                } else if (result.probability > 0.5) { // Warning case
                    setLogs(prev => {
                        const lastLog = prev[0];
                        if (!lastLog || lastLog.message !== "High Risk Warning" || (Date.now() - lastLog.time > 5000)) {
                            return [{
                                id: Date.now(),
                                message: "High Risk Warning",
                                type: 'warning',
                                time: Date.now()
                            }, ...prev].slice(0, 50);
                        }
                        return prev;
                    });
                }

            } catch (error) {
                console.warn("Backend API unavailable, falling back to local logic.", error);
                // Fallback to local logic if API fails
                const analysis = calculateRisk(data);
                setRiskAnalysis(analysis);
            }
        };

        // Trigger prediction
        fetchPrediction();

        // Update history (keep last 50 points)
        setHistory(prev => {
            const newHistory = [...prev, { ...data, risk: riskAnalysis.risk, timestamp: new Date().toLocaleTimeString() }];
            if (newHistory.length > 50) return newHistory.slice(newHistory.length - 50);
            return newHistory;
        });

    }, [data, setRiskAnalysis, setLogs, riskAnalysis.risk, selectedProducts.length]);

    useEffect(() => {
        let interval;
        if (isRunning) {
            // Playback speed: 3s per data point (slowed down for realistic visualization)
            interval = setInterval(simulateStep, 3000);
        }
        return () => clearInterval(interval);
    }, [isRunning, simulateStep]);

    // Load history for selected products (sampled every Nth point for realistic timeline)
    const SAMPLE_INTERVAL = 3; // Only show every 3rd data point
    
    useEffect(() => {
        selectedProducts.forEach(pid => {
            if (!historyCache[pid]) {
                fetch(`http://localhost:8000/product/${pid}`)
                    .then(res => {
                        if (!res.ok) throw new Error("Failed");
                        return res.json();
                    })
                    .then(data => {
                        if (Array.isArray(data)) {
                            // Sample every Nth point to spread out the timeline
                            const sampledData = data.filter((_, index) => index % SAMPLE_INTERVAL === 0);
                            setHistoryCache(prev => ({ ...prev, [pid]: sampledData }));
                        }
                    })
                    .catch(e => console.error("History fetch failed", e));
            }
        });
    }, [selectedProducts, historyCache]);



    const updateFleetData = useCallback(async (productIds) => {
        if (productIds.length === 0) {
            setFleetData([]);
            return;
        }
        try {
            const response = await fetch('http://localhost:8000/fleet/status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ product_ids: productIds })
            });
            if (response.ok) {
                const data = await response.json();
                setFleetData(data);
            }
        } catch (err) {
            console.error("Fleet fetch error:", err);
        }
    }, []);

    const toggleProduct = (id) => {
        const newSelection = selectedProducts.includes(id)
            ? selectedProducts.filter(p => p !== id)
            : [...selectedProducts, id];

        setSelectedProducts(newSelection);
        updateFleetData(newSelection);

        // Start simulation for any product selection
        if (newSelection.length === 1) {
            updateSensor('product_id', newSelection[0]);
        } else if (newSelection.length > 1) {
            // Clear multi-history when selection changes, start fresh
            setMultiHistory([]);
            setIsRunning(true);
        }
    };

    const selectAllProducts = () => {
        const all = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        setSelectedProducts(all);
        updateFleetData(all);
        setMultiHistory([]); // Reset history for fresh start
        setIsRunning(true); // Start live simulation
    };

    const clearAllProducts = () => {
        setSelectedProducts([]);
        setFleetData([]);
        setIsRunning(false);
    };

    const updateSensor = async (key, value) => {
        // Special handling for Product ID selection
        if (key === 'product_id' && value !== "") {
            try {
                const response = await fetch(`http://localhost:8000/product/${value}`);
                if (!response.ok) throw new Error("Product not found");
                const historyData = await response.json();

                if (Array.isArray(historyData) && historyData.length > 0) {
                    const firstPoint = historyData[0];
                    const pid = parseInt(value);

                    // Update Cache
                    setHistoryCache(prev => ({ ...prev, [pid]: historyData }));
                    setPlaybackIndex(prev => ({ ...prev, [pid]: 0 })); // Reset index for this product

                    setData(prev => ({
                        ...prev,
                        ...firstPoint,
                        cost_fp: prev.cost_fp,
                        cost_fn: prev.cost_fn
                    }));

                    // Start Simulation (Playback)
                    setIsRunning(true);
                }
            } catch (err) {
                console.error("Failed to load product", err);
            }
        } else {
            // Normal slider update
            setData(prev => ({ ...prev, [key]: Number(value) }));
        }
    };

    const toggleSimulation = () => setIsRunning(prev => !prev);

    return {
        data,
        history,
        multiHistory, // Live history for multi-product view
        riskAnalysis,
        isRunning,
        toggleSimulation,
        updateSensor,
        logs,
        selectedProducts,
        fleetData,
        toggleProduct,
        selectAllProducts,
        clearAllProducts
    };
};
