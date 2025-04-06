import React from 'react';


const Toast = ({ transaction, onClose }) => {
  return (
    <div className="toast">
      <div className="toast-header">
        <strong>Transaction Details</strong>
      </div>
      <div className="toast-body">
        <p><strong>Transaction ID:</strong> {transaction.id}</p>
        <p><strong>Amount:</strong> {transaction.amount}</p>
        <p><strong>Status:</strong> {transaction.status}</p>
        <p><strong>Risk Score:</strong> {transaction.riskScore}</p>
        <p><strong>Timestamp:</strong> {transaction.timestamp}</p>
      </div>
      <button className="toast-close-btn" onClick={onClose}>Close</button>
    </div>
  );
};

export default Toast;
