from main import predict_failure, SensorInput, EXPECTED_COLUMNS
import pandas as pd

# Mock Data designed to trigger failure (High Torque, High Tool Wear)
# Values chosen to push probability up
input_data = SensorInput(
    Type="L",
    air_temp=300.0,
    proc_temp=310.0,
    rpm=1500,
    torque=70.0,   # High torque
    tool_wear=200  # High wear
)

print("🧪 Testing Prediction Logic with Input:", input_data)

try:
    result = predict_failure(input_data)
    print("\n✅ Prediction Result:")
    print(f"Prediction: {result['prediction']}")
    print(f"Probability: {result['probability']}")
    print(f"Status: {result['status']}")
    print(f"Recommendation: {result['recommendation']}")

    # Validation Checks
    if result['recommendation'] == "Cost-optimized maintenance suggested to prevent $5,000 downtime loss." and result['prediction'] == 1:
        print("\n✅ Recommendation Logic Passed.")
    elif result['prediction'] == 0:
         print("\n⚠️ Prediction was 0 (Healthy). This might be correct if model thinks so, but check probability.")
         if result['probability'] >= 0.3933:
             print("❌ ERROR: Probability >= threshold but prediction is 0!")
         else:
             print("ℹ️ Model predicts Healthy. Try increasing stress inputs if you want to test failure path.")
    else:
        print("\n❌ Recommendation Logic Mismatch or other issue.")
        
except Exception as e:
    print(f"\n❌ Error calling predict_failure: {e}")
