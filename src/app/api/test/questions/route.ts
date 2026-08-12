import { db } from "@/lib/db";
import { json } from "@/lib/api/http";

export async function GET() {
  const questions = await db.question.findMany({
    orderBy: { id: "asc" },
  });

  return json(
    questions.map((question) => ({
      id: question.id,
      left_text: question.leftText,
      right_text: question.rightText,
      factor_group: question.factorGroup,
      sub_factor: question.subFactor,
      tendency_positive: question.tendencyPositive,
      tendency_negative: question.tendencyNegative,
    })),
  );
}
