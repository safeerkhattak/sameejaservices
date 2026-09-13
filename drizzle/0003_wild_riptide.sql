CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mgm_code" text NOT NULL,
	"subsys_code" text NOT NULL,
	"article_name" text NOT NULL,
	"unit" text DEFAULT 'Kg' NOT NULL,
	"default_rate_paisa" bigint,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_default_rate_check" CHECK ("products"."default_rate_paisa" is null or "products"."default_rate_paisa" >= 0)
);
--> statement-breakpoint
ALTER TABLE "invoice_items" ADD COLUMN "product_id" uuid;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_created_by_app_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "products_mgm_code_key" ON "products" USING btree ("mgm_code");--> statement-breakpoint
CREATE UNIQUE INDEX "products_subsys_code_key" ON "products" USING btree ("subsys_code");--> statement-breakpoint
CREATE UNIQUE INDEX "products_article_name_key" ON "products" USING btree ("article_name");--> statement-breakpoint
CREATE INDEX "idx_products_active" ON "products" USING btree ("is_active");--> statement-breakpoint
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_invoice_items_product" ON "invoice_items" USING btree ("product_id");
--> statement-breakpoint
ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL ON TABLE "products" FROM anon, authenticated;
--> statement-breakpoint
INSERT INTO "products" ("mgm_code", "subsys_code", "article_name", "unit", "default_rate_paisa", "created_by")
SELECT seed.mgm_code, seed.subsys_code, seed.article_name, seed.unit, seed.default_rate_paisa, owner_user.id
FROM (VALUES
	('331394', '322313', 'Prime Whole Carcas Goat', 'Kg', 232000::bigint),
	('331395', '322314', 'Whole Boneless FQ (Beef)', 'Kg', NULL::bigint),
	('331396', '322315', 'Whole Boneless HQ (Beef)', 'Kg', NULL::bigint),
	('331397', '322316', 'Whole FQ Veal', 'Kg', 120000::bigint),
	('331398', '322317', 'Whole HQ Veal', 'Kg', 120000::bigint),
	('331399', '322318', 'Whole Beef Boneless HORECA', 'Kg', NULL::bigint),
	('331400', '322319', 'Whole Beef FQ (CDLE)', 'Kg', 78000::bigint),
	('331401', '322320', 'Veal Leg only', 'Kg', NULL::bigint),
	('331402', '322321', 'Prime Whole Carcas Lamb', 'Kg', 245000::bigint),
	('338287', '256261', 'Mutton leg safi', 'Kg', 230000::bigint),
	('331404', '322323', 'Non Branded Mutton', 'Kg', 150000::bigint),
	('338237', '256251', 'Mutton Shoulder safi', 'Kg', NULL::bigint)
) AS seed(mgm_code, subsys_code, article_name, unit, default_rate_paisa)
CROSS JOIN LATERAL (
	SELECT id FROM "app_users" WHERE role = 'owner' LIMIT 1
) AS owner_user
ON CONFLICT DO NOTHING;
--> statement-breakpoint
UPDATE "invoice_items"
SET "product_id" = "products"."id"
FROM "products"
WHERE "invoice_items"."product_id" IS NULL
	AND "invoice_items"."mgm_code" = "products"."mgm_code";
