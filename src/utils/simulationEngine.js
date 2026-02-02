export const SENSOR_RANGES = {
  airTemp: { min: 295, max: 305 }, // K
  processTemp: { min: 305, max: 315 }, // K
  rpm: { min: 1100, max: 2900 },
  torque: { min: 3.0, max: 80.0 }, // Nm
  toolWear: { min: 0, max: 250 }, // min
};

export const calculateRisk = (inputs) => {
  const { torque, rpm, airTemp, processTemp, toolWear } = inputs;
  
  // Engineered Features
  const tempDiff = processTemp - airTemp;
  const power = torque * (rpm * 2 * Math.PI / 60); // Power in Watts, though prompt just asked for Torque * RPM product logic sometimes? Prompt said "Power: Torque * Rotational speed". I'll simple mult.
  const simplePower = torque * rpm;

  // 1. Power Failure
  if (torque > 60 && rpm > 2500) {
    return { 
      risk: 90, 
      label: "Critical", 
      reason: "Power Failure Risk (High Torque & RPM)",
      features: { tempDiff, power: simplePower }
    };
  }
  
  // 2. Heat Dissipation Failure
  if (tempDiff > 10) {
    return { 
      risk: 75, 
      label: "Warning", 
      reason: "Heat Dissipation Risk (Temp Gradient > 10K)",
      features: { tempDiff, power: simplePower }
    };
  }
  
  // 3. Overstrain/Tool Wear Failure
  if (toolWear > 200) {
    return { 
      risk: 80, 
      label: "Critical", 
      reason: "Tool Wear Failure Risk",
      features: { tempDiff, power: simplePower }
    };
  }
  
  // 4. Detailed Calculation (Weighted Sum)
  // Normalize inputs to 0-1 range roughly based on max-min
  // This is a heuristic fallback
  const normTorque = (torque - 3) / (80 - 3);
  const normRPM = (rpm - 1100) / (2900 - 1100);
  const normWear = toolWear / 250;
  // Temp diff normalizer (0 to 12 approx)
  const normTemp = Math.max(0, tempDiff) / 12; 
  
  let riskScore = (0.4 * normTorque) + (0.2 * normRPM) + (0.3 * normWear) + (0.1 * normTemp);
  riskScore = Math.min(Math.max(riskScore, 0), 1) * 100;
  
  return {
    risk: Math.round(riskScore),
    label: riskScore > 50 ? "Caution" : "Healthy",
    reason: riskScore > 50 ? "Elevated Sensor Values" : "System Nominal",
    features: { tempDiff, power: simplePower }
  };
};

export const initialSensorData = {
  airTemp: 300,
  processTemp: 308,
  rpm: 1500,
  torque: 40,
  toolWear: 0
};
