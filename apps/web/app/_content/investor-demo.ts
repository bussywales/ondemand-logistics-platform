export type InvestorDemoStep = {
  title: string;
  proof: string;
  href: string;
  screen: string;
  audienceValue: string;
};

export const investorDemoSteps: InvestorDemoStep[] = [
  {
    title: "Merchant setup",
    screen: "/app/restaurant",
    href: "/app/restaurant",
    proof: "A real restaurant and menu foundation exists for the pilot merchant.",
    audienceValue: "Shows that the pilot merchant can be activated and made orderable without admin theatre."
  },
  {
    title: "Public restaurant order",
    screen: "/restaurants/pilot-kitchen-1777370757",
    href: "/restaurants/pilot-kitchen-1777370757",
    proof: "Customers can browse a real active menu, build a cart, and enter checkout details.",
    audienceValue: "Proves the Stage 1 spine starts from a customer-facing route, not an internal-only backend."
  },
  {
    title: "Payment authorised",
    screen: "/app/orders",
    href: "/app/orders",
    proof: "Paid checkout creates a customer order, payment, and linked delivery job.",
    audienceValue: "Shows order, payment, and fulfilment entering operations as one connected flow."
  },
  {
    title: "Dispatch and Needs Review",
    screen: "/app",
    href: "/app",
    proof: "Blocked or delayed jobs surface in the operator review queue with diagnosis and next action.",
    audienceValue: "Demonstrates that operations are guided by decision surfaces, not raw logs."
  },
  {
    title: "Driver assignment and execution",
    screen: "/driver",
    href: "/driver",
    proof: "A staged driver can go online, receive offers, accept, and progress delivery steps.",
    audienceValue: "Shows the execution layer is connected to the paid order loop."
  },
  {
    title: "POD and delivery completion",
    screen: "/driver",
    href: "/driver",
    proof: "Proof of delivery is recorded before final completion and downstream state updates.",
    audienceValue: "Shows the delivery loop closes with evidence, not just status toggles."
  },
  {
    title: "Payment captured and order fulfilled",
    screen: "/app/orders",
    href: "/app/orders",
    proof: "Delivered jobs trigger payment capture and the customer order moves to FULFILLED.",
    audienceValue: "Proves commercial completion, not just dispatch success."
  },
  {
    title: "Notifications and admin oversight",
    screen: "/app/notifications and /admin",
    href: "/admin",
    proof: "Operators and platform admins can inspect system signals, outbox pressure, and intervention queues.",
    audienceValue: "Shows the product has control-plane depth for pilot support and investor review."
  }
];

export const investorDemoControlLinks = [
  {
    title: "Public restaurant route",
    href: "/restaurants/pilot-kitchen-1777370757",
    proof: "Customer browse, cart, and checkout path."
  },
  {
    title: "Orders queue",
    href: "/app/orders",
    proof: "Customer order -> payment -> delivery linkage."
  },
  {
    title: "Jobs console",
    href: "/app/jobs",
    proof: "Dispatch, review queue, and job decision surfaces."
  },
  {
    title: "Driver execution",
    href: "/driver",
    proof: "Offer accept, pickup, POD, and delivery completion."
  },
  {
    title: "Platform admin",
    href: "/admin",
    proof: "Cross-org intervention queue, health posture, and outbox signals."
  },
  {
    title: "Notifications",
    href: "/app/notifications",
    proof: "In-app operational notifications and event mapping."
  }
] as const;

export const investorDemoWarnings = [
  "Business, driver, and admin views require seeded staging credentials. The public restaurant route does not.",
  "The proof summary is the latest documented staging result, not a live monitoring feed.",
  "If Stripe, email, or domain configuration is unavailable, use the documented fallback sequence instead of improvising on stage."
];
