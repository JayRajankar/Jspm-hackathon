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

    if not email_sent:
        print(f"⚠️ Email alert failed for {product_id}, attempting Telegram call anyway.")

    if FOLLOWUP_SECONDS >= 0:
        def followup_call():
            if FOLLOWUP_SECONDS > 0:
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

def optimize_threshold(y_true, y_probs, cost_fp, cost_fn, method="ensemble"):
    """
    Robust threshold optimization using multiple methods and ensemble approach.
    
    Methods:
    - cost_sensitive: Minimizes business cost (FP * cost_fp + FN * cost_fn)
    - youden_j: Maximizes Youden's J statistic (Sensitivity + Specificity - 1)
    - f_beta: Maximizes F-beta score with beta derived from cost ratio
    - precision_recall: Finds threshold at precision-recall breakeven
    - ensemble: Weighted combination of all methods (default, most robust)
    
    Returns detailed metrics including confidence bounds.
    """
    y_true = np.array(y_true)
    y_probs = np.array(y_probs)
    
    # Fine-grained threshold search (1001 points for precision)
    thresholds = np.linspace(0.001, 0.999, 999)
    
    # === Method 1: Cost-Sensitive Optimization ===
    def cost_based_threshold():
        costs = []
        for thresh in thresholds:
            y_pred = (y_probs >= thresh).astype(int)
            fp = np.sum((y_pred == 1) & (y_true == 0))
            fn = np.sum((y_pred == 0) & (y_true == 1))
            total_cost = (fp * cost_fp) + (fn * cost_fn)
            costs.append(total_cost)
        
        costs = np.array(costs)
        min_idx = np.argmin(costs)
        min_cost = costs[min_idx]
        
        # Find range of thresholds within 5% of minimum cost for confidence interval
        tolerance = min_cost * 0.05 if min_cost > 0 else 0.01
        near_optimal = np.where(costs <= min_cost + tolerance)[0]
        
        return {
            "threshold": float(thresholds[min_idx]),
            "min_cost": float(min_cost),
            "cost_curve": costs,
            "confidence_low": float(thresholds[near_optimal[0]]) if len(near_optimal) > 0 else float(thresholds[min_idx]),
            "confidence_high": float(thresholds[near_optimal[-1]]) if len(near_optimal) > 0 else float(thresholds[min_idx])
        }
    
    # === Method 2: Youden's J Statistic (ROC-based) ===
    def youden_j_threshold():
        j_scores = []
        for thresh in thresholds:
            y_pred = (y_probs >= thresh).astype(int)
            tp = np.sum((y_pred == 1) & (y_true == 1))
            tn = np.sum((y_pred == 0) & (y_true == 0))
            fp = np.sum((y_pred == 1) & (y_true == 0))
            fn = np.sum((y_pred == 0) & (y_true == 1))
            
            sensitivity = tp / (tp + fn) if (tp + fn) > 0 else 0
            specificity = tn / (tn + fp) if (tn + fp) > 0 else 0
            
            j = sensitivity + specificity - 1
            j_scores.append(j)
        
        j_scores = np.array(j_scores)
        max_idx = np.argmax(j_scores)
        
        return {
            "threshold": float(thresholds[max_idx]),
            "j_score": float(j_scores[max_idx])
        }
    
    # === Method 3: F-beta Score (cost-weighted harmonic mean) ===
    def f_beta_threshold():
        # Beta > 1 favors recall (when FN is expensive)
        # Beta < 1 favors precision (when FP is expensive)
        beta = np.sqrt(cost_fn / cost_fp) if cost_fp > 0 else 1.0
        beta = np.clip(beta, 0.1, 10.0)  # Bound for numerical stability
        
        f_scores = []
        for thresh in thresholds:
            y_pred = (y_probs >= thresh).astype(int)
            tp = np.sum((y_pred == 1) & (y_true == 1))
            fp = np.sum((y_pred == 1) & (y_true == 0))
            fn = np.sum((y_pred == 0) & (y_true == 1))
            
            precision = tp / (tp + fp) if (tp + fp) > 0 else 0
            recall = tp / (tp + fn) if (tp + fn) > 0 else 0
            
            if precision + recall > 0:
                f_beta = (1 + beta**2) * (precision * recall) / ((beta**2 * precision) + recall)
            else:
                f_beta = 0
            
            f_scores.append(f_beta)
        
        f_scores = np.array(f_scores)
        max_idx = np.argmax(f_scores)
        
        return {
            "threshold": float(thresholds[max_idx]),
            "f_beta": float(f_scores[max_idx]),
            "beta_used": float(beta)
        }
    
    # === Method 4: Precision-Recall Breakeven ===
    def pr_breakeven_threshold():
        best_diff = float('inf')
        best_thresh = 0.5
        
        for thresh in thresholds:
            y_pred = (y_probs >= thresh).astype(int)
            tp = np.sum((y_pred == 1) & (y_true == 1))
            fp = np.sum((y_pred == 1) & (y_true == 0))
            fn = np.sum((y_pred == 0) & (y_true == 1))
            
            precision = tp / (tp + fp) if (tp + fp) > 0 else 0
            recall = tp / (tp + fn) if (tp + fn) > 0 else 0
            
            diff = abs(precision - recall)
            if diff < best_diff:
                best_diff = diff
                best_thresh = thresh
        
        return {
            "threshold": float(best_thresh),
            "breakeven_gap": float(best_diff)
        }
    
    # === Method 5: Bootstrap Confidence Interval ===
    def bootstrap_threshold(n_bootstrap=50):
        """Use bootstrap sampling to estimate threshold stability."""
        bootstrap_thresholds = []
        n_samples = len(y_true)
        
        for _ in range(n_bootstrap):
            # Sample with replacement
            indices = np.random.choice(n_samples, size=n_samples, replace=True)
            y_true_boot = y_true[indices]
            y_probs_boot = y_probs[indices]
            
            # Find optimal threshold for this sample
            costs = []
            for thresh in thresholds[::10]:  # Coarser search for speed
                y_pred = (y_probs_boot >= thresh).astype(int)
                fp = np.sum((y_pred == 1) & (y_true_boot == 0))
                fn = np.sum((y_pred == 0) & (y_true_boot == 1))
                total_cost = (fp * cost_fp) + (fn * cost_fn)
                costs.append(total_cost)
            
            min_idx = np.argmin(costs)
            bootstrap_thresholds.append(thresholds[::10][min_idx])
        
        return {
            "mean": float(np.mean(bootstrap_thresholds)),
            "std": float(np.std(bootstrap_thresholds)),
            "ci_lower": float(np.percentile(bootstrap_thresholds, 5)),
            "ci_upper": float(np.percentile(bootstrap_thresholds, 95))
        }
    
    # === Calculate all methods ===
    cost_result = cost_based_threshold()
    youden_result = youden_j_threshold()
    fbeta_result = f_beta_threshold()
    pr_result = pr_breakeven_threshold()
    
    # Bootstrap for confidence (smaller sample for speed)
    if len(y_true) > 100:
        bootstrap_result = bootstrap_threshold(n_bootstrap=30)
    else:
        bootstrap_result = {"mean": cost_result["threshold"], "std": 0.05, "ci_lower": 0.3, "ci_upper": 0.7}
    
    # === Ensemble: Weighted combination based on cost ratio ===
    cost_ratio = cost_fn / cost_fp if cost_fp > 0 else 10.0
    
    # Weight assignment based on business context
    if cost_ratio > 5:  # FN is much more expensive - prioritize recall
        weights = {
            "cost": 0.40,
            "youden": 0.15,
            "fbeta": 0.35,
            "pr": 0.10
        }
    elif cost_ratio < 2:  # FP is relatively expensive - prioritize precision  
        weights = {
            "cost": 0.35,
            "youden": 0.30,
            "fbeta": 0.25,
            "pr": 0.10
        }
    else:  # Balanced
        weights = {
            "cost": 0.35,
            "youden": 0.25,
            "fbeta": 0.25,
            "pr": 0.15
        }
    
    ensemble_threshold = (
        weights["cost"] * cost_result["threshold"] +
        weights["youden"] * youden_result["threshold"] +
        weights["fbeta"] * fbeta_result["threshold"] +
        weights["pr"] * pr_result["threshold"]
    )
    
    # Round to 3 decimal places for practical use
    ensemble_threshold = round(ensemble_threshold, 3)
    
    # Calculate expected annual savings at optimal threshold
    baseline_cost = cost_result["cost_curve"][499]  # Cost at 0.5 threshold
    optimal_cost = cost_result["min_cost"]
    annual_savings = max(0, (baseline_cost - optimal_cost) * 365)  # Assume daily samples
    
    if method == "ensemble":
        final_threshold = ensemble_threshold
    elif method == "cost":
        final_threshold = cost_result["threshold"]
    elif method == "youden":
        final_threshold = youden_result["threshold"]
    elif method == "fbeta":
        final_threshold = fbeta_result["threshold"]
    else:
        final_threshold = ensemble_threshold
    
    return {
        "optimal_threshold": float(final_threshold),
        "method_used": method,
        "methods": {
            "cost_sensitive": cost_result["threshold"],
            "youden_j": youden_result["threshold"],
            "f_beta": fbeta_result["threshold"],
            "pr_breakeven": pr_result["threshold"],
            "ensemble": ensemble_threshold
        },
        "confidence_interval": {
            "lower": bootstrap_result["ci_lower"],
            "upper": bootstrap_result["ci_upper"],
            "std": bootstrap_result["std"]
        },
        "metrics": {
            "min_cost": cost_result["min_cost"],
            "j_statistic": youden_result["j_score"],
            "f_beta_score": fbeta_result["f_beta"],
            "beta_used": fbeta_result["beta_used"],
            "cost_ratio": cost_ratio
        },
        "annual_savings_estimate": float(annual_savings)
    }


