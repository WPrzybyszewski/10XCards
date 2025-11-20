globalThis.process ??= {}; globalThis.process.env ??= {};
import { l as clsx, e as createComponent, n as renderComponent, r as renderTemplate } from '../../chunks/astro/server_Df_JRoM_.mjs';
import { $ as $$Layout } from '../../chunks/Layout_DVSiWbrI.mjs';
import { j as jsxRuntimeExports } from '../../chunks/jsx-runtime_DoH26EBh.mjs';
import { i as isFeatureEnabled } from '../../chunks/featureFlags_Dfc6shOx.mjs';
import { a as reactExports } from '../../chunks/_@astro-renderers_SvKBFpRS.mjs';
export { r as renderers } from '../../chunks/_@astro-renderers_SvKBFpRS.mjs';
import { u as useForm, a as useFieldArray } from '../../chunks/index.esm_CCEh_60o.mjs';
/* empty css                                        */

function GeneratorLayout({
  inputPanel,
  proposalsPanel,
  sidebar
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "generator-layout", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "generator-panel", children: inputPanel }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "generator-panel generator-panel--proposals", children: proposalsPanel }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("aside", { className: "generator-panel generator-panel--sidebar", children: sidebar })
  ] });
}

function GeneratorInputPanel({
  value,
  charCount,
  minLength,
  maxLength,
  isValid,
  isGenerating,
  onChange,
  onGenerate
}) {
  const handleChange = (event) => {
    onChange(event.target.value);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "generator-input-panel", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "generator-section-label", children: "Krok 1 · Tekst źródłowy" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { children: "Wklej materiał, z którego mamy stworzyć fiszki" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "generator-section-description", children: [
        "Minimalnie ",
        minLength,
        " znaków, maksymalnie ",
        maxLength,
        " znaków. Im bardziej precyzyjne notatki, tym lepsze propozycje."
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "generator-textarea-wrapper", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "sr-only", children: "Wklej tekst źródłowy" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "textarea",
        {
          value,
          onChange: handleChange,
          placeholder: "Wklej tutaj fragment skryptu, artykułu lub notatek...",
          "aria-invalid": !isValid,
          "aria-describedby": "generator-input-helper"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "generator-textarea-meta", id: "generator-input-helper", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: !isValid ? "error" : void 0, children: [
          charCount,
          " / ",
          minLength,
          "–",
          maxLength,
          " znaków"
        ] }),
        !isValid && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "error", children: [
          "Tekst musi mieć długość od ",
          minLength,
          " do ",
          maxLength,
          " znaków."
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "generator-actions", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          className: "primary-button",
          disabled: !isValid || isGenerating,
          onClick: onGenerate,
          children: isGenerating ? "Generowanie..." : "Generuj fiszki"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          className: "ghost-button",
          onClick: () => onChange(""),
          disabled: value.length === 0,
          children: "Wyczyść pole"
        }
      )
    ] })
  ] });
}

function ProposalCard({
  proposal,
  categories,
  collectionsEnabled = true,
  onChange,
  onAccept,
  onReject
}) {
  const frontLength = proposal.front.trim().length;
  const backLength = proposal.back.trim().length;
  const isFrontValid = frontLength >= 1 && frontLength <= 200;
  const isBackValid = backLength >= 1 && backLength <= 500;
  const isCategoryValid = !collectionsEnabled || Boolean(proposal.categoryId);
  const canAccept = collectionsEnabled && isFrontValid && isBackValid && isCategoryValid && !proposal.isSaving;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("article", { className: "proposal-card", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "proposal-card__header", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "generator-section-label", children: [
        "Propozycja #",
        proposal.index + 1
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "proposal-card__actions", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            className: "primary-button",
            disabled: !canAccept,
            onClick: () => onAccept(proposal.id),
            children: proposal.isSaving ? "Zapisywanie..." : "Akceptuj"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            className: "ghost-button",
            onClick: () => onReject(proposal.id),
            children: "Odrzuć"
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "proposal-card__field", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: `front-${proposal.id}`, children: "Front" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "textarea",
        {
          id: `front-${proposal.id}`,
          value: proposal.front,
          maxLength: 200,
          onChange: (event) => onChange(proposal.id, { front: event.target.value }),
          "aria-invalid": !isFrontValid
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: isFrontValid ? "helper" : "helper error", children: [
        frontLength,
        " / 200"
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "proposal-card__field", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: `back-${proposal.id}`, children: "Back" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "textarea",
        {
          id: `back-${proposal.id}`,
          value: proposal.back,
          maxLength: 500,
          rows: 4,
          onChange: (event) => onChange(proposal.id, { back: event.target.value }),
          "aria-invalid": !isBackValid
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: isBackValid ? "helper" : "helper error", children: [
        backLength,
        " / 500"
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "proposal-card__field", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: `category-${proposal.id}`, children: "Kategoria" }),
      collectionsEnabled ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "select",
          {
            id: `category-${proposal.id}`,
            value: proposal.categoryId ?? "",
            "aria-invalid": !isCategoryValid,
            onChange: (event) => onChange(proposal.id, {
              categoryId: event.target.value || null
            }),
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Wybierz kategorię" }),
              categories.map((category) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: category.id, children: category.name }, category.id))
            ]
          }
        ),
        !isCategoryValid && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "helper error", children: "Wybierz kategorię, aby zapisać." })
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "helper", children: "Kolekcje są chwilowo wyłączone – przypisanie kategorii będzie możliwe po ponownym włączeniu modułu." })
    ] })
  ] });
}

