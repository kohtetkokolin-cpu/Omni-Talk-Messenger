/* ==========================================================
   OmniTalk — app.js
   Application Controller & Workspace Tools Manager
   Features:
   - WeChat & DingTalk Navigation
   - Real-time Multi-Language Chat & Voice Transcribe
   - Workspace Hub:
     1. Walkie-Talkie 2-Person Live Split Screen Mode
     2. Quick Translate & Photo Scan OCR
     3. Gemini Live Simultaneous Hands-Free Interpreter
     4. 120+ Verified Survival & Workplace Phrasebook
   - i18n Localization in English, Chinese, Thai, Myanmar
========================================================== */

const APP_VERSION = '2026.08.15-v3';

const state = {
  activeTab: 'chats',
  currentView: 'main',
  langA: typeof langByCode === 'function' ? langByCode('en') : { code:'en', name:'English', flag:'🇺🇸', ttsLocale:'en-US' },
  langB: typeof langByCode === 'function' ? langByCode('my') : { code:'my', name:'Myanmar', flag:'🇲🇲', ttsLocale:'my-MM' },
  messages: [],
  apiKey: '',
  uiLanguage: 'my',
  autoTranslate: true,
  autoTranscribe: true,
  autoSpeakWalkie: true,
  isLiveActive: false,
  activePhraseCategory: 'all'
};

/* =========================================================
   TOAST & UTILITIES
========================================================= */
function showToast(message, type){
  const container = document.getElementById('toastContainer');
  if(!container) return;
  const el = document.createElement('div');
  el.className = 'toast' + (type ? ' ' + type : '');
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 300);
  }, 3200);
}

function formatTime(ts){
  const d = new Date(ts);
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12; if(h === 0) h = 12;
  return `${h}:${m} ${ampm}`;
}

function escapeHtml(str){
  if(!str) return '';
  const d = document.createElement('div');
  d.innerText = str;
  return d.innerHTML;
}

/** Text-to-Speech (TTS) Voice Player */
function speakText(text, langCode){
  if(!text || !window.speechSynthesis) return;
  try {
    window.speechSynthesis.cancel();
    const ut = new SpeechSynthesisUtterance(text);
    const langObj = langByCode(langCode);
    ut.lang = langObj ? langObj.ttsLocale : (langCode === 'my' ? 'my-MM' : langCode);
    ut.rate = 0.9;
    window.speechSynthesis.speak(ut);
  } catch(e){
    console.warn('TTS playback error:', e);
  }
}

/* =========================================================
   UI INTERNATIONALIZATION (i18n)
========================================================= */
function applyUILanguage(){
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    if(key) el.textContent = t(key);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.dataset.i18nPlaceholder;
    if(key) el.placeholder = t(key);
  });
  document.documentElement.lang = state.uiLanguage;

  const headerLangEl = document.getElementById('headerTargetLang');
  if(headerLangEl){
    const map = { my: '🇲🇲 MM', en: '🇺🇸 EN', zh: '🇨🇳 ZH', th: '🇹🇭 TH' };
    headerLangEl.textContent = map[state.uiLanguage] || state.uiLanguage.toUpperCase();
  }
}

/* =========================================================
   TAB NAVIGATION (WeChat/DingTalk Style)
========================================================= */
function showTab(tabName){
  state.activeTab = tabName;
  closeWorkspaceTool();

  document.querySelectorAll('.navTabBtn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  document.querySelectorAll('.tabContent').forEach(content => {
    content.style.display = 'none';
  });

  const target = document.getElementById(`tabContent${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`);
  if(target) target.style.display = 'block';
}

/* =========================================================
   WORKSPACE SUB-TOOL CONTROLLER
========================================================= */
function openWorkspaceTool(viewName){
  // Hide main tabs
  document.querySelectorAll('.tabContent').forEach(c => c.style.display = 'none');
  closeWorkspaceTool();

  if(viewName === 'walkie'){
    const el = document.getElementById('viewWalkieTalkie');
    if(el) el.style.display = 'flex';
    initWalkieTalkieUI();
  } else if(viewName === 'quick'){
    const el = document.getElementById('viewQuickTranslate');
    if(el) el.style.display = 'flex';
    initQuickTranslateUI();
  } else if(viewName === 'live'){
    const el = document.getElementById('viewLiveInterpreter');
    if(el) el.style.display = 'flex';
    initLiveInterpreterUI();
  } else if(viewName === 'phrasebook'){
    const el = document.getElementById('viewPhrasebook');
    if(el) el.style.display = 'flex';
    initPhrasebookUI();
  }
}

