export interface E2eEnvironment {
  MONGODB_URI: string;
  MONGODB_DB_NAME: string;
  E2E_ADMIN_EMAIL: string;
  E2E_ADMIN_PASSWORD: string;
}

function required(name: keyof E2eEnvironment): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for E2E tests.`);
  return value;
}

export function getE2eEnvironment(): E2eEnvironment {
  const environment = {
    MONGODB_URI: required("MONGODB_URI"),
    MONGODB_DB_NAME: required("MONGODB_DB_NAME"),
    E2E_ADMIN_EMAIL: required("E2E_ADMIN_EMAIL"),
    E2E_ADMIN_PASSWORD: required("E2E_ADMIN_PASSWORD"),
  };

  if (!environment.MONGODB_DB_NAME.includes("-e2e-")) {
    throw new Error("E2E database name must contain the isolation marker.");
  }

  return environment;
}
