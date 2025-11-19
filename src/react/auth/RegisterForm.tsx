import type { JSX } from "react";
import { useId, useState } from "react";

import AuthLayout from "./AuthLayout";

interface RegisterFormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
}

const INITIAL_FORM = {
  email: "",
  password: "",
  confirmPassword: "",
};

export default function RegisterForm(): JSX.Element {
  const emailId = useId();
  const passwordId = useId();
  const confirmPasswordId = useId();

  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState<RegisterFormErrors>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<"info" | "error">("info");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field: keyof typeof INITIAL_FORM) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    if (errors[field]) {
      setErrors((current) => ({ ...current, [field]: undefined }));
    }
  };

  const validate = (): RegisterFormErrors => {
    const nextErrors: RegisterFormErrors = {};

    if (!form.email.trim()) {
      nextErrors.email = "Podaj adres e-mail.";
    } else if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      nextErrors.email = "Adres e-mail ma niepoprawny format.";
    }

    if (form.password.length < 8) {
      nextErrors.password = "Hasło musi mieć co najmniej 8 znaków.";
    }

    if (form.confirmPassword !== form.password) {
      nextErrors.confirmPassword = "Hasła muszą być identyczne.";
    }

    return nextErrors;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setStatusType("error");
      setStatusMessage("Popraw oznaczone pola, aby kontynuować.");
      return;
    }

    setStatusType("info");
    setStatusMessage(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/register", {
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
        message?: string;
        error?: string;
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
        setStatusMessage(payload?.message ?? "Rejestracja nie powiodła się. Spróbuj ponownie.");
        return;
      }

      setForm(INITIAL_FORM);
      setStatusType("info");
      setStatusMessage(
        payload?.message ??
          "Konto zostało utworzone. Sprawdź skrzynkę e-mail i kliknij link aktywacyjny, aby dokończyć rejestrację."
      );
    } catch {
      setStatusType("error");
      setStatusMessage("Nie udało się połączyć z serwerem. Sprawdź sieć i spróbuj ponownie.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Załóż konto"
      description="Zapisuj fiszki, akceptuj propozycje AI i ucz się w jednym miejscu."
      accent="Nowe konto"
      activeLink="register"
      footer={
        <>
          Masz już konto?{" "}
          <a className="auth-link" href="/auth/login">
            Zaloguj się
          </a>
        </>
      }
    >
      <form className="auth-form" noValidate onSubmit={handleSubmit}>
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
          {errors.email ? <p className="auth-error">{errors.email}</p> : null}
        </div>

        <div className="auth-field">
          <label htmlFor={passwordId}>Hasło</label>
          <input
            id={passwordId}
            name="password"
            type="password"
            className={`auth-input ${errors.password ? "error" : ""}`}
            placeholder="Minimum 8 znaków"
            value={form.password}
            onChange={handleChange("password")}
            autoComplete="new-password"
            required
            minLength={8}
          />
          {errors.password ? (
            <p className="auth-error">{errors.password}</p>
          ) : (
            <p className="auth-field-meta">Użyj liter, cyfr i znaków specjalnych.</p>
          )}
        </div>

        <div className="auth-field">
          <label htmlFor={confirmPasswordId}>Powtórz hasło</label>
          <input
            id={confirmPasswordId}
            name="confirmPassword"
            type="password"
            className={`auth-input ${errors.confirmPassword ? "error" : ""}`}
            placeholder="Powtórz hasło"
            value={form.confirmPassword}
            onChange={handleChange("confirmPassword")}
            autoComplete="new-password"
            required
          />
          {errors.confirmPassword ? <p className="auth-error">{errors.confirmPassword}</p> : null}
        </div>

        <div className="auth-actions">
          <button type="submit" className="primary-button auth-submit-button" disabled={isSubmitting}>
            Utwórz konto
          </button>
          {statusMessage ? (
            <p
              className={`auth-status ${statusType === "error" ? "error" : ""}`}
              role={statusType === "error" ? "alert" : "status"}
            >
              {statusMessage}
            </p>
          ) : null}
        </div>
      </form>
    </AuthLayout>
  );
}
