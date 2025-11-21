import process from "node:process";

const REQUIRED_ENV_VARS = [
  "SUPABASE_URL",
  "SUPABASE_PUBLIC_KEY",
  "OPENROUTER_API_KEY",
  "PUBLIC_ENV_NAME",
] as const;

let initialized = false;

export const bootstrapRuntimeDiagnostics = (): void => {
  if (initialized) {
    return;
  }
  initialized = true;

  logEnvironmentSummary();
  attachProcessErrorLogging();
  logSignalHandling();
};

const logEnvironmentSummary = (): void => {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);

  console.log(`[runtime] Fiszki AI booting… PID=${process.pid}`);

  if (missing.length > 0) {
    console.error(
      `[runtime] Missing required environment variables: ${missing.join(", ")}`,
    );
  } else {
    console.log(
      `[runtime] Environment check passed. PORT=${process.env.PORT ?? "3000"}`,
    );
  }
};

const attachProcessErrorLogging = (): void => {
  process.on("unhandledRejection", (reason) => {
    console.error("[runtime] Unhandled promise rejection detected:", reason);
  });

  process.on("uncaughtException", (error) => {
    console.error("[runtime] Uncaught exception detected:", error);
  });
};

const logSignalHandling = (): void => {
  const signals: NodeJS.Signals[] = [
    "SIGTERM",
    "SIGINT",
    "SIGHUP",
    "SIGUSR2",
  ];

  signals.forEach((signal) => {
    process.once(signal, () => {
      console.warn(`[runtime] Received ${signal}, shutting down gracefully…`);
    });
  });
};

