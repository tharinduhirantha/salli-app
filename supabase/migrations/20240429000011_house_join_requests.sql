CREATE TABLE house_join_requests (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id    uuid NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status      text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at  timestamptz DEFAULT now(),
  UNIQUE(house_id, user_id)
);

ALTER TABLE house_join_requests ENABLE ROW LEVEL SECURITY;

-- Requester can insert their own request
CREATE POLICY "insert own request" ON house_join_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Requester can view their own requests
CREATE POLICY "view own requests" ON house_join_requests
  FOR SELECT USING (auth.uid() = user_id);

-- House owner can view requests for their house
CREATE POLICY "owner view requests" ON house_join_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM house_members
      WHERE house_members.house_id = house_join_requests.house_id
        AND house_members.user_id = auth.uid()
        AND house_members.role = 'owner'
    )
  );

-- House owner can update (approve/reject) requests for their house
CREATE POLICY "owner update requests" ON house_join_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM house_members
      WHERE house_members.house_id = house_join_requests.house_id
        AND house_members.user_id = auth.uid()
        AND house_members.role = 'owner'
    )
  );

-- Requester can delete their own pending request (cancel)
CREATE POLICY "delete own request" ON house_join_requests
  FOR DELETE USING (auth.uid() = user_id);
