import type { ApifyVideoItem } from "@/services/competitorVideoService";

const APIFY_BASE = "https://api.apify.com/v2";
const RUN_FETCH_TIMEOUT_MS = 15_000;
const DATASET_FETCH_TIMEOUT_MS = 25_000;

export interface ApifyLastRun {
  runId: string;
  datasetId: string;
}

interface ApifyRunResponse {
  data?: { id?: string; defaultDatasetId?: string; status?: string };
}

/** Lấy run SUCCEEDED gần nhất của một actor-task. Trả null nếu chưa có run nào. */
export async function fetchLastSucceededRun(
  taskId: string,
  token: string,
): Promise<ApifyLastRun | null> {
  const url = `${APIFY_BASE}/actor-tasks/${encodeURIComponent(taskId)}/runs/last?status=SUCCEEDED&token=${token}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(RUN_FETCH_TIMEOUT_MS) });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`apify_run_fetch_failed_${res.status}`);

  // Safe: Apify trả JSON theo shape ApifyRunResponse
  const json = (await res.json()) as ApifyRunResponse;
  const runId = json.data?.id;
  const datasetId = json.data?.defaultDatasetId;
  if (!runId || !datasetId) return null;
  return { runId, datasetId };
}

/** Lấy toàn bộ items của một dataset. */
export async function fetchDatasetItems(
  datasetId: string,
  token: string,
): Promise<ApifyVideoItem[]> {
  const url = `${APIFY_BASE}/datasets/${encodeURIComponent(datasetId)}/items?clean=true&format=json&token=${token}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(DATASET_FETCH_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`apify_dataset_fetch_failed_${res.status}`);
  // Safe: dataset items endpoint trả mảng JSON theo shape ApifyVideoItem
  return (await res.json()) as ApifyVideoItem[];
}
