import pandas as pd
import numpy as np
import joblib
import smtplib
import time
import urllib.parse
import urllib.request
import threading
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

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

# ============== EMAIL ALERT SYSTEM ==============
# Email Configuration from environment
EMAIL_HOST = os.getenv("EMAIL_HOST", "smtp.gmail.com")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
SENDER_EMAIL = os.getenv("SENDER_EMAIL", "")
SENDER_PASSWORD = os.getenv("SENDER_PASSWORD", "")
RECEIVER_EMAILS_RAW = os.getenv("RECEIVER_EMAILS", "")
RECEIVER_EMAILS = [e.strip() for e in RECEIVER_EMAILS_RAW.split(",") if e.strip()]
ALERT_THRESHOLD = float(os.getenv("ALERT_THRESHOLD", "70"))
FOLLOWUP_SECONDS = int(os.getenv("FOLLOWUP_SECONDS", "300"))

# Track last alert time per product to avoid spam
last_alert_time = {}
ALERT_COOLDOWN_SECONDS = 300  # 5 minutes between alerts per product

def send_threshold_alert(
    product_id: str,
    metric_name: str,
    value: float,
    threshold: float,
    sensor_data: dict = None
):
    """Send email alert when threshold is exceeded."""
    if not SENDER_EMAIL or not SENDER_PASSWORD:
        print("⚠️ Email credentials not configured. Skipping alert.")
        return False
    if not RECEIVER_EMAILS:
        print("⚠️ No receiver emails configured. Skipping alert.")
        return False

    # Check cooldown
    current_time = time.time()
    if product_id in last_alert_time:
        if current_time - last_alert_time[product_id] < ALERT_COOLDOWN_SECONDS:
            print(f"⏳ Alert cooldown active for {product_id}. Skipping.")
            return False
    
    last_alert_time[product_id] = current_time

    subject = f"⚠ ALERT: {product_id} - {metric_name} Threshold Exceeded"
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    # Build sensor details HTML if available
    sensor_html = ""
    if sensor_data:
        sensor_html = f"""
        <tr>
            <td colspan="2" style="padding:10px 30px;">
                <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:14px 16px;color:#0369a1;">
                    <div style="font-weight:600;margin-bottom:8px;">Sensor Readings:</div>
                    <div style="font-size:13px;">
                        Air Temp: {sensor_data.get('air_temp', 'N/A')}K | 
                        Process Temp: {sensor_data.get('proc_temp', 'N/A')}K | 
                        RPM: {sensor_data.get('rpm', 'N/A')} | 
                        Torque: {sensor_data.get('torque', 'N/A')} Nm | 
                        Tool Wear: {sensor_data.get('tool_wear', 'N/A')} min
                    </div>
                </div>
            </td>
        </tr>
        """
    
    html_body = f"""
<html>
    <body style="margin:0;padding:0;background:#f3f5fb;font-family:Segoe UI,Arial,sans-serif;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f5fb;padding:28px 0;">
            <tr>
                <td align="center">
                    <table role="presentation" width="620" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;box-shadow:0 10px 30px rgba(18,23,38,0.12);overflow:hidden;">
                        <tr>
                            <td style="background:linear-gradient(135deg,#ff6b6b,#ff8f70);padding:22px 30px;color:#ffffff;">
                                <div style="font-size:20px;font-weight:700;letter-spacing:0.3px;">🔧 Predictive Maintenance Alert</div>
                                <div style="font-size:13px;opacity:0.9;">Threshold exceeded • Immediate attention required</div>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding:26px 30px 10px 30px;color:#1f2937;">
                                <p style="margin:0 0 14px 0;font-size:16px;line-height:1.5;">
                                    A critical reading was detected on <strong>{product_id}</strong>. Please schedule maintenance as soon as possible.
                                </p>
                                <div style="display:inline-block;background:#fee2e2;color:#b91c1c;font-weight:600;padding:6px 12px;border-radius:999px;font-size:12px;">
                                    ⚠ Threshold breached
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding:10px 30px 24px 30px;">
                                <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:separate;border-spacing:0 8px;">
                                    <tr>
                                        <td style="background:#f9fafb;border:1px solid #eef2f7;border-radius:10px;padding:12px 14px;">
                                            <div style="color:#6b7280;font-size:12px;">Metric</div>
                                            <div style="font-weight:600;font-size:15px;color:#111827;">{metric_name}</div>
                                        </td>
                                        <td style="width:12px;"></td>
                                        <td style="background:#f9fafb;border:1px solid #eef2f7;border-radius:10px;padding:12px 14px;">
                                            <div style="color:#6b7280;font-size:12px;">Current Value</div>
                                            <div style="font-weight:600;font-size:15px;color:#ef4444;">{value:.1f}%</div>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="background:#f9fafb;border:1px solid #eef2f7;border-radius:10px;padding:12px 14px;">
                                            <div style="color:#6b7280;font-size:12px;">Threshold</div>
                                            <div style="font-weight:600;font-size:15px;color:#111827;">{threshold:.1f}%</div>
                                        </td>
                                        <td style="width:12px;"></td>
                                        <td style="background:#f9fafb;border:1px solid #eef2f7;border-radius:10px;padding:12px 14px;">
                                            <div style="color:#6b7280;font-size:12px;">Time</div>
                                            <div style="font-weight:600;font-size:15px;color:#111827;">{timestamp}</div>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        {sensor_html}
                        <tr>
                            <td style="padding:0 30px 24px 30px;">
                                <div style="padding:14px 16px;background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;color:#9a3412;">
                                    <strong>Action Required:</strong> Schedule preventive maintenance immediately to avoid unplanned downtime.
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding:16px 30px;background:#f9fafb;color:#9ca3af;font-size:12px;">
                                This is an automated alert from your Predictive Maintenance System. Please do not reply.
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
</html>
"""

    try:
        msg = MIMEMultipart()
        msg["From"] = SENDER_EMAIL
        msg["To"] = ", ".join(RECEIVER_EMAILS)
        msg["Subject"] = subject
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP(EMAIL_HOST, EMAIL_PORT) as server:
            server.starttls()
            server.login(SENDER_EMAIL, SENDER_PASSWORD)
            server.send_message(msg)

        print(f"✅ Alert email sent for {product_id}")
        return True

    except Exception as e:
        print(f"❌ Failed to send alert email: {e}")
        return False


