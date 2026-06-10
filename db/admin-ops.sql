-- Sistema de Suporte e Administração — referência SQL (também aplicado via server/admin/schema.js no arranque)

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'staff_role') THEN
    CREATE TYPE staff_role AS ENUM ('STAFF', 'MODERATOR', 'SENIOR_MODERATOR', 'ADMIN');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_type') THEN
    CREATE TYPE ticket_type AS ENUM (
      'CUSTOMER_SUPPORT', 'HOST_SUPPORT', 'TECHNICAL', 'FINANCIAL',
      'BOOKING_ISSUE', 'COMPLAINT'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_status') THEN
    CREATE TYPE ticket_status AS ENUM (
      'OPEN', 'WAITING_STAFF', 'WAITING_CUSTOMER', 'WAITING_HOST',
      'IN_PROGRESS', 'ESCALATED', 'RESOLVED', 'CLOSED'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_priority') THEN
    CREATE TYPE ticket_priority AS ENUM ('URGENT', 'HIGH', 'MEDIUM', 'LOW');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'boat_review_status') THEN
    CREATE TYPE boat_review_status AS ENUM (
      'DRAFT', 'PENDING_REVIEW', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'moderation_action_type') THEN
    CREATE TYPE moderation_action_type AS ENUM (
      'WARNING', 'TEMP_SUSPENSION', 'INDEFINITE_SUSPENSION', 'PERMANENT_BAN'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'moderation_case_status') THEN
    CREATE TYPE moderation_case_status AS ENUM ('OPEN', 'IN_REVIEW', 'RESOLVED', 'DISMISSED');
  END IF;
END $$;
