const LOG_PREFIX = "[ServerAction]";

type LogDetails = Record<string, unknown> | undefined;

function buildPrefix(scope: string) {
  const timestamp = new Date().toISOString();
  return `${LOG_PREFIX} ${timestamp} :: ${scope}`;
}

export function logServerEvent(scope: string, message: string, details?: LogDetails) {
  const prefix = `${buildPrefix(scope)} — ${message}`;
  if (details) {
    console.log(prefix, details);
  } else {
    console.log(prefix);
  }
}

export function logServerError(
  scope: string,
  error: unknown,
  details?: LogDetails,
) {
  const prefix = `${buildPrefix(scope)} — ERROR`;
  const payload = {
    ...details,
    errorMessage: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  };
  console.error(prefix, payload);
}

