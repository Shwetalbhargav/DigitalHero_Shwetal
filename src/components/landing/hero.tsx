export function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="container hero__grid">
        <div className="hero__content">
          <p className="eyebrow">
            <span aria-hidden="true" />
            Digital products, delivered clearly
          </p>
          <h1 id="hero-title">
            Your next big idea,
            <br />
            <em>built to perform.</em>
          </h1>
          <p className="hero__lede">
            From first sketch to polished launch, we design and build digital
            experiences that move your business forward.
          </p>
          <div className="hero__actions">
            <a className="button" href="#contact">
              Tell us about your project
              <span aria-hidden="true">→</span>
            </a>
            <a className="text-link" href="#process">
              See how we work
            </a>
          </div>
          <div className="hero__proof" aria-label="Client satisfaction">
            <div className="avatar-stack" aria-hidden="true">
              <span>AM</span>
              <span>SK</span>
              <span>JL</span>
            </div>
            <p>
              <strong>Trusted by growing teams</strong>
              Thoughtful work. No agency theatre.
            </p>
          </div>
        </div>

        <div className="hero-visual" aria-hidden="true">
          <div className="hero-visual__glow" />
          <div className="project-card project-card--main">
            <div className="project-card__toolbar">
              <span />
              <span />
              <span />
            </div>
            <div className="project-card__body">
              <p>Launch overview</p>
              <strong>Everything on track.</strong>
              <div className="project-card__chart">
                <i />
                <i />
                <i />
                <i />
                <i />
              </div>
              <div className="project-card__metric">
                <span>Conversion</span>
                <strong>+38%</strong>
              </div>
            </div>
          </div>
          <div className="project-card project-card--note">
            <span className="status-dot" />
            <div>
              <strong>Ready to launch</strong>
              <span>All checks complete</span>
            </div>
          </div>
          <div className="hero-visual__badge">✦</div>
        </div>
      </div>
    </section>
  );
}
