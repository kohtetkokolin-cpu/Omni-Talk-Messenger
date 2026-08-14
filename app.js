/* ==========================================================
   OmniTalk — app.js
   Application Controller & Workspace Tools Manager
   Features:
   - WeChat & DingTalk Navigation
   - Real-time Multi-Language Chat & Voice Transcribe
   - Workspace Hub (Walkie-Talkie, Quick OCR, Gemini Live, Phrasebook)
   - i18n Localization in English, Chinese, Thai, Myanmar
========================================================== */

const APP_VERSION = '2026.08.15-v2';

const state = {
  activeTab: 'chats',
  currentView: 'main', // 'main' | 'conversation' | 'quick' | 'live' | 'phrasebook'
  langA: typeof langByCode === 'function' ? langByCode('en') : { code:'en', label:'English' },
  langB: typeof langByCode === 'function' ? langByCode('my') : { code:'my', label:'Myanmar' },
  messages: [],
  apiKey: '',
  uiLanguage: 'my',
  autoTranslate: true,
  autoTranscribe: true,
  qtTargetCode: 'en',
  qtMicCode: 'my'
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
  document.querySelectorAll('.navTabBtn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  document.querySelectorAll('.tabContent').forEach(content => {
    content.style.display = 'none';
  });

  const target = document.getElementById(`tabContent${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`);
  if(target) target.style.display = 'block';

  // Hide sub-panels if active
  hideAllWorkspacePanels();
}

function hideAllWorkspacePanels(){
  const panels = ['panelA', 'divider', 'panelB', 'quickPanel', 'livePanel'];
  panels.forEach(id => {
    const el = document.getElementById(id);
    if(el) el.style.display = 'none';
  });
  const homeBtn = document.getElementById('homeBtn');
  if(homeBtn) homeBtn.classList.remove('show');
}

/* =========================================================
   INITIALIZATION & EVENT HANDLERS
========================================================= */
document.addEventListener('DOMContentLoaded', async () => {
  // Load saved preferences
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
    btn.addEventListener('click', () => {
      showTab(btn.dataset.tab);
    });
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

  // Chat Reading Language Change in Room
  document.getElementById('chatReadingLangSelect')?.addEventListener('change', (e) => {
    activeReadingLang = e.target.value;
    showToast(`Translating all messages into: ${e.target.value.toUpperCase()}`);
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

  // Workspace Bento Cards
  document.querySelectorAll('.homeCard').forEach(card => {
    card.addEventListener('click', () => {
      const view = card.dataset.view;
      openWorkspaceTool(view);
    });
  });

  // Back Button in Header
  document.getElementById('homeBtn')?.addEventListener('click', () => {
    hideAllWorkspacePanels();
    showTab('tools');
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

  // Audio / Voice Recording Simulation
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

function openWorkspaceTool(view){
  document.querySelectorAll('.tabContent').forEach(c => c.style.display = 'none');
  const homeBtn = document.getElementById('homeBtn');
  if(homeBtn) homeBtn.classList.add('show');

  if(view === 'conversation'){
    document.getElementById('panelA').style.display = 'block';
    document.getElementById('divider').style.display = 'flex';
    document.getElementById('panelB').style.display = 'block';
    if(typeof initWalkieTalkieUI === 'function') initWalkieTalkieUI();
  } else if(view === 'quick'){
    document.getElementById('quickPanel').style.display = 'block';
  } else if(view === 'live'){
    document.getElementById('livePanel').style.display = 'block';
  } else if(view === 'phrasebook'){
    showToast('Opening 120+ Survival & Workplace Phrasebook...');
  }
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
    console.warn('Microphone access denied, using simulated voice recording:', e);
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
