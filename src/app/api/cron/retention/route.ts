import { cronSecret, retentionDays } from "@/lib/env";
import { fulfill } from "@/lib/fulfillment";
import { getPurchaseRepo } from "@/lib/purchases";
import { json } from "@/lib/security";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/** Cron diario: reintenta entregas fallidas y purga payloads cifrados caducados. Exige Bearer CRON_SECRET. */
export async function GET(req: Request) {
  const secret = cronSecret();
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return json(401, { error: "unauthorized" });
  const repo = getPurchaseRepo();
  if (!repo) return json(200, { skipped: "database_not_configured" });
  const pending = await repo.listUndelivered(25);
  let delivered = 0;
  let failed = 0;
  for (const p of pending) {
    const r = await fulfill(p);
    if (r.ok) delivered++;
    else failed++;
  }
  const purged = await repo.purgeExpiredPayloads(retentionDays()).catch(() => 0);
  return json(200, { retried: pending.length, delivered, failed, purged });
}
