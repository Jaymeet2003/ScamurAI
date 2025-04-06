// import React from 'react';
// import './App.css';
// import Landing from './pages/landing';
// import Dashboard from './pages/dashboard';

// function App() {
//   return (
//     <Landing />
//   );
// }

// export default App;

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Landing from './pages/landing';
import Dashboard from './pages/dashboard';
import PrivateRoute from './components/privateroute';
import './App.css';
function App() {
  return (
    
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        
      </Routes>
    
  );
}

export default App;
