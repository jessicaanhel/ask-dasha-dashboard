import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { DashboardLayout } from './components/Layout/DashboardLayout';
import Mortgage from './pages/Mortgage';
import Dasha from './pages/Dasha';

function App() {
  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        <Route path="/" element={<Navigate to="/mortgage" replace />} />
        <Route path="/mortgage" element={<Mortgage />} />
        <Route path="/dasha" element={<Dasha />} />
        <Route path="*" element={<Navigate to="/mortgage" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
