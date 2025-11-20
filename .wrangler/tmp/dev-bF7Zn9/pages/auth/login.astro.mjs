globalThis.process ??= {}; globalThis.process.env ??= {};
import { e as createComponent, n as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../../chunks/astro/server_Df_JRoM_.mjs';
import { $ as $$Layout } from '../../chunks/Layout_DVSiWbrI.mjs';
import { j as jsxRuntimeExports } from '../../chunks/jsx-runtime_DoH26EBh.mjs';
import { a as reactExports } from '../../chunks/_@astro-renderers_SvKBFpRS.mjs';
export { r as renderers } from '../../chunks/_@astro-renderers_SvKBFpRS.mjs';
import { A as AuthLayout } from '../../chunks/AuthLayout_7levPALN.mjs';
import { i as isFeatureEnabled } from '../../chunks/featureFlags_Dfc6shOx.mjs';

const INITIAL_FORM = {
  email: "",
  password: ""
};
function LoginForm() {
  const emailId = reactExports.useId();
  const passwordId = reactExports.useId();
  const [form, setForm] = reactExports.useState(INITIAL_FORM);
  const [errors, setErrors] = reactExports.useState({});
  const [statusMessage, setStatusMessage] = reactExports.useState(null);
  const [statusType, setStatusType] = reactExports.useState("info");
  const [isSubmitting, setIsSubmitting] = reactExports.useState(false);
  const formRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    formRef.current?.setAttribute("data-hydrated", "true");
  }, []);
  const handleChange = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    if (errors[field]) {
      setErrors((current) => ({ ...current, [field]: void 0 }));
    }
  };
  const validate = () => {
    const nextErrors = {};
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
  const handleSubmit = async (event) => {
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
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: form.email.trim(),
          password: form.password
        })
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const fieldName = payload?.details?.field;
        if (fieldName === "email" || fieldName === "password") {
          setErrors((current) => ({
            ...current,
            [fieldName]: payload?.message ?? "Wystąpił błąd."
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
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    AuthLayout,
    {
      title: "Zaloguj się",
      description: "Uzyskaj dostęp do generatora fiszek, biblioteki i trybu nauki.",
      activeLink: "login",
      footer: /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        "Nie masz konta?",
        " ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("a", { className: "auth-link", href: "/auth/register", children: "Zarejestruj się" })
      ] }),
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "form",
        {
          className: "auth-form",
          noValidate: true,
          onSubmit: handleSubmit,
          ref: formRef,
          "data-testid": "login-form",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "auth-field", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: emailId, children: "Adres e-mail" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  id: emailId,
                  name: "email",
                  type: "email",
                  className: `auth-input ${errors.email ? "error" : ""}`,
                  placeholder: "twoje@konto.com",
                  value: form.email,
                  onChange: handleChange("email"),
                  autoComplete: "email",
                  required: true
                }
              ),
              errors.email ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "auth-error", "data-testid": "login-email-error", children: errors.email }) : null
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "auth-field", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: passwordId, children: "Hasło" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  id: passwordId,
                  name: "password",
                  type: "password",
                  className: `auth-input ${errors.password ? "error" : ""}`,
                  placeholder: "••••••••",
                  value: form.password,
                  onChange: handleChange("password"),
                  autoComplete: "current-password",
                  required: true
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "auth-field-meta", children: [
                errors.password ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "auth-error", "data-testid": "login-password-error", children: errors.password }) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", {}),
                /* @__PURE__ */ jsxRuntimeExports.jsx("a", { className: "auth-link", href: "/auth/forgot-password", children: "Nie pamiętasz hasła?" })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "auth-actions", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "submit", className: "primary-button auth-submit-button", disabled: isSubmitting, children: "Zaloguj się" }),
              statusMessage ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                "p",
                {
                  className: `auth-status ${statusType === "error" ? "error" : ""}`,
                  role: statusType === "error" ? "alert" : "status",
                  "data-testid": "login-status-message",
                  children: statusMessage
                }
              ) : null
            ] })
          ]
        }
      )
    }
  );
}

const $$Login = createComponent(($$result, $$props, $$slots) => {
  const isAuthEnabled = isFeatureEnabled("auth");
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Logowanie" }, { "default": ($$result2) => renderTemplate`${isAuthEnabled ? renderTemplate`${renderComponent($$result2, "LoginForm", LoginForm, { "client:load": true, "client:component-hydration": "load", "client:component-path": "C:/Users/Wojtek/Desktop/10XDEVS/10x-astro-starter/src/react/auth/LoginForm.tsx", "client:component-export": "default" })}` : renderTemplate`${maybeRenderHead()}<p>Logowanie jest tymczasowo wyłączone.</p>`}` })}`;
}, "C:/Users/Wojtek/Desktop/10XDEVS/10x-astro-starter/src/pages/auth/login.astro", void 0);

const $$file = "C:/Users/Wojtek/Desktop/10XDEVS/10x-astro-starter/src/pages/auth/login.astro";
const $$url = "/auth/login";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Login,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
