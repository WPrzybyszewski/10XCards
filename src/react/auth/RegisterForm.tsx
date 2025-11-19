import type { JSX } from "react";
import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import AuthLayout from "./AuthLayout";

const registerSchema = z
  .object({
    email: z
      .string()
      .min(1, "Podaj adres e-mail.")
      .email("Adres e-mail ma niepoprawny format."),
    password: z
      .string()
      .min(8, "Hasło musi mieć co najmniej 8 znaków."),
    confirmPassword: z
      .string()
      .min(1, "Powtórz hasło."),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Hasła muszą być identyczne.",
      });
    }
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

const INITIAL_VALUES: RegisterFormValues = {
  email: "",
  password: "",
  confirmPassword: "",
};

export default function RegisterForm(): JSX.Element {
  const emailId = useId();
  const passwordId = useId();
  const confirmPasswordId = useId();

  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<"info" | "error">("info");

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: INITIAL_VALUES,
    mode: "onBlur",
    reValidateMode: "onChange",
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setStatusType("info");
    setStatusMessage(null);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: values.email.trim(),
          password: values.password,
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
          setError(fieldName, {
            type: "server",
            message: payload?.message ?? "Wystąpił błąd.",
          });
        }

        setStatusType("error");
        setStatusMessage(payload?.message ?? "Rejestracja nie powiodła się. Spróbuj ponownie.");
        return;
      }

      reset(INITIAL_VALUES);
      setStatusType("info");
      setStatusMessage(
        payload?.message ??
          "Konto zostało utworzone. Sprawdź skrzynkę e-mail i kliknij link aktywacyjny, aby dokończyć rejestrację."
      );
    } catch {
      setStatusType("error");
      setStatusMessage("Nie udało się połączyć z serwerem. Sprawdź sieć i spróbuj ponownie.");
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
      <form className="auth-form" noValidate onSubmit={handleSubmit(onSubmit)}>
        <div className="auth-field">
          <label htmlFor={emailId}>Adres e-mail</label>
          <input
            id={emailId}
            name="email"
            type="email"
            className={`auth-input ${errors.email ? "error" : ""}`}
            placeholder="twoje@konto.com"
            {...register("email")}
            autoComplete="email"
            required
          />
          {errors.email ? <p className="auth-error">{errors.email.message}</p> : null}
        </div>

        <div className="auth-field">
          <label htmlFor={passwordId}>Hasło</label>
          <input
            id={passwordId}
            name="password"
            type="password"
            className={`auth-input ${errors.password ? "error" : ""}`}
            placeholder="Minimum 8 znaków"
            {...register("password")}
            autoComplete="new-password"
            required
            minLength={8}
          />
          {errors.password ? (
            <p className="auth-error">{errors.password.message}</p>
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
            {...register("confirmPassword")}
            autoComplete="new-password"
            required
          />
          {errors.confirmPassword ? <p className="auth-error">{errors.confirmPassword.message}</p> : null}
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
