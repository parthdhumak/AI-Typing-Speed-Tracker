/** -------------------- CONSTANTS & CONFIG -------------------- */
const CORPORA = {
  easy: `Practice makes progress. Keep your eyes on the screen. Use all fingers if you can. Stay relaxed and breathe. Accuracy matters more than speed.`,
  medium: `Typing quickly requires rhythm, posture, and consistent focus. Aim for smooth, even keystrokes. Correct mistakes promptly, but avoid overthinking.`,
  hard: `Typing proficiency emerges from deliberate repetition, ergonomic alignment, and strategic correction. Sustain tempo; minimize cognitive switching and latency.`,
  numbers: `2025-08-21 14:37:59 — CPU@3.5GHz, RAM=16GB; ping 127.0.0.1 ~ 23ms; sum = 3.1415 * 2e2 / 0.25 => 2513.2!`,
};

const KEYBOARD_LAYOUT = [
  'q w e r t y u i o p [ ] \\',
  'a s d f g h j k l ; \'',
  'z x c v b n m , . /',
  '` 1 2 3 4 5 6 7 8 9 0 - ='
];

const STORAGE_KEYS = {
  THEME: 'theme',
  LAST_SESSION: 'aiTyping:last',
  SCORE_HISTORY: 'aiTyping:history' 
};

/** -------------------- STATE MANAGEMENT -------------------- */
const State = {
  targetText: '',
  typed: '',
  started: false,
  startTime: 0,
  timerId: null,
  duration: 30,
  errorsByKey: {},
  pressesByKey: {},
  customActive: false,
  backspaceCount: 0 
};

/** -------------------- DOM ELEMENTS -------------------- */
const Elements = {
  area: document.getElementById('textArea'),
  wpm: document.getElementById('wpm'),
  netWpm: document.getElementById('netWpm'),
  acc: document.getElementById('acc'),
  keys: document.getElementById('keys'),
  backspaceCount: document.getElementById('backspaceCount'), 
  coachMsg: document.getElementById('coachMsg'),
  tips: document.getElementById('tips'),
  progressBar: document.getElementById('progressBar'),
  keyboard: document.getElementById('keyboard'),
  summary: document.getElementById('summary'),
  useCustomBtn: document.getElementById('useCustom'),
  customTextInput: document.getElementById('customText'),
  themeBtns: document.querySelectorAll('.theme-btn'),
  difficulty: document.getElementById('difficulty'),
  duration: document.getElementById('duration'),
  startBtn: document.getElementById('startBtn'),
  resetBtn: document.getElementById('resetBtn'),
  copyBtn: document.getElementById('copyBtn'),
  globalLeaderboard: document.getElementById('globalLeaderboard'),
  typerName: document.getElementById('typerName'),
  aiSearch: document.getElementById('aiSearch'),
  aiSearchBtn: document.getElementById('aiSearchBtn'),
  // 👇 New Overlay Elements
  overlay: document.getElementById('overlay'), 
  overlayContent: document.getElementById('overlayContent') 
};

