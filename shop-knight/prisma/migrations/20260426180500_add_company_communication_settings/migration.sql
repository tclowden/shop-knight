CREATE TABLE "CompanyCommunicationSettings" (
  "id" TEXT NOT NULL,
  "companyId" TEXT,
  "emailEnabled" BOOLEAN NOT NULL DEFAULT false,
  "emailProvider" TEXT NOT NULL DEFAULT 'SMTP',
  "smtpHost" TEXT,
  "smtpPort" INTEGER,
  "smtpSecure" BOOLEAN NOT NULL DEFAULT false,
  "smtpUser" TEXT,
  "smtpPassEncrypted" TEXT,
  "smtpFromEmail" TEXT,
  "smtpFromName" TEXT,
  "smtpReplyTo" TEXT,
  "smsEnabled" BOOLEAN NOT NULL DEFAULT false,
  "smsProvider" TEXT NOT NULL DEFAULT 'TWILIO',
  "twilioAccountSid" TEXT,
  "twilioAuthTokenEncrypted" TEXT,
  "twilioFromNumber" TEXT,
  "twilioMessagingServiceSid" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CompanyCommunicationSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CompanyCommunicationSettings_companyId_key" ON "CompanyCommunicationSettings"("companyId");

ALTER TABLE "CompanyCommunicationSettings"
ADD CONSTRAINT "CompanyCommunicationSettings_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
