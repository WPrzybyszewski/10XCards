globalThis.process ??= {}; globalThis.process.env ??= {};
import { j as jsxRuntimeExports } from './jsx-runtime_DoH26EBh.mjs';
import { l as clsx } from './astro/server_Df_JRoM_.mjs';
/* empty css                                   */

const NAV_LINKS = [
  { id: "login", label: "Logowanie", href: "/auth/login" },
  { id: "register", label: "Rejestracja", href: "/auth/register" }
];
function AuthLayout({
  title,
  description,
  children,
  footer,
  accent,
  activeLink
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "auth-page", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "auth-topbar", role: "banner", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("a", { className: "auth-logo", href: "/", children: "Fiszki AI" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("nav", { "aria-label": "Nawigacja uwierzytelniania", children: /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "auth-nav-list", children: NAV_LINKS.map((link) => /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        "a",
        {
          href: link.href,
          className: clsx("auth-nav-link", {
            active: link.id === activeLink
          }),
          "aria-current": link.id === activeLink ? "page" : void 0,
          children: link.label
        }
      ) }, link.id)) }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("main", { className: "auth-main", role: "main", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "auth-card", "aria-live": "polite", children: [
      accent ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "auth-accent", children: accent }) : null,
      /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { children: title }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "auth-description", children: description }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "auth-form-wrapper", children }),
      footer ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "auth-footer", children: footer }) : null
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("footer", { className: "auth-background-detail", "aria-hidden": "true", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "auth-gradient-orb" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "auth-gradient-orb soft" })
    ] })
  ] });
}

export { AuthLayout as A };
