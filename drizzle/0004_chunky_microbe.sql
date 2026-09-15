CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"city" text DEFAULT '' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "customer_id" uuid;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "customer_id" uuid;--> statement-breakpoint
WITH customer_sources AS (
	SELECT
		"customer_name" AS "name",
		"customer_city" AS "city",
		"created_by",
		row_number() OVER (
			PARTITION BY regexp_replace(
				regexp_replace(lower(replace(trim("customer_name"), '&', 'and')), '[^a-z0-9]+', '', 'g'),
				'(private|limited|pvt|ltd)+$', '', 'g'
			)
			ORDER BY length("customer_name") DESC, "created_at" DESC
		) AS "position"
	FROM "invoices"
	WHERE trim("customer_name") <> ''
)
INSERT INTO "customers" ("name", "city", "created_by")
SELECT "name", "city", "created_by"
FROM customer_sources
WHERE "position" = 1;--> statement-breakpoint
UPDATE "invoices" AS invoice
SET "customer_id" = customer."id"
FROM "customers" AS customer
WHERE regexp_replace(
	regexp_replace(lower(replace(trim(invoice."customer_name"), '&', 'and')), '[^a-z0-9]+', '', 'g'),
	'(private|limited|pvt|ltd)+$', '', 'g'
) = regexp_replace(
	regexp_replace(lower(replace(trim(customer."name"), '&', 'and')), '[^a-z0-9]+', '', 'g'),
	'(private|limited|pvt|ltd)+$', '', 'g'
);--> statement-breakpoint
UPDATE "payments" AS payment
SET "customer_id" = allocation_customer."customer_id"
FROM (
	SELECT DISTINCT ON (allocation."payment_id") allocation."payment_id", invoice."customer_id"
	FROM "payment_allocations" AS allocation
	INNER JOIN "invoices" AS invoice ON invoice."id" = allocation."invoice_id"
	ORDER BY allocation."payment_id", allocation."created_at"
) AS allocation_customer
WHERE payment."id" = allocation_customer."payment_id";--> statement-breakpoint
UPDATE "payments" AS payment
SET "customer_id" = customer."id"
FROM "customers" AS customer
WHERE payment."customer_id" IS NULL
	AND regexp_replace(
		regexp_replace(lower(replace(trim(payment."customer_name"), '&', 'and')), '[^a-z0-9]+', '', 'g'),
		'(private|limited|pvt|ltd)+$', '', 'g'
	) = regexp_replace(
		regexp_replace(lower(replace(trim(customer."name"), '&', 'and')), '[^a-z0-9]+', '', 'g'),
		'(private|limited|pvt|ltd)+$', '', 'g'
	);--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (SELECT 1 FROM "invoices" WHERE "customer_id" IS NULL) THEN
		RAISE EXCEPTION 'Could not assign a customer ID to every invoice';
	END IF;
	IF EXISTS (SELECT 1 FROM "payments" WHERE "customer_id" IS NULL) THEN
		RAISE EXCEPTION 'Could not assign a customer ID to every payment';
	END IF;
END
$$;--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "customer_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "customer_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_created_by_app_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_customers_name" ON "customers" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_customers_active" ON "customers" USING btree ("is_active");--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
REVOKE ALL ON TABLE "customers" FROM anon, authenticated;
