import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Shell from "./components/Shell";
import CommandCenter from "./pages/CommandCenter";
import IncidentPage from "./pages/IncidentPage";
import Attackers from "./pages/Attackers";
import AttackMatrix from "./pages/AttackMatrix";
import { LiveProvider, useLive } from "./useLive";

function AppRoutes() {
  const { connected, refreshAll } = useLive();

  return (
    <BrowserRouter>
      <Shell connected={connected} onRefresh={refreshAll}>
        <Routes>
          <Route path="/" element={<CommandCenter />} />
          <Route path="/incident/:id" element={<IncidentPage />} />
          <Route path="/attackers" element={<Attackers />} />
          <Route path="/attack" element={<AttackMatrix />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Shell>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <LiveProvider>
      <AppRoutes />
    </LiveProvider>
  );
}
