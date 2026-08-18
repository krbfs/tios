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

export function isAdmin() {
  return getStoredUser()?.role === "admin";
}

export function saveSession(accessToken, user) {
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function adminApiJson(url, options = {}) {
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

  if (response.status === 401 || response.status === 403) {
    clearSession();
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/admin/login.html?next=${next}`;
    throw new Error(data.error || "Unauthorized");
  }

  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`);
  }

  return data;
}

export async function requireAdmin() {
  if (!getAccessToken() || !isAdmin()) {
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/admin/login.html?next=${next}`;
    return false;
  }
  return true;
}

export async function login(email, password) {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Login failed");
  }

  if (data.user?.role !== "admin") {
    throw new Error("Доступ только для администраторов");
  }

  saveSession(data.access_token, data.user);
  return data.user;
}

export function logout() {
  clearSession();
  window.location.href = "/admin/login.html";
}

export const MODES = [
  { value: "leader_resource", label: "Ресурс руководителя" },
  { value: "insighter", label: "Инсайтер (он/она)" },
  { value: "insighter_you", label: "Инсайтер (ты)" },
  { value: "stressless", label: "Стресслесс" },
  { value: "hr_table", label: "Таблица для HR" },
];

export function modeLabel(mode) {
  return MODES.find((item) => item.value === mode)?.label || mode;
}
