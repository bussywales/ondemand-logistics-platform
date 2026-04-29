import type { Metadata } from "next";
import { HelpIndex } from "../_components/help";

export const metadata: Metadata = {
  title: "Help | ShipWright",
  description: "ShipWright help for onboarding, orders, deliveries, drivers, payments, and staging troubleshooting."
};

export default function HelpPage() {
  return <HelpIndex />;
}
