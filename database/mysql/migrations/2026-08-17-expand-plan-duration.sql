-- Allow users to create plans from 1 through 8 weeks.
-- Apply once to an existing production database before deploying this release.

-- MySQL names this operation DROP CHECK; MariaDB uses DROP CONSTRAINT.
-- Select the supported statement without changing any data.
SET @drop_import_weeks = IF(
  VERSION() LIKE '%MariaDB%',
  'ALTER TABLE onboarding_imports DROP CONSTRAINT onboarding_imports_weeks_chk',
  'ALTER TABLE onboarding_imports DROP CHECK onboarding_imports_weeks_chk'
);
PREPARE drop_import_weeks_statement FROM @drop_import_weeks;
EXECUTE drop_import_weeks_statement;
DEALLOCATE PREPARE drop_import_weeks_statement;

ALTER TABLE onboarding_imports
  ADD CONSTRAINT onboarding_imports_weeks_chk
  CHECK (preferred_weeks IS NULL OR preferred_weeks BETWEEN 1 AND 8);

SET @drop_plan_duration = IF(
  VERSION() LIKE '%MariaDB%',
  'ALTER TABLE onboarding_plans DROP CONSTRAINT onboarding_plans_duration_chk',
  'ALTER TABLE onboarding_plans DROP CHECK onboarding_plans_duration_chk'
);
PREPARE drop_plan_duration_statement FROM @drop_plan_duration;
EXECUTE drop_plan_duration_statement;
DEALLOCATE PREPARE drop_plan_duration_statement;

ALTER TABLE onboarding_plans
  ADD CONSTRAINT onboarding_plans_duration_chk
  CHECK (duration_weeks BETWEEN 1 AND 8);
