import { calculate_result, normalizeAnswers } from "@/lib/calculations";
import { encodeAnswers } from "@/lib/encdata";
import { getAuthUser } from "@/lib/api/auth";
import { error, json, parseJson } from "@/lib/api/http";
import { db } from "@/lib/db";
import { assertHumanLikeTimings, requireTestAccess } from "@/lib/test-access";

type SubmitBody = {
  session_uuid?: string;
  answers?: (number | null)[];
  time_per_question?: number[];
};

export async function POST(request: Request) {
  const denied = await requireTestAccess(request, "submit");
  if (denied) {
    return denied;
  }

  const body = await parseJson<SubmitBody>(request);
  if (body instanceof Response) {
    return body;
  }

  const answers = body.answers;
  if (!Array.isArray(answers) || answers.length !== 75) {
    return error("answers must be an array of 75 integers", 400);
  }

  if (!Array.isArray(body.time_per_question)) {
    return error("time_per_question must be an array of 75 numbers", 400);
  }

  const timePerQuestion = body.time_per_question;
  const timingDenied = assertHumanLikeTimings(request, timePerQuestion);
  if (timingDenied) {
    return timingDenied;
  }

  let computed;
  let normalizedAnswers: number[];
  try {
    normalizedAnswers = normalizeAnswers(answers);
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
      answers: normalizedAnswers,
      scaledScores: computed.scaled_scores,
      scaledSystemic: computed.scaled_systemic,
      psychotypeCode: computed.psychotype_code,
      psychotypeSecondary: computed.psychotype_secondary,
      primaryType: computed.primary_type,
      secondaryType: computed.secondary_type,
      profileComplexity: computed.profile_complexity,
      cascadeLevelUsed: computed.cascade_level_used,
      clusterTendencies: computed.cluster_tendencies?.length
        ? computed.cluster_tendencies
        : undefined,
      triadVariant: computed.triad_variant,
      subIndexS: computed.sub_index_s,
      subIndexN: computed.sub_index_n,
      avgIntensity: computed.avg_intensity,
      validationWarnings: computed.validation_warnings,
      mode: "leader_resource",
    },
    include: { session: true },
  });

  return json(
    {
      result_id: result.id,
      encdata: encodeAnswers(normalizedAnswers),
      session_uuid: session.sessionUuid,
    },
    201,
  );
}
