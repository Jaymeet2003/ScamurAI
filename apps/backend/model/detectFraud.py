import dask.dataframe as dd
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.metrics import classification_report, accuracy_score, precision_score, recall_score, f1_score
from xgboost import XGBClassifier
import joblib

# Load dataset using Dask
df = dd.read_csv('datasets/paysim.csv')

# Select relevant columns
df = df[['type', 'amount', 'oldbalanceOrg', 'newbalanceOrig', 'oldbalanceDest', 'newbalanceDest', 'isFraud']]
df_pd = df.compute()

# Feature Engineering
df_pd["delta_balance_org"] = df_pd["oldbalanceOrg"] - df_pd["newbalanceOrig"]
df_pd["delta_balance_dest"] = df_pd["newbalanceDest"] - df_pd["oldbalanceDest"]
df_pd["balance_ratio"] = df_pd["amount"] / (df_pd["oldbalanceOrg"] + 1)
df_pd["same_sender_receiver"] = (df_pd["oldbalanceOrg"] == df_pd["oldbalanceDest"]).astype(int)

# Features and labels
X = df_pd.drop('isFraud', axis=1)
y = df_pd['isFraud']

# Preprocessing
cat_cols = ['type']
num_cols = ['amount', 'oldbalanceOrg', 'newbalanceOrig', 'oldbalanceDest', 'newbalanceDest',
            'delta_balance_org', 'delta_balance_dest', 'balance_ratio', 'same_sender_receiver']

preprocessor = ColumnTransformer(transformers=[
    ('cat', OneHotEncoder(handle_unknown='ignore'), cat_cols),
    ('num', 'passthrough', num_cols)
])

# Model pipeline
model_pipeline = Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('classifier', XGBClassifier(
        n_estimators=300,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        scale_pos_weight=10,
        tree_method="hist",
        eval_metric="aucpr"
    ))
])

# Split data
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)

# Train
model_pipeline.fit(X_train, y_train)

# Evaluate
y_pred = model_pipeline.predict(X_test)
y_proba = model_pipeline.predict_proba(X_test)[:, 1]
print(classification_report(y_test, y_pred))

# # Find best threshold
# precision, recall, thresholds = precision_recall_curve(y_test, y_proba)
# f1_scores = 2 * (precision * recall) / (precision + recall + 1e-9)
# best_threshold = thresholds[np.argmax(f1_scores)]

# print("Best threshold:", best_threshold)
# print("Best F1 score:", f1_scores[np.argmax(f1_scores)])

# Save model and threshold
joblib.dump(model_pipeline, "datasets/stripe_fraud_model.pkl")
# joblib.dump(best_threshold, "datasets/optimal_threshold.pkl")

# Predictions
y_pred = model_pipeline.predict(X_test)

# Scores
accuracy = accuracy_score(y_test, y_pred)
precision = precision_score(y_test, y_pred, zero_division=0)
recall = recall_score(y_test, y_pred, zero_division=0)
f1 = f1_score(y_test, y_pred, zero_division=0)

print("📊 Model Performance:")
print(f"Accuracy : {accuracy:.4f}")
print(f"Precision: {precision:.4f}")
print(f"Recall   : {recall:.4f}")
print(f"F1 Score : {f1:.4f}")

