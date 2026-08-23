import { db } from "@/lib/db";
import { error, json } from "@/lib/api/http";
import { encryptQuestionsPayload } from "@/lib/questions-payload";
import {
  advanceQuestionPageAccess,
  assertQuestionPageAccess,
  extractTestToken,
  QUESTION_PAGE_SIZE,
  QUESTION_TOTAL,
  QUESTION_TOTAL_PAGES,
  requireTestAccess,
} from "@/lib/test-access";

export async function GET(request: Request) {
  const denied = await requireTestAccess(request, "questions");
  if (denied) {
    return denied;
  }

  const url = new URL(request.url);
  const rawPage = url.searchParams.get("page");
  if (rawPage == null || rawPage === "") {
    return error("page query parameter is required (0–14)", 400);
  }

  const page = Number(rawPage);
  if (!Number.isInteger(page) || page < 0 || page >= QUESTION_TOTAL_PAGES) {
    return error("page must be an integer from 0 to 14", 400);
  }

  const token = extractTestToken(request);
  if (!token) {
    return error("Test session required. Start the test from /test.", 401);
  }

  const pageDenied = assertQuestionPageAccess(request, token, page);
  if (pageDenied) {
    return pageDenied;
  }

  const skip = page * QUESTION_PAGE_SIZE;
  const rows = await db.question.findMany({
    orderBy: { id: "asc" },
    skip,
    take: QUESTION_PAGE_SIZE,
    select: {
      id: true,
      leftText: true,
      rightText: true,
    },
  });

  advanceQuestionPageAccess(token, page);

  return json(
    encryptQuestionsPayload(token, {
      page,
      page_size: QUESTION_PAGE_SIZE,
      total: QUESTION_TOTAL,
      total_pages: QUESTION_TOTAL_PAGES,
      questions: rows.map((question) => ({
        id: question.id,
        left_text: question.leftText,
        right_text: question.rightText,
      })),
    }),
  );
}
