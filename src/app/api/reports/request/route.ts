import { requestReport } from "@/lib/leads";
import { clientIp, json, readJson, sameOrigin } from "@/lib/security";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  if (!sameOrigin(req)) return json(403, { error: "bad_origin" });
  let body: unknown;
  try {
    body = await readJson(req);
  } catch {
    return json(400, { error: "invalid_request" });
  }
  const result = await requestReport(body, clientIp(req));
  return json(result.status, result.body);
}