/** -------------------- UTILITY FUNCTIONS -------------------- */
const Utils = {
  escapeHtml: (s) => s.replace(/[&<>"']/g, c => 
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" }[c])
  ),

  clamp: (n, min, max) => Math.max(min, Math.min(max, n)),

  normalizeKey: (key) => key === ' ' ? 'space' : key.toLowerCase()
};

/** -------------------- AI SEARCH -------------------- */
const AISearch = {
  async fetchParagraph(query) {
    if (!query.trim()) return null;
    
    Elements.coachMsg.innerHTML = '🔍 Searching Wikipedia for "' + Utils.escapeHtml(query) + '"...';
    
    try {
      // Try Wikipedia API first
      const response = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`
      );
      
      if (response.ok) {
        const data = await response.json();
        let text = data.extract || '';
        
        if (text.length > 100) {
          // Clean up the text and make it longer for typing practice
          text = text.replace(/\([^)]*\)/g, '').trim();
          
          // If text is too short, try to get more content
          if (text.length < 200) {
            const moreResponse = await fetch(
              `https://en.wikipedia.org/w/api.php?action=query&format=json&titles=${encodeURIComponent(query)}&prop=extracts&exintro=true&explaintext=true&exsectionformat=plain&origin=*`
            );
            
            if (moreResponse.ok) {
              const moreData = await moreResponse.json();
              const pages = moreData.query?.pages;
              if (pages) {
                const pageId = Object.keys(pages)[0];
                const extract = pages[pageId]?.extract;
                if (extract && extract.length > text.length) {
                  text = extract.substring(0, 500).trim();
                }
              }
            }
          }
          
          Elements.coachMsg.innerHTML = '✅ Wikipedia content loaded! Press Start to begin.';
          return text;
        }
      }
    } catch (error) {
      console.log('Wikipedia API failed, using fallback');
    }
    
    // Fallback to local generation
    const text = this.generateSmartText(query);
    Elements.coachMsg.innerHTML = '✅ Content generated! Press Start to begin.';
    return text;
  },
  
  generateSmartText(topic) {
    const lowerTopic = topic.toLowerCase();
    
    // Exact matches first
    if (lowerTopic.includes('artificial intelligence') || lowerTopic.includes('ai')) {
      return `Artificial intelligence represents one of the most transformative technologies of our time. AI systems can process vast amounts of data, recognize patterns, and make decisions with remarkable speed and accuracy. From virtual assistants to autonomous vehicles, AI is revolutionizing industries and changing how we interact with technology. Machine learning algorithms enable computers to learn from experience without explicit programming. As AI continues to evolve, it promises to solve complex problems in healthcare, education, and scientific research while raising important questions about ethics and the future of work.`;
    }
    
    if (lowerTopic.includes('space') || lowerTopic.includes('exploration') || lowerTopic.includes('astronomy')) {
      return `Space exploration has captivated humanity for generations, driving us to push beyond the boundaries of our planet. From the first satellite launches to landing on the Moon, each mission has expanded our understanding of the universe. Modern space programs focus on Mars exploration, asteroid mining, and the search for extraterrestrial life. Private companies now work alongside government agencies to make space travel more accessible and affordable. The International Space Station serves as a testament to international cooperation and scientific advancement. Future missions aim to establish permanent settlements on other planets, ensuring humanity's survival and continued exploration of the cosmos.`;
    }
    
    if (lowerTopic.includes('climate') || lowerTopic.includes('global warming') || lowerTopic.includes('environment')) {
      return `Climate change represents one of the most pressing challenges facing our planet today. Rising global temperatures, melting ice caps, and extreme weather events are clear indicators of environmental transformation. Human activities, particularly the burning of fossil fuels, have significantly increased greenhouse gas concentrations in the atmosphere. Scientists worldwide are working to develop renewable energy solutions, improve energy efficiency, and create sustainable technologies. Individual actions, such as reducing energy consumption and supporting eco-friendly practices, can contribute to global efforts. International cooperation and policy changes are essential for addressing this complex issue and protecting our planet for future generations.`;
    }
    
    if (lowerTopic.includes('technology') || lowerTopic.includes('computer') || lowerTopic.includes('digital')) {
      return `Technology continues to reshape every aspect of modern life, from communication to transportation and entertainment. Smartphones have become powerful computers that fit in our pockets, connecting us to information and people worldwide. Cloud computing enables businesses to store and process data more efficiently than ever before. Emerging technologies like virtual reality, blockchain, and quantum computing promise to unlock new possibilities we can barely imagine. The rapid pace of technological advancement requires continuous learning and adaptation. As we embrace these innovations, we must also consider their impact on privacy, security, and social relationships.`;
    }
    
    if (lowerTopic.includes('history') || lowerTopic.includes('ancient') || lowerTopic.includes('civilization')) {
      return `History provides valuable lessons about human civilization, culture, and progress throughout the ages. Ancient civilizations like Egypt, Greece, and Rome laid the foundations for modern government, philosophy, and architecture. The Renaissance period sparked scientific discovery and artistic achievement that continues to influence us today. Major historical events, including wars, revolutions, and social movements, have shaped the world we live in. By studying the past, we can better understand current events and make informed decisions about the future. Historical preservation efforts ensure that important artifacts, documents, and stories are maintained for future generations to learn from and appreciate.`;
    }
    
    if (lowerTopic.includes('science') || lowerTopic.includes('physics') || lowerTopic.includes('chemistry') || lowerTopic.includes('biology')) {
      return `Science is the systematic study of the natural world through observation, experimentation, and analysis. Scientific methods help us understand everything from subatomic particles to vast galaxies. Breakthrough discoveries in physics have revealed the fundamental laws governing matter and energy. Chemistry explores how atoms and molecules interact to form the substances around us. Biology investigates living organisms and their complex processes. Scientific research drives innovation in medicine, technology, and environmental protection. The scientific community collaborates globally to solve pressing challenges and expand human knowledge. Critical thinking and evidence-based reasoning are essential skills that science education provides to students worldwide.`;
    }
    
    if (lowerTopic.includes('nature') || lowerTopic.includes('animal') || lowerTopic.includes('wildlife') || lowerTopic.includes('forest')) {
      return `Nature encompasses the incredible diversity of life and ecosystems that exist on our planet. From tropical rainforests to arctic tundra, each environment supports unique species adapted to specific conditions. Biodiversity is essential for maintaining ecological balance and providing resources that humans depend on. Conservation efforts work to protect endangered species and preserve natural habitats for future generations. Understanding ecological relationships helps us appreciate the interconnectedness of all living things. Climate and geography influence the distribution of plants and animals across different regions. Environmental science studies how human activities impact natural systems and seeks sustainable solutions for coexistence.`;
    }
    
    if (lowerTopic.includes('medicine') || lowerTopic.includes('health') || lowerTopic.includes('medical')) {
      return `Medicine and healthcare have advanced dramatically over the past century, transforming how we prevent, diagnose, and treat diseases. Modern medical technology includes sophisticated imaging systems, minimally invasive surgical techniques, and personalized treatment approaches. Preventive medicine emphasizes the importance of healthy lifestyle choices, regular screenings, and vaccinations. Medical research continues to develop new treatments for cancer, heart disease, and neurological disorders. The integration of artificial intelligence and big data analytics is revolutionizing drug discovery and patient care. Global health initiatives work to ensure that medical advances benefit people worldwide, regardless of their economic circumstances.`;
    }
    
    if (lowerTopic.includes('education') || lowerTopic.includes('learning') || lowerTopic.includes('school')) {
      return `Education serves as the foundation for personal development and societal progress. Modern educational approaches emphasize critical thinking, creativity, and collaborative problem-solving skills. Technology has transformed learning through online courses, interactive simulations, and personalized instruction. Teachers play a crucial role in inspiring students and adapting to diverse learning styles and needs. Educational research continues to improve teaching methods and curriculum design. Access to quality education remains a global challenge, with efforts focused on reducing inequality and expanding opportunities. Lifelong learning has become essential in our rapidly changing world, requiring individuals to continuously update their knowledge and skills.`;
    }
    
    // Default for unrecognized topics
    return `The study of ${topic} offers fascinating insights into complex systems and phenomena that shape our world. This field encompasses diverse perspectives, methodologies, and applications that contribute to human knowledge and understanding. Researchers and practitioners in this area work to solve important problems and advance our collective wisdom. Through systematic investigation and analysis, we can uncover patterns, relationships, and principles that help explain how things work. The knowledge gained from studying ${topic} has practical applications that benefit society and improve quality of life. Continued exploration and discovery in this field promise to yield new breakthroughs and innovations that will shape our future.`;
  },

};

