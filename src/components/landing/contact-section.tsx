"use client";

import {
  type ChangeEvent,
  type FormEvent,
  useRef,
  useState,
} from "react";

import {
  LEAD_FIELD_NAMES,
  type LeadFieldErrors,
  type LeadFieldName,
  type LeadSubmissionResponse,
} from "@/modules/leads/lead.api";
import {
  createLeadSchema,
  getLeadFieldErrors,
} from "@/modules/leads/lead.validation";

const budgetOptions = [
  ["under-5k", "Under $5k"],
  ["5k-10k", "$5k – $10k"],
  ["10k-25k", "$10k – $25k"],
  ["25k-plus", "$25k+"],
] as const;

type FormValues = Record<LeadFieldName, string>;

const emptyValues: FormValues = {
  name: "",
  email: "",
  budgetRange: "",
  message: "",
};

export function ContactSection() {
  const [values, setValues] = useState<FormValues>(emptyValues);
  const [fieldErrors, setFieldErrors] = useState<LeadFieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccessful, setIsSuccessful] = useState(false);
  const [serverError, setServerError] = useState<string>();
  const [announcement, setAnnouncement] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const submittingRef = useRef(false);
  const fieldRefs = useRef<
    Partial<
      Record<LeadFieldName, HTMLInputElement | HTMLTextAreaElement | null>
    >
  >({});

  function focusFirstInvalidField(errors: LeadFieldErrors): void {
    const firstInvalidField = LEAD_FIELD_NAMES.find((field) => errors[field]);
    if (firstInvalidField) fieldRefs.current[firstInvalidField]?.focus();
  }

  function handleChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ): void {
    const field = event.target.name as LeadFieldName;
    setValues((current) => ({ ...current, [field]: event.target.value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setServerError(undefined);
  }

  function applyValidationErrors(errors: LeadFieldErrors): void {
    setFieldErrors(errors);
    setAnnouncement("Please correct the highlighted fields.");
    focusFirstInvalidField(errors);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (submittingRef.current) return;

    setServerError(undefined);
    const parsed = createLeadSchema.safeParse(values);
    if (!parsed.success) {
      applyValidationErrors(getLeadFieldErrors(parsed.error));
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    setAnnouncement("Sending your project details.");

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const payload = (await response.json()) as LeadSubmissionResponse;

      if (!payload.ok) {
        if (
          payload.error.code === "VALIDATION_ERROR" &&
          payload.error.fieldErrors
        ) {
          applyValidationErrors(payload.error.fieldErrors);
          return;
        }
        throw new Error("Lead submission failed.");
      }
      if (!response.ok) throw new Error("Lead submission failed.");

      setValues(emptyValues);
      setFieldErrors({});
      setIsSuccessful(true);
      setAnnouncement(payload.data.message);
    } catch {
      const message = "We couldn’t send your details. Please try again.";
      setServerError(message);
      setAnnouncement(message);
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  function startAnotherSubmission(): void {
    setIsSuccessful(false);
    setAnnouncement("The form is ready for another enquiry.");
  }

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

        {isSuccessful ? (
          <div
            className="contact-form contact-form--success"
            role="status"
            aria-live="polite"
          >
            <span className="success-mark" aria-hidden="true">
              ✓
            </span>
            <p className="eyebrow">Message received</p>
            <h3>Thanks for reaching out.</h3>
            <p>
              Your project details are safely with us. We’ll be in touch within
              two working days.
            </p>
            <button
              className="button button--secondary"
              type="button"
              onClick={startAnotherSubmission}
            >
              Send another enquiry
            </button>
          </div>
        ) : (
          <form
            className="contact-form"
            ref={formRef}
            onSubmit={handleSubmit}
            noValidate
            aria-busy={isSubmitting}
          >
            {serverError ? (
              <div className="form-server-error" role="alert">
                <span aria-hidden="true">!</span>
                <div>
                  <strong>Something went wrong</strong>
                  <p>{serverError}</p>
                </div>
                <button
                  type="button"
                  onClick={() => formRef.current?.requestSubmit()}
                >
                  Try again
                </button>
              </div>
            ) : null}

            <div className="field-row">
              <div className="field">
                <label htmlFor="name">Your name</label>
                <input
                  id="name"
                  name="name"
                  autoComplete="name"
                  placeholder="Jane Smith"
                  value={values.name}
                  onChange={handleChange}
                  ref={(element) => {
                    fieldRefs.current.name = element;
                  }}
                  aria-invalid={Boolean(fieldErrors.name)}
                  aria-describedby={fieldErrors.name ? "name-error" : undefined}
                />
                {fieldErrors.name ? (
                  <p className="field-error" id="name-error">
                    {fieldErrors.name}
                  </p>
                ) : null}
              </div>
              <div className="field">
                <label htmlFor="email">Work email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="jane@company.com"
                  value={values.email}
                  onChange={handleChange}
                  ref={(element) => {
                    fieldRefs.current.email = element;
                  }}
                  aria-invalid={Boolean(fieldErrors.email)}
                  aria-describedby={
                    fieldErrors.email ? "email-error" : undefined
                  }
                />
                {fieldErrors.email ? (
                  <p className="field-error" id="email-error">
                    {fieldErrors.email}
                  </p>
                ) : null}
              </div>
            </div>
            <fieldset
              className="budget-field"
              aria-invalid={Boolean(fieldErrors.budgetRange)}
              aria-describedby={
                fieldErrors.budgetRange ? "budgetRange-error" : undefined
              }
            >
              <legend>Project budget</legend>
              <div className="budget-options">
                {budgetOptions.map(([value, label], index) => (
                  <label key={value}>
                    <input
                      type="radio"
                      name="budgetRange"
                      value={value}
                      checked={values.budgetRange === value}
                      onChange={handleChange}
                      ref={
                        index === 0
                          ? (element) => {
                              fieldRefs.current.budgetRange = element;
                            }
                          : undefined
                      }
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
              {fieldErrors.budgetRange ? (
                <p className="field-error" id="budgetRange-error">
                  {fieldErrors.budgetRange}
                </p>
              ) : null}
            </fieldset>
            <div className="field">
              <label htmlFor="message">Tell us about your project</label>
              <textarea
                id="message"
                name="message"
                rows={5}
                placeholder="What are you looking to create, improve, or launch?"
                value={values.message}
                onChange={handleChange}
                ref={(element) => {
                  fieldRefs.current.message = element;
                }}
                aria-invalid={Boolean(fieldErrors.message)}
                aria-describedby={
                  fieldErrors.message ? "message-error" : undefined
                }
              />
              {fieldErrors.message ? (
                <p className="field-error" id="message-error">
                  {fieldErrors.message}
                </p>
              ) : null}
            </div>
            <button
              className="button contact-form__submit"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner" aria-hidden="true" />
                  Sending…
                </>
              ) : (
                <>
                  Send project details
                  <span aria-hidden="true">→</span>
                </>
              )}
            </button>
            <p className="form-note">
              We’ll only use your details to reply to your enquiry.
            </p>
          </form>
        )}
        <p className="sr-only" role="status" aria-live="polite">
          {announcement}
        </p>
      </div>
    </section>
  );
}
