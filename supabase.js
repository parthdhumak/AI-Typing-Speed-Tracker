// Supabase Configuration
const SUPABASE_URL = 'https://jhyicwcwclalfnmhvcrw.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoeWljd2N3Y2xhbGZubWh2Y3J3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzNTAxOTAsImV4cCI6MjA3NTkyNjE5MH0.iBRis_sTOosQ3QwFCrJGCGh2YMoNW-rWbKGztuwl_QY';

// Create Supabase Edge Function for AI text generation
const createAIFunction = `
create or replace function generate_text_content(topic text)
returns json
language plpgsql
as $$
declare
  result json;
begin
  case 
    when lower(topic) like '%technology%' or lower(topic) like '%ai%' or lower(topic) like '%artificial intelligence%' then
      result := json_build_object('content', 'Technology continues to revolutionize our world through artificial intelligence, machine learning, and automation. These innovations transform industries, improve efficiency, and create new opportunities for human advancement. From smart devices to autonomous systems, technology shapes how we work, communicate, and solve complex problems in the modern era. The integration of AI into daily life has accelerated dramatically, with applications ranging from voice assistants to predictive analytics.');
    when lower(topic) like '%space%' or lower(topic) like '%astronomy%' or lower(topic) like '%exploration%' then
      result := json_build_object('content', 'Space exploration represents humanity greatest adventure, pushing the boundaries of knowledge and technology. From the first moon landing to modern Mars missions, space programs have advanced our understanding of the universe. Future missions aim to establish permanent settlements beyond Earth, ensuring the survival and continued growth of human civilization. Private companies now collaborate with government agencies to make space travel more accessible and affordable than ever before.');
    when lower(topic) like '%science%' or lower(topic) like '%physics%' or lower(topic) like '%chemistry%' then
      result := json_build_object('content', 'Science is the systematic study of the natural world through observation, experimentation, and analysis. It helps us understand fundamental principles governing matter, energy, and life itself. Scientific discoveries drive innovation in medicine, technology, and environmental protection, contributing to human knowledge and improving quality of life worldwide. The scientific method provides a reliable framework for investigating phenomena and testing hypotheses.');
    else
      result := json_build_object('content', 'Learning about ' || topic || ' provides valuable insights and knowledge that enhance our understanding of the world. Through careful study and analysis, we develop critical thinking skills and gain expertise in various fields. This knowledge helps us make informed decisions and contribute meaningfully to society and human progress. Continuous learning and curiosity drive innovation and personal growth in every aspect of life.');
  end case;
  
  return result;
end;
$$;`;

// Supabase API Client
const Supabase = {
  async request(endpoint, options = {}) {
    const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
        ...options.headers
      },
      ...options
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Supabase error:', response.status, errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    return response.json();
  },

  async saveScore(scoreData) {
    try {
      const data = await this.request('typing_scores', {
        method: 'POST',
        body: JSON.stringify({
          player_name: scoreData.name,
          wpm: scoreData.netWpm,
          accuracy: scoreData.accuracy,
          duration: scoreData.duration,
          keystrokes: scoreData.keystrokes || 0,
          mistakes: scoreData.mistakes || 0,
          created_at: new Date().toISOString()
        })
      });
      return data;
    } catch (error) {
      console.error('Failed to save score:', error);
      return null;
    }
  },

  async getLeaderboard(limit = 10) {
    try {
      console.log('Fetching leaderboard...');
      const data = await this.request(`typing_scores?select=*&order=wpm.desc&limit=${limit}`);
      console.log('Leaderboard data:', data);
      return data || [];
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
      return [];
    }
  },

  async getPlayerStats(playerName) {
    try {
      const data = await this.request(`typing_scores?player_name=eq.${encodeURIComponent(playerName)}&order=created_at.desc&limit=10`);
      return data || [];
    } catch (error) {
      console.error('Failed to fetch player stats:', error);
      return [];
    }
  },


};