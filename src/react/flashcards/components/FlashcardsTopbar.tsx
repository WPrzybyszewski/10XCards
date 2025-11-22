import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { label: "Generator", href: "/app/generator" },
  { label: "Fiszki", href: "/app/flashcards" },
  { label: "Nauka", href: "/app/learn" },
  { label: "Kategorie", href: "/app/categories" },
] as const;

interface FlashcardsTopbarProps {
  activeHref: string;
}

export default function FlashcardsTopbar({
  activeHref,
}: FlashcardsTopbarProps): JSX.Element {
  return (
    <header
      className="flashcards-topbar flex w-full flex-wrap items-center justify-between gap-4 border border-border/60 bg-card/70 px-4 py-4 text-foreground md:flex-nowrap md:px-10"
      role="banner"
    >
      <div className="flashcards-logo text-lg font-semibold tracking-tight">
        Fiszki AI
      </div>

      <nav aria-label="Główna nawigacja">
        <ul className="flashcards-nav-list text-sm font-medium">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className={cn(
                  "flashcards-nav-link",
                  link.href === activeHref && "active",
                )}
                aria-current={link.href === activeHref ? "page" : undefined}
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div
        className="flashcards-user-slot"
        aria-hidden="true"
      >
        <div className="flashcards-user-avatar">
          U
        </div>
        <span>user@example.com</span>
      </div>
    </header>
  );
}
