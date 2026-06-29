import { Routes, Route, Navigate } from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";

import Dashboard from "./pages/Dashboard";
import Cluster from "./pages/Cluster";
import Incidents from "./pages/Incidents";
import AIInsights from "./pages/AIInsights";

function App() {
  return (
    <ProtectedRoute>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/cluster" element={<Cluster />} />
          <Route path="/incidents" element={<Incidents />} />
          <Route path="/insights" element={<AIInsights />} />
        </Route>
      </Routes>
    </ProtectedRoute>
  );
}

export default App;