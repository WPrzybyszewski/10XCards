import type { ReactNode } from "react";

interface GeneratorLayoutProps {
  inputPanel: ReactNode;
  proposalsPanel: ReactNode;
  sidebar: ReactNode;
}

export default function GeneratorLayout({
  inputPanel,
  proposalsPanel,
  sidebar,
}: GeneratorLayoutProps): JSX.Element {
  return (
    <section className="generator-layout">
      <div className="generator-panel">{inputPanel}</div>
      <div className="generator-panel generator-panel--proposals">
        {proposalsPanel}
      </div>
      <aside className="generator-panel generator-panel--sidebar">
        {sidebar}
      </aside>
    </section>
  );
}

