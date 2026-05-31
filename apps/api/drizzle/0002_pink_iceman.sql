ALTER TABLE "users" ALTER COLUMN "phone" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "auth_user_id" uuid;--> statement-breakpoint
CREATE UNIQUE INDEX "users_auth_user_id_unique" ON "users" USING btree ("auth_user_id");--> statement-breakpoint
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.maintenance ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.plugs ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.station_employees ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.stations ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.user_vehicles ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "public can read station catalog" ON public.stations;--> statement-breakpoint
DROP POLICY IF EXISTS "public can read plug catalog" ON public.plugs;--> statement-breakpoint
REVOKE SELECT ON public.stations, public.plugs FROM anon, authenticated;
