import type { JSX } from "react";
import { useEffect, useId, useRef, useState } from "react";

import AuthLayout from "./AuthLayout";

interface FormErrors {
  email?: string;
  password?: string;
}

const INITIAL_FORM = {
  email: "",
  password: "",
};

export default function LoginForm(): JSX.Element {
  const emailId = useId();
  const passwordId = useId();
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<"info" | "error">("info");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    formRef.current?.setAttribute("data-hydrated", "true");
  }, []);

  const handleChange = (field: keyof typeof INITIAL_FORM) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    if (errors[field]) {
      setErrors((current) => ({ ...current, [field]: undefined }));
    }
  };

  const validate = (): FormErrors => {
    const nextErrors: FormErrors = {};

    if (!form.email.trim()) {
      nextErrors.email = "Podaj adres e-mail.";
    } else if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      nextErrors.email = "Adres e-mail ma niepoprawny format.";
    }

    if (!form.password.trim()) {
      nextErrors.password = "Hasło nie może być puste.";
    }

    return nextErrors;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setStatusType("error");
      setStatusMessage("Popraw pola oznaczone na czerwono.");
      return;
    }

    setStatusMessage(null);
    setStatusType("info");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: form.email.trim(),
          password: form.password,
        }),
      });

      const payload: {
        error?: string;
        message?: string;
        details?: { field?: string };
      } | null = await response.json().catch(() => null);

      if (!response.ok) {
        const fieldName = payload?.details?.field;
        if (fieldName === "email" || fieldName === "password") {
          setErrors((current) => ({
            ...current,
            [fieldName]: payload?.message ?? "Wystąpił błąd.",
          }));
        }

        setStatusType("error");
        setStatusMessage(payload?.message ?? "Logowanie nie powiodło się. Spróbuj ponownie.");
        return;
      }

      window.location.assign("/app/generator");
    } catch {
      setStatusType("error");
      setStatusMessage("Nie udało się połączyć z serwerem. Sprawdź sieć i spróbuj ponownie.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Zaloguj się"
      description="Uzyskaj dostęp do generatora fiszek, biblioteki i trybu nauki."
      activeLink="login"
      footer={
        <>
          Nie masz konta?{" "}
          <a className="auth-link" href="/auth/register">
            Zarejestruj się
          </a>
        </>
      }
    >
      <form
        className="auth-form"
        noValidate
        onSubmit={handleSubmit}
        ref={formRef}
        data-testid="login-form"
      >
        <div className="auth-field">
          <label htmlFor={emailId}>Adres e-mail</label>
          <input
            id={emailId}
            name="email"
            type="email"
            className={`auth-input ${errors.email ? "error" : ""}`}
            placeholder="twoje@konto.com"
            value={form.email}
            onChange={handleChange("email")}
            autoComplete="email"
            required
          />
          {errors.email ? (
            <p className="auth-error" data-testid="login-email-error">
              {errors.email}
            </p>
          ) : null}
        </div>

        <div className="auth-field">
          <label htmlFor={passwordId}>Hasło</label>
          <input
            id={passwordId}
            name="password"
            type="password"
            className={`auth-input ${errors.password ? "error" : ""}`}
            placeholder="••••••••"
            value={form.password}
            onChange={handleChange("password")}
            autoComplete="current-password"
            required
          />
          <div className="auth-field-meta">
            {errors.password ? (
              <p className="auth-error" data-testid="login-password-error">
                {errors.password}
              </p>
            ) : (
              <span />
            )}
            <a className="auth-link" href="/auth/forgot-password">
              Nie pamiętasz hasła?
            </a>
          </div>
        </div>

        <div className="auth-actions">
          <button type="submit" className="primary-button auth-submit-button" disabled={isSubmitting}>
            Zaloguj się
          </button>
          {statusMessage ? (
            <p
              className={`auth-status ${statusType === "error" ? "error" : ""}`}
              role={statusType === "error" ? "alert" : "status"}
              data-testid="login-status-message"
            >
              {statusMessage}
            </p>
          ) : null}
        </div>
      </form>
    </AuthLayout>
  );
}
