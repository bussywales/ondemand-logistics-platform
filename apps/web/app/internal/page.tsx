export default function InternalPage() {
  return (
    <main className="internal-shell">
      <section className="internal-card">
        <p className="eyebrow">Internal Foundations</p>
        <h1>On-Demand Logistics Platform</h1>
        <p>
          MVP scope is locked to Food (business-owned) and Retail with a single
          pickup-to-drop flow. This internal page keeps the original foundations
          shell context available for team reference.
        </p>
        <ul>
          <li>API foundations with auth, RBAC, outbox, and operational write guarantees</li>
          <li>Worker-driven dispatch and lifecycle processing</li>
          <li>Web shell expanded into a product-facing landing page on the public homepage</li>
        </ul>
      </section>
    </main>
  );
}
