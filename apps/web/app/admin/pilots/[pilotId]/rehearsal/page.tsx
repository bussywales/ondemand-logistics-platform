import { AdminPilotRehearsalShell } from "../../../../_components/admin-pilot-rehearsal-shell";

export default async function AdminPilotRehearsalPage(props: { params: Promise<{ pilotId: string }> }) {
  const params = await props.params;
  return <AdminPilotRehearsalShell pilotId={params.pilotId} />;
}
