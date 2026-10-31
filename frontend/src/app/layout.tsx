import type { Metadata } from "next";
import "../index.css";
import "@xyflow/react/dist/style.css";

export const metadata: Metadata = {
  title: "MIRAGE | Deception-Driven SOC",
  description: "Live defensive deception monitoring and incident response dashboard."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
