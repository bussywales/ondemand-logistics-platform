import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "ShipWright | On-demand delivery for food and local goods",
  description:
    "Dispatch deliveries, connect with verified drivers, track jobs live, and complete every drop with proof of delivery."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
