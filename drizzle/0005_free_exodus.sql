CREATE INDEX "idx_invoices_customer" ON "invoices" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_payments_customer" ON "payments" USING btree ("customer_id");