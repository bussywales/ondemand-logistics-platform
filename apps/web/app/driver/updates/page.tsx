import { DriverUpdatesShell } from "../../_components/updates-shell";
import { getRelevantProductUpdates } from "../../_lib/product-updates";

export const dynamic = "force-dynamic";

export default function DriverUpdatesPage() {
  return <DriverUpdatesShell updates={getRelevantProductUpdates({ viewer: "driver" })} />;
}