function GeneratorProposalsPanel({
  proposals,
  categories,
  categoriesLoading = false,
  collectionsEnabled = true,
  onChange,
  onAccept,
  onReject
}) {
  if (proposals.length === 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("section", { className: "generator-empty-panel", children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "Wygeneruj fiszki, aby zobaczyć propozycje." }) });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "generator-proposals-panel", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "generator-section-label", children: "Krok 2 · Propozycje AI" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { children: "Przejrzyj i dostosuj fiszki przed akceptacją" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "generator-section-description", children: "Możesz poprawić pytania i odpowiedzi oraz przypisać odpowiednie kategorie. Akceptuj tylko te karty, które rzeczywiście chcesz zapisać." }),
      !collectionsEnabled && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "generator-section-description subtle", children: "Moduł kolekcji jest wyłączony – przypisywanie kategorii i zapisywanie fiszek jest chwilowo niedostępne." }),
      categoriesLoading && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "generator-section-description subtle", children: "Ładuję listę kategorii..." })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "generator-proposals-grid", children: proposals.map((proposal) => /* @__PURE__ */ jsxRuntimeExports.jsx(
      ProposalCard,
      {
        proposal,
        categories,
        collectionsEnabled,
        onChange,
        onAccept,
        onReject
      },
      proposal.id
    )) })
  ] });
}

function GeneratorSidebar() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "generator-sidebar", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "generator-section-label", children: "Wskazówki" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { children: "Jak przygotować dobry tekst?" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("ul", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "Stosuj krótkie akapity i jednoznaczne fakty." }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "Unikaj list bullet w tekście źródłowym – wklej czysty tekst." }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "Jeśli masz wiele tematów, generuj fiszki osobno dla każdej sekcji." })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "generator-section-label", children: "Limity" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { children: "Co sprawdzamy automatycznie?" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("ul", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "Tekst źródłowy: 1000–10000 znaków." }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "Front fiszki: maks. 200 znaków." }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "Back fiszki: maks. 500 znaków." }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "Każda fiszka musi mieć przypisaną kategorię." })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "generator-section-label", children: "Status" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { children: "Historia sesji" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "W przyszłych iteracjach w tym miejscu pojawią się najważniejsze logi z generowania oraz skrót ostatnich akcji." })
    ] })
  ] });
}

function GeneratorToastStack({
  toasts,
  onDismiss
}) {
  if (toasts.length === 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(jsxRuntimeExports.Fragment, {});
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "generator-toast-stack", role: "status", "aria-live": "polite", children: toasts.map((toast) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `generator-toast ${toast.variant}`, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: toast.message }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: () => onDismiss(toast.id), children: "×" })
  ] }, toast.id)) });
}

async function parseJson(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Nieprawidłowa odpowiedź z serwera.");
  }
}
async function handleResponse(response) {
  if (response.ok) {
    return parseJson(response);
  }
  let message = "Wystąpił nieoczekiwany błąd.";
  try {
    const body = await parseJson(response) ?? {};
    message = body.message ?? message;
  } catch (error) {
    console.error("Nie udało się sparsować błędu API", error);
  }
  throw new Error(message);
}
async function getCategories() {
  const response = await fetch("/api/v1/categories?limit=100&offset=0", {
    method: "GET",
    credentials: "include"
  });
  const body = await handleResponse(response);
  return body.items ?? [];
}
async function postGenerate(command) {
  const response = await fetch("/api/v1/flashcards/generate", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(command)
  });
  return handleResponse(response);
}
async function postAccept(command) {
  const response = await fetch("/api/v1/flashcards/accept", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(command)
  });
  return handleResponse(response);
}
function createGeneratorApi() {
  return {
    generate: postGenerate,
    accept: postAccept,
    listCategories: getCategories
  };
}

