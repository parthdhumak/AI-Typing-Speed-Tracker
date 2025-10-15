-- Run this SQL in your Supabase SQL Editor to create the database table

CREATE TABLE typing_scores (
  id BIGSERIAL PRIMARY KEY,
  player_name TEXT NOT NULL,
  wpm INTEGER NOT NULL,
  accuracy INTEGER NOT NULL,
  duration INTEGER NOT NULL,
  keystrokes INTEGER DEFAULT 0,
  mistakes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_typing_scores_wpm ON typing_scores(wpm DESC);
CREATE INDEX idx_typing_scores_player ON typing_scores(player_name);

-- Enable Row Level Security (optional)
ALTER TABLE typing_scores ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read scores
CREATE POLICY "Anyone can view scores" ON typing_scores
  FOR SELECT USING (true);

-- Allow anyone to insert scores
CREATE POLICY "Anyone can insert scores" ON typing_scores
  FOR INSERT WITH CHECK (true);