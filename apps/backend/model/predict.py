from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
import joblib
import pandas as pd
import uvicorn 
from datetime import datetime
import json
import requests

app = FastAPI()

# Load model and optimal threshold
model = joblib.load("../model/stripe_fraud_model.pkl")
threshold = joblib.load("../model/optimal_threshold.pkl")

def prepare_stripe_data_for_model(payment_intent):
    created_time = datetime.utcfromtimestamp(payment_intent["created"])
    df = pd.DataFrame([{
        "Amount": payment_intent.get("amount", 0) / 100,
        "Transaction_Hour": created_time.hour,
        "Transaction_Weekday": created_time.weekday(),
        "Is_Weekend": int(created_time.weekday() in [5, 6]),
        "Transaction_Type": "purchase",
        "Category": "general",
        "Payment_Method": payment_intent.get("payment_method_types", ["unknown"])[0],
        "Account_Number": "unknown",
        "Counterparty": "unknown",
        "User_ID": "unknown",
        "IP_Region": 0
    }])
    
    expected_columns = [
        'Amount', 'Transaction_Hour', 'Transaction_Weekday', 'Is_Weekend',
        'Transaction_Type', 'Category', 'Payment_Method', 'Account_Number',
        'Counterparty', 'User_ID', 'IP_Region',
        'System_Latency', 'Login_Frequency', 'Failed_Attempts',
        'Currency', 'Created_Year', 'Created_Month', 'Created_Day',
        'Has_Description', 'Has_Review', 'Card_ThreeDSecure', 'Installments_Used'
    ]
    for col in expected_columns:
        if col not in df.columns:
            df[col] = 0  # or appropriate default
    df = df[expected_columns]
    
    for col in df.columns:
        if df[col].dtype == 'object':
            df[col] = df[col].astype(str).astype('category')
    
    return df

@app.api_route("/predict", methods=["GET", "POST"])
async def root(request: Request):
    if request.method == "POST":
        payload = await request.json()
        print("📦 Received Payload:", payload)

        # Save full payload for debugging
        with open("last_payload.json", "w") as f:
            json.dump(payload, f, indent=4)

        print("📤 Generating fraud prediction response...")
        # Extract and evaluate payment intent if present
        if "data" in payload and "object" in payload["data"]:
            payment_intent = payload["data"]["object"]
            df = prepare_stripe_data_for_model(payment_intent)
            prob = model.predict_proba(df)[0][1]
            is_fraud = prob > threshold

            result = {
                "fraud": bool(is_fraud),
                "score": float(prob),
                "threshold": float(threshold),
                "amount": float(payment_intent.get("amount", 0) / 100),
                "transactionID": str(payment_intent.get("id", "unknown")),
                "date": datetime.utcfromtimestamp(payment_intent.get("created", 0)).isoformat()
            }

            try:
                with open("../relay/fraud_audit_log.json", "r") as f:
                    existing_logs = json.load(f)
            except (FileNotFoundError, json.JSONDecodeError):
                existing_logs = []

            existing_logs.append(result)

            with open("../relay/fraud_audit_log.json", "w") as f:
                json.dump(existing_logs, f, indent=2)

            with open("last_prediction.json", "w") as out:
                json.dump(result, out, indent=4)

            print("✅ Saved Prediction Result:", result)
            
            if result and all(k in result for k in ("transactionID", "amount", "fraud")):
                try:
                    response = requests.post("http://localhost:5050/gun-publish", json=result)
                    print(f"📡 Sent to /gun-publish | Status: {response.status_code}")
                    print("📩 Response:", response.text)
                except Exception as e:
                    print("❌ Failed to publish to Node.js /gun-publish:", e)

            return result

        return {
            "fraud": False,
            "score": 0.0,
            "threshold": float(threshold)
        }
    
    return {"message": "Stripe fraud detection API is running."}


# Run app programmatically
if __name__ == "__main__":
    uvicorn.run("predict:app", host="127.0.0.1", port=9000, reload=True)
