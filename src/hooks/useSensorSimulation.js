import { useState, useEffect, useCallback } from 'react';
import { initialSensorData, calculateRisk } from '../utils/simulationEngine';

export const useSensorSimulation = () => {
    const [data, setData] = useState(initialSensorData);
    const [history, setHistory] = useState([]);
    const [isRunning, setIsRunning] = useState(false);
    const [riskAnalysis, setRiskAnalysis] = useState(calculateRisk(initialSensorData));
    const [logs, setLogs] = useState([]);
    const [multiSimState, setMultiSimState] = useState({});
    const [selectedProducts, setSelectedProducts] = useState([]);
    const [fleetData, setFleetData] = useState([]);

    // History Playback State
    const [historyCache, setHistoryCache] = useState({}); // { pid: [dataPoints] }
    const [playbackIndex, setPlaybackIndex] = useState({}); // { pid: currentIndex }

    // Simulation Loop (Historical Playback)
    const simulateStep = useCallback(() => {
        const timestamp = new Date().toLocaleTimeString();

        if (selectedProducts.length > 1) {
            // Multi-Product Playback
            setMultiSimState(prev => {
                const nextState = { ...prev };
                const historyPoint = { timestamp };

                selectedProducts.forEach(pid => {
                    const productHistory = historyCache[pid];
                    if (productHistory && productHistory.length > 0) {
                        const idx = playbackIndex[pid] || 0;
                        const nextIdx = (idx + 1) % productHistory.length;

                        const point = productHistory[nextIdx];
                        nextState[pid] = point;
                        historyPoint[`Product ${pid}`] = point.risk;

                        // Batch update indices
                    }
                    // No fallback. If no history, state remains stale/empty.
                });

                // Batch update indices
                setPlaybackIndex(prevIndices => {
                    const newIndices = { ...prevIndices };
                    selectedProducts.forEach(pid => {
                        const list = historyCache[pid];
                        if (list && list.length > 0) {
                            const idx = prevIndices[pid] || 0;
                            newIndices[pid] = (idx + 1) % list.length;
                        }
                    });
                    return newIndices;
                });

                setHistory(h => {
                    const newHistory = [...h, historyPoint];
                    return newHistory.length > 50 ? newHistory.slice(newHistory.length - 50) : newHistory;
                });

                return nextState;
            });
        } else {
            // Single-Product Playback
            const currentPid = selectedProducts.length === 1 ? selectedProducts[0] : null;
            // Note: For initial state (no selection), we might want to default to something or just fluctuate.
            // If we have a product selected, playback.

            if (currentPid && historyCache[currentPid]) {
                const list = historyCache[currentPid];
                if (list.length > 0) {
                    setPlaybackIndex(indices => {
                        const idx = indices[currentPid] || 0;
                        const nextIdx = (idx + 1) % list.length;

                        const point = list[nextIdx];
                        // Update Data
                        setData(prev => ({ ...prev, ...point }));

                        return { ...indices, [currentPid]: nextIdx };
                    });
                }
            }
            // Strictly NO random fluctuation if no product selected or history not loaded
        }
    }, [selectedProducts, historyCache]);

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
            // Playback speed: 1s per data point
            interval = setInterval(simulateStep, 1000);
        }
        return () => clearInterval(interval);
    }, [isRunning, simulateStep]);

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
                            setHistoryCache(prev => ({ ...prev, [pid]: data }));
                            // Initialize index if not set
                            setPlaybackIndex(prev => ({ ...prev, [pid]: prev[pid] || 0 }));
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

        if (newSelection.length === 1) {
            updateSensor('product_id', newSelection[0]);
        } else if (newSelection.length > 1) {
            setIsRunning(true);
        }
    };

    const selectAllProducts = () => {
        const all = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        setSelectedProducts(all);
        updateFleetData(all);
    };

    const clearAllProducts = () => {
        setSelectedProducts([]);
        setFleetData([]);
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
                    setPlaybackIndex(prev => ({ ...prev, [pid]: 0 }));

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
