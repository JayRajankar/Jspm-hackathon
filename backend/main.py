import pandas as pd
import numpy as np
import joblib
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os

# Initialize FastAPI
app = FastAPI(title="Predictive Maintenance API", version="1.0")

# Enable CORS for React Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify the frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load Model
MODEL_PATH = "model.pkl"

try:
    if os.path.exists(MODEL_PATH):
        model = joblib.load(MODEL_PATH)
        print("✅ Model loaded successfully.")
    else:
        print("⚠️ Warning: model.pkl not found. API will fail on prediction.")
        model = None
except Exception as e:
    print(f"❌ Error loading model: {e}")
    model = None

# Input Schema
class SensorInput(BaseModel):
    Type: str  # L, M, or H
    air_temp: float
    proc_temp: float
    rpm: int
    torque: float
    tool_wear: int
    cost_fp: float = 500.0  # Default Cost of False Positive
    cost_fn: float = 5000.0 # Default Cost of False Negative

# Columns expected by the trained model (must match training exactly)
# Updated to match generalized_diff.csv features (No Units!)
EXPECTED_COLUMNS = [
    "Air temperature", 
    "Process temperature", 
    "Rotational speed", 
    "Torque", 
    "Tool wear", 
    "Type_H", 
    "Type_L", 
    "Type_M",
    "Temp_Diff",
    "Power",
    "Tool_Stress"
]

# Load Calibration Data (y_true, y_probs)
CALIBRATION_PATH = "calibration_data.pkl"
calibration_data = None
try:
    if os.path.exists(CALIBRATION_PATH):
        calibration_data = joblib.load(CALIBRATION_PATH)
        print("✅ Calibration data loaded for threshold optimization.")
    else:
        print("⚠️ Warning: calibration_data.pkl not found. Dynamic optimization disabled.")
except Exception as e:
     print(f"❌ Error loading calibration data: {e}")

# Load Dataset for Product Stats
DATASET_PATH = "../../generalized_dff.csv"
product_df = None
try:
    if os.path.exists(DATASET_PATH):
        product_df = pd.read_csv(DATASET_PATH)
        print("✅ Dataset loaded for product lookup.")
    else:
        print("⚠️ Warning: generalized_dff.csv not found. Product lookup will fail.")
except Exception as e:
    print(f"❌ Error loading dataset: {e}")

def optimize_threshold(y_true, y_probs, cost_fp, cost_fn):
    """
    Finds the threshold that minimizes total business cost.
    Total Cost = (False Negatives * cost_fn) + (False Positives * cost_fp)
    """
    thresholds = np.linspace(0.0, 1.0, 101)
    costs = []

    for thresh in thresholds:
        y_pred = (y_probs >= thresh).astype(int)
        
        # Calculate FP and FN
        fp = np.sum((y_pred == 1) & (y_true == 0))
        fn = np.sum((y_pred == 0) & (y_true == 1))
        
        total_cost = (fp * cost_fp) + (fn * cost_fn)
        costs.append(total_cost)

    # Find index of minimum cost
    min_cost_index = np.argmin(costs)
    optimal_threshold = thresholds[min_cost_index]
    
    return float(optimal_threshold)

@app.get("/product/{product_id}")
def get_product_stats(product_id: int):
    # Use pre-computed cache if available, else fallback to raw df
    source_df = fleet_risk_cache if not fleet_risk_cache.empty else product_df
    
    if source_df is None or source_df.empty:
        raise HTTPException(status_code=503, detail="Dataset not ready/loaded.")
    
    # Filter for Product_ID (dataset uses 'Product_1', 'Product_2' etc)
    prod_str = f"Product_{product_id}"
    subset = source_df[source_df['Product ID'] == prod_str]
    
    if subset.empty:
        raise HTTPException(status_code=404, detail=f"Product {product_id} not found.")

    # Sort by UDI for correct time-series playback
    if 'UDI' in subset.columns:
        subset = subset.sort_values(by='UDI')

    # Convert to list of dicts
    history = []
    for _, row in subset.iterrows():
        # Handle missing Probability if falling back to raw df
        prob = row.get('Probability', 0.0) 
        
        history.append({
            "udi": int(row['UDI']),
            "airTemp": float(row['Air temperature']),
            "processTemp": float(row['Process temperature']),
            "rpm": float(row['Rotational speed']),
            "torque": float(row['Torque']),
            "toolWear": float(row['Tool wear']),
            "risk": round(prob * 100, 1), # Send as percentage 0-100
            "prediction": 1 if prob > 0.5 else 0 
        })
        
    return history

# --- Pre-calculate Fleet Risks (Batch Prediction) ---
fleet_risk_cache = pd.DataFrame()

