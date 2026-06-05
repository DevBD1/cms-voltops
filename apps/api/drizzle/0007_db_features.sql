CREATE OR REPLACE VIEW public.view_station_catalog AS
SELECT
	stations.station_code,
	stations.name AS station_name,
	stations.status AS station_status,
	stations.latitude,
	stations.longitude,
	cities.country_code,
	cities.name AS city_name,
	districts.name AS district_name,
	count(plugs.plug_code)::integer AS total_plugs,
	count(plugs.plug_code) FILTER (WHERE plugs.status = 'available')::integer AS available_plugs,
	count(plugs.plug_code) FILTER (WHERE plugs.status = 'fault')::integer AS faulty_plugs,
	coalesce(max(plugs.power_kw), 0)::numeric(8, 2) AS max_power_kw,
	array_remove(array_agg(DISTINCT connector_types.code), NULL) AS connector_type_codes
FROM public.stations
INNER JOIN public.districts ON stations.district_id = districts.id
INNER JOIN public.cities ON districts.city_id = cities.id
LEFT JOIN public.plugs ON plugs.station_code = stations.station_code
LEFT JOIN public.connector_types ON plugs.connector_type_code = connector_types.code
GROUP BY
	stations.station_code,
	stations.name,
	stations.status,
	stations.latitude,
	stations.longitude,
	cities.country_code,
	cities.name,
	districts.name;
--> statement-breakpoint
CREATE OR REPLACE VIEW public.view_connector_pricing AS
SELECT
	connector_types.code AS connector_type_code,
	connector_types.display_name,
	connector_types.current_type,
	connector_types.vehicle_label,
	pricing_rules.price_per_kwh,
	pricing_rules.currency,
	tax_rates.rate AS tax_rate,
	pricing_rules.valid_from AS pricing_valid_from,
	pricing_rules.valid_to AS pricing_valid_to,
	tax_rates.valid_from AS tax_valid_from,
	tax_rates.valid_to AS tax_valid_to
FROM public.connector_types
INNER JOIN public.pricing_rules
	ON pricing_rules.connector_type_code = connector_types.code
	AND pricing_rules.valid_from <= now()
	AND (pricing_rules.valid_to IS NULL OR pricing_rules.valid_to > now())
CROSS JOIN LATERAL (
	SELECT tax_rates.rate, tax_rates.valid_from, tax_rates.valid_to
	FROM public.tax_rates
	WHERE tax_rates.valid_from <= now()
		AND (tax_rates.valid_to IS NULL OR tax_rates.valid_to > now())
	ORDER BY tax_rates.valid_from DESC
	LIMIT 1
) tax_rates
WHERE pricing_rules.valid_from = (
	SELECT max(active_pricing.valid_from)
	FROM public.pricing_rules active_pricing
	WHERE active_pricing.connector_type_code = connector_types.code
		AND active_pricing.valid_from <= now()
		AND (active_pricing.valid_to IS NULL OR active_pricing.valid_to > now())
);
--> statement-breakpoint
GRANT SELECT ON public.view_station_catalog TO anon, authenticated;
--> statement-breakpoint
GRANT SELECT ON public.view_connector_pricing TO anon, authenticated;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	NEW.updated_at = now();
	RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.set_employee_code()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	IF NEW.employee_code IS NULL OR btrim(NEW.employee_code) = '' THEN
		NEW.employee_code = 'EMP-' || lpad(NEW.id::text, 4, '0');
	END IF;

	RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER users_set_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
