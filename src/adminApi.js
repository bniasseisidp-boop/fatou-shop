let csrfToken = "";

async function decodeResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json")
    ? await response.json()
    : { message: await response.text() };

  if (!response.ok) {
    const validationMessage = body.errors
      ? Object.values(body.errors).flat().join(" ")
      : "";
    throw new Error(validationMessage || body.message || "La requête a échoué.");
  }

  return body;
}

export async function api(path, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const headers = new Headers(options.headers || {});
  headers.set("Accept", "application/json");

  const isFormData = options.body instanceof FormData;
  if (options.body && !isFormData && typeof options.body !== "string") {
    headers.set("Content-Type", "application/json");
    options.body = JSON.stringify(options.body);
  }

  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    if (!csrfToken) {
      csrfToken = (await api("/csrf-token")).token;
    }
    headers.set("X-CSRF-TOKEN", csrfToken);
  }

  const response = await fetch(`/api${path}`, {
    ...options,
    method,
    headers,
    credentials: "same-origin",
  });
  const result = await decodeResponse(response);

  if (result.csrf_token) {
    csrfToken = result.csrf_token;
  }

  return result;
}
