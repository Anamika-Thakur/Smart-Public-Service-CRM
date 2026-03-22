const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys');
const Complaint = require('../models/Complaint');
const Feedback  = require('../models/Feedback');
const pino      = require('pino');
const qrcode    = require('qrcode-terminal');
const path      = require('path');

let isReconnecting = false;

// ── Per-user session state ────────────────────────────────────────────────────
const sessions = {};
function getSession(jid) {
  if (!sessions[jid]) sessions[jid] = { lang: null, step: 'LANG_SELECT', data: {} };
  return sessions[jid];
}
function resetSession(jid) {
  sessions[jid] = { lang: null, step: 'LANG_SELECT', data: {} };
}

// ── Translations ──────────────────────────────────────────────────────────────
const T = {
  en: {
    langSelect:      `🏛️ *PS-CRM Gov Portal*\n_Smart Public Service CRM_\n\nWelcome! Please select your language:\n\n1️⃣ English\n2️⃣ हिंदी (Hindi)`,
    menu:            `📋 *Main Menu*\n━━━━━━━━━━━━━━━\n\n1️⃣ File a Complaint\n2️⃣ Track Complaint\n3️⃣ My Complaints\n4️⃣ Give Feedback\n5️⃣ Live Stats\n0️⃣ Cancel / Restart\n\n_Reply with a number to continue._`,
    cancel:          `🔄 Conversation reset. Send *HI* to start again.`,
    invalid:         `❓ Invalid input. Please reply with a valid option.\n\nSend *MENU* for main menu.`,
    askTitle:        `📝 *File a Complaint*\n━━━━━━━━━━━━━━━\n\nStep 1/6: Enter the *title* of your complaint.\n\n_Example: Broken street light near park_\n\n_(Send 0 to cancel)_`,
    askDesc:         `✍️ Step 2/6: Describe your complaint in detail.\n\n_Example: The street light near main market has not been working for 2 weeks causing safety issues at night._\n\n_(Send 0 to cancel)_`,
    askWard:         `📍 Step 3/6: Select your *Ward* — send the letter.\n\nA B C D E F G H I J K L M\nN O P Q R S T U V W X Y Z\n\n_Example: Send A for Ward A_\n\n_(Send 0 to cancel)_`,
    askAddress:      `🏠 Step 4/6: Enter your *address* or landmark.\n\n_Example: Near Main Market, Dharavi_\n\n_(Send 0 to cancel)_`,
    askName:         `👤 Step 5/6: Enter your *full name*.\n\n_(Send 0 to cancel)_`,
    askEmail:        `📧 Step 6/6: Enter your *email address*.\n\n_You will receive confirmation and status updates here._\n\n_(Send 0 to cancel)_`,
    confirmComplaint:(d) => `✅ *Please confirm your complaint:*\n━━━━━━━━━━━━━━━\n\n📌 *Title:* ${d.title}\n📝 *Description:* ${d.description?.slice(0,100)}...\n📍 *Ward:* Ward ${d.ward}\n🏠 *Address:* ${d.address}\n👤 *Name:* ${d.name}\n📧 *Email:* ${d.email}\n\nReply *YES* to submit or *NO* to cancel.`,
    submitSuccess:   (id, sla, cat, urg) => `🎉 *Complaint Submitted Successfully!*\n━━━━━━━━━━━━━━━\n\n✅ Your complaint has been registered.\n\n🆔 *Complaint ID:* ${id}\n🏷️ *Category:* ${cat} (AI detected)\n⚡ *Urgency:* ${urg}\n⏱️ *SLA Deadline:* ${sla}\n\n_You will receive email updates as your complaint progresses._\n\nSend *MENU* for main menu.`,
    submitFail:      `❌ Failed to submit complaint. Please try again.\n\nSend *MENU* to go back.`,
    invalidWard:     `❌ Invalid ward. Please send a single letter from A to Z.\n\n_Example: A for Ward A, L for Ward L_`,
    askTrackId:      `🔍 *Track Complaint*\n━━━━━━━━━━━━━━━\n\nEnter your *Complaint ID*.\n\n_Example: CMP-A3A073B2_\n\n_(Send 0 to cancel)_`,
    notFound:        (id) => `❌ Complaint *${id}* not found.\n\nPlease check the ID and try again.\n\nSend *MENU* to go back.`,
    trackResult:     (c) => {
      const se   = { Pending: '⏳', 'In Progress': '🔄', Resolved: '✅', Escalated: '🚨' };
      const ue   = { High: '🔴', Medium: '🟡', Low: '🟢' };
      const days = Math.floor((new Date() - new Date(c.createdAt)) / (1000 * 60 * 60 * 24));
      const dl   = c.sla?.deadline ? new Date(c.sla.deadline).toLocaleDateString('en-IN') : 'N/A';
      const ov   = c.sla?.deadline && new Date() > new Date(c.sla.deadline) && c.status !== 'Resolved';
      return `📋 *Complaint Details*\n━━━━━━━━━━━━━━━\n\n🆔 *ID:* ${c.complaintNumber || 'CMP-' + c._id?.toString().slice(-8).toUpperCase()}\n📌 *Title:* ${c.title}\n${se[c.status]||'📋'} *Status:* ${c.status}\n🏷️ *Category:* ${c.category}\n${ue[c.urgency]||'⚡'} *Urgency:* ${c.urgency}\n📅 *Filed:* ${new Date(c.createdAt).toLocaleDateString('en-IN')}\n⏱️ *SLA Deadline:* ${dl}\n📆 *Days Open:* ${days}\n${ov?'🚨 *OVERDUE — Escalated to supervisor*\n':''}${c.location?.ward?`📍 *Ward:* ${c.location.ward}\n`:''}${c.resolution?`\n✅ *Resolution:*\n${c.resolution}\n`:''}\nSend *MENU* for main menu.`;
    },
    askEmailForComplaints: `📧 *My Complaints*\n━━━━━━━━━━━━━━━\n\nEnter your *registered email address* to view your complaints.\n\n_(Send 0 to cancel)_`,
    noComplaints:    (e) => `📭 No complaints found for *${e}*.\n\nSend *MENU* to go back.`,
    myComplaintsList:(list) => {
      const se = { Pending: '⏳', 'In Progress': '🔄', Resolved: '✅', Escalated: '🚨' };
      let msg = `📋 *Your Complaints* (${list.length} found)\n━━━━━━━━━━━━━━━\n\n`;
      list.slice(0,5).forEach((c,i) => {
        msg += `${i+1}. ${se[c.status]||'📋'} *${c.title?.slice(0,40)}*\n   🆔 ${c.complaintNumber||'CMP-'+c._id?.toString().slice(-8).toUpperCase()}\n   ${c.status} | ${c.category}\n\n`;
      });
      if (list.length > 5) msg += `_...and ${list.length-5} more_\n\n`;
      msg += `Send *MENU* for main menu.`;
      return msg;
    },
    askFeedbackId:   `⭐ *Give Feedback*\n━━━━━━━━━━━━━━━\n\nEnter the *Complaint ID* of your resolved complaint.\n\n_Example: CMP-A3A073B2_\n\n_(Send 0 to cancel)_`,
    notResolved:     `❌ This complaint is not resolved yet.\nFeedback can only be given after resolution.\n\nSend *MENU* to go back.`,
    alreadyFeedback: `❌ Feedback already submitted for this complaint.\n\nSend *MENU* to go back.`,
    askFeedbackEmail:`📧 Enter your *email address* to submit feedback.\n\n_(Send 0 to cancel)_`,
    askRating:       `⭐ *Rate your experience:*\n\nSend a number from 1 to 5:\n\n1 - 😠 Very Poor\n2 - 😞 Poor\n3 - 😐 Average\n4 - 😊 Good\n5 - 🤩 Excellent\n\n_(Send 0 to cancel)_`,
    askComment:      `💬 Add a comment (optional).\n\nDescribe your experience or send *SKIP* to skip.\n\n_(Send 0 to cancel)_`,
    feedbackSuccess: `🎉 *Thank you for your feedback!*\n\nYour rating has been recorded and will help improve public services.\n\nSend *MENU* for main menu.`,
    feedbackFail:    `❌ Failed to submit feedback. Please try again.\n\nSend *MENU* to go back.`,
    invalidRating:   `❌ Please send a number between 1 and 5.`,
    stats:           (total, resolved, inProgress, pending, rate) =>
      `📊 *PS-CRM Live Statistics*\n━━━━━━━━━━━━━━━\n\n📋 Total Complaints: *${total}*\n✅ Resolved: *${resolved}*\n🔄 In Progress: *${inProgress}*\n⏳ Pending: *${pending}*\n\n📈 Resolution Rate: *${rate}%*\n\n_Last updated: ${new Date().toLocaleString('en-IN')}_\n\nSend *MENU* for main menu.`,
  },

  hi: {
    langSelect:      `🏛️ *PS-CRM Gov Portal*\n_Smart Public Service CRM_\n\nनमस्ते! कृपया अपनी भाषा चुनें:\n\n1️⃣ English\n2️⃣ हिंदी (Hindi)`,
    menu:            `📋 *मुख्य मेनू*\n━━━━━━━━━━━━━━━\n\n1️⃣ शिकायत दर्ज करें\n2️⃣ शिकायत ट्रैक करें\n3️⃣ मेरी शिकायतें\n4️⃣ फ़ीडबैक दें\n5️⃣ लाइव आंकड़े\n0️⃣ रद्द करें / पुनः शुरू करें\n\n_जारी रखने के लिए नंबर भेजें।_`,
    cancel:          `🔄 बातचीत रीसेट हो गई। शुरू करने के लिए *HI* भेजें।`,
    invalid:         `❓ गलत इनपुट। कृपया सही विकल्प चुनें।\n\nमेनू के लिए *MENU* भेजें।`,
    askTitle:        `📝 *शिकायत दर्ज करें*\n━━━━━━━━━━━━━━━\n\nचरण 1/6: अपनी शिकायत का *शीर्षक* लिखें।\n\n_उदाहरण: बाज़ार के पास टूटी सड़क_\n\n_(रद्द करने के लिए 0 भेजें)_`,
    askDesc:         `✍️ चरण 2/6: अपनी शिकायत का *विस्तृत विवरण* लिखें।\n\n_(रद्द करने के लिए 0 भेजें)_`,
    askWard:         `📍 चरण 3/6: अपना *वार्ड* चुनें — अक्षर भेजें।\n\nA B C D E F G H I J K L M\nN O P Q R S T U V W X Y Z\n\n_उदाहरण: Ward A के लिए A भेजें_\n\n_(रद्द करने के लिए 0 भेजें)_`,
    askAddress:      `🏠 चरण 4/6: अपना *पता या लैंडमार्क* लिखें।\n\n_(रद्द करने के लिए 0 भेजें)_`,
    askName:         `👤 चरण 5/6: अपना *पूरा नाम* लिखें।\n\n_(रद्द करने के लिए 0 भेजें)_`,
    askEmail:        `📧 चरण 6/6: अपना *ईमेल पता* लिखें।\n\n_शिकायत की पुष्टि और अपडेट यहाँ भेजे जाएंगे।_\n\n_(रद्द करने के लिए 0 भेजें)_`,
    confirmComplaint:(d) => `✅ *कृपया अपनी शिकायत की पुष्टि करें:*\n━━━━━━━━━━━━━━━\n\n📌 *शीर्षक:* ${d.title}\n📝 *विवरण:* ${d.description?.slice(0,100)}...\n📍 *वार्ड:* Ward ${d.ward}\n🏠 *पता:* ${d.address}\n👤 *नाम:* ${d.name}\n📧 *ईमेल:* ${d.email}\n\nजमा करने के लिए *YES* या रद्द करने के लिए *NO* भेजें।`,
    submitSuccess:   (id, sla, cat, urg) => `🎉 *शिकायत सफलतापूर्वक दर्ज हुई!*\n━━━━━━━━━━━━━━━\n\n✅ आपकी शिकायत पंजीकृत हो गई।\n\n🆔 *शिकायत ID:* ${id}\n🏷️ *श्रेणी:* ${cat} (AI द्वारा)\n⚡ *प्राथमिकता:* ${urg}\n⏱️ *SLA समय सीमा:* ${sla}\n\n_प्रगति पर ईमेल अपडेट मिलेंगे।_\n\nमेनू के लिए *MENU* भेजें।`,
    submitFail:      `❌ शिकायत जमा नहीं हो सकी। कृपया पुनः प्रयास करें।\n\nमेनू के लिए *MENU* भेजें।`,
    invalidWard:     `❌ गलत वार्ड। कृपया A से Z के बीच कोई एक अक्षर भेजें।`,
    askTrackId:      `🔍 *शिकायत ट्रैक करें*\n━━━━━━━━━━━━━━━\n\nअपनी *शिकायत ID* दर्ज करें।\n\n_उदाहरण: CMP-A3A073B2_\n\n_(रद्द करने के लिए 0 भेजें)_`,
    notFound:        (id) => `❌ शिकायत *${id}* नहीं मिली।\n\nID जांचकर पुनः प्रयास करें।\n\nमेनू के लिए *MENU* भेजें।`,
    trackResult:     (c) => {
      const se   = { Pending: '⏳', 'In Progress': '🔄', Resolved: '✅', Escalated: '🚨' };
      const ue   = { High: '🔴', Medium: '🟡', Low: '🟢' };
      const days = Math.floor((new Date() - new Date(c.createdAt)) / (1000 * 60 * 60 * 24));
      const dl   = c.sla?.deadline ? new Date(c.sla.deadline).toLocaleDateString('hi-IN') : 'N/A';
      const ov   = c.sla?.deadline && new Date() > new Date(c.sla.deadline) && c.status !== 'Resolved';
      return `📋 *शिकायत विवरण*\n━━━━━━━━━━━━━━━\n\n🆔 *ID:* ${c.complaintNumber||'CMP-'+c._id?.toString().slice(-8).toUpperCase()}\n📌 *शीर्षक:* ${c.title}\n${se[c.status]||'📋'} *स्थिति:* ${c.status}\n🏷️ *श्रेणी:* ${c.category}\n${ue[c.urgency]||'⚡'} *प्राथमिकता:* ${c.urgency}\n📅 *दर्ज तारीख:* ${new Date(c.createdAt).toLocaleDateString('hi-IN')}\n⏱️ *SLA समय सीमा:* ${dl}\n📆 *खुले दिन:* ${days}\n${ov?'🚨 *समय सीमा पार — पर्यवेक्षक को सौंपा गया*\n':''}${c.location?.ward?`📍 *वार्ड:* ${c.location.ward}\n`:''}${c.resolution?`\n✅ *समाधान:*\n${c.resolution}\n`:''}\nमेनू के लिए *MENU* भेजें।`;
    },
    askEmailForComplaints: `📧 *मेरी शिकायतें*\n━━━━━━━━━━━━━━━\n\nअपनी शिकायतें देखने के लिए *पंजीकृत ईमेल* दर्ज करें।\n\n_(रद्द करने के लिए 0 भेजें)_`,
    noComplaints:    (e) => `📭 *${e}* के लिए कोई शिकायत नहीं मिली।\n\nमेनू के लिए *MENU* भेजें।`,
    myComplaintsList:(list) => {
      const se = { Pending: '⏳', 'In Progress': '🔄', Resolved: '✅', Escalated: '🚨' };
      let msg = `📋 *आपकी शिकायतें* (${list.length} मिलीं)\n━━━━━━━━━━━━━━━\n\n`;
      list.slice(0,5).forEach((c,i) => {
        msg += `${i+1}. ${se[c.status]||'📋'} *${c.title?.slice(0,40)}*\n   🆔 ${c.complaintNumber||'CMP-'+c._id?.toString().slice(-8).toUpperCase()}\n   ${c.status} | ${c.category}\n\n`;
      });
      if (list.length > 5) msg += `_...और ${list.length-5} अधिक_\n\n`;
      msg += `मेनू के लिए *MENU* भेजें।`;
      return msg;
    },
    askFeedbackId:   `⭐ *फ़ीडबैक दें*\n━━━━━━━━━━━━━━━\n\nहल की गई शिकायत की *ID* दर्ज करें।\n\n_(रद्द करने के लिए 0 भेजें)_`,
    notResolved:     `❌ यह शिकायत अभी हल नहीं हुई।\nहल होने के बाद ही फ़ीडबैक दे सकते हैं।\n\nमेनू के लिए *MENU* भेजें।`,
    alreadyFeedback: `❌ इस शिकायत पर फ़ीडबैक पहले ही दिया जा चुका है।\n\nमेनू के लिए *MENU* भेजें।`,
    askFeedbackEmail:`📧 फ़ीडबैक जमा करने के लिए अपना *ईमेल* दर्ज करें।\n\n_(रद्द करने के लिए 0 भेजें)_`,
    askRating:       `⭐ *अपना अनुभव रेट करें:*\n\n1 से 5 के बीच नंबर भेजें:\n\n1 - 😠 बहुत खराब\n2 - 😞 खराब\n3 - 😐 ठीक\n4 - 😊 अच्छा\n5 - 🤩 बहुत अच्छा\n\n_(रद्द करने के लिए 0 भेजें)_`,
    askComment:      `💬 टिप्पणी लिखें (वैकल्पिक)।\n\nछोड़ने के लिए *SKIP* भेजें।\n\n_(रद्द करने के लिए 0 भेजें)_`,
    feedbackSuccess: `🎉 *फ़ीडबैक के लिए धन्यवाद!*\n\nआपकी रेटिंग दर्ज हो गई।\n\nमेनू के लिए *MENU* भेजें।`,
    feedbackFail:    `❌ फ़ीडबैक जमा नहीं हो सका। कृपया पुनः प्रयास करें।\n\nमेनू के लिए *MENU* भेजें।`,
    invalidRating:   `❌ कृपया 1 से 5 के बीच नंबर भेजें।`,
    stats:           (total, resolved, inProgress, pending, rate) =>
      `📊 *PS-CRM लाइव आंकड़े*\n━━━━━━━━━━━━━━━\n\n📋 कुल शिकायतें: *${total}*\n✅ हल हुई: *${resolved}*\n🔄 प्रक्रिया में: *${inProgress}*\n⏳ लंबित: *${pending}*\n\n📈 समाधान दर: *${rate}%*\n\n_अंतिम अपडेट: ${new Date().toLocaleString('hi-IN')}_\n\nमेनू के लिए *MENU* भेजें।`,
  },
};

