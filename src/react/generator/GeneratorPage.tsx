import clsx from "clsx";

import GeneratorLayout from "./components/GeneratorLayout";
import GeneratorInputPanel from "./components/GeneratorInputPanel";
import GeneratorProposalsPanel from "./components/GeneratorProposalsPanel";
import GeneratorSidebar from "./components/GeneratorSidebar";
import GeneratorToastStack from "./components/GeneratorToastStack";
import useGeneratorView from "./useGeneratorView";

import "./generator.css";

const NAV_LINKS = [
  { label: "Generator", href: "/app/generator" },
  { label: "Fiszki", href: "/app/flashcards" },
  { label: "Nauka", href: "/app/learn" },
  { label: "Kategorie", href: "/app/categories" },
];

export default function GeneratorPage(): JSX.Element {
  const {
    input,
    categories,
    isCategoriesLoading,
    proposals,
    toasts,
    setInputValue,
    generate,
    updateProposal,
    acceptProposal,
    rejectProposal,
    dismissToast,
  } = useGeneratorView();

  return (
    <div className="generator-page">
      <header className="generator-topbar" role="banner">
        <div className="generator-logo">Fiszki AI</div>
        <nav aria-label="Główna nawigacja">
          <ul className="generator-nav-list">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className={clsx("generator-nav-link", {
                    active: link.href === "/app/generator",
                  })}
                  aria-current={
                    link.href === "/app/generator" ? "page" : undefined
                  }
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="generator-user-slot">
          <div className="generator-user-avatar" aria-hidden="true">
            U
          </div>
          <span className="generator-user-name">twoje@konto.com</span>
        </div>
      </header>

      <main className="generator-content" role="main">
        <GeneratorLayout
          inputPanel={
            <GeneratorInputPanel
              value={input.rawValue}
              charCount={input.trimmedLength}
              minLength={1000}
              maxLength={10000}
              isValid={input.isValidLength}
              isGenerating={input.isGenerating}
              onChange={setInputValue}
              onGenerate={generate}
            />
          }
          proposalsPanel={
            <GeneratorProposalsPanel
              proposals={proposals}
              categories={categories}
              categoriesLoading={isCategoriesLoading}
              onChange={updateProposal}
              onAccept={acceptProposal}
              onReject={rejectProposal}
            />
          }
          sidebar={<GeneratorSidebar />}
        />
      </main>
      <GeneratorToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

