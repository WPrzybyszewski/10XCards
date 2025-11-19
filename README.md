## Project name

Fiszki AI

## Project description

Fiszki AI is a web application that streamlines the creation and study of educational flashcards.  
The main problem it addresses is that manually creating high‑quality flashcards is time‑consuming, which discourages learners from using spaced repetition despite its proven effectiveness.

The MVP focuses on:
- generating flashcard proposals from user‑provided text using AI,
- manual creation, editing and deletion of flashcards,
- organizing flashcards into user‑defined categories,
- storing all data per user account (no guest mode),
- a simple learning mode that shows random cards one by one (no SRS yet).

More detailed product requirements are documented in `.ai/prd.md`.

## Tech stack

### Frontend

- Astro 5 – fast, island‑based web framework with minimal JavaScript by default
- React 19 – used for interactive components where client‑side interactivity is needed
- TypeScript 5 – static typing and better IDE support
- Tailwind CSS 4 – utility‑first styling
- shadcn/ui – accessible, composable React UI components used as a base for the UI

### Backend

- Supabase
  - PostgreSQL database
  - built‑in authentication and user management
  - SDK that acts as Backend‑as‑a‑Service

### AI integration

- Openrouter.ai
  - unified interface to many models (OpenAI, Anthropic, Google and others)
  - financial limits and key‑level budgeting

### CI/CD and hosting

- GitHub Actions – CI/CD pipelines
- DigitalOcean – hosting via Docker image

### Testing

- **Unit & integration tests**: Vitest lub Jest wraz z `@testing-library/react` do testowania logiki domenowej, walidacji oraz komponentów React.
- **End‑to‑end (E2E)**: Playwright lub Cypress do automatycznego testowania kluczowych przepływów użytkownika (auth, generator fiszek, akceptacja propozycji).

## Getting started locally

### Prerequisites

- Node.js `22.14.0` (as specified in `.nvmrc`)
- npm (comes with Node.js)
- Supabase project with URL and anon key
- Openrouter.ai API key

### 1. Clone the repository

```bash
git clone https://github.com/przeprogramowani/10x-astro-starter.git
cd 10x-astro-starter
```

### 2. Set Node version

If you use `nvm`:

```bash
nvm use
```

This will select Node.js `22.14.0` as specified in `.nvmrc`.

### 3. Install dependencies

```bash
npm install
```

### 4. Configure environment variables

Create a `.env` (or use your preferred env mechanism) with at least:

```bash
SUPABASE_URL=your-supabase-url
SUPABASE_KEY=your-supabase-anon-key
OPENROUTER_API_KEY=your-openrouter-api-key
```

Exact variable names for Supabase and Openrouter integration should match the implementation in `src/db` and API routes.

### 5. Run the development server

```bash
npm run dev
```

The dev server will start on the port configured by Astro (typically `http://localhost:4321`).

### 6. Build and preview production build

Build:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## Available scripts

From `package.json`:

- `npm run dev` – start the Astro dev server
- `npm run build` – build the app for production
- `npm run preview` – preview the production build locally
- `npm run astro` – run the Astro CLI directly
- `npm run lint` – run ESLint over the project
- `npm run lint:fix` – run ESLint with auto‑fix
- `npm run format` – run Prettier formatting over supported files

## Project scope

### In scope for MVP

- User accounts with authentication via Supabase (no guest mode)
- User‑owned flashcards with:
  - required `front` (max 200 characters, trimmed),
  - required `back` (max 500 characters, trimmed),
  - required category
- User‑defined categories, including automatic reassignment of cards to a default category (for example “inne/other”) when a category is removed
- Manual creation, editing and deletion of flashcards
- AI‑assisted generation:
  - user pastes input text,
  - backend requests AI via Openrouter,
  - exactly three flashcard proposals are returned,
  - each proposal can be edited and then accepted or discarded
- Simple learning mode:
  - shows one random card at a time,
  - “show answer” and “next” actions,
  - avoids repeating the same card in a single session
- Minimal logging of key events:
  - `generate_requested`,
  - `generate_failed`,
  - `proposal_accepted`.

### Out of scope for MVP

- Any custom or advanced spaced repetition algorithm (SuperMemo/Anki‑style SRS)
- Scheduling and tracking of review intervals
- Importing content from rich formats (PDF, DOCX, images, etc.)
- Sharing decks between users or making decks public
- Integrations with external learning platforms
- Native mobile applications (MVP is web‑only)
- Advanced library features (full‑text search, complex filtering, sorting)
- Formal KPI dashboards and advanced analytics (only minimal technical logging is implemented in MVP)

## Project status

- Current stage: MVP in active development
- Stability: suitable for local development and experimentation; not yet hardened for production at scale
- Roadmap (high‑level):
  - iterate on AI prompts and quality of generated cards,
  - introduce basic analytics and real KPIs,
  - design and implement a spaced repetition system,
  - extend the library and learning experience.

## License

This project is released under the MIT License. A full license text should be added as `LICENSE` in the repository root if it is not already present.
