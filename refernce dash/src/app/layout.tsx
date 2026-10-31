import "@xyflow/react/dist/style.css";
import "./globals.css";

export const metadata = {
  title: "AgentWarden | Autonomous Agent Security",
  description: "Next-gen runtime guardrails and identity security for autonomous agent fleets."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
