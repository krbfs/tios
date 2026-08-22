import { db } from "@/lib/db";
import { json } from "@/lib/api/http";
import { requireTestAccess } from "@/lib/test-access";

export async function GET(request: Request) {
  const denied = await requireTestAccess(request, "questions");
  if (denied) {
    return denied;
  }

  const questions = await db.question.findMany({
    orderBy: { id: "asc" },
    select: {
      id: true,
      leftText: true,
      rightText: true,
    },
  });

  return json(
    questions.map((question) => ({
      id: question.id,
      left_text: question.leftText,
      right_text: question.rightText,
    })),
  );
}
