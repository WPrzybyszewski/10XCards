type FeatureFlagName = "auth" | "collections";
type EnvironmentName = "local" | "integration" | "prod";

type FeatureFlagConfig = Record<FeatureFlagName, boolean>;
type EnvironmentConfig = Record<EnvironmentName, FeatureFlagConfig>;

const ENV_VARIABLE_NAME = "ENV_NAME";

const ENVIRONMENT_FLAGS: EnvironmentConfig = {
  local: { auth: false, collections: true },
  integration: { auth: true, collections: false },
  prod: { auth: true, collections: true },
};

const DEFAULT_ENVIRONMENT: EnvironmentName = "local";
const VALID_ENVIRONMENTS = new Set<EnvironmentName>([
  "local",
  "integration",
  "prod",
]);

function readEnvironmentVariable(name: string): string | undefined {
  if (
    typeof process !== "undefined" &&
    typeof process.env === "object" &&
    process.env?.[name]
  ) {
    return process.env[name];
  }

  if (
    typeof import.meta !== "undefined" &&
    typeof import.meta.env === "object" &&
    (import.meta.env as Record<string, unknown>)[name]
  ) {
    const value = (import.meta.env as Record<string, unknown>)[name];
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }

  return undefined;
}

export function resolveEnvironment(customEnv?: string): EnvironmentName {
  const envName = customEnv ?? readEnvironmentVariable(ENV_VARIABLE_NAME);
  if (!envName) {
    return DEFAULT_ENVIRONMENT;
  }

  if (VALID_ENVIRONMENTS.has(envName as EnvironmentName)) {
    return envName as EnvironmentName;
  }

  return DEFAULT_ENVIRONMENT;
}

export function getEnvironmentFlags(
  envOverride?: EnvironmentName,
): FeatureFlagConfig {
  const environment = resolveEnvironment(envOverride);
  return { ...ENVIRONMENT_FLAGS[environment] };
}

export function isFeatureEnabled(
  feature: FeatureFlagName,
  options?: { envName?: EnvironmentName },
): boolean {
  const environment = resolveEnvironment(options?.envName);
  return ENVIRONMENT_FLAGS[environment]?.[feature] ?? false;
}

export type { EnvironmentName, FeatureFlagConfig, FeatureFlagName };

