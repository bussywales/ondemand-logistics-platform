import type { Metadata } from "next";
import React from "react";
import { ChipparLanding } from "./_components/chippar-landing";

export const metadata: Metadata = {
  title: "Chippar | Keep local commerce moving",
  description:
    "One shared view of orders, delivery progress and the next action your team needs to take.",
};

export default function HomePage() {
  return <ChipparLanding />;
}
