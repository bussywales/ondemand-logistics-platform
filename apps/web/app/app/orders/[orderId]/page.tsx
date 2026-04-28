import { OrdersShell } from "../../../_components/orders-shell";

export default async function OrderDetailPage(props: { params: Promise<{ orderId: string }> }) {
  const params = await props.params;
  return <OrdersShell orderId={params.orderId} />;
}
