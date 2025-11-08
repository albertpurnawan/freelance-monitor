-- Add last_reminder_at to offers for tracking email reminders
ALTER TABLE IF EXISTS offers
ADD COLUMN IF NOT EXISTS last_reminder_at TIMESTAMP NULL;

