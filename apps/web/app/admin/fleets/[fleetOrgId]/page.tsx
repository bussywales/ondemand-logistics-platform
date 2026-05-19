import { AdminFleetDriversShell } from "../../../_components/admin-fleets-shell";

export default async function AdminFleetDriversPage(props: { params: Promise<{ fleetOrgId: string }> }) {
  const { fleetOrgId } = await props.params;
  return <AdminFleetDriversShell fleetOrgId={fleetOrgId} />;
}
