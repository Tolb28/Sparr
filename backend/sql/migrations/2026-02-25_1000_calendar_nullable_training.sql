-- Allow rest-day slots in order-oriented calendars.
-- A rest day is a row with id_trainings = NULL (no training assigned).
ALTER TABLE training_calendar_trainings ALTER COLUMN id_trainings DROP NOT NULL;
