import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import Shell from "./components/Shell";
import CommandCenter from "./dashboard-pages/CommandCenter";
import IncidentPage from "./dashboard-pages/IncidentPage";
import Attackers from "./dashboard-pages/Attackers";
import AttackMatrix from "./dashboard-pages/AttackMatrix";
import { LiveProvider, useLive } from "./useLive";

function IncidentRoute() {
  const { id } = useParams<{ id: string }>();
  return <IncidentPage id={id || ""} />;
}

function AppRoutes() {
  const { connected, refreshAll } = useLive();

  return (
    <BrowserRouter>
      <Shell connected={connected} onRefresh={refreshAll}>
        <Routes>
          <Route path="/" element={<CommandCenter />} />
          <Route path="/incident/:id" element={<IncidentRoute />} />
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
