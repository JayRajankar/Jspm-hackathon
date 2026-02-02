import requests
import json

base_url = "http://localhost:8000"

def test_product_fetch(product_id):
    try:
        response = requests.get(f"{base_url}/product/{product_id}")
        if response.status_code == 200:
            print(f"✅ Product {product_id} Data: {response.json()}")
            return response.json()
        else:
            print(f"❌ Failed to fetch Product {product_id}: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

def test_prediction(product_stats):
    payload = {
        "Type": product_stats.get("type", "L"),
        "air_temp": product_stats["airTemp"],
        "proc_temp": product_stats["processTemp"],
        "rpm": product_stats["rpm"],
        "torque": product_stats["torque"],
        "tool_wear": product_stats["toolWear"],
        "cost_fp": 500,
        "cost_fn": 5000
    }
    
    try:
        response = requests.post(f"{base_url}/predict", json=payload)
        data = response.json()
        print(f"🔮 Prediction for Product Base Stats: {data}")
    except Exception as e:
        print(f"❌ Prediction Error: {e}")

print("🧪 Testing Backend Migration...")

# 1. Fetch Product 1 Stats
stats = test_product_fetch(1)

# 2. Run Prediction on these stats
if stats:
    test_prediction(stats)

# 3. Fetch Product 5 Stats
test_product_fetch(5)
