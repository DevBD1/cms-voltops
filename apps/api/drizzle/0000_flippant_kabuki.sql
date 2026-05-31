CREATE TABLE "addresses" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"title" varchar(100) NOT NULL,
	"country" varchar(80) NOT NULL,
	"city" varchar(100) NOT NULL,
	"district" varchar(100) NOT NULL,
	"neighborhood" varchar(100),
	"avenue" varchar(100),
	"street" varchar(100),
	"apt_no" varchar(30),
	"apt" varchar(30),
	"door_no" varchar(30),
	"postal_no" varchar(30)
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"employee_code" varchar(40) NOT NULL,
	"department" varchar(100) NOT NULL,
	"job_title" varchar(100) NOT NULL,
	"hire_date" date NOT NULL,
	"status" varchar(30) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maintenance" (
	"id" serial PRIMARY KEY NOT NULL,
	"station_code" varchar(40) NOT NULL,
	"plug_code" varchar(60),
	"employee_id" integer,
	"maintenance_type" varchar(80) NOT NULL,
	"description" text NOT NULL,
	"scheduled_date" date NOT NULL,
	"completed_date" date,
	"status" varchar(30) DEFAULT 'scheduled' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plugs" (
	"plug_code" varchar(60) PRIMARY KEY NOT NULL,
	"station_code" varchar(40) NOT NULL,
	"plug_type" varchar(40) NOT NULL,
	"power_kw" numeric(8, 2) NOT NULL,
	"current_type" varchar(10) NOT NULL,
	"status" varchar(30) DEFAULT 'available' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "receipts" (
	"receipt_no" varchar(60) PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"subtotal" numeric(10, 2) NOT NULL,
	"tax_amount" numeric(10, 2) NOT NULL,
	"total_amount" numeric(10, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'TRY' NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"plug_code" varchar(60) NOT NULL,
	"vehicle_plate_number" varchar(20),
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"energy_kwh" numeric(10, 3),
	"duration_minutes" numeric(10, 2),
	"total_price" numeric(10, 2),
	"status" varchar(30) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "station_employees" (
	"id" serial PRIMARY KEY NOT NULL,
	"station_code" varchar(40) NOT NULL,
	"employee_id" integer NOT NULL,
	"assignment_role" varchar(80) NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stations" (
	"station_code" varchar(40) PRIMARY KEY NOT NULL,
	"name" varchar(150) NOT NULL,
	"city" varchar(100) NOT NULL,
	"district" varchar(100) NOT NULL,
	"latitude" numeric(10, 6) NOT NULL,
	"longitude" numeric(10, 6) NOT NULL,
	"status" varchar(30) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tickets" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"station_code" varchar(40),
	"session_id" integer,
	"assigned_employee_id" integer,
	"title" varchar(150) NOT NULL,
	"description" text NOT NULL,
	"priority" varchar(30) DEFAULT 'normal' NOT NULL,
	"status" varchar(30) DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_vehicles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"vehicle_plate_number" varchar(20) NOT NULL,
	"relationship_type" varchar(40) NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"tckn" integer,
	"email" varchar(200) NOT NULL,
	"phone" varchar(30) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"marketing_consent" timestamp with time zone,
	"terms_of_service" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vehicles" (
	"plate_number" varchar(20) PRIMARY KEY NOT NULL,
	"connector_type" varchar(40) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance" ADD CONSTRAINT "maintenance_station_code_stations_station_code_fk" FOREIGN KEY ("station_code") REFERENCES "public"."stations"("station_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance" ADD CONSTRAINT "maintenance_plug_code_plugs_plug_code_fk" FOREIGN KEY ("plug_code") REFERENCES "public"."plugs"("plug_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance" ADD CONSTRAINT "maintenance_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plugs" ADD CONSTRAINT "plugs_station_code_stations_station_code_fk" FOREIGN KEY ("station_code") REFERENCES "public"."stations"("station_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_plug_code_plugs_plug_code_fk" FOREIGN KEY ("plug_code") REFERENCES "public"."plugs"("plug_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_vehicle_plate_number_vehicles_plate_number_fk" FOREIGN KEY ("vehicle_plate_number") REFERENCES "public"."vehicles"("plate_number") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "station_employees" ADD CONSTRAINT "station_employees_station_code_stations_station_code_fk" FOREIGN KEY ("station_code") REFERENCES "public"."stations"("station_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "station_employees" ADD CONSTRAINT "station_employees_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_station_code_stations_station_code_fk" FOREIGN KEY ("station_code") REFERENCES "public"."stations"("station_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_assigned_employee_id_employees_id_fk" FOREIGN KEY ("assigned_employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_vehicles" ADD CONSTRAINT "user_vehicles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_vehicles" ADD CONSTRAINT "user_vehicles_vehicle_plate_number_vehicles_plate_number_fk" FOREIGN KEY ("vehicle_plate_number") REFERENCES "public"."vehicles"("plate_number") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "employees_employee_code_unique" ON "employees" USING btree ("employee_code");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "users_phone_unique" ON "users" USING btree ("phone");