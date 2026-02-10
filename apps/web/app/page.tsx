export default function HomePage() {
  return (
    <main className="shell">
      <section>
        <p className="eyebrow">Foundations</p>
        <h1>On-Demand Logistics Platform</h1>
        <p>
          MVP scope is locked to Food (business-owned) and Retail with a single
          pickup-to-drop flow. This shell intentionally excludes dispatch, pricing,
          and payment features.
        </p>
      </section>
      <ul>
        <li>API: NestJS + Supabase JWT/RBAC + Outbox</li>
        <li>Worker: SKIP LOCKED poller with retries</li>
        <li>Web: Dashboard/tracking shell only</li>
      </ul>
    </main>
  );
}
