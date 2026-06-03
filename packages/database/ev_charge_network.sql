-- ============================================================
-- EV CHARGE STATION NETWORK DATABASE
-- Designed to 5NF (Fifth Normal Form)
-- Includes: Tables, Indexes, Views, Triggers, Stored Procedures
-- ============================================================

-- ============================================================
-- TABLE DEFINITIONS (5NF compliant)
-- ============================================================

-- 1. LOCATIONS
-- Stores physical location data independently (avoids address duplication)
CREATE TABLE locations (
    location_id     INT PRIMARY KEY AUTO_INCREMENT,
    city            VARCHAR(100) NOT NULL,
    district        VARCHAR(100),
    address_line    VARCHAR(255) NOT NULL,
    latitude        DECIMAL(9,6) NOT NULL,
    longitude       DECIMAL(9,6) NOT NULL,
    country_code    CHAR(2) NOT NULL DEFAULT 'TR'
);

-- 2. STATIONS
-- A station is a physical site (e.g., a parking lot with chargers)
CREATE TABLE stations (
    station_id      INT PRIMARY KEY AUTO_INCREMENT,
    location_id     INT NOT NULL,
    station_name    VARCHAR(150) NOT NULL,
    operator_name   VARCHAR(100) NOT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    opened_at       DATE,
    FOREIGN KEY (location_id) REFERENCES locations(location_id)
);

-- 3. CONNECTOR_TYPES
-- Lookup table: CCS2, CHAdeMO, Type2, etc. — normalized out to avoid repetition
CREATE TABLE connector_types (
    connector_type_id   INT PRIMARY KEY AUTO_INCREMENT,
    type_code           VARCHAR(30) NOT NULL UNIQUE,   -- e.g. 'CCS2', 'TYPE2'
    max_power_kw        DECIMAL(6,2) NOT NULL,
    current_type        ENUM('AC', 'DC') NOT NULL
);

-- 4. CHARGERS
-- Individual charger units within a station
CREATE TABLE chargers (
    charger_id          INT PRIMARY KEY AUTO_INCREMENT,
    station_id          INT NOT NULL,
    connector_type_id   INT NOT NULL,
    serial_number       VARCHAR(100) NOT NULL UNIQUE,
    status              ENUM('AVAILABLE', 'IN_USE', 'FAULT', 'OFFLINE') NOT NULL DEFAULT 'AVAILABLE',
    installed_at        DATE,
    FOREIGN KEY (station_id) REFERENCES stations(station_id),
    FOREIGN KEY (connector_type_id) REFERENCES connector_types(connector_type_id)
);

