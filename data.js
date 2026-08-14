/* ==========================================================
   Walkie-Talkie & Polyglot Messenger — data.js
   Languages, phrasebooks, offline dictionaries, vocabulary.
========================================================== */

const LANGUAGES = [
  { code: 'my', name: 'Myanmar (Burmese)', flag: '🇲🇲', ttsLocale: 'my-MM', offline: true },
  { code: 'en', name: 'English', flag: '🇺🇸', ttsLocale: 'en-US', offline: true },
  { code: 'zh', name: 'Chinese (Mandarin)', flag: '🇨🇳', ttsLocale: 'zh-CN', offline: true },
  { code: 'th', name: 'Thai', flag: '🇹🇭', ttsLocale: 'th-TH', offline: true },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵', ttsLocale: 'ja-JP', offline: false },
  { code: 'ko', name: 'Korean', flag: '🇰🇷', ttsLocale: 'ko-KR', offline: false },
  { code: 'vi', name: 'Vietnamese', flag: '🇻🇳', ttsLocale: 'vi-VN', offline: false },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳', ttsLocale: 'hi-IN', offline: false },
  { code: 'id', name: 'Indonesian', flag: '🇮🇩', ttsLocale: 'id-ID', offline: false },
  { code: 'ms', name: 'Malay', flag: '🇲🇾', ttsLocale: 'ms-MY', offline: false },
  { code: 'fil', name: 'Filipino (Tagalog)', flag: '🇵🇭', ttsLocale: 'fil-PH', offline: false },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦', ttsLocale: 'ar-SA', offline: false },
  { code: 'fr', name: 'French', flag: '🇫🇷', ttsLocale: 'fr-FR', offline: true },
  { code: 'es', name: 'Spanish', flag: '🇪🇸', ttsLocale: 'es-ES', offline: true },
];

function langByCode(code){
  if(!code) return LANGUAGES[0];
  const c = code.toLowerCase().trim();
  return LANGUAGES.find(l => l.code === c || l.ttsLocale.toLowerCase().startsWith(c)) || LANGUAGES[0];
}

function langOptionLabel(l){
  return `${l.flag} ${l.name}${l.offline ? ' (Offline✓)' : ''}`;
}

let translationMemory = {};
try{
  const tmSaved = localStorage.getItem('wt_translationMemory');
  if(tmSaved) translationMemory = JSON.parse(tmSaved) || {};
}catch(e){}

