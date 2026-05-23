import { Suspense } from "react";
import { AdminDispatchAuditShell } from "../../_components/admin-dispatch-audit-shell";

export default function AdminDispatchAuditPage() {
  return (
    <Suspense
      fallback={
        <main className="app-shell loading-shell">
          <section className="sw-empty-state">
            <strong className="sw-empty-title">Loading dispatch audit</strong>
          </section>
        </main>
      }
    >
      <AdminDispatchAuditShell />
    </Suspense>
  );
}