/** -------------------- TEXT GENERATION -------------------- */
const TextGenerator = {
  buildMarkov(text) {
    const words = text.replace(/\n/g, ' ').split(/\s+/).filter(Boolean);
    const model = new Map();
    
    for (let i = 0; i < words.length - 2; i++) {
      const key = `${words[i]} ${words[i + 1]}`;
      if (!model.has(key)) model.set(key, []);
      model.get(key).push(words[i + 2]);
    }
    
    return { model, words };
  },

  generateText(seedText, targetLen = 45) {
    const { model, words } = this.buildMarkov(seedText);
    if (words.length < 3) return seedText;

    let i = Math.floor(Math.random() * (words.length - 2));
    let [w1, w2] = [words[i], words[i + 1]];
    const out = [w1, w2];

    while (out.length < targetLen) {
      const next = model.get(`${w1} ${w2}`);
      if (!next?.length) {
        i = Math.floor(Math.random() * (words.length - 2));
        [w1, w2] = [words[i], words[i + 1]];
        out.push(w1);
        continue;
      }
      
      const w3 = next[Math.floor(Math.random() * next.length)];
      out.push(w3);
      [w1, w2] = [w2, w3];
    }
    
    return out.join(' ').replace(/\s+/g, ' ').trim();
  },

  pickPassage() {
    if (State.customActive && Elements.customTextInput.value.trim()) {
      const customText = Elements.customTextInput.value.trim();
      return customText
        .split(/\n+/)
        .map(p => p.replace(/\s+/g, ' ').trim())
        .filter(Boolean)
        .join('\n\n');
    }

    const mode = Elements.difficulty.value;
    switch (mode) {
      case 'easy': 
        return this.generateText(CORPORA.easy, 120); 
      case 'medium': 
        return this.generateText(CORPORA.medium, 140); 
      case 'hard': 
        return this.generateText(CORPORA.hard, 160); 
      case 'numbers': 
        return this.generateText(CORPORA.numbers, 50);
    }

    // --- AUTO-AI LOGIC (Runs for 'auto' or default) ---
    const lastSession = JSON.parse(localStorage.getItem(STORAGE_KEYS.LAST_SESSION) || 'null');
    if (lastSession) {
      if (lastSession.netWpm > 60 && lastSession.accuracy > 95) {
        return this.generateText(`${CORPORA.hard} ${CORPORA.numbers}`, 75);
      }
      if (lastSession.netWpm > 40 && lastSession.accuracy > 92) {
        return this.generateText(CORPORA.medium, 65);
      }
      if (lastSession.netWpm < 25 || lastSession.accuracy < 85) {
        return this.generateText(CORPORA.easy, 45);
      }
      return this.generateText(CORPORA.medium, 60);
    }
    
    return this.generateText(`${CORPORA.easy} ${CORPORA.medium}`, 55);
  }
};