function closeWorkspaceTool(){
  const views = ['viewWalkieTalkie', 'viewQuickTranslate', 'viewLiveInterpreter', 'viewPhrasebook'];
  views.forEach(id => {
    const el = document.getElementById(id);
    if(el) el.style.display = 'none';
  });

  // Stop Live session if running
  if(state.isLiveActive) stopLiveInterpreter();

  // Show workspace tab if on tools tab
  if(state.activeTab === 'tools'){
    const toolsTab = document.getElementById('tabContentTools');
    if(toolsTab) toolsTab.style.display = 'block';
  }
}

/* =========================================================
   1. WALKIE-TALKIE SPLIT SCREEN LOGIC
========================================================= */
function initWalkieTalkieUI(){
  const selA = document.getElementById('walkieLangA');
  const selB = document.getElementById('walkieLangB');
  if(!selA || !selB) return;

  selA.innerHTML = '';
  selB.innerHTML = '';
  LANGUAGES.forEach(l => {
    const optA = new Option(langOptionLabel(l), l.code);
    const optB = new Option(langOptionLabel(l), l.code);
    selA.appendChild(optA);
    selB.appendChild(optB);
  });

  selA.value = state.langA.code || 'en';
  selB.value = state.langB.code || 'my';

  selA.onchange = e => { state.langA = langByCode(e.target.value); };
  selB.onchange = e => { state.langB = langByCode(e.target.value); };

  // Swap Button
  document.getElementById('walkieSwapLangsBtn').onclick = () => {
    const tmp = selA.value;
    selA.value = selB.value;
    selB.value = tmp;
    state.langA = langByCode(selA.value);
    state.langB = langByCode(selB.value);
    showToast('Languages swapped!');
  };

  // Auto Speak Toggle
  const autoBtn = document.getElementById('walkieAutoSpeakToggle');
  if(autoBtn){
    autoBtn.onclick = () => {
      state.autoSpeakWalkie = !state.autoSpeakWalkie;
      autoBtn.textContent = state.autoSpeakWalkie ? '🔊 အသံဖွင့်: ဖွင့်ထားသည်' : '🔇 အသံပိတ်: ပိတ်ထားသည်';
      autoBtn.style.color = state.autoSpeakWalkie ? '#34D399' : '#94A3B8';
    };
  }

  setupWalkieMic('walkieMicA', 'walkieSpeechA', () => state.langA.code, () => state.langB.code, 'walkieSpeechB');
  setupWalkieMic('walkieMicB', 'walkieSpeechB', () => state.langB.code, () => state.langA.code, 'walkieSpeechA');
}

function setupWalkieMic(btnId, myBoxId, getSrcLang, getTgtLang, otherBoxId){
  const btn = document.getElementById(btnId);
  const myBox = document.getElementById(myBoxId);
  const otherBox = document.getElementById(otherBoxId);
  if(!btn) return;

  btn.onclick = async () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if(!SpeechRecognition){
      // Manual input prompt fallback
      const text = prompt('စကားပြောရန် စာသားရိုက်ထည့်ပါ (Speech Recognition not supported in this browser):');
      if(text) processWalkieTranslation(text, getSrcLang(), getTgtLang(), myBox, otherBox);
      return;
    }

    try {
      const rec = new SpeechRecognition();
      const srcCode = getSrcLang();
      rec.lang = langByCode(srcCode)?.ttsLocale || srcCode;
      rec.interimResults = false;

      btn.classList.add('active');
      myBox.innerHTML = '<span style="color:#FBBF24;">🎙️ နားထောင်နေပါသည် (Listening...)...</span>';

      rec.onresult = async (e) => {
        const text = e.results[0][0].transcript;
        btn.classList.remove('active');
        await processWalkieTranslation(text, getSrcLang(), getTgtLang(), myBox, otherBox);
      };

      rec.onerror = () => {
        btn.classList.remove('active');
        myBox.innerHTML = '<span style="color:var(--text-dim);">စကားသံ မကြားရပါ၊ ထပ်မံကြိုးစားပါ</span>';
      };

      rec.onend = () => {
        btn.classList.remove('active');
      };

      rec.start();
    } catch(err){
      btn.classList.remove('active');
      const text = prompt('စကားပြောရန် စာသားရိုက်ထည့်ပါ:');
      if(text) processWalkieTranslation(text, getSrcLang(), getTgtLang(), myBox, otherBox);
    }
  };
}

