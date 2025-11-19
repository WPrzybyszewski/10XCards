import { useId, useState } from "react";

import AuthLayout from "./AuthLayout";

export default function ForgotPasswordForm(): JSX.Element {
  const emailId = useId();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email.trim()) {
      setError("Podaj adres e-mail powiązany z kontem.");
      setStatusMessage(null);
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("Adres e-mail ma niepoprawny format.");
      setStatusMessage(null);
      return;
    }

    setError(null);
    setStatusMessage(
      "Jeśli konto istnieje, wyślemy wiadomość z linkiem resetującym. Integracja z Supabase zostanie dodana później."
    );
  };

  return (
    <AuthLayout
      title="Odzyskaj dostęp"
      description="Podaj adres e-mail, aby otrzymać instrukcję ustawienia nowego hasła."
      accent="Bezpieczeństwo konta"
      activeLink="forgot"
      footer={
        <>
          Pamiętasz hasło?{" "}
          <a className="auth-link" href="/auth/login">
            Wróć do logowania
          </a>
        </>
      }
    >
      <form className="auth-form" noValidate onSubmit={handleSubmit}>
        <div className="auth-field">
          <label htmlFor={emailId}>Adres e-mail</label>
          <input
            id={emailId}
            type="email"
            name="email"
            className={`auth-input ${error ? "error" : ""}`}
            placeholder="twoje@konto.com"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              if (error) {
                setError(null);
              }
            }}
            autoComplete="email"
            required
          />
          {error ? <p className="auth-error">{error}</p> : null}
        </div>
        <div className="auth-actions">
          <button type="submit" className="primary-button auth-submit-button">
            Wyślij link resetujący
          </button>
          {statusMessage ? (
            <p className="auth-status" role="status">
              {statusMessage}
            </p>
          ) : null}
        </div>
      </form>
    </AuthLayout>
  );
}