-- 5. USERS
CREATE TABLE users (
    user_id         INT PRIMARY KEY AUTO_INCREMENT,
    full_name       VARCHAR(150) NOT NULL,
    email           VARCHAR(200) NOT NULL UNIQUE,
    phone           VARCHAR(20),
    balance_tl      DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 6. SESSIONS
-- Charging session records — core transactional table
CREATE TABLE sessions (
    session_id          INT PRIMARY KEY AUTO_INCREMENT,
    charger_id          INT NOT NULL,
    user_id             INT NOT NULL,
    started_at          DATETIME NOT NULL,
    ended_at            DATETIME,
    energy_kwh          DECIMAL(8,3),        -- total energy delivered
    cost_tl             DECIMAL(8,2),        -- total charged to user
    payment_status      ENUM('PENDING', 'PAID', 'FAILED') NOT NULL DEFAULT 'PENDING',
    FOREIGN KEY (charger_id) REFERENCES chargers(charger_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- 7. PRICING_RULES
-- Decoupled from connector_types and stations — 5NF: no transitive dependencies
-- A rule applies to a specific (station, connector_type) combination
CREATE TABLE pricing_rules (
    rule_id             INT PRIMARY KEY AUTO_INCREMENT,
    station_id          INT NOT NULL,
    connector_type_id   INT NOT NULL,
    price_per_kwh_tl    DECIMAL(6,4) NOT NULL,
    valid_from          DATE NOT NULL,
    valid_to            DATE,
    UNIQUE KEY unique_rule (station_id, connector_type_id, valid_from),
    FOREIGN KEY (station_id) REFERENCES stations(station_id),
    FOREIGN KEY (connector_type_id) REFERENCES connector_types(connector_type_id)
);


-- ============================================================
-- INDEXES
-- ============================================================

-- Speed up session lookups by user
CREATE INDEX idx_sessions_user_id ON sessions(user_id);

-- Speed up charger availability checks per station
CREATE INDEX idx_chargers_station_status ON chargers(station_id, status);

-- Geo queries: find nearby stations
CREATE INDEX idx_locations_lat_lng ON locations(latitude, longitude);

-- Session time-range queries (reporting)
CREATE INDEX idx_sessions_started_at ON sessions(started_at);

-- Pricing lookup: active rules for a station
CREATE INDEX idx_pricing_station_connector ON pricing_rules(station_id, connector_type_id, valid_from);


-- ============================================================
-- VIEWS
-- ============================================================

-- VIEW 1: Full charger details with station and location info
CREATE OR REPLACE VIEW vw_charger_overview AS
SELECT
    c.charger_id,
    c.serial_number,
    c.status,
    ct.type_code       AS connector_type,
    ct.max_power_kw,
    ct.current_type,
    s.station_name,
    s.operator_name,
    l.city,
    l.district,
    l.address_line,
    l.latitude,
    l.longitude
FROM chargers c
JOIN stations s          ON c.station_id = s.station_id
JOIN locations l         ON s.location_id = l.location_id
JOIN connector_types ct  ON c.connector_type_id = ct.connector_type_id;


-- VIEW 2: Active sessions with user and charger context
CREATE OR REPLACE VIEW vw_active_sessions AS
SELECT
    se.session_id,
    u.full_name          AS user_name,
    u.email,
    c.serial_number      AS charger_serial,
    ct.type_code         AS connector_type,
    s.station_name,
    l.city,
    se.started_at,
    TIMESTAMPDIFF(MINUTE, se.started_at, NOW()) AS duration_minutes
FROM sessions se
JOIN users u             ON se.user_id = u.user_id
JOIN chargers c          ON se.charger_id = c.charger_id
JOIN connector_types ct  ON c.connector_type_id = ct.connector_type_id
JOIN stations s          ON c.station_id = s.station_id
JOIN locations l         ON s.location_id = l.location_id
WHERE se.ended_at IS NULL;


-- VIEW 3: Revenue summary per station (completed sessions)
CREATE OR REPLACE VIEW vw_station_revenue AS
SELECT
    s.station_id,
    s.station_name,
    l.city,
    COUNT(se.session_id)            AS total_sessions,
    ROUND(SUM(se.energy_kwh), 2)    AS total_energy_kwh,
    ROUND(SUM(se.cost_tl), 2)       AS total_revenue_tl
FROM sessions se
JOIN chargers c  ON se.charger_id = c.charger_id
JOIN stations s  ON c.station_id = s.station_id
JOIN locations l ON s.location_id = l.location_id
WHERE se.payment_status = 'PAID'
GROUP BY s.station_id, s.station_name, l.city;


-- ============================================================
-- TRIGGERS
-- ============================================================

DELIMITER $$

-- TRIGGER 1: When a session ends, set charger status back to AVAILABLE
CREATE TRIGGER trg_session_end_free_charger
AFTER UPDATE ON sessions
FOR EACH ROW
BEGIN
    IF NEW.ended_at IS NOT NULL AND OLD.ended_at IS NULL THEN
        UPDATE chargers
        SET status = 'AVAILABLE'
        WHERE charger_id = NEW.charger_id;
    END IF;
END$$

-- TRIGGER 2: When a session starts, set charger status to IN_USE
--            and validate that the charger is actually available
CREATE TRIGGER trg_session_start_lock_charger
BEFORE INSERT ON sessions
FOR EACH ROW
BEGIN
    DECLARE current_status VARCHAR(20);

    SELECT status INTO current_status
    FROM chargers
    WHERE charger_id = NEW.charger_id;

    IF current_status != 'AVAILABLE' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Charger is not available for a new session.';
    END IF;

    UPDATE chargers
    SET status = 'IN_USE'
    WHERE charger_id = NEW.charger_id;
END$$

-- TRIGGER 3: Deduct session cost from user balance when payment is marked PAID
CREATE TRIGGER trg_deduct_balance_on_payment
AFTER UPDATE ON sessions
FOR EACH ROW
BEGIN
    IF NEW.payment_status = 'PAID' AND OLD.payment_status != 'PAID' THEN
        UPDATE users
        SET balance_tl = balance_tl - NEW.cost_tl
        WHERE user_id = NEW.user_id;
    END IF;
END$$

DELIMITER ;


-- ============================================================
-- STORED PROCEDURES
-- ============================================================

DELIMITER $$

-- SP 1: Start a charging session
--       Finds the active pricing rule and locks the charger
CREATE PROCEDURE sp_start_session(
    IN  p_user_id    INT,
    IN  p_charger_id INT,
    OUT p_session_id INT
)
BEGIN
    DECLARE v_balance DECIMAL(10,2);

    -- Basic balance check (must have at least 1 TL)
    SELECT balance_tl INTO v_balance FROM users WHERE user_id = p_user_id;
    IF v_balance < 1.00 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Insufficient balance to start session.';
    END IF;

    INSERT INTO sessions (charger_id, user_id, started_at, payment_status)
    VALUES (p_charger_id, p_user_id, NOW(), 'PENDING');

    SET p_session_id = LAST_INSERT_ID();
END$$


-- SP 2: End a charging session — calculates cost using active pricing rule
CREATE PROCEDURE sp_end_session(
    IN p_session_id INT,
    IN p_energy_kwh DECIMAL(8,3)
)
BEGIN
    DECLARE v_charger_id        INT;
    DECLARE v_station_id        INT;
    DECLARE v_connector_type_id INT;
    DECLARE v_price             DECIMAL(6,4);
    DECLARE v_cost              DECIMAL(8,2);

    -- Get charger and station info
    SELECT c.charger_id, c.station_id, c.connector_type_id
    INTO v_charger_id, v_station_id, v_connector_type_id
    FROM sessions se
    JOIN chargers c ON se.charger_id = c.charger_id
    WHERE se.session_id = p_session_id;

    -- Get applicable price (most recent valid rule)
    SELECT price_per_kwh_tl INTO v_price
    FROM pricing_rules
    WHERE station_id = v_station_id
      AND connector_type_id = v_connector_type_id
      AND valid_from <= CURDATE()
      AND (valid_to IS NULL OR valid_to >= CURDATE())
    ORDER BY valid_from DESC
    LIMIT 1;

    IF v_price IS NULL THEN
        SET v_price = 5.00; -- fallback default price (TL/kWh)
    END IF;

    SET v_cost = ROUND(p_energy_kwh * v_price, 2);

    UPDATE sessions
    SET ended_at       = NOW(),
        energy_kwh     = p_energy_kwh,
        cost_tl        = v_cost,
        payment_status = 'PAID'
    WHERE session_id = p_session_id;

END$$


-- SP 3: Get available chargers near a coordinate (within ~10 km radius approx)
CREATE PROCEDURE sp_find_nearby_chargers(
    IN p_latitude   DECIMAL(9,6),
    IN p_longitude  DECIMAL(9,6),
    IN p_radius_km  DECIMAL(5,2)
)
BEGIN
    SELECT
        co.charger_id,
        co.serial_number,
        co.connector_type,
        co.max_power_kw,
        co.current_type,
        co.station_name,
        co.operator_name,
        co.city,
        co.address_line,
        co.latitude,
        co.longitude,
        -- Haversine approximation (fast, good enough for nearby search)
        ROUND(
            6371 * ACOS(
                COS(RADIANS(p_latitude)) * COS(RADIANS(co.latitude)) *
                COS(RADIANS(co.longitude) - RADIANS(p_longitude)) +
                SIN(RADIANS(p_latitude)) * SIN(RADIANS(co.latitude))
            ), 2
        ) AS distance_km
    FROM vw_charger_overview co
    WHERE co.status = 'AVAILABLE'
    HAVING distance_km <= p_radius_km
    ORDER BY distance_km ASC;
END$$

DELIMITER ;


-- ============================================================
-- SAMPLE DATA (for testing)
-- ============================================================

INSERT INTO locations (city, district, address_line, latitude, longitude)
VALUES
    ('Istanbul', 'Kadıköy',   'Moda Cad. No:12',     41.0082, 28.9784),
    ('Istanbul', 'Beşiktaş',  'Barbaros Blv. No:5',  41.0430, 29.0070),
    ('Ankara',   'Çankaya',   'Tunalı Hilmi Cad. 3', 39.9179, 32.8627);

INSERT INTO connector_types (type_code, max_power_kw, current_type) VALUES
    ('TYPE2',  22.00, 'AC'),
    ('CCS2',  150.00, 'DC'),
    ('CHADEMO', 50.00, 'DC');

INSERT INTO stations (location_id, station_name, operator_name, is_active, opened_at) VALUES
    (1, 'Moda EV Hub',        'ZES',      TRUE, '2022-06-01'),
    (2, 'Beşiktaş Süper Şarj','Sharz.net',TRUE, '2023-01-15'),
    (3, 'Çankaya Charge Park', 'ZES',     TRUE, '2021-09-10');

INSERT INTO chargers (station_id, connector_type_id, serial_number, status, installed_at) VALUES
    (1, 1, 'ZES-001-T2',   'AVAILABLE', '2022-06-01'),
    (1, 2, 'ZES-002-CCS',  'AVAILABLE', '2022-06-01'),
    (2, 2, 'SHZ-010-CCS',  'AVAILABLE', '2023-01-15'),
    (2, 3, 'SHZ-011-CHD',  'FAULT',     '2023-01-15'),
    (3, 1, 'ZES-030-T2',   'AVAILABLE', '2021-09-10');

INSERT INTO users (full_name, email, phone, balance_tl) VALUES
    ('Mehmet Burak', 'mehmet@example.com', '+905551234567', 250.00),
    ('Ayşe Kaya',   'ayse@example.com',   '+905559876543', 80.00);

INSERT INTO pricing_rules (station_id, connector_type_id, price_per_kwh_tl, valid_from) VALUES
    (1, 1, 4.50, '2024-01-01'),
    (1, 2, 7.20, '2024-01-01'),
    (2, 2, 8.00, '2024-01-01'),
    (2, 3, 6.50, '2024-01-01'),
    (3, 1, 4.00, '2024-01-01');
