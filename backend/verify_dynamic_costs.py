import requests
import json

url = "http://localhost:8000/predict"

def test_cost_profile(cost_fn, cost_fp):
    payload = {
        "Type": "L",
        "air_temp": 300.0,
        "proc_temp": 310.0,
        "rpm": 1500,
        "torque": 40.0,
        "tool_wear": 100,
        "cost_fn": cost_fn,
        "cost_fp": cost_fp
    }
    
    try:
        response = requests.post(url, json=payload)
        data = response.json()
        print(f"💰 Cost Profile [FN=${cost_fn}, FP=${cost_fp}] -> Threshold: {data.get('threshold')} | Status: {data.get('status')}")
        return data.get('threshold')
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

print("🧪 Testing Dynamic Cost Optimization...")

# Case 1: High Cost of Failure (Should lower threshold to be more sensitive)
t1 = test_cost_profile(50000, 500)

# Case 2: High Cost of False Alarm (Should raise threshold to be more conservative)
t2 = test_cost_profile(5000, 5000)

if t1 is not None and t2 is not None:
    if t1 < t2:
        print("\n✅ SUCCESS: Threshold adapted correctly. Higher failure cost lowered the threshold.")
    else:
        print("\n⚠️ WARNING: Thresholds might not have shifted as expected. Check optimization logic.")