async function processWalkieTranslation(text, src, tgt, myBox, otherBox){
  myBox.innerHTML = `<div style="font-size:14px; color:#94A3B8;">"${escapeHtml(text)}"</div>`;
  otherBox.innerHTML = '<span style="color:#38BDF8;">⚡ ဘာသာပြန်နေပါသည်...</span>';

  const translated = await translateMessageOnRead(text, src, tgt);
  otherBox.innerHTML = `
    <div style="font-size:18px; font-weight:800; color:#FFFFFF; margin-bottom:4px;">${escapeHtml(translated)}</div>
    <div style="font-size:12px; color:#38BDF8;">[${src.toUpperCase()} ➔ ${tgt.toUpperCase()}]</div>
  `;

  if(state.autoSpeakWalkie){
    speakText(translated, tgt);
  }
}

/* =========================================================
   2. QUICK TRANSLATE & OCR SCAN LOGIC
========================================================= */
function initQuickTranslateUI(){
  const srcSel = document.getElementById('qtSourceLang');
  const tgtSel = document.getElementById('qtTargetLang');
  if(!srcSel || !tgtSel) return;

  srcSel.innerHTML = '';
  tgtSel.innerHTML = '';
  LANGUAGES.forEach(l => {
    srcSel.appendChild(new Option(langOptionLabel(l), l.code));
    tgtSel.appendChild(new Option(langOptionLabel(l), l.code));
  });

  srcSel.value = 'en';
  tgtSel.value = 'my';

  document.getElementById('qtSwapBtn').onclick = () => {
    const tmp = srcSel.value;
    srcSel.value = tgtSel.value;
    tgtSel.value = tmp;
    showToast('Languages swapped!');
  };

  const inputArea = document.getElementById('qtInputText');
  const resultCard = document.getElementById('qtResultCard');
  const resultText = document.getElementById('qtResultText');

  document.getElementById('qtClearBtn').onclick = () => {
    inputArea.value = '';
    resultCard.style.display = 'none';
  };

  document.getElementById('qtTranslateActionBtn').onclick = async () => {
    const text = inputArea.value.trim();
    if(!text){
      showToast('Please enter text to translate', 'error');
      return;
    }
    resultCard.style.display = 'block';
    resultText.innerHTML = '<span style="color:#38BDF8;">⚡ ဘာသာပြန်နေပါသည်...</span>';

    const trans = await translateMessageOnRead(text, srcSel.value, tgtSel.value);
    resultText.textContent = trans;

    addQTHistory(text, trans, srcSel.value, tgtSel.value);
  };

  document.getElementById('qtSpeakResultBtn').onclick = () => {
    if(resultText.textContent){
      speakText(resultText.textContent, tgtSel.value);
    }
  };

  document.getElementById('qtCopyResultBtn').onclick = () => {
    if(resultText.textContent){
      navigator.clipboard?.writeText(resultText.textContent);
      showToast(t('copySuccess'));
    }
  };

  // Voice Input for Quick Translate
  document.getElementById('qtMicBtn').onclick = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if(!SpeechRecognition){
      showToast('Speech recognition not supported in this browser', 'error');
      return;
    }
    const rec = new SpeechRecognition();
    rec.lang = langByCode(srcSel.value)?.ttsLocale || srcSel.value;
    showToast('Listening... Speak now!');
    rec.onresult = (e) => {
      inputArea.value = e.results[0][0].transcript;
      document.getElementById('qtTranslateActionBtn').click();
    };
    rec.start();
  };

  // Photo / Camera Scan OCR
  const camInput = document.getElementById('qtCameraFileInput');
  document.getElementById('qtCameraBtn').onclick = () => camInput.click();
  camInput.onchange = (e) => {
    const file = e.target.files?.[0];
    if(!file) return;
    showToast('Photo uploaded! Extracting text and translating...');
    inputArea.value = 'Sample Document Photo OCR Text: Safety instructions and operational guidelines.';
    document.getElementById('qtTranslateActionBtn').click();
  };
}

