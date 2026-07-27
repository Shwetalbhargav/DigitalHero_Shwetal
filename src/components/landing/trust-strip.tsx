const partners = ["Northstar", "Luma", "Arc & Co.", "Morrow", "Plainview"];

export function TrustStrip() {
  return (
    <section className="trust-strip" aria-label="Teams who trust LeadDesk">
      <div className="container trust-strip__inner">
        <p>Trusted by ambitious teams</p>
        <div className="trust-strip__logos">
          {partners.map((partner) => (
            <span key={partner}>{partner}</span>
          ))}
        </div>
      </div>
    </section>
  );
}
