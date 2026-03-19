-- Normalize existing emails to lowercase first
UPDATE "User"
SET "email" = lower("email")
WHERE "email" <> lower("email");

-- Enforce case-insensitive uniqueness at DB level
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_lower_key"
ON "User" (lower("email"));
