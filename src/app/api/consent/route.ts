import { getAuthUser } from "@/lib/api/auth";
import { error, json, parseJson } from "@/lib/api/http";
import { CONSENT_TEXT, CONSENT_VERSION } from "@/lib/psychotypes";
import { db } from "@/lib/db";

type ConsentBody = {
  session_uuid?: string;
  consent_version?: number;
  consent_text?: string;
};

export async function POST(request: Request) {
  const body = await parseJson<ConsentBody>(request);
  if (body instanceof Response) {
    return body;
  }

  const sessionUuid = body.session_uuid?.trim();
  if (!sessionUuid) {
    return error("session_uuid is required", 400);
  }

  const consentText = body.consent_text?.trim() || CONSENT_TEXT;
  const consentVersion = body.consent_version ?? CONSENT_VERSION;

  const authUser = await getAuthUser(request);

  try {
    const consent = await db.userConsent.create({
      data: {
        sessionUuid,
        userId: authUser?.id,
        consentVersion,
        consentText,
      },
      select: {
        id: true,
        sessionUuid: true,
        consentVersion: true,
        consentedAt: true,
      },
    });

    return json(
      {
        id: consent.id,
        session_uuid: consent.sessionUuid,
        consent_version: consent.consentVersion,
        consented_at: consent.consentedAt.toISOString(),
      },
      201,
    );
  } catch (err) {
    console.error("consent create failed:", err);
    const message =
      err instanceof Error && err.message.includes("DATABASE_URL")
        ? "База данных недоступна. Обратитесь к администратору."
        : err instanceof Error
          ? err.message
          : "Failed to save consent";
    return error(message, 500);
  }
}
