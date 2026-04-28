import "./globals.css";
import "./design-system.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { BusinessAuthProvider } from "./_components/business-auth-provider";

export const metadata: Metadata = {
  title: "ShipWright | On-demand delivery for food and local goods",
  description:
    "Dispatch deliveries, connect with verified drivers, track jobs live, and complete every drop with proof of delivery."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <BusinessAuthProvider>{children}</BusinessAuthProvider>
      </body>
    </html>
  );
}