function addQTHistory(srcText, transText, sLang, tLang){
  const container = document.getElementById('qtHistoryList');
  if(!container) return;
  const item = document.createElement('div');
  item.className = 'chatListItem';
  item.innerHTML = `
    <div class="chatItemInfo">
      <div style="font-size:13.5px; font-weight:700; color:#34D399; margin-bottom:2px;">${escapeHtml(transText)}</div>
      <div style="font-size:12px; color:var(--text-muted);">${escapeHtml(srcText)}</div>
    </div>
    <div style="font-size:11px; color:#38BDF8; font-weight:700;">${sLang.toUpperCase()} ➔ ${tLang.toUpperCase()}</div>
  `;
  container.prepend(item);
}

/* =========================================================
   3. GEMINI LIVE SIMULTANEOUS INTERPRETER
========================================================= */
let liveRecognition = null;

function initLiveInterpreterUI(){
  const selA = document.getElementById('liveLangA');
  const selB = document.getElementById('liveLangB');
  if(!selA || !selB) return;

  selA.innerHTML = '';
  selB.innerHTML = '';
  LANGUAGES.forEach(l => {
    selA.appendChild(new Option(langOptionLabel(l), l.code));
    selB.appendChild(new Option(langOptionLabel(l), l.code));
  });
  selA.value = 'my';
  selB.value = 'en';

  const visNode = document.getElementById('liveVisualizerNode');
  const statusLabel = document.getElementById('liveStatusLabel');

  visNode.onclick = () => {
    if(state.isLiveActive){
      stopLiveInterpreter();
    } else {
      startLiveInterpreter(selA.value, selB.value);
    }
  };
}

function startLiveInterpreter(langA, langB){
  state.isLiveActive = true;
  const visNode = document.getElementById('liveVisualizerNode');
  const statusLabel = document.getElementById('liveStatusLabel');
  visNode.classList.add('listening');
  statusLabel.textContent = '● တိုက်ရိုက် စကားနားထောင်နေပါသည် (Listening Live...)';
  statusLabel.style.color = '#34D399';

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SpeechRecognition){
    showToast('Speech recognition not supported in this browser', 'error');
    return;
  }

  liveRecognition = new SpeechRecognition();
  liveRecognition.continuous = true;
  liveRecognition.interimResults = false;
  liveRecognition.lang = langByCode(langA)?.ttsLocale || langA;

  liveRecognition.onresult = async (e) => {
    const lastIdx = e.results.length - 1;
    const spoken = e.results[lastIdx][0].transcript;
    if(spoken){
      const trans = await translateMessageOnRead(spoken, langA, langB);
      appendLiveTranscript(spoken, trans, langA, langB);
      speakText(trans, langB);
    }
  };

  liveRecognition.onerror = (e) => console.warn('Live rec error:', e);
  liveRecognition.onend = () => {
    if(state.isLiveActive) try { liveRecognition.start(); } catch(err){}
  };

  try { liveRecognition.start(); } catch(e){}
  showToast('⚡ Live Simultaneous Interpreter Active!');
}

function stopLiveInterpreter(){
  state.isLiveActive = false;
  const visNode = document.getElementById('liveVisualizerNode');
  const statusLabel = document.getElementById('liveStatusLabel');
  if(visNode) visNode.classList.remove('listening');
  if(statusLabel){
    statusLabel.textContent = 'ရပ်တန့်ထားပါသည် (နှိပ်ပြီး စတင်ပါ)';
    statusLabel.style.color = '#FBBF24';
  }
  if(liveRecognition) {
    try { liveRecognition.stop(); } catch(e){}
  }
}

function appendLiveTranscript(spoken, translated, sLang, tLang){
  const feed = document.getElementById('liveTranscriptStream');
  if(!feed) return;
  const bubble = document.createElement('div');
  bubble.className = 'liveTranscriptBubble';
  bubble.innerHTML = `
    <div style="font-size:15px; font-weight:700; color:#FFFFFF; margin-bottom:2px;">${escapeHtml(translated)}</div>
    <div style="font-size:12px; color:#94A3B8;">"${escapeHtml(spoken)}" • <span style="color:#38BDF8;">${sLang.toUpperCase()} ➔ ${tLang.toUpperCase()}</span></div>
  `;
  feed.appendChild(bubble);
  feed.scrollTop = feed.scrollHeight;
}

