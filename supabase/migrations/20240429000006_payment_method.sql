ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'Card';

UPDATE transactions SET payment_method = 'Card' WHERE payment_method IS NULL OR payment_method = '';

ALTER TABLE recurring_payments
  ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'Card';

UPDATE recurring_payments SET payment_method = 'Card' WHERE payment_method IS NULL OR payment_method = '';
