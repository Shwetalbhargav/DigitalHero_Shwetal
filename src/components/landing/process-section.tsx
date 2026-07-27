const steps = [
  {
    number: "01",
    title: "Discover",
    description:
      "We get close to the problem, your customers, and the result that matters.",
  },
  {
    number: "02",
    title: "Design",
    description:
      "We turn insight into a focused, testable experience with every detail considered.",
  },
  {
    number: "03",
    title: "Deliver",
    description:
      "We build, refine, and launch a reliable product your team can confidently grow.",
  },
];

export function ProcessSection() {
  return (
    <section
      className="section process"
      id="process"
      aria-labelledby="process-title"
    >
      <div className="container">
        <div className="section-heading">
          <div>
            <p className="eyebrow">A simple, focused process</p>
            <h2 id="process-title">Clarity at every step.</h2>
          </div>
          <p>
            You always know what is happening, why it matters, and what comes
            next.
          </p>
        </div>
        <ol className="process-grid">
          {steps.map((step) => (
            <li key={step.number}>
              <span className="step-number">{step.number}</span>
              <div className="step-icon" aria-hidden="true">
                {step.number === "01" ? "⌁" : step.number === "02" ? "◇" : "↗"}
              </div>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
