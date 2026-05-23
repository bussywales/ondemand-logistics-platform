import { FleetDriverDetailShell } from "../../../_components/fleet-shell";

export default async function FleetDriverDetailPage(props: { params: Promise<{ driverId: string }> }) {
  const params = await props.params;
  return <FleetDriverDetailShell driverId={params.driverId} />;
}
