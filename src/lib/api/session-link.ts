import { db } from "@/lib/db";

/** Привязать анонимную сессию теста к пользователю после входа. */
export async function attachSessionToUser(
  userId: string,
  sessionUuid: string | null | undefined,
): Promise<void> {
  if (!sessionUuid) {
    return;
  }

  await db.testSession.updateMany({
    where: {
      sessionUuid,
      userId: null,
    },
    data: { userId },
  });
}