// ── Keyword-based AI classification ──────────────────────────────────────────
function classifyComplaint(title, description) {
  const text = `${title} ${description}`.toLowerCase();
  if (['pothole','road','footpath','bridge','pavement','highway','street','tar'].some(k => text.includes(k)))
    return { category: 'Roads', urgency: 'High' };
  if (['water','pipe','supply','leak','flood','drainage','tap','borewell'].some(k => text.includes(k)))
    return { category: 'Water', urgency: 'High' };
  if (['light','electricity','power','wire','transformer','electric','bulb','streetlight'].some(k => text.includes(k)))
    return { category: 'Electricity', urgency: 'Medium' };
  if (['garbage','waste','sanitation','trash','smell','sewage','drain','dustbin','litter'].some(k => text.includes(k)))
    return { category: 'Sanitation', urgency: 'High' };
  return { category: 'Other', urgency: 'Low' };
}

// ── Message handler ───────────────────────────────────────────────────────────
async function handleMessage(jid, text) {
  const session = getSession(jid);
  const input   = text.trim();
  const upper   = input.toUpperCase();

  // Global commands — work at any step
  if (['MENU', 'MAIN', 'BACK'].includes(upper)) {
    session.step = 'MENU';
    session.data = {};
    return T[session.lang || 'en'].menu;
  }
  if (['0', 'CANCEL', 'QUIT', 'EXIT'].includes(upper)) {
    const lang = session.lang || 'en';
    resetSession(jid);
    return T[lang].cancel;
  }
  if (['HI', 'HELLO', 'HELP', 'START', 'NAMASTE', 'NAMASKAR'].includes(upper)) {
    resetSession(jid);
    return T.en.langSelect;
  }

  // ── Language selection ────────────────────────────────────────────────────
  if (session.step === 'LANG_SELECT') {                          // ✅ fixed: was `p ===`
    if (input === '1') { session.lang = 'en'; session.step = 'MENU'; return T.en.menu; }
    if (input === '2') { session.lang = 'hi'; session.step = 'MENU'; return T.hi.menu; }
    return T.en.langSelect;
  }

  const tr = T[session.lang || 'en'];

  // ── Main menu ─────────────────────────────────────────────────────────────
  if (session.step === 'MENU') {                                 // ✅ fixed: was `if (upper === 'MENU')`
    if (input === '1') { session.step = 'FILE_TITLE';  return tr.askTitle; }
    if (input === '2') { session.step = 'TRACK_ID';    return tr.askTrackId; }
    if (input === '3') { session.step = 'MY_EMAIL';    return tr.askEmailForComplaints; }
    if (input === '4') { session.step = 'FEEDBACK_ID'; return tr.askFeedbackId; }
    if (input === '5') {
      const total      = await Complaint.countDocuments();
      const resolved   = await Complaint.countDocuments({ status: 'Resolved' });
      const inProgress = await Complaint.countDocuments({ status: 'In Progress' });
      const pending    = await Complaint.countDocuments({ status: 'Pending' });
      const rate       = total > 0 ? Math.round((resolved / total) * 100) : 0;
      session.step     = 'MENU';
      return tr.stats(total, resolved, inProgress, pending, rate);
    }
    if (input === '0') { resetSession(jid); return tr.cancel; }
    return tr.menu;
  }

  // ── File complaint ────────────────────────────────────────────────────────
  if (session.step === 'FILE_TITLE') {
    session.data.title = input;
    session.step = 'FILE_DESC';
    return tr.askDesc;
  }
  if (session.step === 'FILE_DESC') {
    session.data.description = input;
    session.step = 'FILE_WARD';
    return tr.askWard;
  }
  if (session.step === 'FILE_WARD') {
    const ward = upper.replace('WARD', '').trim();
    if (ward.length !== 1 || !/^[A-Z]$/.test(ward)) return tr.invalidWard;
    session.data.ward = ward;
    session.step = 'FILE_ADDRESS';
    return tr.askAddress;
  }
  if (session.step === 'FILE_ADDRESS') {
    session.data.address = input;
    session.step = 'FILE_NAME';
    return tr.askName;
  }
  if (session.step === 'FILE_NAME') {
    session.data.name = input;
    session.step = 'FILE_EMAIL';
    return tr.askEmail;
  }
  if (session.step === 'FILE_EMAIL') {
    session.data.email = input;
    session.step = 'FILE_CONFIRM';
    return tr.confirmComplaint(session.data);
  }
  if (session.step === 'FILE_CONFIRM') {
    if (upper === 'YES') {
      try {
        const { setSLADeadline }            = require('./slaService');
        const { sendComplaintConfirmation } = require('./emailService');
        const { category, urgency }         = classifyComplaint(session.data.title, session.data.description);
        const deadline                      = setSLADeadline(urgency);

        const complaint = await Complaint.create({
          title:       session.data.title,
          description: session.data.description,
          category, urgency,
          citizen:  { name: session.data.name, email: session.data.email, phone: '' },
          location: { address: session.data.address, ward: `Ward ${session.data.ward}` },
          sla:      { deadline, escalated: false, escalatedAt: null },
        });

        // ✅ Send confirmation email — inside try block where complaint exists
        sendComplaintConfirmation(complaint);

        const id  = complaint.complaintNumber || `CMP-${complaint._id.toString().slice(-8).toUpperCase()}`;
        const sla = new Date(deadline).toLocaleDateString(session.lang === 'hi' ? 'hi-IN' : 'en-IN');
        session.step = 'MENU';
        session.data = {};
        return tr.submitSuccess(id, sla, category, urgency);
      } catch (err) {
        console.error('[WhatsApp Bot] Submit error:', err.message);
        session.step = 'MENU';
        return tr.submitFail;
      }
    }
    // NO — cancel
    session.step = 'MENU';
    session.data = {};
    return tr.menu;
  }

  // ── Track complaint ───────────────────────────────────────────────────────
  if (session.step === 'TRACK_ID') {
    const cmpId = upper.startsWith('CMP-') ? upper : `CMP-${upper}`;
    const c     = await Complaint.findOne({ complaintNumber: cmpId }).lean();
    session.step = 'MENU';
    if (!c) return tr.notFound(cmpId);
    return tr.trackResult(c);
  }

  // ── My complaints ─────────────────────────────────────────────────────────
  if (session.step === 'MY_EMAIL') {
    const list = await Complaint.find({ 'citizen.email': input.toLowerCase() })
      .sort({ createdAt: -1 }).lean();
    session.step = 'MENU';
    if (!list.length) return tr.noComplaints(input);
    return tr.myComplaintsList(list);
  }

  // ── Feedback ──────────────────────────────────────────────────────────────
  if (session.step === 'FEEDBACK_ID') {
    const cmpId = upper.startsWith('CMP-') ? upper : `CMP-${upper}`;
    const c     = await Complaint.findOne({ complaintNumber: cmpId }).lean();
    if (!c) return tr.notFound(cmpId);
    if (c.status !== 'Resolved') return tr.notResolved;
    session.data.complaintId = c._id.toString();
    session.step = 'FEEDBACK_EMAIL';
    return tr.askFeedbackEmail;
  }
  if (session.step === 'FEEDBACK_EMAIL') {
    const existing = await Feedback.findOne({
      complaint:    session.data.complaintId,
      citizenEmail: input.toLowerCase(),
    });
    if (existing) { session.step = 'MENU'; return tr.alreadyFeedback; }
    session.data.citizenEmail = input.toLowerCase();
    session.step = 'FEEDBACK_RATING';
    return tr.askRating;
  }
  if (session.step === 'FEEDBACK_RATING') {
    const rating = parseInt(input);
    if (isNaN(rating) || rating < 1 || rating > 5) return tr.invalidRating;
    session.data.rating = rating;
    session.step = 'FEEDBACK_COMMENT';
    return tr.askComment;
  }
  if (session.step === 'FEEDBACK_COMMENT') {
    const comment   = upper === 'SKIP' ? '' : input;
    const sentiment = session.data.rating >= 4 ? 'Positive' : session.data.rating === 3 ? 'Neutral' : 'Negative';
    try {
      await Feedback.create({
        complaint:    session.data.complaintId,
        citizenEmail: session.data.citizenEmail,
        citizenName:  session.data.citizenEmail,
        rating:       session.data.rating,
        comment,
        sentiment,
      });
      session.step = 'MENU';
      session.data = {};
      return tr.feedbackSuccess;
    } catch (err) {
      console.error('[WhatsApp Bot] Feedback error:', err.message);
      session.step = 'MENU';
      return tr.feedbackFail;
    }
  }

  return tr.invalid;
}

