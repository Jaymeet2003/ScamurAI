from fastapi import FastAPI, Request
import joblib
import pandas as pd

app = FastAPI()

# Load model and optimal threshold
model = joblib.load("../model/stripe_fraud_model.pkl")
threshold = joblib.load("../model/optimal_threshold.pkl")

# Prediction API
@app.post("/predict")
async def predict(request: Request):
    tx_data = await request.json()
    
    # Build model input
    df = pd.DataFrame([tx_data])
    prob = model.predict_proba(df)[0][1]
    is_fraud = prob > threshold
    
    return {
        "fraud": bool(is_fraud),
        "score": float(prob),
        "threshold": float(threshold)
    }
