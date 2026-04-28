import { CustomerOrderingShell } from "../../_components/customer-ordering-shell";

export default async function RestaurantOrderingPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  return <CustomerOrderingShell slug={params.slug} />;
}
