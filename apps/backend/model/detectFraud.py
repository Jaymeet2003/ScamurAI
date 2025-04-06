import dask.dataframe as dd
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, RandomizedSearchCV
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.metrics import classification_report, accuracy_score, precision_score, recall_score, f1_score, precision_recall_curve
from xgboost import XGBClassifier
import joblib
from imblearn.over_sampling import RandomOverSampler

# Load dataset using Dask
df = dd.read_csv('datasets/synthetic_transactions.csv')

# Drop unnecessary columns if they exist
columns_to_drop = ['Transaction_ID', 'Currency']
df = df.drop(columns=[col for col in columns_to_drop if col in df.columns], errors='ignore')

# Compute to convert to pandas DataFrame
df_pd = df.compute()

# Extract time-based features from Date
df_pd['Date'] = pd.to_datetime(df_pd['Date'], errors='coerce')
df_pd['Transaction_Hour'] = df_pd['Date'].dt.hour
df_pd['Transaction_Weekday'] = df_pd['Date'].dt.weekday
df_pd['Is_Weekend'] = df_pd['Transaction_Weekday'].isin([5, 6]).astype(int)

# Drop unused or excluded columns
df_pd = df_pd.drop(columns=['Date', 'Risk_Type', 'Incident_Severity', 'Error_Code'], errors='ignore')

# Target and features
y = df_pd['Risk_Incident']
X = df_pd.drop(columns=['Risk_Incident'])

# Frequency encode high-cardinality columns
for col in ['Account_Number', 'Counterparty', 'User_ID', 'IP_Region']:
    if col in X.columns:
        freq = X[col].value_counts().to_dict()
        X[col] = X[col].map(freq)

# Define categorical and numerical columns
cat_cols = ['Transaction_Type', 'Category', 'Payment_Method']
num_cols = [col for col in X.columns if col not in cat_cols]

# Fill missing values in categorical columns
for col in cat_cols:
    if col in X.columns:
        X[col] = X[col].fillna("missing")

# Fill missing values in numerical columns
for col in num_cols:
    if col in X.columns:
        X[col] = X[col].fillna(X[col].median())

# Preprocessor
preprocessor = ColumnTransformer(transformers=[
    ('cat', OneHotEncoder(handle_unknown='ignore'), cat_cols),
    ('num', StandardScaler(), num_cols)
])

# Encode features
X_encoded = preprocessor.fit_transform(X)

# Balance the dataset using RandomOverSampler
ros = RandomOverSampler(random_state=42)
X_resampled, y_resampled = ros.fit_resample(X_encoded, y)

# Split data
X_train, X_test, y_train, y_test = train_test_split(X_resampled, y_resampled, stratify=y_resampled, test_size=0.2, random_state=42)

# Hyperparameter tuning
param_dist = {
    'n_estimators': [100, 200, 300],
    'max_depth': [4, 6, 8],
    'learning_rate': [0.01, 0.05, 0.1],
    'subsample': [0.6, 0.8, 1.0],
    'colsample_bytree': [0.6, 0.8, 1.0]
}

clf = RandomizedSearchCV(
    XGBClassifier(
        scale_pos_weight=1,
        tree_method="hist",
        eval_metric="aucpr",
        use_label_encoder=False,
        random_state=42
    ),
    param_distributions=param_dist,
    n_iter=10,
    scoring='f1',
    cv=3,
    verbose=1,
    n_jobs=-1
)

# Train
clf.fit(X_train, y_train)

# Predict
y_pred = clf.predict(X_test)
y_proba = clf.predict_proba(X_test)[:, 1]

# Evaluate
precision, recall, thresholds = precision_recall_curve(y_test, y_proba)
f1_scores = 2 * (precision * recall) / (precision + recall + 1e-9)
best_threshold = thresholds[np.argmax(f1_scores)]

# Save model and threshold
joblib.dump(clf.best_estimator_, "stripe_fraud_model.pkl")
joblib.dump(best_threshold, "optimal_threshold.pkl")

# Final scores
print("📊 XGBoost Model Performance:")
print(f"Accuracy : {accuracy_score(y_test, y_pred):.4f}")
print(f"Precision: {precision_score(y_test, y_pred, zero_division=0):.4f}")
print(f"Recall   : {recall_score(y_test, y_pred, zero_division=0):.4f}")
print(f"F1 Score : {f1_score(y_test, y_pred, zero_division=0):.4f}")

from sklearn.metrics import confusion_matrix
import seaborn as sns
import matplotlib.pyplot as plt

# Generate and display the confusion matrix
cm = confusion_matrix(y_test, y_pred)
print("\n📊 Confusion Matrix:")
print(cm)

# Optional: Plot the confusion matrix
plt.figure(figsize=(5, 4))
sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
            xticklabels=["Not Fraud", "Fraud"],
            yticklabels=["Not Fraud", "Fraud"])
plt.xlabel("Predicted")
plt.ylabel("Actual")
plt.title("Confusion Matrix")
plt.tight_layout()
plt.show()

import plotly.graph_objects as go

# Plot precision-recall curve
fig = go.Figure()
fig.add_trace(go.Scatter(x=recall, y=precision, mode='lines', name='Precision-Recall'))
fig.update_layout(
    title="📈 Precision-Recall Curve",
    xaxis_title="Recall",
    yaxis_title="Precision",
    template="plotly_white",
    width=700,
    height=500
)
fig.show()

# Plot F1 score trade-off across thresholds
fig_f1 = go.Figure()
fig_f1.add_trace(go.Scatter(x=thresholds, y=f1_scores[:-1], mode='lines+markers', name='F1 Score'))
fig_f1.update_layout(
    title="⚖️ F1 Score Across Thresholds",
    xaxis_title="Threshold",
    yaxis_title="F1 Score",
    template="plotly_white",
    width=700,
    height=500
)
fig_f1.show()
