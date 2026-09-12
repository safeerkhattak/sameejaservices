"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

declare global {
  interface Document {
    modelContext?: {
      registerTool: (tool: {
        name: string;
        title: string;
        description: string;
        inputSchema: object;
        execute: (input: unknown) => unknown | Promise<unknown>;
        annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean };
      }, options?: { signal?: AbortSignal }) => void | Promise<void>;
    };
  }
}

export function WebMcpTools() {
  const router = useRouter();
  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();

    const register = async () => {
      await context.registerTool({
        name: "start_invoice_creation",
        title: "Start invoice creation",
        description: "Open the Sameeja invoice entry form so the signed-in user can prepare and submit a new draft.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
        execute() {
          router.push("/invoices/new");
          return { status: "opening_invoice_form" };
        },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
      }, { signal: lifecycle.signal });

      await context.registerTool({
        name: "start_payment_allocation",
        title: "Start payment allocation",
        description: "Open the owner-only payment screen where a payment can be manually allocated to selected invoices.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
        execute() {
          router.push("/payments/new");
          return { status: "opening_payment_allocation" };
        },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
      }, { signal: lifecycle.signal });
    };

    void register().catch(() => undefined);
    return () => lifecycle.abort();
  }, [router]);
  return null;
}
