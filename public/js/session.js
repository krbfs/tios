const SESSION_KEY = "tc26_session_uuid";
const CONSENT_KEY = "tc26_consent_given";
const TEST_TOKEN_KEY = "tc26_test_token";

export const CONSENT_TEXT =
  "Я даю согласие на обработку моих персональных данных, включая результаты тестирования, в целях предоставления мне персонализированных рекомендаций, в соответствии с Политикой обработки персональных данных. Я понимаю, что результаты не являются медицинским диагнозом. Я могу отозвать согласие и удалить свои данные в любой момент в личном кабинете.";

export const CONSENT_HTML =
  "Я даю согласие на обработку моих персональных данных, включая результаты тестирования, в целях предоставления мне персонализированных рекомендаций, в соответствии с " +
  '<a href="/privacy.html" target="_blank" rel="noopener">Политикой</a>. ' +
  "Я понимаю, что результаты не являются медицинским диагнозом. Я могу отозвать согласие и удалить свои данные в любой момент в личном кабинете.";

export const CONSENT_VERSION = 1;

export function getSessionUuid() {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export function hasConsent() {
  return sessionStorage.getItem(CONSENT_KEY) === "1";
}

export function markConsentGiven() {
  sessionStorage.setItem(CONSENT_KEY, "1");
}

export function getTestToken() {
  return sessionStorage.getItem(TEST_TOKEN_KEY);
}

export function setTestToken(token) {
  sessionStorage.setItem(TEST_TOKEN_KEY, token);
}

export function clearTestToken() {
  sessionStorage.removeItem(TEST_TOKEN_KEY);
}

/**
 * Issue a start challenge, wait until min dwell if needed, then redeem for test_token.
 * @param {{ session_uuid?: string, website?: string, challengePayload?: object }} [antiBot]
 */
export async function startTestWithAntiBot(antiBot = {}) {
  let challengePayload = antiBot.challengePayload;
  if (!challengePayload?.challenge) {
    challengePayload = await apiJson("/api/test/challenge");
  }

  const challenge = challengePayload?.challenge;
  if (!challenge) {
    throw new Error("Не удалось начать тест");
  }

  const minWait = Number(challengePayload.min_wait_ms) || 2000;
  const issuedAt = Number(challengePayload.issued_at_ms) || Date.now();
  const waitMs = Math.max(0, minWait - (Date.now() - issuedAt));
  if (waitMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  const start = await apiJson("/api/test/start", {
    method: "POST",
    body: JSON.stringify({
      session_uuid: antiBot.session_uuid || getSessionUuid(),
      challenge,
      website: typeof antiBot.website === "string" ? antiBot.website : "",
    }),
  });

  if (!start?.test_token || start.test_token === "invalid") {
    throw new Error("Не удалось начать тест");
  }

  setTestToken(start.test_token);
  return start;
}

export async function apiJson(url, options = {}) {
  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  const sessionUuid = getSessionUuid();
  headers.set("X-Session-Uuid", sessionUuid);

  const token = localStorage.getItem("tc26_access_token");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const testToken = getTestToken();
  if (testToken) {
    headers.set("X-Test-Token", testToken);
  }

  const response = await fetch(url, { ...options, headers });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data.error || `HTTP ${response.status}`;
    throw new Error(message);
  }

  return data;
}

export function formatDate(iso) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}
