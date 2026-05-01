-- Replace per-column user approach with a proper junction table.
-- Supports any number of house members without schema changes.

CREATE TABLE IF NOT EXISTS recurring_payment_shares (
  payment_id UUID NOT NULL REFERENCES recurring_payments(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id)          ON DELETE CASCADE,
  pay        DECIMAL(10,2) NOT NULL DEFAULT 0,
  paid       DECIMAL(10,2) NOT NULL DEFAULT 0,
  PRIMARY KEY (payment_id, user_id)
);

ALTER TABLE recurring_payment_shares ENABLE ROW LEVEL SECURITY;

-- Single ALL policy — same house-scoped logic as recurring_payments
CREATE POLICY "rps_all" ON recurring_payment_shares FOR ALL TO authenticated
  USING (
    payment_id IN (
      SELECT id FROM recurring_payments WHERE house_id IN (SELECT get_user_house_ids())
    )
  )
  WITH CHECK (
    payment_id IN (
      SELECT id FROM recurring_payments WHERE house_id IN (SELECT get_user_house_ids())
    )
  );

-- Migrate existing th/ma column data into the junction table.
-- First joined member → th_pay/th_paid, second joined member → ma_pay/ma_paid.
INSERT INTO recurring_payment_shares (payment_id, user_id, pay, paid)
SELECT
  rp.id,
  ranked.user_id,
  CASE ranked.rn
    WHEN 1 THEN COALESCE(rp.th_pay,  0)
    WHEN 2 THEN COALESCE(rp.ma_pay,  0)
    ELSE 0
  END,
  CASE ranked.rn
    WHEN 1 THEN COALESCE(rp.th_paid, 0)
    WHEN 2 THEN COALESCE(rp.ma_paid, 0)
    ELSE 0
  END
FROM recurring_payments rp
JOIN (
  SELECT house_id, user_id,
         ROW_NUMBER() OVER (PARTITION BY house_id ORDER BY joined_at ASC) AS rn
  FROM house_members
) ranked ON ranked.house_id = rp.house_id
WHERE ranked.rn <= 2
ON CONFLICT (payment_id, user_id) DO NOTHING;
