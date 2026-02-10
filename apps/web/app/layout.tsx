import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "OnDemand Logistics Platform",
  description: "Foundations shell for dashboard and branded tracking"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