/** -------------------- STATISTICS CALCULATION -------------------- */
const Statistics = {
  calcStats() {
    const elapsed = (Date.now() - State.startTime) / 1000 || 0.001;
    const minutes = elapsed / 60;
    const grossWpm = Math.round((State.typed.length / 5) / minutes);
    const mistakes = [...State.typed].reduce((acc, char, index) => 
      acc + (char !== (State.targetText[index] || '')), 0
    );
    const accuracy = State.typed.length ? 
      Math.max(0, Math.round(100 * (1 - mistakes / State.typed.length))) : 100;
    const netWpm = Math.max(0, Math.round(grossWpm - (mistakes / minutes)));
    
    return { grossWpm, netWpm, accuracy, mistakes, elapsed };
  },

  worstKeys(n = 5) {
    // Logic extracted to Coach.buildSummary for clarity
    return Object.keys(State.pressesByKey)
      .map(key => ({
        key,
        presses: State.pressesByKey[key] || 0,
        errors: State.errorsByKey[key] || 0,
        rate: State.pressesByKey[key] ? (State.errorsByKey[key] || 0) / State.pressesByKey[key] : 0
      }))
      .filter(obj => obj.presses >= 2)
      .sort((a, b) => b.rate - a.rate)
      .slice(0, n);
  }
};

