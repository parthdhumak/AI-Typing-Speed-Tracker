// Direct email sending to logged-in user
async function showEmailPreview() {
  // Get user email from Supabase auth
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user || !user.email) {
    alert('Please login first to receive email reports');
    return;
  }
  
  const userEmail = user.email;
  const userName = user.user_metadata?.name || user.email.split('@')[0];
  
  const emailData = {
    to: userEmail,
    subject: 'Weekly Typing Progress Report',
    html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #333; text-align: center;">Weekly Typing Progress Report</h2>
      <p>Hello ${userName}! Here's your weekly summary:</p>
      
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
        <div style="display: inline-block; margin: 10px 15px;">
          <div style="font-size: 24px; font-weight: bold;">12</div>
          <div style="font-size: 12px;">Sessions</div>
        </div>
        <div style="display: inline-block; margin: 10px 15px;">
          <div style="font-size: 24px; font-weight: bold;">68.5</div>
          <div style="font-size: 12px;">Avg WPM</div>
        </div>
        <div style="display: inline-block; margin: 10px 15px;">
          <div style="font-size: 24px; font-weight: bold;">94.2%</div>
          <div style="font-size: 12px;">Accuracy</div>
        </div>
        <div style="display: inline-block; margin: 10px 15px;">
          <div style="font-size: 24px; font-weight: bold;">+5.3</div>
          <div style="font-size: 12px;">Improvement</div>
        </div>
      </div>
      
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin: 20px 0;">
        <h3>Weekly Insight</h3>
        <p>Excellent progress this week! Your typing speed improved significantly. Continue practicing consistently for best results.</p>
      </div>
      
      <p style="text-align: center; color: #666;">Keep up the great work!</p>
    </div>`
  };
  
  try {
    const response = await fetch('https://api.netlify.com/api/v1/forms/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        'form-name': 'email-sender',
        ...emailData
      })
    });
    
    if (response.ok) {
      alert('✅ Email sent successfully! Check your inbox.');
    } else {
      throw new Error('Failed to send');
    }
  } catch (error) {
    // Fallback: Use EmailJS
    sendWithEmailJS(userEmail, emailData, userName);
  }
}

// Fallback using EmailJS
function sendWithEmailJS(userEmail, emailData, userName) {
  // Simple mailto fallback
  const subject = encodeURIComponent(emailData.subject);
  const body = encodeURIComponent(`Weekly Typing Progress Report

Hello ${userName}! Here's your weekly summary:

Performance:
• Practice Sessions: 12
• Average Speed: 68.5 WPM
• Accuracy Rate: 94.2%
• Speed Improvement: +5.3 WPM

Insight:
Excellent progress this week! Your typing speed improved significantly. Continue practicing consistently for best results.

Keep up the great work!`);
  
  const mailtoLink = `mailto:${userEmail}?subject=${subject}&body=${body}`;
  
  // Try to open default email client
  const link = document.createElement('a');
  link.href = mailtoLink;
  link.click();
  
  alert('✅ Email draft opened in your default email app. Please send it to yourself.');
}