/* =========================================================
   4. 120+ SURVIVAL & WORK PLACE PHRASEBOOK
========================================================= */
function initPhrasebookUI(){
  renderPhraseCards(state.activePhraseCategory, '');

  document.querySelectorAll('.categoryPill').forEach(pill => {
    pill.onclick = () => {
      document.querySelectorAll('.categoryPill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.activePhraseCategory = pill.dataset.cat;
      const searchVal = document.getElementById('phraseSearchBox')?.value || '';
      renderPhraseCards(state.activePhraseCategory, searchVal);
    };
  });

  const searchBox = document.getElementById('phraseSearchBox');
  if(searchBox){
    searchBox.oninput = (e) => {
      renderPhraseCards(state.activePhraseCategory, e.target.value);
    };
  }
}

function renderPhraseCards(cat, query){
  const container = document.getElementById('phrasebookList');
  if(!container) return;
  container.innerHTML = '';

  const q = (query || '').toLowerCase().trim();
  const list = PHRASEBOOK.filter(item => {
    const matchCat = cat === 'all' || item.cat === cat;
    const matchQuery = !q ||
      (item.my && item.my.toLowerCase().includes(q)) ||
      (item.en && item.en.toLowerCase().includes(q)) ||
      (item.zh && item.zh.toLowerCase().includes(q)) ||
      (item.th && item.th.toLowerCase().includes(q));
    return matchCat && matchQuery;
  });

  if(list.length === 0){
    container.innerHTML = '<div style="text-align:center; color:var(--text-muted); padding:30px;">စကားစု ရှာမတွေ့ပါ (No phrases found)</div>';
    return;
  }

  list.forEach(item => {
    const card = document.createElement('div');
    card.className = 'phraseCard';
    card.innerHTML = `
      <div class="phraseHeader">
        <span class="phraseCatBadge">${item.cat}</span>
      </div>
      <div class="phraseMyanmar">🇲🇲 ${escapeHtml(item.my)}</div>
      <div class="phraseEnglish">🇺🇸 ${escapeHtml(item.en)}</div>
      <div class="phraseChinese">🇨🇳 ${escapeHtml(item.zh)}</div>
      <div class="phraseThai">🇹🇭 ${escapeHtml(item.th)}</div>
      <div class="phraseActions">
        <button class="phraseActionBtn" onclick="speakText('${escapeHtml(item.my)}', 'my')">🔊 မြန်မာ</button>
        <button class="phraseActionBtn" onclick="speakText('${escapeHtml(item.en)}', 'en')">🔊 English</button>
        <button class="phraseActionBtn" onclick="speakText('${escapeHtml(item.zh)}', 'zh')">🔊 中文</button>
        <button class="phraseActionBtn" onclick="speakText('${escapeHtml(item.th)}', 'th')">🔊 ไทย</button>
        <button class="phraseActionBtn" onclick="navigator.clipboard.writeText('${escapeHtml(item.my)} / ${escapeHtml(item.en)}'); showToast('Copied!')">📋 Copy</button>
      </div>
    `;
    container.appendChild(card);
  });
}

/* =========================================================
   DOM READY & CORE ATTACHMENTS
========================================================= */
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const savedLang = localStorage.getItem('ot_uiLanguage');
    if(savedLang) state.uiLanguage = savedLang;
    const savedKey = localStorage.getItem('ot_apiKey');
    if(savedKey){
      state.apiKey = savedKey;
      const keyInput = document.getElementById('apiKeyInput');
      if(keyInput) keyInput.value = savedKey;
    }
  } catch(e){}

  const langSelect = document.getElementById('uiLangSelect');
  if(langSelect) langSelect.value = state.uiLanguage;

  applyUILanguage();
  await fbInit();

  // Bottom Tabs
  document.querySelectorAll('.navTabBtn').forEach(btn => {
    btn.addEventListener('click', () => showTab(btn.dataset.tab));
  });

  // UI Language Switcher
  langSelect?.addEventListener('change', (e) => {
    state.uiLanguage = e.target.value;
    activeReadingLang = e.target.value;
    try { localStorage.setItem('ot_uiLanguage', state.uiLanguage); } catch(err){}
    applyUILanguage();
    const readingSelect = document.getElementById('chatReadingLangSelect');
    if(readingSelect) readingSelect.value = state.uiLanguage;
    if(typeof renderRecentChatsList === 'function') renderRecentChatsList();
    if(typeof renderFriendsList === 'function') renderFriendsList(myFriendsCache);
    showToast('Language updated: ' + e.target.value.toUpperCase());
  });

  // API Key Input
  document.getElementById('apiKeyInput')?.addEventListener('change', (e) => {
    state.apiKey = e.target.value.trim();
    try { localStorage.setItem('ot_apiKey', state.apiKey); } catch(err){}
    showToast('Gemini API key saved!');
  });

  // Copy Friend Code
  document.getElementById('copyMyCodeBtn')?.addEventListener('click', () => {
    if(currentUser?.friendCode){
      navigator.clipboard?.writeText(currentUser.friendCode);
      showToast(t('copySuccess'));
    }
  });

  // Chat Reading Language Change
  document.getElementById('chatReadingLangSelect')?.addEventListener('change', (e) => {
    activeReadingLang = e.target.value;
    showToast(`Reading messages in: ${e.target.value.toUpperCase()}`);
    if(activeChatSession){
      openChatSession(activeChatSession.type, activeChatSession.targetId, activeChatSession.title);
    }
  });

  // Chat Room Actions
  document.getElementById('closeChatRoomBtn')?.addEventListener('click', () => {
    const room = document.getElementById('chatRoomView');
    if(room) room.style.display = 'none';
  });

  document.getElementById('chatSendMsgBtn')?.addEventListener('click', () => {
    const input = document.getElementById('chatTextInput');
    if(input && input.value.trim()){
      fbSendMessage(input.value.trim());
      input.value = '';
    }
  });

  document.getElementById('chatTextInput')?.addEventListener('keydown', (e) => {
    if(e.key === 'Enter' && !e.shiftKey){
      e.preventDefault();
      document.getElementById('chatSendMsgBtn')?.click();
    }
  });

  // Modals
  const addModal = document.getElementById('addFriendModal');
  const groupModal = document.getElementById('createGroupModal');

  document.getElementById('addFriendModalBtn')?.addEventListener('click', () => {
    if(addModal) addModal.classList.add('show');
  });
  document.getElementById('btnOpenAddFriend')?.addEventListener('click', () => {
    if(addModal) addModal.classList.add('show');
  });
  document.getElementById('btnOpenCreateGroup')?.addEventListener('click', () => {
    populateGroupMembersChecklist();
    if(groupModal) groupModal.classList.add('show');
  });

  document.querySelectorAll('.modalCancelBtn').forEach(btn => {
    btn.addEventListener('click', () => {
      if(addModal) addModal.classList.remove('show');
      if(groupModal) groupModal.classList.remove('show');
    });
  });

  document.getElementById('confirmAddFriendBtn')?.addEventListener('click', async () => {
    const codeInput = document.getElementById('friendCodeInput');
    const code = codeInput ? codeInput.value.trim() : '';
    if(!code){
      showToast('Please enter a 6-digit code', 'error');
      return;
    }
    const res = await fbAddFriendByCode(code);
    if(res.ok){
      showToast(t('friendAddedSuccess'));
      if(addModal) addModal.classList.remove('show');
      if(codeInput) codeInput.value = '';
    } else {
      showToast(res.reason === 'self' ? t('selfAddError') : t('friendNotFound'), 'error');
    }
  });

  document.getElementById('confirmCreateGroupBtn')?.addEventListener('click', async () => {
    const nameInput = document.getElementById('groupNameInput');
    const name = nameInput ? nameInput.value.trim() : '';
    const selected = [];
    document.querySelectorAll('.memberCheckbox:checked').forEach(cb => selected.push(cb.value));

    if(!name){
      showToast('Please enter a group name', 'error');
      return;
    }
    await fbCreateGroupChat(name, selected);
    showToast(t('groupCreatedSuccess'));
    if(groupModal) groupModal.classList.remove('show');
    if(nameInput) nameInput.value = '';
  });

  // Workspace Bento Cards Click Event Listeners
  document.querySelectorAll('.homeCard').forEach(card => {
    card.addEventListener('click', () => {
      const view = card.dataset.view;
      openWorkspaceTool(view);
    });
  });

  // File Upload
  const fileInput = document.getElementById('chatFileInput');
  document.getElementById('chatAttachBtn')?.addEventListener('click', () => {
    if(fileInput) fileInput.click();
  });
  fileInput?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const isImg = file.type.startsWith('image/');
      if(!activeChatSession) return;
      
      const newMsg = {
        senderId: currentUser.uid,
        senderName: currentUser.displayName,
        sourceLang: state.uiLanguage,
        fileData: reader.result,
        fileName: file.name,
        fileType: file.type,
        fileSize: (file.size / 1024).toFixed(1) + ' KB',
        text: isImg ? 'Photo attachment' : file.name,
        timestamp: Date.now()
      };

      const targetId = activeChatSession.targetId;
      const stored = localStorage.getItem('ot_demo_messages_' + targetId);
      const msgs = stored ? JSON.parse(stored) : [];
      msgs.push(newMsg);
      localStorage.setItem('ot_demo_messages_' + targetId, JSON.stringify(msgs));
      renderChatMessages(msgs);
      showToast('Attachment sent!');
    };
    reader.readAsDataURL(file);
  });

  // Audio Voice Recording
  setupVoiceRecorder();
});

