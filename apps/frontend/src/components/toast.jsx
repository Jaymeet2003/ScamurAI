// Toast.jsx
import React from "react";

const Toast = ({ transaction, onClose }) => {
  return (
    <div className="toast">
      <div className="toast-header">
        <strong>Transaction ID:</strong> {transaction.id}
      </div>
      <div className="toast-body">
        <div><strong>Amount:</strong> {transaction.amount}</div>
        <div><strong>Risk Score:</strong> {transaction.riskScore}</div>
        <div><strong>Reets-Cross-Check:</strong> {transaction.reetsCheck}</div>
      </div>
      <button onClick={onClose} className="toast-close-btn">Close</button>
    </div>
  );
};

export default Toast;
