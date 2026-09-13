import { z } from "zod";
import { parsePkr } from "@/lib/money";

export const productSchema = z.object({
  articleName: z.string().trim().min(2, "Enter an article name.").max(160),
  mgmCode: z.string().trim().min(1, "Enter the MGM code.").max(40),
  subsysCode: z.string().trim().min(1, "Enter the Subsys code.").max(40),
  unit: z.string().trim().min(1, "Enter a unit.").max(20),
  defaultRate: z.union([z.string(), z.number()]).optional(),
});

export function parseOptionalRate(value: unknown) {
  if (value === undefined || value === null || String(value).trim() === "") return null;
  const rate = parsePkr(value);
  if (rate === null || rate <= 0) throw new Error("Default Metro rate must be greater than zero, or left blank.");
  return rate;
}

export function productErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "The product could not be saved.";
  if (message === "AUTH_REQUIRED") return Response.json({ error: "Sign in to continue." }, { status: 401 });
  if (message === "OWNER_REQUIRED") return Response.json({ error: "Only the master user can manage products." }, { status: 403 });
  if (message.includes("products_") || message.includes("duplicate key")) return Response.json({ error: "Article name, MGM code and Subsys code must each be unique." }, { status: 409 });
  return Response.json({ error: message.length > 220 ? "The product could not be saved." : message }, { status: 400 });
}
