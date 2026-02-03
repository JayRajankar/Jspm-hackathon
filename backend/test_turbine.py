"""
Test script to verify turbine endpoints are working
"""
import requests
import json

BASE_URL = "http://localhost:8000"

print("=" * 60)
print("TURBINE SYSTEM VERIFICATION TEST")
print("=" * 60)

# Test 1: Health Check
print("\n1. Testing Health Check...")
try:
    response = requests.get(f"{BASE_URL}/")
    result = response.json()
    print(f"   Status: {result.get('status')}")
    print(f"   Equipment Model Loaded: {result.get('model_loaded')}")
    print(f"   Turbine Model Loaded: {result.get('turbine_model_loaded')}")
    print("   ✅ Health check passed!")
except Exception as e:
    print(f"   ❌ Error: {e}")

# Test 2: Get Turbine Data
print("\n2. Testing Turbine Data Endpoint...")
try:
    response = requests.get(f"{BASE_URL}/turbine/Turbine_1")
    result = response.json()
    print(f"   Turbine ID: {result.get('turbine_id')}")
    print(f"   Total Points: {result.get('total_points')}")
    if result.get('history'):
        first_point = result['history'][0]
        print(f"   First Point: AT={first_point['AT']:.2f}, V={first_point['V']:.2f}, AP={first_point['AP']:.2f}, RH={first_point['RH']:.2f}, Risk={first_point['risk']:.2f}%")
    print("   ✅ Turbine data endpoint working!")
except Exception as e:
    print(f"   ❌ Error: {e}")

# Test 3: Turbine Prediction
print("\n3. Testing Turbine Prediction...")
try:
    test_data = {
        "AT": 20.0,
        "V": 50.0,
        "AP": 1010.0,
        "RH": 70.0
    }
    response = requests.post(f"{BASE_URL}/turbine/predict", json=test_data)
    result = response.json()
    print(f"   Input: AT={test_data['AT']}, V={test_data['V']}, AP={test_data['AP']}, RH={test_data['RH']}")
    print(f"   Prediction: {result.get('prediction')}")
    print(f"   Risk Probability: {result.get('risk_probability'):.2f}%")
    print(f"   Status: {result.get('status')}")
    print("   ✅ Turbine prediction working!")
except Exception as e:
    print(f"   ❌ Error: {e}")

# Test 4: Fleet Status
print("\n4. Testing Turbine Fleet Status...")
try:
    response = requests.post(f"{BASE_URL}/turbine/fleet/status")
    result = response.json()
    fleet = result.get('fleet', [])
    print(f"   Total Turbines: {len(fleet)}")
    if fleet:
        print(f"   Sample: {fleet[0]['turbine_id']} - Risk: {fleet[0]['risk']:.2f}%")
    print("   ✅ Fleet status working!")
except Exception as e:
    print(f"   ❌ Error: {e}")

print("\n" + "=" * 60)
print("VERIFICATION COMPLETE!")
print("=" * 60)
