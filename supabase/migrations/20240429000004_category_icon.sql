ALTER TABLE categories ADD COLUMN IF NOT EXISTS icon TEXT NOT NULL DEFAULT 'help-circle-outline';

-- Back-fill default icons for existing categories
UPDATE categories SET icon = 'restaurant-outline'          WHERE name = 'Food';
UPDATE categories SET icon = 'home-outline'                WHERE name = 'Household';
UPDATE categories SET icon = 'car-outline'                 WHERE name = 'Car';
UPDATE categories SET icon = 'receipt-outline'             WHERE name = 'Bill';
UPDATE categories SET icon = 'heart-outline'               WHERE name = 'Baby';
UPDATE categories SET icon = 'construct-outline'           WHERE name = 'Maintenance';
UPDATE categories SET icon = 'ellipsis-horizontal-circle-outline' WHERE name = 'Other';
UPDATE categories SET icon = 'game-controller-outline'     WHERE name = 'Fun';
UPDATE categories SET icon = 'phone-portrait-outline'      WHERE name = 'Subscription';
UPDATE categories SET icon = 'bag-handle-outline'          WHERE name = 'Shopping';
UPDATE categories SET icon = 'globe-outline'               WHERE name = 'Online';
UPDATE categories SET icon = 'car-sport-outline'           WHERE name = 'Taxi';
UPDATE categories SET icon = 'medkit-outline'              WHERE name = 'Medicine';
UPDATE categories SET icon = 'card-outline'                WHERE name = 'Installment';
UPDATE categories SET icon = 'wallet-outline'              WHERE name = 'Deposit';
UPDATE categories SET icon = 'person-outline'              WHERE name = 'Personal';
