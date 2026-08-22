type TelegramConfig = {
  botToken: string;
  chatId: string;
};

export function getTelegramConfig(): TelegramConfig | null {
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  if (!botToken || !chatId) {
    return null;
  }
  return { botToken, chatId };
}

export async function sendTelegramMessage(text: string): Promise<void> {
  const config = getTelegramConfig();
  if (!config) {
    throw new Error("Telegram is not configured");
  }

  const response = await fetch(
    `https://api.telegram.org/bot${config.botToken}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: config.chatId,
        text,
        disable_web_page_preview: true,
      }),
    },
  );

  const data = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    description?: string;
  };

  if (!response.ok || !data.ok) {
    throw new Error(data.description || `Telegram API HTTP ${response.status}`);
  }
}
