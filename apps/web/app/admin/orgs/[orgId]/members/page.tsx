import { AdminOrgMembersShell } from "../../../../_components/identity-shell";

export default async function AdminOrgMembersPage(props: { params: Promise<{ orgId: string }> }) {
  const params = await props.params;
  return <AdminOrgMembersShell orgId={params.orgId} />;
}
