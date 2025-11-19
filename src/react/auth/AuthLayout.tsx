import type { ReactNode } from "react";
import clsx from "clsx";

import "./auth.css";

const NAV_LINKS = [
  { id: "login", label: "Logowanie", href: "/auth/login" },
  { id: "register", label: "Rejestracja", href: "/auth/register" },
];

type AuthLayoutProps = {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
  accent?: string;
  activeLink?: "login" | "register" | "forgot";
};

export default function AuthLayout({
  title,
  description,
  children,
  footer,
  accent,
  activeLink,
}: AuthLayoutProps): JSX.Element {
  return (
    <div className="auth-page">
      <header className="auth-topbar" role="banner">
        <a className="auth-logo" href="/">
          Fiszki AI
        </a>
        <nav aria-label="Nawigacja uwierzytelniania">
          <ul className="auth-nav-list">
            {NAV_LINKS.map((link) => (
              <li key={link.id}>
                <a
                  href={link.href}
                  className={clsx("auth-nav-link", {
                    active: link.id === activeLink,
                  })}
                  aria-current={link.id === activeLink ? "page" : undefined}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main className="auth-main" role="main">
        <section className="auth-card" aria-live="polite">
          {accent ? <p className="auth-accent">{accent}</p> : null}
          <h1>{title}</h1>
          <p className="auth-description">{description}</p>
          <div className="auth-form-wrapper">{children}</div>
          {footer ? <div className="auth-footer">{footer}</div> : null}
        </section>
      </main>
      <footer className="auth-background-detail" aria-hidden="true">
        <div className="auth-gradient-orb" />
        <div className="auth-gradient-orb soft" />
      </footer>
    </div>
  );
}


