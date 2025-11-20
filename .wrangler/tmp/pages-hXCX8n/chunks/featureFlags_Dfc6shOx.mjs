globalThis.process ??= {}; globalThis.process.env ??= {};
const __vite_import_meta_env__ = {"ASSETS_PREFIX": undefined, "BASE_URL": "/", "DEV": false, "MODE": "production", "PROD": true, "SITE": undefined, "SSR": true};
const ENV_VARIABLE_NAME = "ENV_NAME";
const ENVIRONMENT_FLAGS = {
  local: { auth: false, collections: true },
  integration: { auth: true, collections: false },
  prod: { auth: true, collections: true }
};
const DEFAULT_ENVIRONMENT = "local";
const VALID_ENVIRONMENTS = /* @__PURE__ */ new Set([
  "local",
  "integration",
  "prod"
]);
function readEnvironmentVariable(name) {
  if (typeof process !== "undefined" && typeof process.env === "object" && process.env?.[name]) {
    return process.env[name];
  }
  if (typeof import.meta !== "undefined" && typeof (Object.assign(__vite_import_meta_env__, { ENV_NAME: "prod" })) === "object" && Object.assign(__vite_import_meta_env__, { ENV_NAME: "prod" })[name]) {
    const value = Object.assign(__vite_import_meta_env__, { ENV_NAME: "prod" })[name];
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }
  return void 0;
}
function resolveEnvironment(customEnv) {
  const envName = readEnvironmentVariable(ENV_VARIABLE_NAME);
  if (!envName) {
    return DEFAULT_ENVIRONMENT;
  }
  if (VALID_ENVIRONMENTS.has(envName)) {
    return envName;
  }
  return DEFAULT_ENVIRONMENT;
}
function isFeatureEnabled(feature, options) {
  const environment = resolveEnvironment();
  return ENVIRONMENT_FLAGS[environment]?.[feature] ?? false;
}

export { isFeatureEnabled as i };
