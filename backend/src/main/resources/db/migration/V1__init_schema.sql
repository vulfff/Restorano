CREATE SCHEMA IF NOT EXISTS restorano;

CREATE TABLE restorano.admin (
    id         BIGSERIAL PRIMARY KEY,
    username   VARCHAR(50)  UNIQUE NOT NULL,
    email      VARCHAR(255) UNIQUE NOT NULL,
    password   VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ  DEFAULT now()
);

CREATE TABLE restorano.floor_plan (
    id         BIGSERIAL PRIMARY KEY,
    grid_cols  INT         NOT NULL DEFAULT 20,
    grid_rows  INT         NOT NULL DEFAULT 14,
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE restorano.area (
    id               BIGSERIAL PRIMARY KEY,
    floor_plan_id    BIGINT       NOT NULL REFERENCES restorano.floor_plan(id) ON DELETE CASCADE,
    name             VARCHAR(100) NOT NULL,
    color            VARCHAR(20)  NOT NULL,
    top_left_col     INT          NOT NULL,
    top_left_row     INT          NOT NULL,
    bottom_right_col INT          NOT NULL,
    bottom_right_row INT          NOT NULL
);

CREATE TABLE restorano.restaurant_table (
    id             BIGSERIAL PRIMARY KEY,
    floor_plan_id  BIGINT      NOT NULL REFERENCES restorano.floor_plan(id) ON DELETE CASCADE,
    area_id        BIGINT      REFERENCES restorano.area(id) ON DELETE SET NULL,
    label          VARCHAR(20) NOT NULL,
    capacity       INT         NOT NULL,
    col            INT         NOT NULL,
    row            INT         NOT NULL,
    width_cells    INT         NOT NULL DEFAULT 1,
    height_cells   INT         NOT NULL DEFAULT 1,
    is_fused       BOOLEAN     NOT NULL DEFAULT false,
    parent_fused_id BIGINT     REFERENCES restorano.restaurant_table(id) ON DELETE SET NULL
);

CREATE TABLE restorano.reservation (
    id          BIGSERIAL PRIMARY KEY,
    guest_name  VARCHAR(255) NOT NULL,
    party_size  INT          NOT NULL,
    starts_at   TIMESTAMPTZ  NOT NULL,
    ends_at     TIMESTAMPTZ  NOT NULL,
    notes       TEXT,
    created_at  TIMESTAMPTZ  DEFAULT now()
);

CREATE TABLE restorano.reservation_tables (
    reservation_id BIGINT NOT NULL REFERENCES restorano.reservation(id)       ON DELETE CASCADE,
    table_id       BIGINT NOT NULL REFERENCES restorano.restaurant_table(id)  ON DELETE CASCADE,
    PRIMARY KEY (reservation_id, table_id)
);

-- Seed the singleton floor plan row
INSERT INTO restorano.floor_plan (id, grid_cols, grid_rows) VALUES (1, 20, 14);
SELECT setval('restorano.floor_plan_id_seq', 1);