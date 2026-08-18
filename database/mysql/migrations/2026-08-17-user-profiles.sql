-- Add self-service profile fields without changing authentication settings.
ALTER TABLE app_users
  ADD COLUMN job_title VARCHAR(120) NOT NULL DEFAULT '' AFTER full_name,
  ADD COLUMN department VARCHAR(120) NOT NULL DEFAULT '' AFTER job_title,
  ADD COLUMN phone VARCHAR(40) NOT NULL DEFAULT '' AFTER department,
  ADD COLUMN timezone VARCHAR(64) NOT NULL DEFAULT '' AFTER phone,
  ADD COLUMN avatar_data MEDIUMTEXT NULL AFTER timezone;
