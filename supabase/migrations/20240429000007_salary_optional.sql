-- share_salary: user controls whether their salary is visible for split calculations
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS share_salary BOOLEAN NOT NULL DEFAULT true;

-- split_pct: manual split percentage override (0-100) per member per month
-- used when share_salary = false
ALTER TABLE member_salaries ADD COLUMN IF NOT EXISTS split_pct REAL;