const MIN_INPUT = 1e3;
const MAX_INPUT = 1e4;
const normalizeCategory = (category) => ({
  id: category.id,
  name: category.name
});
const normalizeProposal = (proposal) => ({
  id: proposal.id,
  index: proposal.index,
  front: proposal.front,
  back: proposal.back,
  categoryId: null,
  isSaving: false
});
const COLLECTIONS_FEATURE_ENABLED = isFeatureEnabled("collections");
function useGeneratorView() {
  const api = reactExports.useMemo(() => createGeneratorApi(), []);
  const [generationId, setGenerationId] = reactExports.useState(null);
  const [categories, setCategories] = reactExports.useState([]);
  const [isCategoriesLoading, setIsCategoriesLoading] = reactExports.useState(true);
  const [toasts, setToasts] = reactExports.useState([]);
  const [isGenerating, setIsGenerating] = reactExports.useState(false);
  const { control, watch, setValue, getValues } = useForm({
    defaultValues: {
      prompt: "",
      proposals: []
    },
    mode: "onChange"
  });
  const { replace, update, remove } = useFieldArray({
    control,
    name: "proposals",
    keyName: "fieldKey"
  });
  const promptValue = watch("prompt") ?? "";
  const proposals = watch("proposals") ?? [];
  const trimmedLength = promptValue.trim().length;
  const isValidLength = trimmedLength >= MIN_INPUT && trimmedLength <= MAX_INPUT;
  const input = reactExports.useMemo(
    () => ({
      rawValue: promptValue,
      trimmedLength,
      isValidLength,
      isGenerating
    }),
    [promptValue, trimmedLength, isValidLength, isGenerating]
  );
  const setInputValue = reactExports.useCallback(
    (value) => {
      setValue("prompt", value, { shouldDirty: true });
    },
    [setValue]
  );
  const pushToast = reactExports.useCallback((variant, message) => {
    setToasts((previous) => [
      ...previous,
      {
        id: crypto.randomUUID(),
        variant,
        message
      }
    ]);
  }, []);
  const dismissToast = reactExports.useCallback((id) => {
    setToasts((previous) => previous.filter((toast) => toast.id !== id));
  }, []);
  reactExports.useEffect(() => {
    if (toasts.length === 0) {
      return;
    }
    const timers = toasts.map(
      (toast) => window.setTimeout(() => {
        dismissToast(toast.id);
      }, 4e3)
    );
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [toasts, dismissToast]);
  const loadCategories = reactExports.useCallback(async () => {
    if (!COLLECTIONS_FEATURE_ENABLED) {
      setCategories([]);
      setIsCategoriesLoading(false);
      return;
    }
    setIsCategoriesLoading(true);
    try {
      const result = await api.listCategories();
      const normalized = result.map(
        (category) => normalizeCategory({
          id: category.id,
          name: category.name
        })
      );
      setCategories(normalized);
    } catch (error) {
      console.error(error);
      pushToast("error", "Nie udało się załadować kategorii.");
    } finally {
      setIsCategoriesLoading(false);
    }
  }, [api, pushToast]);
  reactExports.useEffect(() => {
    void loadCategories();
  }, [loadCategories]);
  const generate = reactExports.useCallback(async () => {
    if (!isValidLength) {
      pushToast("error", "Tekst musi mieć długość od 1000 do 10000 znaków.");
      return;
    }
    setIsGenerating(true);
    try {
      const payload = {
        input: promptValue.trim()
      };
      const response = await api.generate(payload);
      setGenerationId(response.generation_id);
      replace(response.proposals.map(normalizeProposal));
      pushToast(
        "success",
        "Gotowe! Edytuj propozycje i zaakceptuj wybrane fiszki."
      );
    } catch (error) {
      console.error(error);
      pushToast(
        "error",
        error instanceof Error ? error.message : "Nie udało się wygenerować fiszek."
      );
    } finally {
      setIsGenerating(false);
    }
  }, [api, promptValue, pushToast, replace, isValidLength]);
  const updateProposal = reactExports.useCallback(
    (proposalId, patch) => {
      const currentProposals = getValues("proposals");
      const index = currentProposals.findIndex(
        (proposal) => proposal.id === proposalId
      );
      if (index === -1) {
        return;
      }
      update(index, { ...currentProposals[index], ...patch });
    },
    [getValues, update]
  );
  const validateProposal = (proposal) => {
    const frontLength = proposal.front.trim().length;
    if (frontLength < 1 || frontLength > 200) {
      return "Front musi mieć od 1 do 200 znaków.";
    }
    const backLength = proposal.back.trim().length;
    if (backLength < 1 || backLength > 500) {
      return "Back musi mieć od 1 do 500 znaków.";
    }
    if (!proposal.categoryId) {
      return "Wybierz kategorię przed zapisem fiszki.";
    }
    if (!generationId) {
      return "Brak identyfikatora generacji – odśwież widok.";
    }
    return null;
  };
  const acceptProposal = reactExports.useCallback(
    async (proposalId) => {
      const currentProposals = getValues("proposals");
      const index = currentProposals.findIndex(
        (item) => item.id === proposalId
      );
      if (index === -1) {
        return;
      }
      const proposal = currentProposals[index];
      if (!proposal) {
        return;
      }
      const validationError = validateProposal(proposal);
      if (validationError) {
        pushToast("error", validationError);
        return;
      }
      updateProposal(proposalId, { isSaving: true });
      try {
        await api.accept({
          generation_id: generationId,
          proposal_id: proposal.id,
          category_id: proposal.categoryId,
          front: proposal.front.trim(),
          back: proposal.back.trim()
        });
        remove(index);
        pushToast("success", "Fiszka została zapisana.");
      } catch (error) {
        console.error(error);
        pushToast(
          "error",
          error instanceof Error ? error.message : "Nie udało się zapisać fiszki."
        );
        updateProposal(proposalId, { isSaving: false });
      }
    },
    [api, generationId, getValues, pushToast, remove, updateProposal]
  );
  const rejectProposal = reactExports.useCallback(
    (proposalId) => {
      const currentProposals = getValues("proposals");
      const index = currentProposals.findIndex(
        (proposal) => proposal.id === proposalId
      );
      if (index === -1) {
        return;
      }
      remove(index);
      pushToast("info", "Propozycja została odrzucona.");
    },
    [getValues, pushToast, remove]
  );
  return {
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
    dismissToast
  };
}

const NAV_LINKS = [
  { label: "Generator", href: "/app/generator" },
  { label: "Fiszki", href: "/app/flashcards" },
  { label: "Nauka", href: "/app/learn" },
  { label: "Kategorie", href: "/app/categories", requiresCollections: true }
];
function GeneratorPage() {
  const isCollectionsEnabled = isFeatureEnabled("collections");
  const filteredNavLinks = NAV_LINKS.filter((link) => {
    if (link.requiresCollections && !isCollectionsEnabled) {
      return false;
    }
    return true;
  });
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
    dismissToast
  } = useGeneratorView();
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "generator-page", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "generator-topbar", role: "banner", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "generator-logo", children: "Fiszki AI" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("nav", { "aria-label": "Główna nawigacja", children: /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "generator-nav-list", children: filteredNavLinks.map((link) => /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        "a",
        {
          href: link.href,
          className: clsx("generator-nav-link", {
            active: link.href === "/app/generator"
          }),
          "aria-current": link.href === "/app/generator" ? "page" : void 0,
          children: link.label
        }
      ) }, link.href)) }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "generator-user-slot", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "generator-user-avatar", "aria-hidden": "true", children: "U" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "generator-user-name", children: "twoje@konto.com" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("main", { className: "generator-content", role: "main", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      GeneratorLayout,
      {
        inputPanel: /* @__PURE__ */ jsxRuntimeExports.jsx(
          GeneratorInputPanel,
          {
            value: input.rawValue,
            charCount: input.trimmedLength,
            minLength: 1e3,
            maxLength: 1e4,
            isValid: input.isValidLength,
            isGenerating: input.isGenerating,
            onChange: setInputValue,
            onGenerate: generate
          }
        ),
        proposalsPanel: /* @__PURE__ */ jsxRuntimeExports.jsx(
          GeneratorProposalsPanel,
          {
            proposals,
            categories,
            categoriesLoading: isCategoriesLoading,
            collectionsEnabled: isCollectionsEnabled,
            onChange: updateProposal,
            onAccept: acceptProposal,
            onReject: rejectProposal
          }
        ),
        sidebar: /* @__PURE__ */ jsxRuntimeExports.jsx(GeneratorSidebar, {})
      }
    ) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(GeneratorToastStack, { toasts, onDismiss: dismissToast })
  ] });
}

const $$Generator = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Generator fiszek AI" }, { "default": ($$result2) => renderTemplate` ${renderComponent($$result2, "GeneratorPage", GeneratorPage, { "client:load": true, "client:component-hydration": "load", "client:component-path": "C:/Users/Wojtek/Desktop/10XDEVS/10x-astro-starter/src/react/generator/GeneratorPage.tsx", "client:component-export": "default" })} ` })}`;
}, "C:/Users/Wojtek/Desktop/10XDEVS/10x-astro-starter/src/pages/app/generator.astro", void 0);

const $$file = "C:/Users/Wojtek/Desktop/10XDEVS/10x-astro-starter/src/pages/app/generator.astro";
const $$url = "/app/generator";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Generator,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