/** -------------------- RENDER FUNCTIONS -------------------- */
const Renderer = {
  updateMetrics() {
    const { grossWpm, netWpm, accuracy } = Statistics.calcStats();
    Elements.wpm.textContent = isFinite(grossWpm) ? grossWpm : 0;
    Elements.netWpm.textContent = isFinite(netWpm) ? netWpm : 0;
    Elements.acc.textContent = `${accuracy}%`;
    Elements.keys.textContent = State.typed.length;
    Elements.backspaceCount.textContent = State.backspaceCount; 
  },

  renderText() {
    const output = [];
    let caretPlaced = false;
    const words = State.targetText.split(/(\s+)/).filter(Boolean);
    let typedIndex = 0;

    if (!State.typed.length) {
      output.push('<span class="caret"></span>');
      caretPlaced = true;
    }

    for (const word of words) {
      let wordHtml = '';
      
      for (const char of word) {
        const typedChar = State.typed[typedIndex];
        let className = 'char';
        
        if (typedChar === undefined) className += ' pending';
        else if (typedChar === char) className += ' correct';
        else className += ' wrong';

        const displayChar = char === ' ' ? '&nbsp;' : Utils.escapeHtml(char);
        wordHtml += `<span class="${className}">${displayChar}</span>`;
        
        if (!caretPlaced && typedIndex === State.typed.length - 1) {
          wordHtml += '<span class="caret"></span>';
          caretPlaced = true;
        }
        
        typedIndex++;
      }
      
      output.push(`<span class="word">${wordHtml}</span>`);
    }

    if (!caretPlaced && State.typed.length >= State.targetText.length) {
      output.push('<span class="caret"></span>');
    }
    
    Elements.area.innerHTML = output.join('');

    const caret = Elements.area.querySelector('.caret');
    if (caret) {
      caret.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  },

  renderKeyboard() {
    Elements.keyboard.innerHTML = '';
    
    KEYBOARD_LAYOUT.forEach(row => {
      const rowElement = document.createElement('div');
      
      row.split(' ').forEach(char => {
        const keyElement = document.createElement('div');
        keyElement.className = 'kbd';
        keyElement.dataset.key = char;
        keyElement.innerHTML = `<span>${char}</span><span class="rate">0%</span>`;
        rowElement.appendChild(keyElement);
      });
      
      Elements.keyboard.appendChild(rowElement);
    });
  },

  updateKeyboard() {
    Elements.keyboard.querySelectorAll('.kbd').forEach(node => {
      const key = node.dataset.key;
      const presses = State.pressesByKey[key] || 0;
      const errors = State.errorsByKey[key] || 0;
      const errorRate = presses ? (errors / presses) : 0;

      node.classList.remove('bad', 'warn', 'good', 'good-press', 'bad-press');
      
      if (presses > 0) {
        node.classList.add(errors > 0 ? 'bad-press' : 'good-press');
      }
      
      node.querySelector('.rate').textContent = `${Math.round(errorRate * 100)}%`;
    });
  }
};

/** -------------------- AI LOGIC -------------------- */
const AICoach = {
  analyzePerformance() {
    const { grossWpm, netWpm, accuracy, elapsed } = Statistics.calcStats();
    const worstKeys = Statistics.worstKeys(3);
    
    let feedback = [];
    let tips = [];
    
    // Speed analysis
    if (netWpm < 20) {
      feedback.push('🐌 Focus on accuracy over speed');
      tips.push('Practice common letter combinations');
    } else if (netWpm < 40) {
      feedback.push('📈 Good progress! Keep practicing');
      tips.push('Try touch typing without looking at keyboard');
    } else if (netWpm < 60) {
      feedback.push('🚀 Excellent speed! Fine-tune accuracy');
      tips.push('Focus on rhythm and consistency');
    } else {
      feedback.push('⚡ Outstanding! You\'re a typing master');
      tips.push('Challenge yourself with harder texts');
    }
    
    // Accuracy analysis
    if (accuracy < 85) {
      feedback.push('🎯 Slow down and focus on accuracy');
      tips.push('Accuracy is more important than speed');
    } else if (accuracy < 95) {
      feedback.push('✅ Good accuracy, keep it up');
    } else {
      feedback.push('🎯 Perfect accuracy!');
    }
    
    // Error pattern analysis
    if (worstKeys.length > 0) {
      const problemKey = worstKeys[0].key;
      feedback.push(`⚠️ Watch out for "${problemKey}" key`);
      tips.push(`Practice words with "${problemKey}"`);
    }
    
    // Consistency analysis
    const consistency = this.analyzeConsistency();
    if (consistency < 0.7) {
      feedback.push('📊 Work on typing rhythm');
      tips.push('Try to maintain steady pace');
    }
    
    return { feedback, tips };
  },
  
  analyzeConsistency() {
    if (State.typed.length < 10) return 1;
    const intervals = [];
    let lastTime = State.startTime;
    
    for (let i = 0; i < Math.min(State.typed.length, 20); i++) {
      const currentTime = Date.now();
      intervals.push(currentTime - lastTime);
      lastTime = currentTime;
    }
    
    const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / intervals.length;
    return Math.max(0, 1 - (Math.sqrt(variance) / avg));
  },
  
  generatePersonalizedText() {
    const worstKeys = Statistics.worstKeys(5).map(k => k.key);
    if (worstKeys.length === 0) return null;
    
    const practiceWords = {
      'a': ['cat', 'bat', 'hat', 'mat', 'sat'],
      'e': ['see', 'bee', 'fee', 'tree', 'free'],
      's': ['sun', 'sit', 'set', 'sea', 'see'],
      't': ['top', 'tip', 'tap', 'ten', 'tea'],
      'i': ['big', 'bit', 'hit', 'sit', 'fit'],
      'n': ['not', 'net', 'new', 'now', 'run'],
      'o': ['dog', 'hot', 'pot', 'top', 'box'],
      'r': ['red', 'run', 'rat', 'car', 'far']
    };
    
    let words = [];
    worstKeys.forEach(key => {
      if (practiceWords[key]) {
        words.push(...practiceWords[key]);
      }
    });
    
    return words.length > 0 ? words.slice(0, 15).join(' ') : null;
  }
};

/** -------------------- COACHING SYSTEM -------------------- */
const Coach = {
  provideFeedback() {
    if (!State.started || State.typed.length <= 5) {
      Elements.coachMsg.innerHTML = 'Start typing when ready. Focus on consistency.';
      Elements.tips.innerHTML = '';
      return;
    }
    
    const analysis = AICoach.analyzePerformance();
    const { grossWpm, netWpm, accuracy, elapsed } = Statistics.calcStats();
    const cps = (State.typed.length / Math.max(1, elapsed)).toFixed(1);
    
    let message = `Typing at ${cps} cps. ${analysis.feedback.join(' ')}`;
    const tips = [...analysis.tips];
    
    const worstKeys = Statistics.worstKeys(3);
    if (worstKeys.length) {
      tips.push(`Focus on: ${worstKeys.map(w => 
        `<span class="kbd warn">${Utils.escapeHtml(w.key)}</span>`
      ).join(' ')}`);
    }
    
    if (State.backspaceCount > 5 && State.typed.length > 50) {
      tips.push(`You used ${State.backspaceCount} backspaces. Try to minimize corrections.`);
    }

    Elements.coachMsg.innerHTML = message;
    Elements.tips.innerHTML = tips.map(tip => `<li>${tip}</li>`).join('');
  },

  buildSummary() {
    const { grossWpm, netWpm, accuracy, mistakes } = Statistics.calcStats();
    const worstKeys = Statistics.worstKeys(5);

    const summaryData = { 
      grossWpm, netWpm, accuracy, mistakes, 
      duration: State.duration, 
      backspaces: State.backspaceCount, 
      timestamp: Date.now(), 
      worst: worstKeys 
    };
    
    const html = `
      <div class="session-summary">
        <h2>Session Summary</h2>
        <p><b>Gross WPM:</b> ${grossWpm} &nbsp; <b>Net WPM:</b> ${netWpm} &nbsp; <b>Accuracy:</b> ${accuracy}%</p>
        <p><b>Keystrokes:</b> ${State.typed.length} &nbsp; <b>Mistakes:</b> ${mistakes} &nbsp; <b>Backspaces:</b> ${State.backspaceCount}</p>
        <p><b>Duration:</b> ${State.duration}s</p>
        
        <div class="challenging-keys">
          ${worstKeys.map(w => 
            `<span class="key ${w.rate > 0.3 ? 'active' : ''}">${Utils.escapeHtml(w.key)}</span>`
          ).join('') || '<span class="key">No errors</span>'}
        </div>
      </div>`;
    
    return { json: summaryData, html };
  }
};

//** -------------------- GAME LOGIC -------------------- */
const Game = {
  reset() {
    clearInterval(State.timerId);
    State.started = false;
    State.typed = '';
    State.duration = +Elements.duration.value;



    State.targetText = TextGenerator.pickPassage();
    Elements.area.scrollTop = 0;
    
    // Reset metrics
    State.backspaceCount = 0; 
    Object.keys(State.errorsByKey).forEach(key => delete State.errorsByKey[key]);
    Object.keys(State.pressesByKey).forEach(key => delete State.pressesByKey[key]);
    
    // 👇 HIDE THE OVERLAY
    Elements.overlay.classList.remove('active'); 
    
    Renderer.renderText();
    Renderer.updateMetrics();
    Renderer.updateKeyboard();
    
    Elements.progressBar.style.width = '0%';
    // Reset coach message, clearing any "Time's Up" message
    Elements.coachMsg.innerHTML = 'Ready when you are. Press <b>Start</b> and begin typing.';
    Elements.tips.innerHTML = '';
    Elements.summary.textContent = 'Your results will appear here after the timer ends.';
  },

  start() {
    if (State.started) return;
    
    State.typed = '';
    State.started = true;
    State.startTime = Date.now();
    const totalDuration = State.duration;

    State.timerId = setInterval(() => {
      const elapsed = (Date.now() - State.startTime) / 1000;
      Elements.progressBar.style.width = `${100 * (elapsed / totalDuration)}%`;
      
      Renderer.updateMetrics();
      Coach.provideFeedback();
      
      // Calls the 'Times Up' handler
      if (elapsed >= totalDuration) this.finish(); 
    }, 100);
  },

  // The 'Times Up' handler: Handles all post-test logic and visual updates
  finish() { 
    clearInterval(State.timerId);
    State.started = false;
    
    Renderer.updateMetrics();
    Coach.provideFeedback();
    
    const summary = Coach.buildSummary();
    localStorage.setItem(STORAGE_KEYS.LAST_SESSION, JSON.stringify(summary.json));
    
    // --- HIGH SCORE HISTORY LOGIC ---
    const typerName = (Elements.typerName.value.trim() || 'Guest').substring(0, 15);
    const newSession = {
        ...summary.json,
        name: typerName,
        date: new Date().toLocaleString()
    };
    
    let history = JSON.parse(localStorage.getItem(STORAGE_KEYS.SCORE_HISTORY) || '[]');
    history.push(newSession);

    // Sort by netWpm (descending) and trim to top 10
    history.sort((a, b) => b.netWpm - a.netWpm);
    history = history.slice(0, 10); 
    
    localStorage.setItem(STORAGE_KEYS.SCORE_HISTORY, JSON.stringify(history));
    
    // Save to Supabase cloud database
    if (typeof supabase !== 'undefined') {
      saveScoreToSupabase({
        name: typerName,
        netWpm: summary.json.netWpm,
        accuracy: summary.json.accuracy,
        duration: summary.json.duration,
        keystrokes: State.typed.length,
        mistakes: summary.json.mistakes
      });
    }

    // Update Summary Panel with CURRENT session results
    Elements.summary.innerHTML = summary.html;

    // Display High Score History table
    this.displayHighScoreHistory(history);
  	
  	// --- NEW VISUAL "TIMES UP" FEATURE (Overlay) ---
  	Elements.overlayContent.innerHTML = `
    	<h2>TIME'S UP!</h2>
    	<p>Net WPM: *${summary.json.netWpm}*</p>
    	<p style="font-size: 1rem; color: var(--muted); margin-top: 1.5rem;">
    	Full summary and leaderboards are below.
    	</p>
  	`;
  	Elements.overlay.classList.add('active'); 
  	// ----------------------------------------------------

    // Ensure the coach message is neutral
    Elements.coachMsg.innerHTML = 'Test finished. Review your summary below.';
    Elements.tips.innerHTML = '';
  },

  displayHighScoreHistory(history) {
    if (!history.length) return;

    let html = `
        <div class="score-table">
            <h3>🏆 Top 10 Scores</h3>
            <table>
                <tr>
                    <th>Rank</th>
                    <th>Name</th>
                    <th>WPM</th>
                    <th>Acc</th>
                    <th>Time</th>
                </tr>
    `;

    history.forEach((score, index) => {
        html += `
            <tr>
                <td>${index + 1}${index === 0 ? '👑' : ''}</td>
                <td>${Utils.escapeHtml(score.name)}</td>
                <td>${score.netWpm}</td>
                <td>${score.accuracy}%</td>
                <td>${score.duration}s</td>
            </tr>
        `;
    });

    html += `</table></div>`;
    
    Elements.summary.innerHTML += html;
    

  },

  handleKeypress(event) {
    // Allow typing in custom text input or name input
    if (State.customActive && event.target === Elements.customTextInput) {
      return; 
    }
    if (event.target === Elements.typerName || event.target === Elements.aiSearch) {
      return; // Allow typing in the name field and AI search field
    }

    // If game hasn't started, prevent typing except for certain keys
    if (!State.started) {
      if (['Escape', 'F5'].includes(event.key)) return;
      event.preventDefault();
      return;
    }

    // Don't interfere with modifier key combinations
    if (event.ctrlKey || event.metaKey || event.altKey) return;

  	// Prevent typing if the overlay is active (i.e., test is over)
    if (Elements.overlay.classList.contains('active')) {
        event.preventDefault();
        return;
    }

    const expectedChar = State.targetText[State.typed.length] || '';
    const normalizedKey = Utils.normalizeKey(event.key);

    if (event.key === 'Backspace') {
      State.typed = State.typed.slice(0, -1);
      // Increment Backspace Count
      State.backspaceCount++; 
    } else if (event.key.length === 1) {
      State.typed += event.key;
      State.pressesByKey[normalizedKey] = (State.pressesByKey[normalizedKey] || 0) + 1;
      
      if (event.key !== expectedChar) {
        State.errorsByKey[normalizedKey] = (State.errorsByKey[normalizedKey] || 0) + 1;
      }
    } else {
      return;
    }

    event.preventDefault();
    
    Renderer.updateMetrics();
    Renderer.renderText();
    Renderer.updateKeyboard();

    if (State.typed.length >= State.targetText.length) {
      State.targetText += ' ' + TextGenerator.generateText(State.targetText, 25);
      Renderer.renderText();
    }
  }
};

/** -------------------- THEME MANAGEMENT -------------------- */
const ThemeManager = {
  applyTheme(theme) {
    if (theme === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.body.classList.toggle('dark', isDark);
    } else {
      document.body.classList.toggle('dark', theme === 'dark');
    }
    
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
    this.updateThemeButtons(theme);
  },

  updateThemeButtons(activeTheme) {
    Elements.themeBtns.forEach(btn => 
      btn.classList.toggle('active', btn.dataset.theme === activeTheme)
    );
  },

  init() {
    const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) || 'light';
    this.applyTheme(savedTheme);
  }
};

