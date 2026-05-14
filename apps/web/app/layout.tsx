import "./globals.css";
import "./design-system.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { BusinessAuthProvider } from "./_components/business-auth-provider";

export const metadata: Metadata = {
  title: "ShipWright | AI-assisted logistics command centre",
  description:
    "Premium logistics infrastructure for restaurants, retailers, operators, couriers, and platform teams running local delivery."
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