def send_alert_with_followup(product_id: str, metric_name: str, value: float, threshold: float, sensor_data: dict = None):
    """Send alert and schedule Telegram follow-up call."""
    email_sent = send_threshold_alert(product_id, metric_name, value, threshold, sensor_data)
    
    if email_sent and FOLLOWUP_SECONDS > 0:
        def followup_call():
            print(f"⏳ Waiting {FOLLOWUP_SECONDS} seconds before Telegram call...")
            time.sleep(FOLLOWUP_SECONDS)
            try:
                params = {
                    "source": "web",
                    "user": "@JayRajankar",
                    "text": f"Critical alert for {product_id}. Risk level at {value:.1f} percent. Immediate maintenance required.",
                    "lang": "en-US-Standard-B",
                }
                url = "http://api.callmebot.com/start.php?" + urllib.parse.urlencode(params)
                with urllib.request.urlopen(url, timeout=30) as response:
                    response.read()
                print(f"📞 Telegram call initiated for {product_id}")
            except Exception as e:
                print(f"❌ Telegram call failed: {e}")
        
        # Run followup in background thread
        threading.Thread(target=followup_call, daemon=True).start()


# Alert Request Schema
class AlertRequest(BaseModel):
    product_id: str
    risk_value: float
    sensor_data: dict = None


