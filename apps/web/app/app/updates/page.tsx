import { BusinessUpdatesShell } from "../../_components/updates-shell";
import { getRelevantProductUpdates } from "../../_lib/product-updates";

export const dynamic = "force-dynamic";

export default function AppUpdatesPage() {
  return <BusinessUpdatesShell updates={getRelevantProductUpdates({ viewer: "business" })} />;
}
