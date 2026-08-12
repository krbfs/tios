import { getSessionUuid } from "/js/session.js";

const TOKEN_KEY = "tc26_access_token";
const USER_KEY = "tc26_user";

export function getAccessToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser() {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveUserSession(accessToken, user) {
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearUserSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function buildResultUrl(encdata) {
  return `${window.location.origin}/quiz/result?encdata=${encodeURIComponent(encdata)}`;
}

async function authFetch(url, options = {}) {
  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("X-Session-Uuid", getSessionUuid());

  const response = await fetch(url, { ...options, headers });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Login failed");
  }

  return data;
}

export async function loginUser(email, password) {
  const data = await authFetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password, session_uuid: getSessionUuid() }),
  });

  saveUserSession(data.access_token, data.user);
  return data.user;
}

export async function registerUser(email, password) {
  await authFetch("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  return loginUser(email, password);
}

export async function authApiJson(url, options = {}) {
  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  const token = getAccessToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(url, { ...options, headers });
  const data = await response.json().catch(() => ({}));

  if (response.status === 401) {
    clearUserSession();
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/login.html?next=${next}`;
    throw new Error(data.error || "Unauthorized");
  }

  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`);
  }

  return data;
}

export async function requireUser() {
  if (!getAccessToken()) {
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/login.html?next=${next}`;
    return false;
  }
  return true;
}

export function logoutUser() {
  clearUserSession();
  window.location.href = "/login.html";
}