// ── Bot startup ───────────────────────────────────────────────────────────────
async function startWhatsAppBot() {
  const authPath             = path.join(__dirname, '../auth_info_baileys');
  const { state, saveCreds } = await useMultiFileAuthState(authPath);
  const { version }          = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version, auth: state,
    logger:     pino({ level: 'fatal' }).child({ class: 'baileys' }),
    getMessage: async () => ({ conversation: '' }),
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      console.log('\n[WhatsApp Bot] 📱 Scan this QR code with your WhatsApp:\n');
      qrcode.generate(qr, { small: true });
      console.log('\n[WhatsApp Bot] Open WhatsApp → Linked Devices → Link a Device → Scan above QR\n');
    }
    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;

      if (code === DisconnectReason.loggedOut) {
        console.log('[WhatsApp Bot] ❌ Logged out. Clearing session and restarting...');
        const fs = require('fs');
        if (fs.existsSync(authPath)) fs.rmSync(authPath, { recursive: true, force: true });
        setTimeout(() => startWhatsAppBot(), 3000);
        return;
      }

      // ✅ Fixed: don't restart on session replaced — just stop cleanly
      if (code === 440) {
        console.log('[WhatsApp Bot] ⚠️  Session replaced by another device. Stopping this instance.');
        try { sock.end(); } catch (_) {}
        return;
      }

      if (!isReconnecting) {
        isReconnecting = true;
        console.log(`[WhatsApp Bot] Connection closed (code: ${code}). Reconnecting in 5s...`);
        setTimeout(async () => {
          isReconnecting = false;
          try { sock.end(); } catch (_) {}
          startWhatsAppBot();
        }, 5000);
      }
    } else if (connection === 'open') {
      isReconnecting = false;
      console.log('[WhatsApp Bot] ✅ Connected successfully! Bot is live.');
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;
      const jid = msg.key.remoteJid;
      if (!jid) continue;

      // Ignore group messages
      if (jid.endsWith('@g.us')) continue;

      // Ignore broadcast/status messages
      if (jid === 'status@broadcast') continue;

      // Ignore messages older than 30 seconds
      const msgTime = msg.messageTimestamp * 1000;
      if (Date.now() - msgTime > 30000) continue;

      const text = (
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        msg.message?.imageMessage?.caption || ''
      ).trim();

      if (!text) continue;

      console.log(`[WhatsApp Bot] From ${jid}: ${text}`);

      try {
        const reply = await handleMessage(jid, text);
        if (reply) await sock.sendMessage(jid, { text: reply });
      } catch (err) {
        console.error('[WhatsApp Bot] Error:', err.message);
        await sock.sendMessage(jid, { text: `⚠️ Something went wrong. Send *HI* to restart.` });
      }
    }
  });

  return sock;
}

module.exports = { startWhatsAppBot };