const PHRASEBOOK = [
  { cat: 'emergency', en: 'Help me please!', my: 'ကျေးဇူးပြု၍ ကူညီပါ!', zh: '请帮帮我！', th: 'ช่วยด้วยครับ/ค่ะ!' },
  { cat: 'emergency', en: 'Call the police!', my: 'ရဲခေါ်ပေးပါ!', zh: '请叫警察！', th: 'เรียกตำรวจให้หน่อย!' },
  { cat: 'emergency', en: 'Call an ambulance immediately!', my: 'လူနာတင်ယာဉ် အမြန်ခေါ်ပေးပါ!', zh: '快叫救护车！', th: 'เรียกรถพยาบาลด่วน!' },
  { cat: 'emergency', en: 'There is a fire!', my: 'မီးလောင်နေတယ်!', zh: '着火了！', th: 'ไฟไหม้!' },
  { cat: 'medical', en: 'I feel very sick.', my: 'ကျွန်တော်/ကျွန်မ နေမကောင်းဖြစ်နေပါတယ်။', zh: '我感觉很不舒服。', th: 'ฉันรู้สึกไม่สบายมาก' },
  { cat: 'medical', en: 'Where is the hospital?', my: 'ဆေးရုံ ဘယ်နားမှာလဲ?', zh: '医院在哪里？', th: 'โรงพยาบาลอยู่ที่ไหน?' },
  { cat: 'medical', en: 'I need to see a doctor.', my: 'ဆရာဝန်နဲ့ ပြသဖို့ လိုအပ်ပါတယ်။', zh: '我需要看医生。', th: 'ฉันต้องไปพบแพทย์' },
  { cat: 'medical', en: 'I have severe pain here.', my: 'ဒီနေရာက အရမ်းနာကျင်နေပါတယ်။', zh: '我这里非常疼。', th: 'ฉันปวดตรงนี้มาก' },
  { cat: 'workplace', en: 'What is today’s task?', my: 'ဒီနေ့ လုပ်ရမယ့် အလုပ်က ဘာလဲခင်ဗျာ?', zh: '今天的任务是什么？', th: 'งานวันนี้คืออะไรครับ/ค่ะ?' },
  { cat: 'workplace', en: 'This machine is not working.', my: 'ဒီစက် ပျက်နေပါတယ်/အလုပ်မလုပ်တော့ပါခင်ဗျာ။', zh: '这台机器坏了/不运转。', th: 'เครื่องนี้ไม่ทำงานครับ/ค่ะ' },
  { cat: 'workplace', en: 'Please check the defect rate.', my: 'ချို့ယွင်းချက် ရာခိုင်နှုန်းကို စစ်ဆေးပေးပါ။', zh: '请检查不良率。', th: 'กรุณาตรวจสอบอัตราของเสีย' },
  { cat: 'workplace', en: 'We need more raw materials.', my: 'ကုန်ကြမ်းပစ္စည်းတွေ ထပ်လိုပါတယ်။', zh: '我们需要更多原材料。', th: 'เราต้องการวัตถุดิบเพิ่ม' },
  { cat: 'workplace', en: 'Please wear safety gear.', my: 'ဘေးကင်းလုံခြုံရေး ဝတ်စုံ ဝတ်ဆင်ပါ။', zh: '请穿戴安全防护装备。', th: 'กรุณาสวมใส่อุปกรณ์ความปลอดภัย' },
  { cat: 'housing', en: 'Where is my room?', my: 'ကျွန်တော့် အခန်း ဘယ်မှာလဲခင်ဗျာ?', zh: '我的房间在哪里？', th: 'ห้องของฉันอยู่ที่ไหน?' },
  { cat: 'housing', en: 'The water/electricity is cut off.', my: 'ရေ/မီး ပြတ်နေပါတယ်။', zh: '停水/停电了。', th: 'น้ำ/ไฟดับครับ' },
  { cat: 'wages', en: 'When will salary be paid?', my: 'လစာ ဘယ်နေ့ ထုတ်ပေးမှာလဲခင်ဗျာ?', zh: '什么时候发工资？', th: 'เงินเดือนจะออกเมื่อไหร่ครับ/ค่ะ?' },
  { cat: 'wages', en: 'Is overtime pay included?', my: 'OT (အချိန်ပိုကြေး) ပါပြီးသားလားခင်ဗျာ?', zh: '包括加班费吗？', th: 'รวมค่าล่วงเวลา (OT) หรือยัง?' },
  { cat: 'immigration', en: 'Here is my passport and work permit.', my: 'ဒါ ကျွန်တော့် ပတ်စ်ပို့နဲ့ အလုပ်လုပ်ခွင့် ကတ်ပြားပါ။', zh: '这是我的护照和工作许可证。', th: 'นี่คือหนังสือเดินทางและใบอนุญาตทำงานของฉัน' },
  { cat: 'immigration', en: 'I need to renew my visa.', my: 'ဗီဇာ သက်တမ်းတိုးဖို့ လိုအပ်ပါတယ်။', zh: '我需要续签签证。', th: 'ฉันจำเป็นต้องต่ออายุวีซ่า' }
];

