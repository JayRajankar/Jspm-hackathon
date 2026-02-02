import pandas as pd
import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report

# 1. Load Data
df = pd.read_csv("../../generalized_dff.csv")

# 2. Feature Engineering
# Temp_Diff: (Process temperature - Air temperature)
df['Temp_Diff'] = df['Process temperature'] - df['Air temperature']

# Mechanical_Power: (Torque * Rotational speed) -> Naming it 'Power' for consistency
df['Power'] = df['Torque'] * df['Rotational speed']

# Tool_Stress: (Tool wear * Torque)
df['Tool_Stress'] = df['Tool wear'] * df['Torque']

# One-Hot Encoding for Type
df = pd.get_dummies(df, columns=['Type'], drop_first=False)

# 3. Define Features and Target
# Excluding UDI, Product ID, and individual failure modes (TWF, HDF, etc)
target = "Machine failure"
features = [
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

X = df[features]
y = df[target]

# 4. Train Model
# Using a Random Forest as requested
clf = RandomForestClassifier(n_estimators=100, random_state=42)
clf.fit(X, y)

# 5. Evaluate (Optional, just to be sure)
# 5. Evaluate
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Fit on training set to generate "unseen" probabilities for the test set
# This ensures our calibration data represents out-of-sample performance
clf_calib = RandomForestClassifier(n_estimators=100, random_state=42)
clf_calib.fit(X_train, y_train)

y_pred = clf_calib.predict(X_test)
y_probs = clf_calib.predict_proba(X_test)[:, 1] # Probability of failure (class 1)

print("Model Accuracy on Test Set:", accuracy_score(y_test, y_pred))
print(classification_report(y_test, y_pred))

# Refit final model on all data for production
clf.fit(X, y) 

# 6. Save Model & Calibration Data
joblib.dump(clf, "model.pkl")
joblib.dump(features, "model_columns.pkl")

# Save y_test and y_probs for real-time cost optimization
calibration_data = {
    "y_true": y_test.values,
    "y_probs": y_probs
}
joblib.dump(calibration_data, "calibration_data.pkl")

print("✅ Model trained and saved to model.pkl")
print("✅ Calibration data (y_true, y_probs) saved to calibration_data.pkl")
