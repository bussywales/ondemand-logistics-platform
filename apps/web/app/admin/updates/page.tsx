import { AdminUpdatesShell } from "../../_components/updates-shell";
import { getRelevantProductUpdates } from "../../_lib/product-updates";

export const dynamic = "force-dynamic";

export default function AdminUpdatesPage() {
  return <AdminUpdatesShell updates={getRelevantProductUpdates({ viewer: "platform_admin" })} />;
}
