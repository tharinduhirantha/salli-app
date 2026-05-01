ALTER TABLE recurring_payment_shares ADD COLUMN IF NOT EXISTS is_paid boolean NOT NULL DEFAULT false;
UPDATE recurring_payment_shares SET is_paid = true WHERE paid > 0;
