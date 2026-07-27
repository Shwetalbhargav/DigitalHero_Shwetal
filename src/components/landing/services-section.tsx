const services = [
  {
    title: "Product strategy",
    description:
      "Research, positioning, and a practical roadmap aligned around the right opportunity.",
    items: ["Discovery workshops", "Experience strategy", "Product roadmaps"],
  },
  {
    title: "UX & UI design",
    description:
      "Useful, distinctive interfaces that feel intuitive on every screen.",
    items: ["User journeys", "Interface design", "Design systems"],
  },
  {
    title: "Web development",
    description:
      "Fast, accessible, production-ready websites built for real business goals.",
    items: ["Next.js builds", "CMS integration", "Performance"],
  },
];

export function ServicesSection() {
  return (
    <section
      className="section services"
      id="services"
      aria-labelledby="services-title"
    >
      <div className="container">
        <div className="section-heading section-heading--light">
          <div>
            <p className="eyebrow">What we do</p>
            <h2 id="services-title">Small team. Full capability.</h2>
          </div>
          <p>
            Senior thinking and hands-on craft, without layers of account
            management.
          </p>
        </div>
        <div className="services-grid">
          {services.map((service, index) => (
            <article key={service.title} className="service-card">
              <span className="service-card__number">0{index + 1}</span>
              <h3>{service.title}</h3>
              <p>{service.description}</p>
              <ul>
                {service.items.map((item) => (
                  <li key={item}>
                    <span aria-hidden="true">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
