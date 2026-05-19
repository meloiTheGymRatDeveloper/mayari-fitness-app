-- mayari/supabase/migrations/018_grocery_lists.sql
CREATE TABLE IF NOT EXISTS grocery_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  meal_plan_id uuid REFERENCES meal_plans(id) ON DELETE SET NULL,
  name text,
  items jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_grocery_lists_user_id ON grocery_lists(user_id);

ALTER TABLE grocery_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own grocery lists"
  ON grocery_lists FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own grocery lists"
  ON grocery_lists FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own grocery lists"
  ON grocery_lists FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own grocery lists"
  ON grocery_lists FOR DELETE USING (auth.uid() = user_id);
