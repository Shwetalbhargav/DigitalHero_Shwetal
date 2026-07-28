"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import type { AuthError, AuthSuccess } from "@/modules/auth/auth.api";

import styles from "./login.module.css";

type AlertState = "expired" | "invalid" | "rate_limited" | "error" | null;

interface LoginFormProps {
  returnTo: string;
  sessionExpired: boolean;
}

const alertContent: Record<
  Exclude<AlertState, null>,
  { title: string; message: string }
> = {
  expired: {
    title: "Your session expired",
    message: "Sign in again to continue to the admin portal.",
  },
  invalid: {
    title: "We couldn't sign you in",
    message: "Check your email and password, then try again.",
  },
  rate_limited: {
    title: "Too many sign-in attempts",
    message: "Please wait a few minutes before trying again.",
  },
  error: {
    title: "Sign in is temporarily unavailable",
    message: "Please try again. If the problem continues, return later.",
  },
};

export function LoginForm({
  returnTo,
  sessionExpired,
}: LoginFormProps): React.JSX.Element {
  const router = useRouter();
  const submittingRef = useRef(false);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState<AlertState>(
    sessionExpired ? "expired" : null,
  );

  useEffect(() => {
    if (alert && alert !== "expired") passwordRef.current?.focus();
  }, [alert]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (submittingRef.current) return;

    submittingRef.current = true;
    setSubmitting(true);
    setAlert(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password, remember }),
      });
      const payload = (await response.json()) as AuthSuccess | AuthError;

      if (response.ok && payload.ok) {
        router.replace(returnTo);
        router.refresh();
        return;
      }

      setPassword("");
      if (!payload.ok && payload.error.code === "RATE_LIMITED") {
        setAlert("rate_limited");
      } else if (
        !payload.ok &&
        payload.error.code === "INVALID_CREDENTIALS"
      ) {
        setAlert("invalid");
      } else {
        setAlert("error");
      }
    } catch {
      setPassword("");
      setAlert("error");
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  const currentAlert = alert ? alertContent[alert] : null;

  return (
    <form
      className={styles.form}
      onSubmit={handleSubmit}
      aria-busy={submitting}
      noValidate={false}
    >
      {currentAlert ? (
        <div
          className={`${styles.alert} ${
            alert === "expired" ? styles.alertExpired : styles.alertError
          }`}
          role="alert"
        >
          <span className={styles.alertIcon} aria-hidden="true">
            {alert === "expired" ? "i" : "!"}
          </span>
          <div>
            <strong>{currentAlert.title}</strong>
            <p>{currentAlert.message}</p>
          </div>
        </div>
      ) : null}

      <div className={styles.field}>
        <label htmlFor="email">Email address</label>
        <input
          id="email"
          name="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="username"
          inputMode="email"
          placeholder="admin@example.com"
          disabled={submitting}
          required
          autoFocus
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="password">Password</label>
        <div className={styles.passwordField}>
          <input
            ref={passwordRef}
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            disabled={submitting}
            required
          />
          <button
            type="button"
            className={styles.reveal}
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            disabled={submitting}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M2.5 12s3.4-5 9.5-5 9.5 5 9.5 5-3.4 5-9.5 5-9.5-5-9.5-5Z" />
              <circle cx="12" cy="12" r="2.5" />
              {showPassword ? null : <path d="m4 4 16 16" />}
            </svg>
          </button>
        </div>
      </div>

      <label className={styles.remember}>
        <input
          type="checkbox"
          checked={remember}
          onChange={(event) => setRemember(event.target.checked)}
          disabled={submitting}
        />
        <span>Keep me signed in on this device</span>
      </label>

      <button className={styles.submit} type="submit" disabled={submitting}>
        {submitting ? (
          <>
            <span className={styles.spinner} aria-hidden="true" />
            Signing in…
          </>
        ) : (
          <>
            Sign in
            <span aria-hidden="true">→</span>
          </>
        )}
      </button>

      <p className={styles.securityNote}>
        <span aria-hidden="true">◆</span>
        Secure access for authorized administrators
      </p>
    </form>
  );
}
