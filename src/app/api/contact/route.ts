import { error, json, parseJson } from "@/lib/api/http";
import { sendTelegramMessage } from "@/lib/telegram";

type ContactBody = {
  name?: string;
  message?: string;
};

const NAME_MIN = 1;
const NAME_MAX = 120;
const MESSAGE_MIN = 1;
const MESSAGE_MAX = 4000;

function formatContactMessage(name: string, message: string): string {
  return [
    "Новое сообщение с сайта TIOS",
    "",
    `Имя: ${name}`,
    "",
    "Сообщение:",
    message,
  ].join("\n");
}

export async function POST(request: Request) {
  const body = await parseJson<ContactBody>(request);
  if (body instanceof Response) {
    return body;
  }

  const name = body.name?.trim() ?? "";
  const message = body.message?.trim() ?? "";

  if (name.length < NAME_MIN || name.length > NAME_MAX) {
    return error(`Имя: от ${NAME_MIN} до ${NAME_MAX} символов`, 400);
  }

  if (message.length < MESSAGE_MIN || message.length > MESSAGE_MAX) {
    return error(`Сообщение: от ${MESSAGE_MIN} до ${MESSAGE_MAX} символов`, 400);
  }

  try {
    await sendTelegramMessage(formatContactMessage(name, message));
    return json({ ok: true });
  } catch (err) {
    console.error("contact telegram send failed:", err);
    const configured = err instanceof Error && err.message === "Telegram is not configured";
    return error(
      configured
        ? "Форма временно недоступна. Попробуйте позже."
        : "Не удалось отправить сообщение. Попробуйте позже.",
      configured ? 503 : 502,
    );
  }
}