/** -------------------- EVENT HANDLERS -------------------- */
const EventHandlers = {
  init() {
    // Theme events
    Elements.themeBtns.forEach(btn => 
      btn.addEventListener('click', () => ThemeManager.applyTheme(btn.dataset.theme))
    );
    
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (localStorage.getItem(STORAGE_KEYS.THEME) === 'system') {
        ThemeManager.applyTheme('system');
      }
    });

    // Control events
    Elements.useCustomBtn.addEventListener('click', () => {
      State.customActive = !State.customActive;
      Elements.useCustomBtn.textContent = State.customActive ? 'Disable Custom' : 'Use Custom';
      Game.reset();
    });

    Elements.aiSearchBtn.addEventListener('click', async () => {
      const query = Elements.aiSearch.value.trim();
      if (!query) {
        Elements.coachMsg.innerHTML = 'Please enter a search term.';
        return;
      }
      
      const paragraph = await AISearch.fetchParagraph(query);
      if (paragraph) {
        Elements.customTextInput.value = paragraph;
        State.customActive = true;
        Elements.useCustomBtn.textContent = 'Disable Custom';
        Game.reset();
      }
    });

    Elements.aiSearch.addEventListener('keypress', async (e) => {
      if (e.key === 'Enter') {
        Elements.aiSearchBtn.click();
      }
    });

    Elements.difficulty.addEventListener('change', () => Game.reset());
    Elements.duration.addEventListener('change', () => Game.reset());
    Elements.startBtn.addEventListener('click', () => Game.start());
    Elements.resetBtn.addEventListener('click', () => Game.reset());

    Elements.copyBtn.addEventListener('click', () => {
      const summaryText = Elements.summary.innerText.split('🏆 Top 10 Scores')[0].trim();
      navigator.clipboard.writeText(summaryText)
        .then(() => Elements.coachMsg.innerHTML = 'Summary copied to clipboard.')
        .catch(err => console.error('Copy failed:', err));
    });
    
    Elements.globalLeaderboard.addEventListener('click', async () => {
      Elements.coachMsg.innerHTML = '🌍 Loading global leaderboard...';
      const leaderboard = await getLeaderboard(20);
      
      if (leaderboard.length > 0) {
        let html = `<div class="score-table"><h3>🌍 Global Top 20</h3><table>`;
        html += `<tr><th>Rank</th><th>Player</th><th>WPM</th><th>Acc</th><th>Date</th></tr>`;
        
        leaderboard.forEach((score, index) => {
          const date = new Date(score.created_at).toLocaleDateString();
          html += `<tr>`;
          html += `<td>${index + 1}${index < 3 ? ['🥇', '🥈', '🥉'][index] : ''}</td>`;
          html += `<td>${Utils.escapeHtml(score.player_name)}</td>`;
          html += `<td>${score.wpm}</td>`;
          html += `<td>${score.accuracy}%</td>`;
          html += `<td>${date}</td>`;
          html += `</tr>`;
        });
        
        html += `</table></div>`;
        Elements.summary.innerHTML = html;
        Elements.coachMsg.innerHTML = '🌍 Global leaderboard loaded!';
      } else {
        Elements.coachMsg.innerHTML = '⚠️ No scores found. Complete a test first!';
      }
    });

    // Keyboard event
    window.addEventListener('keydown', (event) => Game.handleKeypress(event));
    
    // Hide overlay when clicked (allowing user to dismiss it and view stats)
    Elements.overlay.addEventListener('click', () => {
        Elements.overlay.classList.remove('active');
    });
  }
};

