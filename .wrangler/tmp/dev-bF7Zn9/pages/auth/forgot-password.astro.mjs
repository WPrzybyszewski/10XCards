globalThis.process ??= {}; globalThis.process.env ??= {};
import { e as createComponent, n as renderComponent, r as renderTemplate } from '../../chunks/astro/server_Df_JRoM_.mjs';
import { $ as $$Layout } from '../../chunks/Layout_DVSiWbrI.mjs';
import { j as jsxRuntimeExports } from '../../chunks/jsx-runtime_DoH26EBh.mjs';
import { a as reactExports } from '../../chunks/_@astro-renderers_SvKBFpRS.mjs';
export { r as renderers } from '../../chunks/_@astro-renderers_SvKBFpRS.mjs';
import { A as AuthLayout } from '../../chunks/AuthLayout_7levPALN.mjs';

function ForgotPasswordForm() {
  const emailId = reactExports.useId();
  const [email, setEmail] = reactExports.useState("");
  const [error, setError] = reactExports.useState(null);
  const [statusMessage, setStatusMessage] = reactExports.useState(null);
  const handleSubmit = (event) => {
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
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    AuthLayout,
    {
      title: "Odzyskaj dostęp",
      description: "Podaj adres e-mail, aby otrzymać instrukcję ustawienia nowego hasła.",
      accent: "Bezpieczeństwo konta",
      activeLink: "forgot",
      footer: /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        "Pamiętasz hasło?",
        " ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("a", { className: "auth-link", href: "/auth/login", children: "Wróć do logowania" })
      ] }),
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { className: "auth-form", noValidate: true, onSubmit: handleSubmit, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "auth-field", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: emailId, children: "Adres e-mail" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              id: emailId,
              type: "email",
              name: "email",
              className: `auth-input ${error ? "error" : ""}`,
              placeholder: "twoje@konto.com",
              value: email,
              onChange: (event) => {
                setEmail(event.target.value);
                if (error) {
                  setError(null);
                }
              },
              autoComplete: "email",
              required: true
            }
          ),
          error ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "auth-error", children: error }) : null
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "auth-actions", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "submit", className: "primary-button auth-submit-button", children: "Wyślij link resetujący" }),
          statusMessage ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "auth-status", role: "status", children: statusMessage }) : null
        ] })
      ] })
    }
  );
}

const $$ForgotPassword = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Odzyskiwanie konta" }, { "default": ($$result2) => renderTemplate` ${renderComponent($$result2, "ForgotPasswordForm", ForgotPasswordForm, { "client:load": true, "client:component-hydration": "load", "client:component-path": "C:/Users/Wojtek/Desktop/10XDEVS/10x-astro-starter/src/react/auth/ForgotPasswordForm.tsx", "client:component-export": "default" })} ` })}`;
}, "C:/Users/Wojtek/Desktop/10XDEVS/10x-astro-starter/src/pages/auth/forgot-password.astro", void 0);

const $$file = "C:/Users/Wojtek/Desktop/10XDEVS/10x-astro-starter/src/pages/auth/forgot-password.astro";
const $$url = "/auth/forgot-password";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$ForgotPassword,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
