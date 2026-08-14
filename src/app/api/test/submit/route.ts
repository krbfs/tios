import { calculate_result } from "@/lib/calculations";
import { encodeAnswers } from "@/lib/encdata";
import { getAuthUser } from "@/lib/api/auth";
import { error, json, parseJson } from "@/lib/api/http";
import { db } from "@/lib/db";

type SubmitBody = {
  session_uuid?: string;
  answers?: number[];
  time_per_question?: number[];
};

export async function POST(request: Request) {
  const body = await parseJson<SubmitBody>(request);
  if (body instanceof Response) {
    return body;
  }

  const answers = body.answers;
  if (!Array.isArray(answers) || answers.length !== 75) {
    return error("answers must be an array of 75 integers", 400);
  }

  const timePerQuestion =
    body.time_per_question ??
    Array.from({ length: 75 }, () => 5);

  if (!Array.isArray(timePerQuestion) || timePerQuestion.length !== 75) {
    return error("time_per_question must be an array of 75 numbers", 400);
  }

  let computed;
  try {
    computed = calculate_result(answers, timePerQuestion);
  } catch (err) {
    return error(
      err instanceof Error ? err.message : "Invalid answers",
      400,
    );
  }

  const authUser = await getAuthUser(request);
  let session =
    body.session_uuid &&
    (await db.testSession.findUnique({
      where: { sessionUuid: body.session_uuid },
    }));

  if (session && authUser && !session.userId) {
    session = await db.testSession.update({
      where: { id: session.id },
      data: { userId: authUser.id },
    });
  }

  if (!session) {
    session = await db.testSession.create({
      data: {
        ...(body.session_uuid ? { sessionUuid: body.session_uuid } : {}),
        userId: authUser?.id,
        completedAt: new Date(),
      },
    });
  } else {
    session = await db.testSession.update({
      where: { id: session.id },
      data: { completedAt: new Date() },
    });
  }

  const result = await db.testResult.create({
    data: {
      sessionId: session.id,
      answers,
      scaledScores: computed.scaled_scores,
      scaledSystemic: computed.scaled_systemic,
      psychotypeCode: computed.psychotype_code,
      psychotypeSecondary: computed.psychotype_secondary,
      avgIntensity: computed.avg_intensity,
      validationWarnings: computed.validation_warnings,
      mode: "leader_resource",
    },
    include: { session: true },
  });

  return json(
    {
      result_id: result.id,
      encdata: encodeAnswers(answers),
      session_uuid: session.sessionUuid,
      psychotype_code: result.psychotypeCode,
      psychotype_secondary: result.psychotypeSecondary,
      avg_intensity: result.avgIntensity,
      scaled_scores: result.scaledScores,
      scaled_systemic: result.scaledSystemic,
      validation_warnings: result.validationWarnings,
      warnings: computed.warnings,
      mode: result.mode,
    },
    201,
  );
}
