import { z } from "zod";
import { COUNTRIES, LOCALES } from "@/lib/i18n/config";

/** Fronteras HTTP: strictObject (sin campos adicionales) + tipos exactos, sin coerciones silenciosas. */
export const InputsSchema = z.strictObject({
  age: z.number(),
  waist_threshold_sex: z.enum(["female", "male"]),
  body_measurements: z.strictObject({ height_cm: z.number(), weight_kg: z.number(), waist_cm: z.number() }),
  physical_activity_30m_daily: z.boolean(),
  fruit_veg_daily: z.boolean(),
  antihypertensive_medication: z.boolean(),
  history_high_glucose: z.boolean(),
  family_history: z.enum(["none", "second_degree", "first_degree"]),
});

export const ReportRequestSchema = z.strictObject({
  locale: z.enum(LOCALES),
  country_code: z.enum(COUNTRIES),
  inputs: InputsSchema,
  email: z.string().min(5).max(254),
  consent_report_delivery: z.boolean(),
  consent_owner_copy: z.boolean().optional(),
  /** Honeypot anti-bot: debe llegar vacío. */
  website: z.string().max(200).optional(),
});
export type ReportRequest = z.infer<typeof ReportRequestSchema>;

export const PurchaseStartSchema = z.strictObject({
  unlock_token: z.string().min(20).max(4000),
  accept_terms: z.boolean(),
});

export const CreateOrderSchema = z.strictObject({
  purchase_id: z.string().uuid(),
  unlock_token: z.string().min(20).max(4000),
  accept_terms: z.boolean().optional(),
});

export const CaptureSchema = z.strictObject({
  purchase_id: z.string().uuid(),
  order_id: z.string().min(5).max(64),
  unlock_token: z.string().min(20).max(4000),
});

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
