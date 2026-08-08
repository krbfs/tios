"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/results";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    setMessage("Это демо-форма без бэкенда. Переходим дальше.");
    setTimeout(() => router.push(next), 600);
  };

  return (
    <div className="container-page py-12 max-w-md">
      <div className="rounded-lg border border-solid border-border p-6 shadow-sm bg-white">
        <h1 className="text-2xl font-bold text-center mb-2">Войти</h1>
        <p className="text-muted text-center text-sm mb-6">
          Для сохранения результата в профиле войдите в систему. Пока это только UI без авторизации.
        </p>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-md border border-solid border-border px-3 py-2"
              placeholder="you@example.com"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Пароль
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-md border border-solid border-border px-3 py-2"
              placeholder="••••••••"
            />
          </label>
          <button type="submit" className="btn btn-primary btn-lg w-full">
            Войти
          </button>
        </form>
        {message ? <p className="text-sm text-primary mt-4 text-center">{message}</p> : null}
        <p className="text-xs text-muted text-center mt-6">
          Google / Microsoft SSO появятся позже вместе с бэкендом.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="container-page py-12 text-muted">Загрузка…</div>}>
      <LoginForm />
    </Suspense>
  );
}
