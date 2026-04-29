-- Migration: Add calendar types (day-oriented / order-oriented), multi-week rotations,
-- order start dates, day-of-week scheduling, and optional training times.

-- 1. training_calendar: add calendar_type, num_weeks, order_start_date
ALTER TABLE training_calendar
  ADD COLUMN calendar_type varchar NOT NULL DEFAULT 'order';

ALTER TABLE training_calendar
  ADD COLUMN num_weeks integer NOT NULL DEFAULT 1;

ALTER TABLE training_calendar
  ADD COLUMN order_start_date date;

ALTER TABLE training_calendar
  ADD CONSTRAINT training_calendar_type_check
    CHECK (calendar_type IN ('day', 'order'));

ALTER TABLE training_calendar
  ADD CONSTRAINT training_calendar_num_weeks_check
    CHECK (num_weeks >= 1);

-- 2. training_calendar_trainings: add week_number, day_of_week, start_time
ALTER TABLE training_calendar_trainings
  ADD COLUMN week_number integer;

ALTER TABLE training_calendar_trainings
  ADD COLUMN day_of_week integer;

ALTER TABLE training_calendar_trainings
  ADD COLUMN start_time time;

ALTER TABLE training_calendar_trainings
  ADD CONSTRAINT tct_day_of_week_check
    CHECK (day_of_week IS NULL OR (day_of_week >= 0 AND day_of_week <= 6));

ALTER TABLE training_calendar_trainings
  ADD CONSTRAINT tct_week_number_check
    CHECK (week_number IS NULL OR week_number >= 1);
