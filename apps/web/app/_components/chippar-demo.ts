/** Self-contained illustrative sequence. Never reads or creates a real order. */
export const chipparStages = [
  {
    label: "Restaurant order",
    image: "restaurant-bag.png",
    alt: "A paper takeaway bag ready at a restaurant counter",
    status: "Order received",
    time: "10:14",
    heading: "Order received",
    detail: "Ready for dispatch review",
    action: "Review dispatch",
    description:
      "The restaurant's order is ready. The operator can review the collection details before assigning a courier.",
  },
  {
    label: "Dispatch review",
    image: "dispatch-screen.png",
    alt: "A dispatch screen showing an illustrative order awaiting a courier",
    status: "Awaiting assignment",
    time: "10:16",
    heading: "Courier needed",
    detail: "Awaiting assignment",
    action: "Review delivery",
    description:
      "A missing courier is visible before the handoff. The operator decides the next step; nothing is assigned automatically.",
  },
  {
    label: "Courier handoff",
    image: "courier-handoff.png",
    alt: "A cycle courier collecting a takeaway bag from a restaurant",
    status: "Pickup planned",
    time: "Pending",
    heading: "Handoff planned",
    detail: "Waiting for courier assignment",
    action: "Review proof",
    description:
      "The planned handoff stays pending until a courier is assigned and collection is confirmed. This tour does not perform either action.",
  },
  {
    label: "Delivery proof",
    image: "delivery-doorstep.png",
    alt: "A paper delivery bag beside a residential front door",
    status: "Delivery planned",
    time: "Pending",
    heading: "Proof to follow",
    detail: "Waiting for delivery",
    action: "Back to dispatch",
    description:
      "Delivery proof closes the loop after the handoff. No delivery is claimed here: this is a local illustration of the workflow.",
  },
] as const;

export function nextChipparStage(index: number) {
  return index >= chipparStages.length - 1 ? 1 : Math.max(0, index + 1);
}