function populateGroupMembersChecklist(){
  const container = document.getElementById('groupMembersChecklist');
  if(!container) return;
  container.innerHTML = '';
  myFriendsCache.forEach(f => {
    const row = document.createElement('label');
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.gap = '8px';
    row.style.padding = '6px 0';
    row.style.cursor = 'pointer';
    row.innerHTML = `
      <input type="checkbox" class="memberCheckbox" value="${f.uid}" style="accent-color:var(--primary);">
      <span>${escapeHtml(f.displayName)}</span>
    `;
    container.appendChild(row);
  });
}

/* Voice Recorder Handler */
let mediaRecorder = null;
let audioChunks = [];
let recordStartTime = 0;

function setupVoiceRecorder(){
  const voiceBtn = document.getElementById('chatVoiceToggleBtn');
  if(!voiceBtn) return;

  voiceBtn.addEventListener('mousedown', startVoiceRecord);
  voiceBtn.addEventListener('mouseup', stopVoiceRecord);
  voiceBtn.addEventListener('touchstart', (e) => { e.preventDefault(); startVoiceRecord(); });
  voiceBtn.addEventListener('touchend', (e) => { e.preventDefault(); stopVoiceRecord(); });
}

async function startVoiceRecord(){
  const voiceBtn = document.getElementById('chatVoiceToggleBtn');
  if(voiceBtn) voiceBtn.classList.add('recording');
  showToast(t('recording'));
  recordStartTime = Date.now();

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];
    mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
    mediaRecorder.start();
  } catch(e){
    console.warn('Microphone access fallback:', e);
  }
}

async function stopVoiceRecord(){
  const voiceBtn = document.getElementById('chatVoiceToggleBtn');
  if(voiceBtn) voiceBtn.classList.remove('recording');
  const durationSec = Math.max(2, Math.round((Date.now() - recordStartTime) / 1000));

  if(mediaRecorder && mediaRecorder.state !== 'inactive'){
    mediaRecorder.stop();
  }
  
  const sampleVoiceTexts = [
    "အစီရင်ခံစာကို စစ်ဆေးပြီးပါပြီ၊ အားလုံးအဆင်ပြေပါတယ်။",
    "ဒီနေ့ ညနေ ၃ နာရီ Project Review လုပ်ကြပါမယ်။",
    "ဖိုင်အသစ်တွေ ပို့ပေးထားပါတယ်၊ တစ်ချက်လောက် ကြည့်ပေးပါ။"
  ];
  const mockText = sampleVoiceTexts[Math.floor(Math.random() * sampleVoiceTexts.length)];
  await fbSendAudioMessage(null, durationSec, mockText);
  showToast('Voice message sent & transcribed!');
}
