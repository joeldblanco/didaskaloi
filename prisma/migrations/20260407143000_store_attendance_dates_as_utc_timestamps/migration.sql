ALTER TABLE
    "attendances"
ALTER COLUMN
    "date" TYPE TIMESTAMPTZ(3) USING ("date" :: timestamp AT TIME ZONE 'America/Lima');