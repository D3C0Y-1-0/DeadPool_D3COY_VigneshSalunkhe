import type { Metadata } from "next";
import "../index.css";
import "@xyflow/react/dist/style.css";

export const metadata: Metadata = {
  title: "TrapNet | Deception-Driven SOC Platform",
  description: "TrapNet — Real-time deception-driven threat detection, MITRE ATT&CK correlation, and human-approved SOAR response."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