/** -------------------- AUTHENTICATION -------------------- */
const Auth = {
  async init() {
    if (typeof supabase === 'undefined') {
      console.log('Supabase not loaded, using guest mode');
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      this.setUser(session.user);
    } else {
      // Redirect to login if not authenticated
      window.location.href = 'index.html';
    }
  },

  setUser(user) {
    const userName = user.user_metadata?.full_name || user.email.split('@')[0];
    const initials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    
    document.getElementById('userName').textContent = userName;
    document.getElementById('userInitials').textContent = initials;
    Elements.typerName.value = userName;
  }
};

// Profile menu functions
function showProfileMenu() {
  const menu = document.getElementById('profileMenu');
  menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
}

async function logout() {
  if (typeof supabase !== 'undefined') {
    await supabase.auth.signOut();
  }
  window.location.href = 'login.html';
}

// Close profile menu when clicking outside
document.addEventListener('click', (e) => {
  if (!e.target.closest('.profile-section')) {
    document.getElementById('profileMenu').style.display = 'none';
  }
});



/** -------------------- MUSIC CONTROL -------------------- */
const MusicControl = {
  audio: null,
  isPlaying: true,

  init() {
    this.audio = document.getElementById('backgroundMusic');
    this.audio.volume = 0.3; // Set volume to 30%
    
    // Auto-play music when page loads
    this.audio.play().catch(() => {
      // Auto-play blocked, user needs to interact first
      console.log('Auto-play blocked, click music icon to start');
      this.isPlaying = false;
      this.updateIcon();
    });
  },

  toggle() {
    if (this.isPlaying) {
      this.audio.pause();
      this.isPlaying = false;
    } else {
      this.audio.play();
      this.isPlaying = true;
    }
    this.updateIcon();
  },

  updateIcon() {
    const icon = document.getElementById('musicIcon');
    const control = document.getElementById('musicControl');
    
    if (this.isPlaying) {
      icon.textContent = '🎵';
      control.classList.remove('muted');
    } else {
      icon.textContent = '🔇';
      control.classList.add('muted');
    }
  }
};

// Global function for onclick
function toggleMusic() {
  MusicControl.toggle();
}

/** -------------------- INITIALIZATION -------------------- */
function init() {
  Renderer.renderKeyboard();
  ThemeManager.init();
  EventHandlers.init();
  Auth.init();
  MusicControl.init();
  
  Game.reset();
}

// Start the application

init();
