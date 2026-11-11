import { API_URL } from "@/lib/constants";
import type {
  AiChatReply,
  FoodRecord,
  MenuExtraction,
  PlateAnalysis,
  Recommendations,
} from "@/types";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}

/** Human-readable message for a failed response. FastAPI sends
 *  {detail: string} or, for validation errors, {detail: [{msg}]}; gateways
 *  may send HTML. statusText is empty over HTTP/2, so never rely on it. */
async function errorMessage(res: Response): Promise<string> {
  const body = (await res.json().catch(() => null)) as { detail?: unknown } | null;
  const detail = body?.detail;
  if (typeof detail === "string" && detail) return detail;
  if (Array.isArray(detail) && typeof detail[0]?.msg === "string") {
    return `Invalid request: ${detail[0].msg}`;
  }
  if (res.status === 404 || res.status === 405) {
    return "The NutriMess server address looks wrong (check NEXT_PUBLIC_API_URL)";
  }
  if (res.status >= 500) {
    return `The NutriMess server had a problem (${res.status}). Please try again`;
  }
  return `Request failed (${res.status})`;
}

async function request<T>(
  path: string,
  accessToken: string | null,
  init: RequestInit
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: accessToken
        ? { ...init.headers, Authorization: `Bearer ${accessToken}` }
        : init.headers,
    });
  } catch {
    throw new ApiError(
      "Could not reach the NutriMess server. Is the backend running?",
      0
    );
  }

  if (!res.ok) {
    throw new ApiError(await errorMessage(res), res.status);
  }
  return (await res.json()) as T;
}

/** Send a menu photo to FastAPI → Gemini for structured extraction. */
export function extractMenu(
  file: File,
  accessToken: string
): Promise<MenuExtraction> {
  const form = new FormData();
  form.append("file", file);
  return request<MenuExtraction>("/api/menu/extract", accessToken, {
    method: "POST",
    body: form,
  });
}

/** Identify foods on a plate photo and estimate nutrition. */
export function analyzePlate(
  file: File,
  accessToken: string
): Promise<PlateAnalysis> {
  const form = new FormData();
  form.append("file", file);
  return request<PlateAnalysis>("/api/plate/analyze", accessToken, {
    method: "POST",
    body: form,
  });
}

/** Search the food database (DB foods + bundled mess dishes). */
export async function searchFoods(
  query: string,
  signal?: AbortSignal
): Promise<FoodRecord[]> {
  const params = new URLSearchParams({ q: query, limit: "10" });
  const res = await request<{ foods: FoodRecord[] }>(
    `/api/nutrition/foods?${params}`,
    null,
    { signal }
  );
  return res.foods;
}

/** Ask the AI nutrition assistant; omit sessionId to start a new chat. */
export function sendAiMessage(
  message: string,
  sessionId: string | null,
  accessToken: string
): Promise<AiChatReply> {
  return request<AiChatReply>("/api/chat", accessToken, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, session_id: sessionId }),
  });
}

/** Rule-based picks for the user's next meal (no AI call). */
export function getRecommendations(
  accessToken: string,
  signal?: AbortSignal
): Promise<Recommendations> {
  return request<Recommendations>("/api/chat/recommendations", accessToken, {
    signal,
  });
}
