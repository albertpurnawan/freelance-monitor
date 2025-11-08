-- WARNING: This will permanently delete public/default data (user_id = 0)
-- Make a backup before running in production.

BEGIN;

-- Remove public templates
DELETE FROM report_templates WHERE user_id = 0;

-- Remove public monthly reports
DELETE FROM monthly_reports WHERE user_id = 0;

COMMIT;

