-- Create Edge Function for sending weekly emails
-- This function should be deployed as a Supabase Edge Function

-- First, create the email template function
CREATE OR REPLACE FUNCTION get_email_template(
  user_name TEXT,
  sessions INTEGER,
  avg_wpm DECIMAL,
  avg_accuracy DECIMAL,
  improvement_wpm DECIMAL,
  feedback_message TEXT
) RETURNS TEXT AS $$
BEGIN
  RETURN format('
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; background: #f0f0f0; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; padding: 30px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
    .header { text-align: center; color: #333; margin-bottom: 30px; }
    .stats { background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%); color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .stat-item { display: inline-block; margin: 10px 20px; text-align: center; }
    .stat-value { font-size: 24px; font-weight: bold; display: block; }
    .stat-label { font-size: 12px; opacity: 0.9; }
    .feedback { background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin: 20px 0; }
    .footer { text-align: center; color: #666; margin-top: 30px; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎯 Weekly Typing Report</h1>
      <p>Hi %s! Here''s your weekly typing progress</p>
    </div>
    
    <div class="stats">
      <div class="stat-item">
        <span class="stat-value">%s</span>
        <span class="stat-label">Sessions</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">%s</span>
        <span class="stat-label">Avg WPM</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">%s%%</span>
        <span class="stat-label">Accuracy</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">%s</span>
        <span class="stat-label">WPM Change</span>
      </div>
    </div>
    
    <div class="feedback">
      <h3>💡 Weekly Feedback</h3>
      <p>%s</p>
    </div>
    
    <div class="footer">
      <p>Keep practicing to improve your typing skills! 🚀</p>
      <p><a href="file:///c:/Users/Parth/Downloads/ADHD/AI+WC.html">Continue Practicing</a></p>
    </div>
  </div>
</body>
</html>',
    user_name, sessions, avg_wpm, avg_accuracy, 
    CASE WHEN improvement_wpm > 0 THEN ''+'' || improvement_wpm ELSE improvement_wpm::TEXT END,
    feedback_message
  );
END;
$$ LANGUAGE plpgsql;

-- Function to send weekly emails (to be called by cron job)
CREATE OR REPLACE FUNCTION send_weekly_emails()
RETURNS INTEGER AS $$
DECLARE
  user_record RECORD;
  report_data JSON;
  email_html TEXT;
  emails_sent INTEGER := 0;
BEGIN
  -- Loop through all users who have typing scores
  FOR user_record IN 
    SELECT DISTINCT u.id, u.email, COALESCE(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)) as name
    FROM auth.users u
    WHERE u.email IS NOT NULL
    AND EXISTS (SELECT 1 FROM typing_scores ts WHERE ts.user_id = u.id)
  LOOP
    -- Generate weekly report
    SELECT generate_weekly_report(user_record.id, user_record.email) INTO report_data;
    
    -- Generate email HTML
    SELECT get_email_template(
      user_record.name,
      (report_data->>'sessions')::INTEGER,
      (report_data->>'avg_wpm')::DECIMAL,
      (report_data->>'avg_accuracy')::DECIMAL,
      (report_data->>'improvement_wpm')::DECIMAL,
      report_data->>'feedback_message'
    ) INTO email_html;
    
    -- Send email using Supabase's built-in email service
    -- Note: This requires Supabase Pro plan with email service enabled
    PERFORM net.http_post(
      url := 'https://api.resend.com/emails',
      headers := jsonb_build_object(
        'Authorization', 'Bearer YOUR_RESEND_API_KEY',
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'from', 'AI Typing Coach <noreply@yourdomain.com>',
        'to', user_record.email,
        'subject', 'Your Weekly Typing Progress Report 📊',
        'html', email_html
      )
    );
    
    -- Mark feedback as sent
    UPDATE weekly_feedback 
    SET feedback_sent = TRUE 
    WHERE user_id = user_record.id 
    AND week_start = DATE_TRUNC('week', CURRENT_DATE)
    AND feedback_sent = FALSE;
    
    emails_sent := emails_sent + 1;
  END LOOP;
  
  RETURN emails_sent;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create cron job to run every Sunday at 12:00 PM
-- This requires pg_cron extension (available in Supabase Pro)
SELECT cron.schedule(
  'weekly-typing-feedback',
  '0 12 * * 0',  -- Every Sunday at 12:00 PM
  'SELECT send_weekly_emails();'
);