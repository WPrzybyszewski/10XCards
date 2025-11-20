globalThis.process ??= {}; globalThis.process.env ??= {};
import { o as objectType, k as stringType, e as createComponent, n as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../../chunks/astro/server_Df_JRoM_.mjs';
import { $ as $$Layout } from '../../chunks/Layout_DVSiWbrI.mjs';
import { j as jsxRuntimeExports } from '../../chunks/jsx-runtime_DoH26EBh.mjs';
import { a as reactExports } from '../../chunks/_@astro-renderers_SvKBFpRS.mjs';
export { r as renderers } from '../../chunks/_@astro-renderers_SvKBFpRS.mjs';
import { g as get, s as set, b as appendErrors, u as useForm } from '../../chunks/index.esm_CCEh_60o.mjs';
import { A as AuthLayout } from '../../chunks/AuthLayout_7levPALN.mjs';
import { i as isFeatureEnabled } from '../../chunks/featureFlags_Dfc6shOx.mjs';

const r=(t,r,o)=>{if(t&&"reportValidity"in t){const s=get(o,r);t.setCustomValidity(s&&s.message||""),t.reportValidity();}},o=(e,t)=>{for(const o in t.fields){const s=t.fields[o];s&&s.ref&&"reportValidity"in s.ref?r(s.ref,o,e):s&&s.refs&&s.refs.forEach(t=>r(t,o,e));}},s$1=(r,s)=>{s.shouldUseNativeValidation&&o(r,s);const n={};for(const o in r){const f=get(s.fields,o),c=Object.assign(r[o]||{},{ref:f&&f.ref});if(i(s.names||Object.keys(r),o)){const r=Object.assign({},get(n,o));set(r,"root",c),set(n,o,r);}else set(n,o,c);}return n},i=(e,t)=>{const r=n$1(t);return e.some(e=>n$1(e).match(`^${r}\\.\\d+`))};function n$1(e){return e.replace(/\]|\[/g,"")}

function n(r,e){for(var n={};r.length;){var s=r[0],t=s.code,i=s.message,a=s.path.join(".");if(!n[a])if("unionErrors"in s){var u=s.unionErrors[0].errors[0];n[a]={message:u.message,type:u.code};}else n[a]={message:i,type:t};if("unionErrors"in s&&s.unionErrors.forEach(function(e){return e.errors.forEach(function(e){return r.push(e)})}),e){var c=n[a].types,f=c&&c[s.code];n[a]=appendErrors(a,e,n,t,f?[].concat(f,s.message):s.message);}r.shift();}return n}function s(o$1,s,t){return void 0===t&&(t={}),function(i,a,u){try{return Promise.resolve(function(e,n){try{var a=Promise.resolve(o$1["sync"===t.mode?"parse":"parseAsync"](i,s)).then(function(e){return u.shouldUseNativeValidation&&o({},u),{errors:{},values:t.raw?Object.assign({},i):e}});}catch(r){return n(r)}return a&&a.then?a.then(void 0,n):a}(0,function(r){if(function(r){return Array.isArray(null==r?void 0:r.errors)}(r))return {values:{},errors:s$1(n(r.errors,!u.shouldUseNativeValidation&&"all"===u.criteriaMode),u)};throw r}))}catch(r){return Promise.reject(r)}}}

const registerSchema = objectType({
  email: stringType().min(1, "Podaj adres e-mail.").email("Adres e-mail ma niepoprawny format."),
  password: stringType().min(8, "Hasło musi mieć co najmniej 8 znaków."),
  confirmPassword: stringType().min(1, "Powtórz hasło.")
}).superRefine((data, ctx) => {
  if (data.password !== data.confirmPassword) {
    ctx.addIssue({
      code: "custom",
      path: ["confirmPassword"],
      message: "Hasła muszą być identyczne."
    });
  }
});
const INITIAL_VALUES = {
  email: "",
  password: "",
  confirmPassword: ""
};
function RegisterForm() {
  const emailId = reactExports.useId();
  const passwordId = reactExports.useId();
  const confirmPasswordId = reactExports.useId();
  const [statusMessage, setStatusMessage] = reactExports.useState(null);
  const [statusType, setStatusType] = reactExports.useState("info");
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: s(registerSchema),
    defaultValues: INITIAL_VALUES,
    mode: "onBlur",
    reValidateMode: "onChange"
  });
  const onSubmit = async (values) => {
    setStatusType("info");
    setStatusMessage(null);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: values.email.trim(),
          password: values.password
        })
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const fieldName = payload?.details?.field;
        if (fieldName === "email" || fieldName === "password") {
          setError(fieldName, {
            type: "server",
            message: payload?.message ?? "Wystąpił błąd."
          });
        }
        setStatusType("error");
        setStatusMessage(payload?.message ?? "Rejestracja nie powiodła się. Spróbuj ponownie.");
        return;
      }
      reset(INITIAL_VALUES);
      setStatusType("info");
      setStatusMessage(
        payload?.message ?? "Konto zostało utworzone. Sprawdź skrzynkę e-mail i kliknij link aktywacyjny, aby dokończyć rejestrację."
      );
    } catch {
      setStatusType("error");
      setStatusMessage("Nie udało się połączyć z serwerem. Sprawdź sieć i spróbuj ponownie.");
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    AuthLayout,
    {
      title: "Załóż konto",
      description: "Zapisuj fiszki, akceptuj propozycje AI i ucz się w jednym miejscu.",
      accent: "Nowe konto",
      activeLink: "register",
      footer: /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        "Masz już konto?",
        " ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("a", { className: "auth-link", href: "/auth/login", children: "Zaloguj się" })
      ] }),
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { className: "auth-form", noValidate: true, onSubmit: handleSubmit(onSubmit), children: [
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
              ...register("email"),
              autoComplete: "email",
              required: true
            }
          ),
          errors.email ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "auth-error", children: errors.email.message }) : null
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
              placeholder: "Minimum 8 znaków",
              ...register("password"),
              autoComplete: "new-password",
              required: true,
              minLength: 8
            }
          ),
          errors.password ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "auth-error", children: errors.password.message }) : /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "auth-field-meta", children: "Użyj liter, cyfr i znaków specjalnych." })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "auth-field", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: confirmPasswordId, children: "Powtórz hasło" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              id: confirmPasswordId,
              name: "confirmPassword",
              type: "password",
              className: `auth-input ${errors.confirmPassword ? "error" : ""}`,
              placeholder: "Powtórz hasło",
              ...register("confirmPassword"),
              autoComplete: "new-password",
              required: true
            }
          ),
          errors.confirmPassword ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "auth-error", children: errors.confirmPassword.message }) : null
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "auth-actions", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "submit", className: "primary-button auth-submit-button", disabled: isSubmitting, children: "Utwórz konto" }),
          statusMessage ? /* @__PURE__ */ jsxRuntimeExports.jsx(
            "p",
            {
              className: `auth-status ${statusType === "error" ? "error" : ""}`,
              role: statusType === "error" ? "alert" : "status",
              children: statusMessage
            }
          ) : null
        ] })
      ] })
    }
  );
}

const $$Register = createComponent(($$result, $$props, $$slots) => {
  const isAuthEnabled = isFeatureEnabled("auth");
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Rejestracja" }, { "default": ($$result2) => renderTemplate`${isAuthEnabled ? renderTemplate`${renderComponent($$result2, "RegisterForm", RegisterForm, { "client:load": true, "client:component-hydration": "load", "client:component-path": "C:/Users/Wojtek/Desktop/10XDEVS/10x-astro-starter/src/react/auth/RegisterForm.tsx", "client:component-export": "default" })}` : renderTemplate`${maybeRenderHead()}<p>Rejestracja jest tymczasowo wyłączona.</p>`}` })}`;
}, "C:/Users/Wojtek/Desktop/10XDEVS/10x-astro-starter/src/pages/auth/register.astro", void 0);

const $$file = "C:/Users/Wojtek/Desktop/10XDEVS/10x-astro-starter/src/pages/auth/register.astro";
const $$url = "/auth/register";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Register,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
