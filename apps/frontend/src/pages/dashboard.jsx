import React, { useState, useEffect } from "react";
import { Line } from "react-chartjs-2";
import Chart from 'chart.js/auto';
import dataJSON from '../../../backend/relay/fraud_audit_log.json';
import './Dashboard.css';
import Toast from '../components/toast';

const handleLogout = () => {
  window.location.href = 'http://localhost:5050/logout';
};

const Navbar = () => {
  return (
    <div className="navbar">
      <div className="navbar-logo">ScamurAI</div>
      <div className="navbar-links">
        <a href="/" className="navbar-home">Peer Network</a>
      </div>
     
      <div className="navbar-logout">
        <button onClick={handleLogout} className="navbar-logout-btn">Logout</button>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const [showToast, setShowToast] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  const uniqueTransactionsMap = new Map();
  dataJSON.forEach(entry => {
    if (!uniqueTransactionsMap.has(entry.transactionID)) {
      uniqueTransactionsMap.set(entry.transactionID, {
        id: entry.transactionID,
        amount: `$${entry.amount}`,
        riskScore: entry.fraud ? "High" : "Low",
        status: entry.fraud.toString(),
        timestamp: new Date(entry.date).toLocaleString()
      });
    }
  });
  const transactions = Array.from(uniqueTransactionsMap.values());

  const handleTransactionClick = (transaction) => {
    setSelectedTransaction(transaction);
    setShowToast(true);
  };

  const uniqueGraphMap = new Map();
  dataJSON.forEach(entry => {
    if (!uniqueGraphMap.has(entry.transactionID)) {
      uniqueGraphMap.set(entry.transactionID, entry);
    }
  });
  const graphData = Array.from(uniqueGraphMap.values());

  return (
    <div className="dashboard-container">
      <Navbar />

      <div className="dashboard-header">
        <h1>Fraud Detection Dashboard</h1>
        <p>Real-time monitoring and analysis of suspicious activities</p>
      </div>

      <div className="dashboard-main">
        <div className="graph-area">
          <Line
            data={{
              labels: graphData.map((entry) => new Date(entry.date).toLocaleTimeString()),
              datasets: [
                {
                  label: "Fraud Detected",
                  data: graphData.map(entry => entry.fraud ? 1 : 0),
                  borderWidth: 2,
                  fill: true,
                  backgroundColor: 'rgba(255, 99, 132, 0.2)',
                  borderColor: 'rgba(255, 99, 132, 1)'
                }
              ],
            }}
            options={{
              responsive: true,
              scales: {
                y: {
                  beginAtZero: true,
                  max: 1,
                  ticks: {
                    stepSize: 1
                  }
                }
              }
            }}
          />
        </div>

        <div className="transaction-table">
          <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
            <table>
              <thead style={{ position: 'sticky', top: 0, backgroundColor: '#fff', zIndex: 1 }}>
                <tr>
                  <th>Transaction ID</th>
                  <th>Status</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr
                    key={`${transaction.id}-${transaction.timestamp}`}
                    onClick={() => handleTransactionClick(transaction)}
                  >
                    <td>{transaction.id}</td>
                    <td>{transaction.riskScore}</td>
                    <td>{transaction.timestamp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
