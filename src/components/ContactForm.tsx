"use client";

import { useState } from "react";

type FormState = "idle" | "sending" | "success" | "error";

export function ContactForm() {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<FormState>("idle");
  const [errorText, setErrorText] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("sending");
    setErrorText("");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, message }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Не удалось отправить сообщение");
      }

      setName("");
      setMessage("");
      setState("success");
    } catch (err) {
      setState("error");
      setErrorText(err instanceof Error ? err.message : "Не удалось отправить сообщение");
    }
  }

  return (
    <form className="contact-form" onSubmit={handleSubmit}>
      <label className="form-field">
        <span className="form-field-label">Имя</span>
        <input
          type="text"
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          minLength={1}
          maxLength={120}
          autoComplete="name"
          disabled={state === "sending"}
        />
      </label>

      <label className="form-field">
        <span className="form-field-label">Сообщение</span>
        <textarea
          name="message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          required
          minLength={1}
          maxLength={4000}
          rows={6}
          disabled={state === "sending"}
        />
      </label>

      <button className="btn btn-primary" type="submit" disabled={state === "sending"}>
        {state === "sending" ? "Отправка…" : "Отправить"}
      </button>

      {state === "success" ? (
        <p className="form-status form-status--success" role="status">
          Спасибо! Сообщение отправлено — мы ответим в ближайшее время.
        </p>
      ) : null}

      {state === "error" ? (
        <p className="form-status form-status--error" role="alert">
          {errorText}
        </p>
      ) : null}
    </form>
  );
}