--> statement-breakpoint
CREATE TRIGGER employees_set_updated_at
BEFORE UPDATE ON public.employees
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
--> statement-breakpoint
CREATE TRIGGER stations_set_updated_at
BEFORE UPDATE ON public.stations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
--> statement-breakpoint
CREATE TRIGGER plugs_set_updated_at
BEFORE UPDATE ON public.plugs
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
--> statement-breakpoint
CREATE TRIGGER sessions_set_updated_at
BEFORE UPDATE ON public.sessions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
--> statement-breakpoint
CREATE TRIGGER receipts_set_updated_at
BEFORE UPDATE ON public.receipts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
--> statement-breakpoint
CREATE TRIGGER maintenance_set_updated_at
BEFORE UPDATE ON public.maintenance
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
--> statement-breakpoint
CREATE TRIGGER tickets_set_updated_at
BEFORE UPDATE ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
--> statement-breakpoint
CREATE TRIGGER employees_set_employee_code
BEFORE INSERT ON public.employees
FOR EACH ROW EXECUTE FUNCTION public.set_employee_code();
--> statement-breakpoint
CREATE OR REPLACE PROCEDURE public.proc_start_session(
	IN p_user_id integer,
	IN p_plug_code varchar,
	IN p_vehicle_plate_number varchar,
	INOUT session_id integer DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
	v_user_is_active boolean;
	v_plug_exists boolean;
	v_constraint_name text;
BEGIN
	SELECT users.is_active INTO v_user_is_active
	FROM public.users
	WHERE users.id = p_user_id;

	IF v_user_is_active IS DISTINCT FROM true THEN
		RAISE EXCEPTION 'Active user not found';
	END IF;

	IF EXISTS (
		SELECT 1
		FROM public.sessions
		WHERE sessions.user_id = p_user_id
			AND sessions.status = 'active'
	) THEN
		RAISE EXCEPTION 'Active session already exists';
	END IF;

	IF p_vehicle_plate_number IS NOT NULL AND NOT EXISTS (
		SELECT 1
		FROM public.user_vehicles
		WHERE user_vehicles.user_id = p_user_id
			AND user_vehicles.vehicle_plate_number = p_vehicle_plate_number
	) THEN
		RAISE EXCEPTION 'Vehicle not found';
	END IF;

	UPDATE public.plugs
	SET status = 'in_use'
	WHERE plugs.plug_code = p_plug_code
		AND plugs.status = 'available';

	IF NOT FOUND THEN
		SELECT EXISTS (
			SELECT 1 FROM public.plugs WHERE plugs.plug_code = p_plug_code
		) INTO v_plug_exists;

		IF NOT v_plug_exists THEN
			RAISE EXCEPTION 'Plug not found';
		END IF;

		RAISE EXCEPTION 'Plug is not available';
	END IF;

	INSERT INTO public.sessions (
		user_id,
		plug_code,
		vehicle_plate_number,
		started_at,
		status
	) VALUES (
		p_user_id,
		p_plug_code,
		p_vehicle_plate_number,
		now(),
		'active'
	)
	RETURNING id INTO session_id;
EXCEPTION
	WHEN unique_violation THEN
		GET STACKED DIAGNOSTICS v_constraint_name = CONSTRAINT_NAME;
		IF v_constraint_name = 'sessions_active_user_unique' THEN
			RAISE EXCEPTION 'Active session already exists';
		END IF;
		RAISE;
END;
$$;
--> statement-breakpoint
REVOKE EXECUTE ON PROCEDURE public.proc_start_session(integer, varchar, varchar, integer) FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
CREATE OR REPLACE PROCEDURE public.proc_end_session(
	IN p_session_id integer,
	IN p_energy_kwh numeric,
	IN p_actor_user_id integer,
	INOUT completed_session_id integer DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
	v_user_id integer;
	v_plug_code varchar;
	v_status varchar;
	v_connector_type_code varchar;
	v_pricing_rule_id integer;
	v_tax_rate_id integer;
BEGIN
	SELECT
		sessions.user_id,
		sessions.plug_code,
		sessions.status
	INTO
		v_user_id,
		v_plug_code,
		v_status
	FROM public.sessions
	WHERE sessions.id = p_session_id
	FOR UPDATE;

	IF NOT FOUND THEN
		RAISE EXCEPTION 'Session not found';
	END IF;

	IF p_actor_user_id IS NOT NULL AND v_user_id <> p_actor_user_id THEN
		RAISE EXCEPTION 'Session not found';
	END IF;

	IF v_status <> 'active' THEN
		RAISE EXCEPTION 'Session is not active';
	END IF;

	IF p_energy_kwh <= 0 THEN
		RAISE EXCEPTION 'energyKwh must be greater than zero';
	END IF;

	SELECT plugs.connector_type_code INTO v_connector_type_code
	FROM public.plugs
	WHERE plugs.plug_code = v_plug_code;

	IF NOT FOUND THEN
		RAISE EXCEPTION 'Plug not found';
	END IF;

	SELECT pricing_rules.id INTO v_pricing_rule_id
	FROM public.pricing_rules
	WHERE pricing_rules.connector_type_code = v_connector_type_code
		AND pricing_rules.valid_from <= now()
		AND (pricing_rules.valid_to IS NULL OR pricing_rules.valid_to > now())
	ORDER BY pricing_rules.valid_from DESC
	LIMIT 1;

	IF v_pricing_rule_id IS NULL THEN
		RAISE EXCEPTION 'Active pricing rule not found';
	END IF;

	SELECT tax_rates.id INTO v_tax_rate_id
	FROM public.tax_rates
	WHERE tax_rates.valid_from <= now()
		AND (tax_rates.valid_to IS NULL OR tax_rates.valid_to > now())
	ORDER BY tax_rates.valid_from DESC
	LIMIT 1;

	IF v_tax_rate_id IS NULL THEN
		RAISE EXCEPTION 'Active tax rate not found';
	END IF;

	UPDATE public.sessions
	SET
		ended_at = now(),
		energy_kwh = p_energy_kwh,
		status = 'completed'
	WHERE sessions.id = p_session_id;

	UPDATE public.plugs
	SET status = 'available'
	WHERE plugs.plug_code = v_plug_code;

	INSERT INTO public.receipts (
		receipt_no,
		session_id,
		pricing_rule_id,
		tax_rate_id,
		issued_at
	) VALUES (
		'R-' || lpad(p_session_id::text, 6, '0'),
		p_session_id,
		v_pricing_rule_id,
		v_tax_rate_id,
		now()
	)
	ON CONFLICT DO NOTHING;

	completed_session_id = p_session_id;
END;
$$;
--> statement-breakpoint
REVOKE EXECUTE ON PROCEDURE public.proc_end_session(integer, numeric, integer, integer) FROM PUBLIC, anon, authenticated;
