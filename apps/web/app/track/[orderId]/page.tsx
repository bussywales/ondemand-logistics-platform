import { CustomerTrackingShell } from "../../_components/customer-tracking-shell";

export default async function PublicOrderTrackingPage(props: { params: Promise<{ orderId: string }> }) {
  const params = await props.params;
  return <CustomerTrackingShell orderId={params.orderId} />;
}