def get_simple_threshold(y_true, y_probs, cost_fp, cost_fn):
    """Simple wrapper that returns just the threshold value for backward compatibility."""
    result = optimize_threshold(y_true, y_probs, cost_fp, cost_fn, method="ensemble")
    return result["optimal_threshold"]

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

        # COST OPTIMIZATION LOGIC - Using robust ensemble algorithm
        threshold_result = None
        if calibration_data:
             # Calculate optimal threshold dynamically based on user input costs
             threshold_result = optimize_threshold(
                 calibration_data['y_true'], 
                 calibration_data['y_probs'], 
                 data.cost_fp, 
                 data.cost_fn,
                 method="ensemble"
             )
             THRESHOLD = threshold_result["optimal_threshold"]
        else:
             THRESHOLD = 0.3933 # Default fallback
        
        if probability_class_1 >= THRESHOLD:
            prediction = 1
            status_msg = "Failure Predicted"
            recommendation = f"Optimized maintenance trigger (Thresh: {THRESHOLD:.3f}) to prevent ${data.cost_fn} loss."
        else:
            prediction = 0
            status_msg = "Healthy"
            recommendation = "System execution normal"

        response = {
            "prediction": int(prediction),
            "probability": round(float(probability_class_1), 4),
            "threshold": round(float(THRESHOLD), 4),
            "status": status_msg,
            "recommendation": recommendation
        }
        
        # Add optimization details if available
        if threshold_result:
            response["optimization"] = {
                "method_thresholds": threshold_result["methods"],
                "confidence_interval": threshold_result["confidence_interval"],
                "annual_savings_estimate": threshold_result["annual_savings_estimate"]
            }
        
        return response

    except Exception as e:
        print(f"Prediction Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============== TURBINE SYSTEM ==============

# Load Turbine Model and Data
TURBINE_MODEL_PATH = "turbine_model.pkl"
TURBINE_COLUMNS_PATH = "turbine_model_columns.pkl"
TURBINE_DATA_PATH = "Turbine_test_data.csv"

try:
    if os.path.exists(TURBINE_MODEL_PATH) and os.path.exists(TURBINE_COLUMNS_PATH):
        turbine_model = joblib.load(TURBINE_MODEL_PATH)
        turbine_columns = joblib.load(TURBINE_COLUMNS_PATH)
        turbine_data = pd.read_csv(TURBINE_DATA_PATH)
        print(f"✅ Turbine model loaded. Columns: {turbine_columns}")
        print(f"✅ Turbine test data loaded. Shape: {turbine_data.shape}")
    else:
        print("⚠️ Warning: turbine model files not found.")
        turbine_model = None
        turbine_columns = None
        turbine_data = None
except Exception as e:
    print(f"❌ Error loading turbine model: {e}")
    turbine_model = None
    turbine_columns = None
    turbine_data = None

# Turbine Input Schema
class TurbineInput(BaseModel):
    AT: float  # Air Temperature
    V: float   # Voltage
    AP: float  # Air Pressure
    RH: float  # Relative Humidity

def create_turbine_features(AT, V, AP, RH):
    """
    Create engineered features for turbine model prediction
    Must match the features used during training
    """
    # Create engineered features
    temp_press_ratio = AT / (AP / 1000)
    voltage_temp = V * AT
    humidity_factor = (RH / 100) * V
    power_est = V * AT * (AP / 1000)
    
    # Return DataFrame with all features in correct order
    features_dict = {
        'AT': AT,
        'V': V,
        'AP': AP,
        'RH': RH,
        'Temp_Press_Ratio': temp_press_ratio,
        'Voltage_Temp': voltage_temp,
        'Humidity_Factor': humidity_factor,
        'Power_Est': power_est
    }
    
    return pd.DataFrame([features_dict])

@app.get("/turbine/{turbine_id}")
def get_turbine_data(turbine_id: str):
    """
    Get historical data for a specific turbine with predicted risk
    """
    if turbine_data is None or turbine_model is None:
        raise HTTPException(status_code=503, detail="Turbine system not loaded")
    
    try:
        # Extract turbine number for deterministic sampling
        turbine_num = int(turbine_id.split('_')[-1]) if '_' in turbine_id else 1
        start_idx = (turbine_num * 19) % len(turbine_data)
        
        # Get a window of data (sample every 3rd point for 100 points total)
        SAMPLE_INTERVAL = 3
        sample_indices = range(start_idx, start_idx + (100 * SAMPLE_INTERVAL), SAMPLE_INTERVAL)
        
        history = []
        for idx in sample_indices:
            actual_idx = idx % len(turbine_data)  # Wrap around
            row = turbine_data.iloc[actual_idx]
            
            # Create features with engineering
            input_df = create_turbine_features(row['AT'], row['V'], row['AP'], row['RH'])
            
            # Predict risk
            probabilities = turbine_model.predict_proba(input_df)[0]
            risk = float(probabilities[1] * 100)  # Failure probability percentage
            
            history.append({
                "AT": float(row['AT']),
                "V": float(row['V']),
                "AP": float(row['AP']),
                "RH": float(row['RH']),
                "risk": risk
            })
        
        return {
            "turbine_id": turbine_id,
            "history": history,
            "total_points": len(history)
        }
    
    except Exception as e:
        print(f"Turbine data error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/turbine/predict")
def predict_turbine(data: TurbineInput):
    """
    Predict turbine failure risk based on sensor readings
    """
    if turbine_model is None:
        raise HTTPException(status_code=503, detail="Turbine model not loaded")
    
    try:
        # Create features with engineering
        input_df = create_turbine_features(data.AT, data.V, data.AP, data.RH)
        
        # Get prediction and probability
        prediction = turbine_model.predict(input_df)[0]
        probabilities = turbine_model.predict_proba(input_df)[0]
        risk_probability = float(probabilities[1] * 100)
        
        return {
            "prediction": int(prediction),
            "risk_probability": risk_probability,
            "status": "High Risk" if prediction == 1 else "Normal",
            "sensor_data": {
                "AT": data.AT,
                "V": data.V,
                "AP": data.AP,
                "RH": data.RH
            }
        }
    
    except Exception as e:
        print(f"Turbine prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/turbine/fleet/status")
def get_turbine_fleet_status():
    """
    Get aggregated risk status for all turbines in the fleet
    """
    if turbine_data is None or turbine_model is None:
        raise HTTPException(status_code=503, detail="Turbine system not loaded")
    
    try:
        fleet_status = []
        
        for i in range(1, 11):  # Turbine_1 to Turbine_10
            turbine_id = f"Turbine_{i}"
            start_idx = (i * 19) % len(turbine_data)
            
            # Get recent window (last 10 points for averaging)
            indices = [(start_idx + j) % len(turbine_data) for j in range(10)]
            risks = []
            
            for idx in indices:
                row = turbine_data.iloc[idx]
                # Create features with engineering
                input_df = create_turbine_features(row['AT'], row['V'], row['AP'], row['RH'])
                probabilities = turbine_model.predict_proba(input_df)[0]
                risks.append(probabilities[1] * 100)
            
            avg_risk = float(np.mean(risks))
            
            fleet_status.append({
                "turbine_id": turbine_id,
                "risk": avg_risk,
                "name": turbine_id
            })
        
        return {"fleet": fleet_status}
    
    except Exception as e:
        print(f"Fleet status error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============== GENERATOR SYSTEM ==============

# Load Generator Model and Data
GENERATOR_MODEL_PATH = "generator_model.pkl"
GENERATOR_COLUMNS_PATH = "generator_model_columns.pkl"
GENERATOR_DATA_PATH = "generator_test_data.csv"

try:
    if os.path.exists(GENERATOR_MODEL_PATH) and os.path.exists(GENERATOR_COLUMNS_PATH):
        generator_model = joblib.load(GENERATOR_MODEL_PATH)
        generator_columns = joblib.load(GENERATOR_COLUMNS_PATH)
        generator_data = pd.read_csv(GENERATOR_DATA_PATH)
        print(f"✅ Generator model loaded. Columns: {generator_columns}")
        print(f"✅ Generator test data loaded. Shape: {generator_data.shape}")
    else:
        print("⚠️ Warning: generator model files not found.")
        generator_model = None
        generator_columns = None
        generator_data = None
except Exception as e:
    print(f"❌ Error loading generator model: {e}")
    generator_model = None
    generator_columns = None
    generator_data = None

# Generator Input Schema
class GeneratorInput(BaseModel):
    air_temp: float
    core_temp: float
    rpm: float
    torque: float
    wear: float

def create_generator_features(air_temp, core_temp, rpm, torque, wear):
    """
    Create feature DataFrame for generator model prediction
    Uses only raw features as model was trained on them
    """
    # Return DataFrame with raw features only
    features_dict = {
        'air_temp': air_temp,
        'core_temp': core_temp,
        'rpm': rpm,
        'torque': torque,
        'wear': wear
    }
    
    return pd.DataFrame([features_dict])

@app.get("/generator/{generator_id}")
def get_generator_data(generator_id: str):
    """
    Get historical data and predictions for a specific generator
    """
    if generator_model is None or generator_data is None:
        raise HTTPException(status_code=503, detail="Generator model not available")
    
    try:
        # Extract generator number from ID (e.g., "Generator_1" -> 1)
        gen_num = int(generator_id.split('_')[1])
        
        # Calculate chunk size for each generator
        chunk_size = len(generator_data) // 10
        start_idx = (gen_num - 1) * chunk_size
        end_idx = start_idx + chunk_size if gen_num < 10 else len(generator_data)
        
        # Get data chunk for this generator
        generator_chunk = generator_data.iloc[start_idx:end_idx]
        
        results = []
        for _, row in generator_chunk.iterrows():
            # Create features with engineering
            input_df = create_generator_features(
                row['air_temp'], row['core_temp'], row['rpm'], 
                row['torque'], row['wear']
            )
            
            # Predict
            probabilities = generator_model.predict_proba(input_df)[0]
            
            results.append({
                "air_temp": float(row['air_temp']),
                "core_temp": float(row['core_temp']),
                "rpm": float(row['rpm']),
                "torque": float(row['torque']),
                "wear": float(row['wear']),
                "risk": float(probabilities[1] * 100)
            })
        
        return {"generator_id": generator_id, "history": results}
    
    except Exception as e:
        print(f"Generator data error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generator/predict")
def predict_generator(input_data: GeneratorInput):
    """
    Real-time prediction for generator data
    """
    if generator_model is None:
        raise HTTPException(status_code=503, detail="Generator model not available")
    
    try:
        # Create features with engineering
        input_df = create_generator_features(
            input_data.air_temp, input_data.core_temp, input_data.rpm,
            input_data.torque, input_data.wear
        )
        
        # Predict
        probabilities = generator_model.predict_proba(input_df)[0]
        risk = probabilities[1] * 100
        
        return {
            "risk": float(risk),
            "status": "High Risk" if risk >= 70 else "Medium Risk" if risk >= 40 else "Low Risk"
        }
    
    except Exception as e:
        print(f"Generator prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generator/fleet/status")
def get_generator_fleet_status(generator_ids: list[str]):
    """
    Get fleet status for multiple generators
    """
    if generator_model is None or generator_data is None:
        raise HTTPException(status_code=503, detail="Generator model not available")
    
    try:
        fleet_status = []
        chunk_size = len(generator_data) // 10
        
        for generator_id in generator_ids:
            gen_num = int(generator_id.split('_')[1]) if '_' in generator_id else int(generator_id)
            start_idx = (gen_num - 1) * chunk_size
            end_idx = start_idx + chunk_size if gen_num < 10 else len(generator_data)
            
            generator_chunk = generator_data.iloc[start_idx:end_idx]
            
            # Calculate average risk for this generator
            risks = []
            for _, row in generator_chunk.iterrows():
                input_df = create_generator_features(
                    row['air_temp'], row['core_temp'], row['rpm'],
                    row['torque'], row['wear']
                )
                probabilities = generator_model.predict_proba(input_df)[0]
                risks.append(probabilities[1] * 100)
            
            avg_risk = float(np.mean(risks))
            
            fleet_status.append({
                "generator_id": f"Generator_{gen_num}",
                "risk": avg_risk,
                "name": f"Generator_{gen_num}"
            })
        
        return {"fleet": fleet_status}
    
    except Exception as e:
        print(f"Generator fleet status error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============== TURBINE COST OPTIMIZATION ==============

class TurbineCostInput(BaseModel):
    AT: float
    V: float
    AP: float
    RH: float
    cost_fp: float = 500
    cost_fn: float = 5000

@app.post("/turbine/predict/cost")
def predict_turbine_with_cost(data: TurbineCostInput):
    """
    Predict turbine failure risk with robust cost-optimized threshold
    Uses ensemble of methods: cost-sensitive, Youden's J, F-beta, and PR-breakeven
    """
    if turbine_model is None or turbine_data is None:
        raise HTTPException(status_code=503, detail="Turbine model not loaded")
    
    try:
        # Create features for input
        input_df = create_turbine_features(data.AT, data.V, data.AP, data.RH)
        
        # Get probability
        probabilities = turbine_model.predict_proba(input_df)[0]
        risk_probability = float(probabilities[1])
        
        # Calculate optimal threshold using turbine data (sample for performance)
        sample_size = min(500, len(turbine_data))
        sample_df = turbine_data.sample(n=sample_size, random_state=42)
        
        y_probs = []
        for _, row in sample_df.iterrows():
            feat_df = create_turbine_features(row['AT'], row['V'], row['AP'], row['RH'])
            probs = turbine_model.predict_proba(feat_df)[0]
            y_probs.append(probs[1])
        
        y_probs = np.array(y_probs)
        # Create synthetic ground truth based on high probability threshold
        y_true = (y_probs > 0.5).astype(int)
        
        # Get robust threshold optimization result
        threshold_result = optimize_threshold(y_true, y_probs, data.cost_fp, data.cost_fn, method="ensemble")
        optimal_threshold = threshold_result["optimal_threshold"]
        
        # Make prediction using optimal threshold
        prediction = 1 if risk_probability >= optimal_threshold else 0
        
        # Calculate strategy based on cost ratio
        ratio = data.cost_fn / data.cost_fp
        if ratio > 8:
            strategy = "Aggressive Protection"
        elif ratio < 3:
            strategy = "Conservative Monitoring"
        else:
            strategy = "Balanced Profile"
        
        return {
            "prediction": int(prediction),
            "probability": round(risk_probability, 4),
            "risk_percent": round(risk_probability * 100, 2),
            "threshold": round(optimal_threshold, 4),
            "status": "High Risk" if prediction == 1 else "Normal",
            "strategy": strategy,
            "cost_fn": data.cost_fn,
            "cost_fp": data.cost_fp,
            "optimization": {
                "method_thresholds": threshold_result["methods"],
                "confidence_interval": threshold_result["confidence_interval"],
                "annual_savings_estimate": threshold_result["annual_savings_estimate"],
                "f_beta_used": threshold_result["metrics"]["beta_used"]
            }
        }
    
    except Exception as e:
        print(f"Turbine cost prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============== GENERATOR COST OPTIMIZATION ==============

class GeneratorCostInput(BaseModel):
    air_temp: float
    core_temp: float
    rpm: float
    torque: float
    wear: float
    cost_fp: float = 500
    cost_fn: float = 5000

@app.post("/generator/predict/cost")
def predict_generator_with_cost(data: GeneratorCostInput):
    """
    Predict generator failure risk with robust cost-optimized threshold
    Uses ensemble of methods: cost-sensitive, Youden's J, F-beta, and PR-breakeven
    """
    if generator_model is None or generator_data is None:
        raise HTTPException(status_code=503, detail="Generator model not loaded")
    
    try:
        # Create features for input
        input_df = create_generator_features(
            data.air_temp, data.core_temp, data.rpm, data.torque, data.wear
        )
        
        # Get probability
        probabilities = generator_model.predict_proba(input_df)[0]
        risk_probability = float(probabilities[1])
        
        # Calculate optimal threshold using generator data (sample for performance)
        sample_size = min(500, len(generator_data))
        sample_df = generator_data.sample(n=sample_size, random_state=42)
        
        y_probs = []
        for _, row in sample_df.iterrows():
            feat_df = create_generator_features(
                row['air_temp'], row['core_temp'], row['rpm'], row['torque'], row['wear']
            )
            probs = generator_model.predict_proba(feat_df)[0]
            y_probs.append(probs[1])
        
        y_probs = np.array(y_probs)
        # Create synthetic ground truth based on high probability threshold
        y_true = (y_probs > 0.5).astype(int)
        
        # Get robust threshold optimization result
        threshold_result = optimize_threshold(y_true, y_probs, data.cost_fp, data.cost_fn, method="ensemble")
        optimal_threshold = threshold_result["optimal_threshold"]
        
        # Make prediction using optimal threshold
        prediction = 1 if risk_probability >= optimal_threshold else 0
        
        # Calculate strategy based on cost ratio
        ratio = data.cost_fn / data.cost_fp
        if ratio > 8:
            strategy = "Aggressive Protection"
        elif ratio < 3:
            strategy = "Conservative Monitoring"
        else:
            strategy = "Balanced Profile"
        
        return {
            "prediction": int(prediction),
            "probability": round(risk_probability, 4),
            "risk_percent": round(risk_probability * 100, 2),
            "threshold": round(optimal_threshold, 4),
            "status": "High Risk" if prediction == 1 else "Normal",
            "strategy": strategy,
            "cost_fn": data.cost_fn,
            "cost_fp": data.cost_fp,
            "optimization": {
                "method_thresholds": threshold_result["methods"],
                "confidence_interval": threshold_result["confidence_interval"],
                "annual_savings_estimate": threshold_result["annual_savings_estimate"],
                "f_beta_used": threshold_result["metrics"]["beta_used"]
            }
        }
    
    except Exception as e:
        print(f"Generator cost prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
def health_check():
    return {
        "status": "online", 
        "model_loaded": model is not None,
        "turbine_model_loaded": turbine_model is not None,
        "generator_model_loaded": generator_model is not None
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
