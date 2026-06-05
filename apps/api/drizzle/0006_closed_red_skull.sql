CREATE TABLE "cities" (
	"id" serial PRIMARY KEY NOT NULL,
	"country_code" varchar(2) NOT NULL,
	"name" varchar(100) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "connector_types" (
	"code" varchar(40) PRIMARY KEY NOT NULL,
	"display_name" varchar(100) NOT NULL,
	"current_type" varchar(10) NOT NULL,
	"vehicle_label" varchar(40) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "districts" (
	"id" serial PRIMARY KEY NOT NULL,
	"city_id" integer NOT NULL,
	"name" varchar(100) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pricing_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"connector_type_code" varchar(40) NOT NULL,
	"price_per_kwh" numeric(10, 4) NOT NULL,
	"currency" varchar(3) DEFAULT 'TRY' NOT NULL,
	"valid_from" timestamp with time zone NOT NULL,
	"valid_to" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "tax_rates" (
	"id" serial PRIMARY KEY NOT NULL,
	"rate" numeric(5, 4) NOT NULL,
	"valid_from" timestamp with time zone NOT NULL,
	"valid_to" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "districts" ADD CONSTRAINT "districts_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pricing_rules" ADD CONSTRAINT "pricing_rules_connector_type_code_connector_types_code_fk" FOREIGN KEY ("connector_type_code") REFERENCES "public"."connector_types"("code") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "cities_country_name_unique" ON "cities" USING btree ("country_code","name");
--> statement-breakpoint
CREATE UNIQUE INDEX "districts_city_name_unique" ON "districts" USING btree ("city_id","name");
--> statement-breakpoint
CREATE INDEX "districts_city_id_idx" ON "districts" USING btree ("city_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "pricing_rules_connector_valid_from_unique" ON "pricing_rules" USING btree ("connector_type_code","valid_from");
--> statement-breakpoint
CREATE INDEX "pricing_rules_connector_type_code_idx" ON "pricing_rules" USING btree ("connector_type_code");
--> statement-breakpoint
CREATE UNIQUE INDEX "tax_rates_valid_from_unique" ON "tax_rates" USING btree ("valid_from");
--> statement-breakpoint
INSERT INTO "connector_types" ("code", "display_name", "current_type", "vehicle_label") VALUES
	('AC_TYPE2', 'AC Type 2', 'AC', 'Type-2'),
	('DC_CCS2', 'DC CCS2', 'DC', 'CCS'),
	('DC_CHADEMO', 'DC CHAdeMO', 'DC', 'CHAdeMO'),
	('DC_GB_T', 'DC GB/T', 'DC', 'GB/T')
ON CONFLICT ("code") DO NOTHING;
--> statement-breakpoint
INSERT INTO "pricing_rules" ("connector_type_code", "price_per_kwh", "currency", "valid_from", "valid_to")
SELECT connector_types.code, '7.5000', 'TRY', '1970-01-01T00:00:00Z'::timestamptz, NULL
FROM "connector_types"
ON CONFLICT ("connector_type_code", "valid_from") DO NOTHING;
--> statement-breakpoint
INSERT INTO "tax_rates" ("rate", "valid_from", "valid_to") VALUES
	('0.2000', '1970-01-01T00:00:00Z'::timestamptz, NULL)
ON CONFLICT ("valid_from") DO NOTHING;
--> statement-breakpoint
ALTER TABLE "addresses" ADD COLUMN "district_id" integer;
--> statement-breakpoint
ALTER TABLE "plugs" ADD COLUMN "connector_type_code" varchar(40);
--> statement-breakpoint
ALTER TABLE "receipts" ADD COLUMN "pricing_rule_id" integer;
--> statement-breakpoint
ALTER TABLE "receipts" ADD COLUMN "tax_rate_id" integer;
--> statement-breakpoint
ALTER TABLE "stations" ADD COLUMN "district_id" integer;
--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "connector_type_code" varchar(40);
--> statement-breakpoint
INSERT INTO "cities" ("country_code", "name")
SELECT DISTINCT 'TR', trim("city")
FROM "stations"
WHERE nullif(trim("city"), '') IS NOT NULL
ON CONFLICT ("country_code", "name") DO NOTHING;
--> statement-breakpoint
INSERT INTO "cities" ("country_code", "name")
SELECT DISTINCT
	CASE WHEN length(trim("country")) = 2 THEN upper(trim("country")) ELSE 'TR' END,
	trim("city")
FROM "addresses"
WHERE nullif(trim("city"), '') IS NOT NULL
ON CONFLICT ("country_code", "name") DO NOTHING;
--> statement-breakpoint
INSERT INTO "districts" ("city_id", "name")
SELECT DISTINCT cities.id, trim(stations."district")
FROM "stations"
INNER JOIN "cities" ON cities."country_code" = 'TR' AND cities."name" = trim(stations."city")
WHERE nullif(trim(stations."district"), '') IS NOT NULL
ON CONFLICT ("city_id", "name") DO NOTHING;
--> statement-breakpoint
INSERT INTO "districts" ("city_id", "name")
SELECT DISTINCT cities.id, trim(addresses."district")
FROM "addresses"
INNER JOIN "cities" ON cities."country_code" = CASE WHEN length(trim(addresses."country")) = 2 THEN upper(trim(addresses."country")) ELSE 'TR' END
	AND cities."name" = trim(addresses."city")
WHERE nullif(trim(addresses."district"), '') IS NOT NULL
ON CONFLICT ("city_id", "name") DO NOTHING;
--> statement-breakpoint
UPDATE "stations"
SET "district_id" = districts.id
FROM "districts"
INNER JOIN "cities" ON districts."city_id" = cities.id
WHERE cities."country_code" = 'TR'
	AND cities."name" = trim(stations."city")
	AND districts."name" = trim(stations."district");
--> statement-breakpoint
UPDATE "addresses"
SET "district_id" = districts.id
FROM "districts"
INNER JOIN "cities" ON districts."city_id" = cities.id
WHERE cities."country_code" = CASE WHEN length(trim(addresses."country")) = 2 THEN upper(trim(addresses."country")) ELSE 'TR' END
	AND cities."name" = trim(addresses."city")
	AND districts."name" = trim(addresses."district");
--> statement-breakpoint
UPDATE "plugs"
SET "connector_type_code" = CASE "plug_type"
	WHEN 'AC_TYPE2' THEN 'AC_TYPE2'
	WHEN 'DC_CCS2' THEN 'DC_CCS2'
	WHEN 'DC_CHADEMO' THEN 'DC_CHADEMO'
	WHEN 'DC_GB_T' THEN 'DC_GB_T'
	WHEN 'Type-2' THEN 'AC_TYPE2'
	WHEN 'Type 2' THEN 'AC_TYPE2'
	WHEN 'CCS' THEN 'DC_CCS2'
	WHEN 'CHAdeMO' THEN 'DC_CHADEMO'
	ELSE NULL
END;
--> statement-breakpoint
UPDATE "vehicles"
SET "connector_type_code" = CASE "connector_type"
	WHEN 'Type-2' THEN 'AC_TYPE2'
	WHEN 'CCS' THEN 'DC_CCS2'
	WHEN 'CHAdeMO' THEN 'DC_CHADEMO'
	ELSE NULL
END;
--> statement-breakpoint
UPDATE "receipts"
SET "tax_rate_id" = tax_rates.id
FROM "tax_rates"
WHERE tax_rates."valid_from" = '1970-01-01T00:00:00Z'::timestamptz;
--> statement-breakpoint
UPDATE "receipts"
SET "pricing_rule_id" = pricing_rules.id
FROM "sessions"
INNER JOIN "plugs" ON sessions."plug_code" = plugs."plug_code"
INNER JOIN "pricing_rules" ON pricing_rules."connector_type_code" = plugs."connector_type_code"
	AND pricing_rules."valid_from" = '1970-01-01T00:00:00Z'::timestamptz
WHERE receipts."session_id" = sessions.id;
--> statement-breakpoint
DO $$
DECLARE
	mismatch_count integer;
BEGIN
	SELECT count(*) INTO mismatch_count
	FROM "receipts"
	INNER JOIN "sessions" ON receipts."session_id" = sessions.id
	INNER JOIN "pricing_rules" ON receipts."pricing_rule_id" = pricing_rules.id
	INNER JOIN "tax_rates" ON receipts."tax_rate_id" = tax_rates.id
	WHERE receipts."subtotal" IS DISTINCT FROM round((sessions."energy_kwh" * pricing_rules."price_per_kwh")::numeric, 2)
		OR receipts."tax_amount" IS DISTINCT FROM round((round((sessions."energy_kwh" * pricing_rules."price_per_kwh")::numeric, 2) * tax_rates."rate")::numeric, 2)
		OR receipts."total_amount" IS DISTINCT FROM (
			round((sessions."energy_kwh" * pricing_rules."price_per_kwh")::numeric, 2)
			+ round((round((sessions."energy_kwh" * pricing_rules."price_per_kwh")::numeric, 2) * tax_rates."rate")::numeric, 2)
		)
		OR receipts."currency" IS DISTINCT FROM pricing_rules."currency";

	IF mismatch_count > 0 THEN
		RAISE EXCEPTION 'receipt amount validation failed for % rows', mismatch_count;
	END IF;
END $$;
--> statement-breakpoint
DO $$
DECLARE
	failure_count integer;
BEGIN
	SELECT count(*) INTO failure_count FROM "stations" WHERE "district_id" IS NULL;
	IF failure_count > 0 THEN RAISE EXCEPTION 'station geography backfill failed for % rows', failure_count; END IF;

	SELECT count(*) INTO failure_count FROM "addresses" WHERE "district_id" IS NULL;
	IF failure_count > 0 THEN RAISE EXCEPTION 'address geography backfill failed for % rows', failure_count; END IF;

	SELECT count(*) INTO failure_count FROM "plugs" WHERE "connector_type_code" IS NULL OR NOT EXISTS (
		SELECT 1 FROM "connector_types" WHERE connector_types."code" = plugs."connector_type_code"
	);
	IF failure_count > 0 THEN RAISE EXCEPTION 'plug connector backfill failed for % rows', failure_count; END IF;

	SELECT count(*) INTO failure_count FROM "vehicles" WHERE "connector_type_code" IS NULL OR NOT EXISTS (
		SELECT 1 FROM "connector_types" WHERE connector_types."code" = vehicles."connector_type_code"
	);
	IF failure_count > 0 THEN RAISE EXCEPTION 'vehicle connector backfill failed for % rows', failure_count; END IF;

	SELECT count(*) INTO failure_count FROM "receipts" WHERE "pricing_rule_id" IS NULL OR "tax_rate_id" IS NULL;
	IF failure_count > 0 THEN RAISE EXCEPTION 'receipt determinant backfill failed for % rows', failure_count; END IF;

	SELECT count(*) INTO failure_count
	FROM (
		SELECT "user_id"
		FROM "employees"
		GROUP BY "user_id"
		HAVING count(*) > 1
	) duplicates;
	IF failure_count > 0 THEN RAISE EXCEPTION 'employees.user_id unique constraint would fail for % users', failure_count; END IF;

	SELECT count(*) INTO failure_count
	FROM (
		SELECT "session_id"
		FROM "receipts"
		GROUP BY "session_id"
		HAVING count(*) > 1
	) duplicates;
	IF failure_count > 0 THEN RAISE EXCEPTION 'receipts.session_id unique constraint would fail for % sessions', failure_count; END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "addresses" ALTER COLUMN "district_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "plugs" ALTER COLUMN "connector_type_code" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "receipts" ALTER COLUMN "pricing_rule_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "receipts" ALTER COLUMN "tax_rate_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "stations" ALTER COLUMN "district_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "vehicles" ALTER COLUMN "connector_type_code" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_district_id_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."districts"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "plugs" ADD CONSTRAINT "plugs_connector_type_code_connector_types_code_fk" FOREIGN KEY ("connector_type_code") REFERENCES "public"."connector_types"("code") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_pricing_rule_id_pricing_rules_id_fk" FOREIGN KEY ("pricing_rule_id") REFERENCES "public"."pricing_rules"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_tax_rate_id_tax_rates_id_fk" FOREIGN KEY ("tax_rate_id") REFERENCES "public"."tax_rates"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "stations" ADD CONSTRAINT "stations_district_id_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."districts"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_connector_type_code_connector_types_code_fk" FOREIGN KEY ("connector_type_code") REFERENCES "public"."connector_types"("code") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "addresses_district_id_idx" ON "addresses" USING btree ("district_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "employees_user_id_unique" ON "employees" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "plugs_connector_type_code_idx" ON "plugs" USING btree ("connector_type_code");
--> statement-breakpoint
CREATE UNIQUE INDEX "receipts_session_id_unique" ON "receipts" USING btree ("session_id");
--> statement-breakpoint
CREATE INDEX "receipts_pricing_rule_id_idx" ON "receipts" USING btree ("pricing_rule_id");
--> statement-breakpoint
CREATE INDEX "receipts_tax_rate_id_idx" ON "receipts" USING btree ("tax_rate_id");
--> statement-breakpoint
CREATE INDEX "stations_district_id_idx" ON "stations" USING btree ("district_id");
--> statement-breakpoint
ALTER TABLE "addresses" DROP COLUMN "country";
--> statement-breakpoint
ALTER TABLE "addresses" DROP COLUMN "city";
--> statement-breakpoint
ALTER TABLE "addresses" DROP COLUMN "district";
--> statement-breakpoint
ALTER TABLE "plugs" DROP COLUMN "plug_type";
--> statement-breakpoint
ALTER TABLE "plugs" DROP COLUMN "current_type";
--> statement-breakpoint
ALTER TABLE "receipts" DROP COLUMN "subtotal";
--> statement-breakpoint
ALTER TABLE "receipts" DROP COLUMN "tax_amount";
--> statement-breakpoint
ALTER TABLE "receipts" DROP COLUMN "total_amount";
--> statement-breakpoint
ALTER TABLE "receipts" DROP COLUMN "currency";
--> statement-breakpoint
ALTER TABLE "sessions" DROP COLUMN "duration_minutes";
--> statement-breakpoint
ALTER TABLE "sessions" DROP COLUMN "total_price";
--> statement-breakpoint
ALTER TABLE "stations" DROP COLUMN "city";
--> statement-breakpoint
ALTER TABLE "stations" DROP COLUMN "district";
--> statement-breakpoint
ALTER TABLE "vehicles" DROP COLUMN "connector_type";
--> statement-breakpoint
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.connector_types ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.districts ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.pricing_rules ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.tax_rates ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE SELECT ON public.cities, public.connector_types, public.districts, public.pricing_rules, public.tax_rates FROM anon, authenticated;