const PHRASES = [
  { en: 'Hello', my: 'မင်္ဂလာပါ', zh: '你好', th: 'สวัสดี', fr: 'Bonjour', es: 'Hola' },
  { en: 'Thank you', my: 'ကျေးဇူးတင်ပါတယ်', zh: '谢谢', th: 'ขอบคุณ', fr: 'Merci', es: 'Gracias' },
  { en: 'Yes', my: 'ဟုတ်ကဲ့ / ဟုတ်ပါတယ်', zh: '是的', th: 'ใช่', fr: 'Oui', es: 'Sí' },
  { en: 'No', my: 'မဟုတ်ပါ / မဟုတ်ဘူး', zh: '不是 / 不', th: 'ไม่ใช่', fr: 'Non', es: 'No' },
  { en: 'Please', my: 'ကျေးဇူးပြု၍', zh: '请', th: 'กรุณา / โปรด', fr: 'S\'il vous plaît', es: 'Por favor' },
  { en: 'Sorry / Excuse me', my: 'တောင်းပန်ပါတယ်', zh: '对不起 / 抱歉', th: 'ขอโทษ', fr: 'Pardon', es: 'Disculpe' },
  { en: 'I understand', my: 'နားလည်ပါပြီ', zh: '我明白了', th: 'เข้าใจแล้ว', fr: 'Je comprends', es: 'Entiendo' },
  { en: 'I do not understand', my: 'နားမလည်ပါဘူး', zh: '我不明白', th: 'ไม่เข้าใจ', fr: 'Je ne comprends pas', es: 'No entiendo' },
  { en: 'How much is this?', my: 'ဒါ ဘယ်လောက်လဲ?', zh: '这个多少钱？', th: 'อันนี้ราคาเท่าไหร่?', fr: 'Combien ça coûte ?', es: '¿Cuánto cuesta esto?' },
  { en: 'Where is the bathroom?', my: 'အိမ်သာ ဘယ်နားမှာလဲ?', zh: '洗手间在哪里？', th: 'ห้องน้ำอยู่ที่ไหน?', fr: 'Où sont les toilettes ?', es: '¿Dónde está el baño?' },
  { en: 'Goodbye', my: 'သွားပါဦးမယ် / တာ့တာ', zh: '再见', th: 'ลาก่อน', fr: 'Au revoir', es: 'Adiós' }
];

const WORDS = [
  { en: 'water', my: 'ရေ', zh: '水', th: 'น้ำ', fr: 'eau', es: 'agua' },
  { en: 'food', my: 'အစားအစာ', zh: '食物', th: 'อาหาร', fr: 'nourriture', es: 'comida' },
  { en: 'money', my: 'ပိုက်ဆံ / ငွေ', zh: '钱', th: 'เงิน', fr: 'argent', es: 'dinero' },
  { en: 'hospital', my: 'ဆေးရုံ', zh: '医院', th: 'โรงพยาบาล', fr: 'hôpital', es: 'hospital' },
  { en: 'police', my: 'ရဲ', zh: '警察', th: 'ตำรวจ', fr: 'police', es: 'policía' },
  { en: 'doctor', my: 'ဆရာဝန်', zh: '医生', th: 'หมอ', fr: 'médecin', es: 'médico' },
  { en: 'medicine', my: 'ဆေး', zh: '药', th: 'ยา', fr: 'médicament', es: 'medicina' },
  { en: 'room', my: 'အခန်း', zh: '房间', th: 'ห้อง', fr: 'chambre', es: 'habitación' },
  { en: 'factory', my: 'စက်ရုံ', zh: '工厂', th: 'โรงงาน', fr: 'usine', es: 'fábrica' },
  { en: 'boss / manager', my: 'သူဌေး / မန်နေဂျာ', zh: '老板 / 经理', th: 'หัวหน้า / ผู้จัดการ', fr: 'patron', es: 'jefe' },
  { en: 'work', my: 'အလုပ်', zh: '工作', th: 'ทำงาน', fr: 'travail', es: 'trabajo' },
  { en: 'today', my: 'ဒီနေ့', zh: '今天', th: 'วันนี้', fr: 'aujourd\'hui', es: 'hoy' },
  { en: 'tomorrow', my: 'မနက်ဖြန်', zh: '明天', th: 'พรุ่งนี้', fr: 'demain', es: 'mañana' }
];
