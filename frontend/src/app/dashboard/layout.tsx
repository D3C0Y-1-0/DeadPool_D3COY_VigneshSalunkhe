"use client";

import type { ReactNode } from "react";
import Shell from "../../components/Shell";
import { LiveProvider, useLive } from "../../useLive";

function DashboardFrame({ children }: { children: ReactNode }) {
  const { connected, error, refreshAll } = useLive();
  return (
    <Shell connected={connected} onRefresh={refreshAll} error={error}>
      {children}
    </Shell>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <LiveProvider>
      <DashboardFrame>{children}</DashboardFrame>
    </LiveProvider>
  );
}
