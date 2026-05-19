CREATE TABLE IF NOT EXISTS fasting_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_window_hours int NOT NULL,
  fasting_start timestamptz NOT NULL,
  eating_window_start timestamptz,
  eating_window_end timestamptz,
  fasting_end timestamptz,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fasting_logs_user_id ON fasting_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_fasting_logs_user_status ON fasting_logs(user_id, status);

ALTER TABLE fasting_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own fasting logs"
  ON fasting_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own fasting logs"
  ON fasting_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own fasting logs"
  ON fasting_logs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own fasting logs"
  ON fasting_logs FOR DELETE
  USING (auth.uid() = user_id);
