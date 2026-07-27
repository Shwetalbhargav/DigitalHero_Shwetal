const budgetOptions = [
  ["under-5k", "Under $5k"],
  ["5k-10k", "$5k – $10k"],
  ["10k-25k", "$10k – $25k"],
  ["25k-plus", "$25k+"],
] as const;

export function ContactSection() {
  return (
    <section
      className="section contact"
      id="contact"
      aria-labelledby="contact-title"
    >
      <div className="container contact__grid">
        <div className="contact__intro">
          <p className="eyebrow">Start a conversation</p>
          <h2 id="contact-title">
            Have a project in mind?
            <br />
            <em>Let’s make it real.</em>
          </h2>
          <p>
            Share a few details and we’ll come back with useful next steps
            within two working days.
          </p>
          <div className="contact__promise">
            <span aria-hidden="true">✓</span>
            <p>
              <strong>No hard sell.</strong>
              Just a practical conversation about your idea.
            </p>
          </div>
        </div>

        <form className="contact-form">
          <div className="field-row">
            <div className="field">
              <label htmlFor="name">Your name</label>
              <input
                id="name"
                name="name"
                autoComplete="name"
                placeholder="Jane Smith"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="email">Work email</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="jane@company.com"
                required
              />
            </div>
          </div>
          <fieldset className="budget-field">
            <legend>Project budget</legend>
            <div className="budget-options">
              {budgetOptions.map(([value, label]) => (
                <label key={value}>
                  <input
                    type="radio"
                    name="budgetRange"
                    value={value}
                    required
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="field">
            <label htmlFor="message">Tell us about your project</label>
            <textarea
              id="message"
              name="message"
              rows={5}
              placeholder="What are you looking to create, improve, or launch?"
              required
            />
          </div>
          <button className="button contact-form__submit" type="submit">
            Send project details
            <span aria-hidden="true">→</span>
          </button>
          <p className="form-note">
            We’ll only use your details to reply to your enquiry.
          </p>
        </form>
      </div>
    </section>
  );
}
