-- Create weekly feedback table
CREATE TABLE IF NOT EXISTS weekly_feedback (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  email TEXT NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  total_sessions INTEGER DEFAULT 0,
  avg_wpm DECIMAL(5,2) DEFAULT 0,
  avg_accuracy DECIMAL(5,2) DEFAULT 0,
  total_keystrokes INTEGER DEFAULT 0,
  improvement_wpm DECIMAL(5,2) DEFAULT 0,
  feedback_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_weekly_feedback_user ON weekly_feedback(user_id);
CREATE INDEX idx_weekly_feedback_week ON weekly_feedback(week_start, week_end);

-- Enable RLS
ALTER TABLE weekly_feedback ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own feedback" ON weekly_feedback
  FOR SELECT USING (auth.uid() = user_id);

-- Function to generate weekly report
CREATE OR REPLACE FUNCTION generate_weekly_report(user_uuid UUID, user_email TEXT)
RETURNS JSON AS $$
DECLARE
  week_start DATE;
  week_end DATE;
  current_stats RECORD;
  previous_stats RECORD;
  report JSON;
BEGIN
  -- Get current week (Sunday to Saturday)
  week_start := DATE_TRUNC('week', CURRENT_DATE);
  week_end := week_start + INTERVAL '6 days';
  
  -- Get current week stats
  SELECT 
    COUNT(*) as sessions,
    ROUND(AVG(wpm), 2) as avg_wpm,
    ROUND(AVG(accuracy), 2) as avg_accuracy,
    SUM(keystrokes) as total_keystrokes
  INTO current_stats
  FROM typing_scores 
  WHERE user_id = user_uuid 
    AND DATE(created_at) BETWEEN week_start AND week_end;
  
  -- Get previous week stats for comparison
  SELECT 
    ROUND(AVG(wpm), 2) as avg_wpm
  INTO previous_stats
  FROM typing_scores 
  WHERE user_id = user_uuid 
    AND DATE(created_at) BETWEEN (week_start - INTERVAL '7 days') AND (week_start - INTERVAL '1 day');
  
  -- Calculate improvement
  report := json_build_object(
    'email', user_email,
    'week_start', week_start,
    'week_end', week_end,
    'sessions', COALESCE(current_stats.sessions, 0),
    'avg_wpm', COALESCE(current_stats.avg_wpm, 0),
    'avg_accuracy', COALESCE(current_stats.avg_accuracy, 0),
    'total_keystrokes', COALESCE(current_stats.total_keystrokes, 0),
    'improvement_wpm', COALESCE(current_stats.avg_wpm - previous_stats.avg_wpm, 0),
    'feedback_message', CASE 
      WHEN current_stats.sessions = 0 THEN 'No practice sessions this week. Daily practice leads to better results.'
      WHEN current_stats.avg_wpm > previous_stats.avg_wpm THEN 'Excellent progress! Your typing speed has improved this week.'
      WHEN current_stats.avg_wpm = previous_stats.avg_wpm THEN 'Consistent performance. Try more challenging texts to improve further.'
      ELSE 'Focus on accuracy and regular practice to increase your typing speed.'
    END
  );
  
  -- Insert feedback record
  INSERT INTO weekly_feedback (
    user_id, email, week_start, week_end, 
    total_sessions, avg_wpm, avg_accuracy, total_keystrokes, improvement_wpm
  ) VALUES (
    user_uuid, user_email, week_start, week_end,
    COALESCE(current_stats.sessions, 0),
    COALESCE(current_stats.avg_wpm, 0),
    COALESCE(current_stats.avg_accuracy, 0),
    COALESCE(current_stats.total_keystrokes, 0),
    COALESCE(current_stats.avg_wpm - previous_stats.avg_wpm, 0)
  );
  
  RETURN report;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;