def precompute_fleet_risks():
    global fleet_risk_cache
    if product_df is None or model is None:
        return

    print("⚙️ Pre-computing fleet risks...")
    try:
        # Create a working copy
        df_full = product_df.copy()

        # Apply Feature Engineering (Must match training!)
        df_full['Temp_Diff'] = df_full['Process temperature'] - df_full['Air temperature']
        df_full['Power'] = df_full['Torque'] * df_full['Rotational speed']
        df_full['Tool_Stress'] = df_full['Tool wear'] * df_full['Torque']

        # One-Hot Encoding
        df_encoded = pd.get_dummies(df_full, columns=['Type'], drop_first=False)
        
        # Ensure all encoded cols exist
        for col in ["Type_H", "Type_L", "Type_M"]:
             if col not in df_encoded.columns:
                 df_encoded[col] = 0
        
        # Select features in order
        X_full = df_encoded[EXPECTED_COLUMNS]
        
        # Batch Predict
        probs = model.predict_proba(X_full)[:, 1] # Probability of Class 1
        
        # Store results
        fleet_risk_cache = product_df.copy()
        fleet_risk_cache['Probability'] = probs
        fleet_risk_cache['Risk_Category'] = pd.cut(
            fleet_risk_cache['Probability'], 
            bins=[-0.1, 0.3933, 0.7, 1.1], 
            labels=["Low Risk", "Medium Risk", "High Risk"]
        )
        print("✅ Fleet risks pre-computed.")
        
    except Exception as e:
        print(f"❌ Error pre-computing fleet risks: {e}")

# Call on startup (or when needed)
precompute_fleet_risks()

class FleetRequest(BaseModel):
    product_ids: list[int]

@app.post("/fleet/status")
def get_fleet_status(req: FleetRequest):
    if fleet_risk_cache.empty:
         raise HTTPException(status_code=503, detail="Fleet risks not computed.")
    
    # Map valid Products (e.g. 1 -> "Product_1")
    target_products = [f"Product_{pid}" for pid in req.product_ids]
    
    # Filter
    subset = fleet_risk_cache[fleet_risk_cache['Product ID'].isin(target_products)]
    
    if subset.empty:
        return []

    # Format for Recharts TreeMap: [ {name: 'High', children: [...]}, ... ]
    tree_data = []
    
    for category in ["High Risk", "Medium Risk", "Low Risk"]:
        cat_subset = subset[subset['Risk_Category'] == category]
        if not cat_subset.empty:
            children = []
            for _, row in cat_subset.head(50).iterrows(): # Limit items per category to avoid UI lag
                children.append({
                    "name": row['UDI'],
                    "size": float(row['Torque']), # Size by Torque or just 1
                    "product": row['Product ID'],
                    "prob": round(float(row['Probability']), 2)
                })
            
            tree_data.append({
                "name": category,
                "children": children
            })
            
    return tree_data

@app.post("/predict")
def predict_failure(data: SensorInput):
    if not model:
        raise HTTPException(status_code=503, detail="Model is not loaded.")

    try:
        # 1. Feature Engineering
        # Temp_Diff = Process - Air
        temp_diff = data.proc_temp - data.air_temp
        
        # Power = Torque * RPM
        power = data.torque * data.rpm

        # Tool_Stress = Tool Wear * Torque
        tool_stress = data.tool_wear * data.torque

        # One-Hot Encoding for Type
        type_h = 1 if data.Type == 'H' else 0
        type_l = 1 if data.Type == 'L' else 0
        type_m = 1 if data.Type == 'M' else 0

        # 2. Create Feature Vector in exact order
        features_dict = {
            'Air temperature': data.air_temp,
            'Process temperature': data.proc_temp,
            'Rotational speed': data.rpm,
            'Torque': data.torque,
            'Tool wear': data.tool_wear,
            'Type_H': type_h,
            'Type_L': type_l,
            'Type_M': type_m,
            'Temp_Diff': temp_diff,
            'Power': power,
            'Tool_Stress': tool_stress
        }
        
        features = pd.DataFrame([features_dict])
        
        # Ensure correct column order
        features = features[EXPECTED_COLUMNS]

        # 3. Prediction with Cost-Optimized Threshold
        try:
            # Get probability of class 1 (Failure)
            probability_class_1 = model.predict_proba(features)[0][1]
        except:
             # Fallback if model doesn't support proba (unlikely for RandomForest)
            probability_class_1 = float(model.predict(features)[0])

        # COST OPTIMIZATION LOGIC
        if calibration_data:
             # Calculate optimal threshold dynamically based on user input costs
             THRESHOLD = optimize_threshold(
                 calibration_data['y_true'], 
                 calibration_data['y_probs'], 
                 data.cost_fp, 
                 data.cost_fn
             )
        else:
             THRESHOLD = 0.3933 # Default fallback
        
        if probability_class_1 >= THRESHOLD:
            prediction = 1
            status_msg = "Failure Predicted"
            recommendation = f"Optimized maintenance trigger (Thresh: {THRESHOLD:.2f}) to prevent ${data.cost_fn} loss."
        else:
            prediction = 0
            status_msg = "Healthy"
            recommendation = "System execution normal"

        return {
            "prediction": int(prediction),
            "probability": round(float(probability_class_1), 4),
            "threshold": round(float(THRESHOLD), 4),
            "status": status_msg,
            "recommendation": recommendation
        }

    except Exception as e:
        print(f"Prediction Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
def health_check():
    return {"status": "online", "model_loaded": model is not None}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
