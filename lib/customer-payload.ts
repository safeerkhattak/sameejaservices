import { z } from "zod";

export const customerSchema = z.object({
  name: z.string().trim().min(2, "Enter a customer name.").max(180),
  city: z.string().trim().max(100, "City must be 100 characters or fewer."),
});

export function customerErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "The customer could not be saved.";
  if (message === "AUTH_REQUIRED") return Response.json({ error: "Sign in to continue." }, { status: 401 });
  if (message === "OWNER_REQUIRED") return Response.json({ error: "Only the master user can manage customers." }, { status: 403 });
  return Response.json({ error: message.length > 220 ? "The customer could not be saved." : message }, { status: 400 });
}
