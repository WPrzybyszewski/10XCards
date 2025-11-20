# Feature Flags Plan

## Goals

- Decouple deployments from releases by activating functionality with feature flags.
- Use identical flag checks across API endpoints, Astro pages, and collection visibility logic.
- Keep configuration centralized and type-safe for both frontend and backend consumers.

## Requirements Recap

- Supported environments: `local`, `integration`, `prod`.
- Flags: `auth`, `collections` (boolean only).
- Environment source: `process.env.ENV_NAME` (defaults to `local` and falls back to `false` when undefined/invalid).
- No runtime environment switching needed after initialization.

## Implementation Outline

1. Create a shared module at `src/features/featureFlags.ts`.
2. Model environment names and flag names via TypeScript literal unions.
3. Store configuration in a constant `Record<EnvironmentName, { auth: boolean; collections: boolean }>` (tweak per needs).
4. Expose helpers:
   - `isFeatureEnabled(feature, options?)` → returns `false` for unknown env/flag.
   - `getEnvironmentFlags(envOverride?)` → returns a copy of the resolved environment config.
5. Resolve the environment using `process.env.ENV_NAME` with a safe default and validation.
6. Import the helper wherever needed (API routes, Astro pages, collection logic). Ensure client builds receive `ENV_NAME` via Vite env exposure when necessary.

## Reference Module Sketch

```ts
// src/features/featureFlags.ts
type FeatureFlagName = "auth" | "collections";
type EnvironmentName = "local" | "integration" | "prod";

type FeatureFlagConfig = Record<FeatureFlagName, boolean>;
type EnvironmentConfig = Record<EnvironmentName, FeatureFlagConfig>;

const ENVIRONMENT_FLAGS: EnvironmentConfig = {
  local: { auth: true, collections: true },
  integration: { auth: true, collections: false },
  prod: { auth: true, collections: true },
};

const DEFAULT_ENV: EnvironmentName = "local";
const VALID_ENVS = new Set<EnvironmentName>(["local", "integration", "prod"]);

function resolveEnvironment(customEnv?: string): EnvironmentName {
  const envName = customEnv ?? process.env.ENV_NAME;
  if (!envName) return DEFAULT_ENV;
  if (VALID_ENVS.has(envName as EnvironmentName)) return envName as EnvironmentName;
  return DEFAULT_ENV;
}

export function isFeatureEnabled(feature: FeatureFlagName, options?: { envName?: EnvironmentName }): boolean {
  const env = resolveEnvironment(options?.envName);
  return ENVIRONMENT_FLAGS[env]?.[feature] ?? false;
}

export function getEnvironmentFlags(envOverride?: EnvironmentName): FeatureFlagConfig {
  const env = resolveEnvironment(envOverride);
  return { ...ENVIRONMENT_FLAGS[env] };
}
```

## Next Steps

- Wire up `ENV_NAME` exposure for the client bundle if flags are needed in browser code.
- Replace hard-coded checks in endpoints/pages with `isFeatureEnabled(...)`.
- Plan integration tests covering flag-enabled/disabled scenarios for critical flows.
