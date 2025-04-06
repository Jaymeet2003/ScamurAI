import React, { useState } from "react";
import './Dashboard.css';
import Toast from '../components/toast'; // Import the Toast component
const handleLogout = () => {
  window.location.href = 'http://localhost:5050/logout';
};
const Navbar = () => {
  return (
    <div className="navbar">
      <div className="navbar-logo">ScamurAI</div>
      <div className="navbar-links">
        <a href="/" className="navbar-home">Settings</a>
      </div>
      <div className="navbar-links">
        <a href="/" className="navbar-home">Peer Network</a>
      </div>
      <div className="navbar-logout">
        <button onClick = {handleLogout} className="navbar-logout-btn">Logout</button>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const [showToast, setShowToast] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  const transactions = [
    { id: 'Trc0000223', amount: '$1000', riskScore: 'High', reetsCheck: 'Passed' },
    { id: 'T:1000233', amount: '$2200', riskScore: 'Low', reetsCheck: 'Failed' },
    { id: 'Trs0000224', amount: '$1800', riskScore: 'Medium', reetsCheck: 'Passed' },
  ];

  const handleTransactionClick = (transaction) => {
    setSelectedTransaction(transaction);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false); // Hide toast after 3 seconds
    }, 3000); // Toast duration: 3 seconds
  };
 
  return (
    <div className="dashboard-container">
      <Navbar />

      <div className="dashboard-header">
        <h1>Fraud Detection Dashboard</h1>
        <p>Real-time monitoring and analysis of suspicious activities</p>
      </div>

      <div className="dashboard-main">
        <div className="graph-area">
          <div className="graph-placeholder">[Graph Placeholder]</div>
        </div>

        <div className="transaction-table">
          <table>
            <thead>
              <tr>
                <th>Transaction ID</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Risk Score</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction) => (
                <tr
                  key={transaction.id}
                  onClick={() => handleTransactionClick(transaction)}
                >
                  <td>{transaction.id}</td>
                  <td>{transaction.amount}</td>
                  <td className="flagged">{transaction.riskScore}</td>
                  <td>{transaction.riskScore}</td>
                  <td>12:30 PM</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="fraud-alerts">
          <div className="fraud-alert level1">
            <div className="fraud-alert-status">Fraud Alert - Level 1</div>
            <div className="fraud-alert-amount">$0/220</div>
          </div>
          <div className="fraud-alert level2">
            <div className="fraud-alert-status">Fraud Alert - Level 2</div>
            <div className="fraud-alert-amount">$0/220</div>
          </div>
          <div className="fraud-alert level3">
            <div className="fraud-alert-status">Fraud Alert - Level 3</div>
            <div className="fraud-alert-amount">$0/220</div>
          </div>
          <div className="fraud-alert level4">
            <div className="fraud-alert-status">Fraud Alert - Level 4</div>
            <div className="fraud-alert-amount">$0/220</div>
          </div>
        </div>
      </div>

      {/* Show the Toast if selectedTransaction exists */}
      {showToast && selectedTransaction && (
        <Toast transaction={selectedTransaction} onClose={() => setShowToast(false)} />
      )}
    </div>
  );
};

export default Dashboard;
