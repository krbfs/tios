"use client";

import Link from "next/link";
import { useRef, useState } from "react";

type FormState = "idle" | "sending" | "success" | "error";

export function ContactForm() {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [company, setCompany] = useState("");
  const [state, setState] = useState<FormState>("idle");
  const [errorText, setErrorText] = useState("");
  const startedAtRef = useRef(Date.now());

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("sending");
    setErrorText("");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          contact,
          message,
          company,
          elapsedMs: Date.now() - startedAtRef.current,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Не удалось отправить сообщение");
      }

      setName("");
      setContact("");
      setMessage("");
      startedAtRef.current = Date.now();
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
        <span className="form-field-label">Контакт</span>
        <input
          type="text"
          name="contact"
          value={contact}
          onChange={(event) => setContact(event.target.value)}
          required
          minLength={1}
          maxLength={200}
          autoComplete="email"
          placeholder="Email, телефон или Telegram"
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

      <div
        aria-hidden="true"
        style={{ position: "absolute", left: "-9999px", width: 1, height: 1, overflow: "hidden" }}
      >
        <label>
          Компания
          <input
            type="text"
            name="company"
            value={company}
            onChange={(event) => setCompany(event.target.value)}
            tabIndex={-1}
            autoComplete="off"
          />
        </label>
      </div>

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
