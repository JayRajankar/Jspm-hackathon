import requests
import json

base_url = "http://localhost:8000"

def test_fleet_status(product_ids):
    print(f"🔬 Testing Fleet Status for Products: {product_ids}")
    try:
        response = requests.post(
            f"{base_url}/fleet/status", 
            json={"product_ids": product_ids},
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Response Received.")
            # Check structure
            categories = [d['name'] for d in data]
            print(f"📂 Categories Found: {categories}")
            
            for cat in data:
                print(f"   - {cat['name']}: {len(cat['children'])} items")
                if cat['children']:
                    sample = cat['children'][0]
                    print(f"     Sample: {sample}")
            return True
        else:
            print(f"❌ Failed: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

# Test
test_fleet_status([1, 2, 3])
