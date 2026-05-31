CREATE INDEX "addresses_user_id_idx" ON "addresses" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "employees_user_id_idx" ON "employees" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "maintenance_station_code_idx" ON "maintenance" USING btree ("station_code");--> statement-breakpoint
CREATE INDEX "maintenance_plug_code_idx" ON "maintenance" USING btree ("plug_code");--> statement-breakpoint
CREATE INDEX "maintenance_employee_id_idx" ON "maintenance" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "plugs_station_code_idx" ON "plugs" USING btree ("station_code");--> statement-breakpoint
CREATE INDEX "receipts_session_id_idx" ON "receipts" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_plug_code_idx" ON "sessions" USING btree ("plug_code");--> statement-breakpoint
CREATE INDEX "sessions_vehicle_plate_number_idx" ON "sessions" USING btree ("vehicle_plate_number");--> statement-breakpoint
CREATE INDEX "station_employees_station_code_idx" ON "station_employees" USING btree ("station_code");--> statement-breakpoint
CREATE INDEX "station_employees_employee_id_idx" ON "station_employees" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "tickets_user_id_idx" ON "tickets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "tickets_station_code_idx" ON "tickets" USING btree ("station_code");--> statement-breakpoint
CREATE INDEX "tickets_session_id_idx" ON "tickets" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "tickets_assigned_employee_id_idx" ON "tickets" USING btree ("assigned_employee_id");--> statement-breakpoint
CREATE INDEX "user_vehicles_user_id_idx" ON "user_vehicles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_vehicles_vehicle_plate_number_idx" ON "user_vehicles" USING btree ("vehicle_plate_number");