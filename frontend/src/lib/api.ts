import { API_URL } from "@/lib/constants";
import type { FoodRecord, MenuExtraction, PlateAnalysis } from "@/types";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
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
    const body = (await res.json().catch(() => null)) as {
      detail?: unknown;
    } | null;
    const detail =
      typeof body?.detail === "string" ? body.detail : res.statusText;
    throw new ApiError(detail, res.status);
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
