import { error, json } from "@/lib/api/http";
import {
  COMPATIBILITY_PSYCHOTYPES,
  getCompatibilityMatrix,
  getCompatibilityRule,
} from "@/lib/compatibility";

export async function GET(request: Request) {
  const url = new URL(request.url);

  if (url.searchParams.get("matrix") === "1") {
    return json({
      psychotypes: [...COMPATIBILITY_PSYCHOTYPES],
      matrix: await getCompatibilityMatrix(),
    });
  }

  const typeA = url.searchParams.get("type_a")?.trim();
  const typeB = url.searchParams.get("type_b")?.trim();

  if (!typeA || !typeB) {
    return error("type_a and type_b query parameters are required", 400);
  }

  if (
    !COMPATIBILITY_PSYCHOTYPES.includes(
      typeA as (typeof COMPATIBILITY_PSYCHOTYPES)[number],
    ) ||
    !COMPATIBILITY_PSYCHOTYPES.includes(
      typeB as (typeof COMPATIBILITY_PSYCHOTYPES)[number],
    )
  ) {
    return error("Invalid psychotype code", 400);
  }

  const rule = await getCompatibilityRule(typeA, typeB);
  if (!rule) {
    return error("Compatibility rule not found", 404);
  }

  return json(rule);
}