@app.post("/alert/check")
async def check_and_alert(req: AlertRequest, background_tasks: BackgroundTasks):
    """Check if risk exceeds threshold and send alert."""
    if req.risk_value >= ALERT_THRESHOLD:
        background_tasks.add_task(
            send_alert_with_followup,
            req.product_id,
            "Failure Risk",
            req.risk_value,
            ALERT_THRESHOLD,
            req.sensor_data
        )
        return {
            "alert_triggered": True,
            "message": f"Alert triggered for {req.product_id}",
            "risk": req.risk_value,
            "threshold": ALERT_THRESHOLD
        }
    
    return {
        "alert_triggered": False,
        "message": "Risk within safe limits",
        "risk": req.risk_value,
        "threshold": ALERT_THRESHOLD
    }


@app.post("/alert/send")
async def send_manual_alert(req: AlertRequest, background_tasks: BackgroundTasks):
    """Manually trigger an alert (for testing)."""
    background_tasks.add_task(
        send_alert_with_followup,
        req.product_id,
        "Manual Alert",
        req.risk_value,
        ALERT_THRESHOLD,
        req.sensor_data
    )
    return {"status": "Alert queued", "product_id": req.product_id}


@app.get("/alert/config")
def get_alert_config():
    """Get current alert configuration (for debugging)."""
    return {
        "email_configured": bool(SENDER_EMAIL and SENDER_PASSWORD),
        "receivers_count": len(RECEIVER_EMAILS),
        "threshold": ALERT_THRESHOLD,
        "followup_seconds": FOLLOWUP_SECONDS,
        "cooldown_seconds": ALERT_COOLDOWN_SECONDS
    }

# ============== END EMAIL ALERT SYSTEM ==============

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
DATASET_PATH = "generalized_dff.csv"
product_df = None
try:
    if os.path.exists(DATASET_PATH):
        product_df = pd.read_csv(DATASET_PATH)
        print("✅ Dataset loaded for product lookup.")
    else:
        # Development fallback: generate a small demo dataset so the UI can function
        print("⚠️ generalized_dff.csv not found — using generated demo dataset for development.")
        demo_rows = []
        for pid in range(1, 11):
            for udi in range(1, 6):
                demo_rows.append({
                    "Product ID": f"Product_{pid}",
                    "UDI": udi,
                    "Air temperature": 295 + (pid % 5) + (udi * 0.1),
                    "Process temperature": 305 + (pid % 7) + (udi * 0.15),
                    "Rotational speed": 1200 + (pid * 50) + (udi * 10),
                    "Torque": 10 + (pid * 2) + (udi * 0.5),
                    "Tool wear": (udi * 5) % 250,
                    "Type": ["L","M","H"][pid % 3]
                })
        product_df = pd.DataFrame(demo_rows)
        print("✅ Demo dataset generated (development only).")
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

    # Aggregate by Product ID - calculate average risk probability per product
    product_risks = subset.groupby('Product ID').agg({
        'Probability': 'mean'
    }).reset_index()
    
    # Assign risk category based on average probability
    def get_risk_category(prob):
        if prob >= 0.7:
            return "High Risk"
        elif prob >= 0.3933:
            return "Medium Risk"
        else:
            return "Low Risk"
    
    product_risks['Risk_Category'] = product_risks['Probability'].apply(get_risk_category)
    
    # Format for Recharts TreeMap: [ {name: 'High', children: [...]}, ... ]
    tree_data = []
    
    for category in ["High Risk", "Medium Risk", "Low Risk"]:
        cat_subset = product_risks[product_risks['Risk_Category'] == category]
        if not cat_subset.empty:
            children = []
            for _, row in cat_subset.iterrows():
                children.append({
                    "name": row['Product ID'],
                    "size": round(float(row['Probability']) * 100, 1),  # Size by risk percentage
                    "prob": round(float(row['Probability']) * 100, 1)   # Risk probability as percentage
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
