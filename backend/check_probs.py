import joblib
import pandas as pd
import numpy as np

model = joblib.load('model.pkl')
df = pd.read_csv('generalized_dff.csv')

# Rename columns
df.columns = ['UDI','Product ID','Type','Air temperature','Process temperature',
              'Rotational speed','Torque','Tool wear','Machine failure',
              'TWF','HDF','PWF','OSF','RNF','Mechanical_Power','Temp_Diff','Tool_Stress']

# Feature engineering
df['Power'] = df['Torque'] * df['Rotational speed']
df_enc = pd.get_dummies(df, columns=['Type'])

for c in ['Type_H','Type_L','Type_M']:
    if c not in df_enc.columns:
        df_enc[c] = 0

cols = ['Air temperature','Process temperature','Rotational speed','Torque',
        'Tool wear','Type_H','Type_L','Type_M','Temp_Diff','Power','Tool_Stress']

X = df_enc[cols]
probs = model.predict_proba(X)[:,1]

print('=== Probability Distribution ===')
print(f'Min probability: {probs.min():.4f} ({probs.min()*100:.1f}%)')
print(f'Max probability: {probs.max():.4f} ({probs.max()*100:.1f}%)')
print(f'Mean probability: {probs.mean():.4f} ({probs.mean()*100:.1f}%)')
print(f'Median probability: {np.median(probs):.4f} ({np.median(probs)*100:.1f}%)')
print()
print('=== Count by Risk Level (as %) ===')
print(f'Risk < 10%: {(probs < 0.1).sum()} rows')
print(f'Risk 10-20%: {((probs >= 0.1) & (probs < 0.2)).sum()} rows')
print(f'Risk 20-30%: {((probs >= 0.2) & (probs < 0.3)).sum()} rows')
print(f'Risk 30-50%: {((probs >= 0.3) & (probs < 0.5)).sum()} rows')
print(f'Risk 50-70%: {((probs >= 0.5) & (probs < 0.7)).sum()} rows')
print(f'Risk > 70%: {(probs >= 0.7).sum()} rows')
print(f'Total rows: {len(probs)}')
