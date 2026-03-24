// ps-crm-backend/src/controllers/chatbotController.js
const Complaint = require('../models/Complaint');
const Feedback  = require('../models/Feedback');

// ── In-memory session store (keyed by socketId or userId) ────────────────────
const sessions = {};
function getSession(id) {
  if (!sessions[id]) sessions[id] = { lang: null, step: 'LANG_SELECT', data: {} };
  return sessions[id];
}
function resetSession(id) {
  sessions[id] = { lang: null, step: 'LANG_SELECT', data: {} };
}

// ── Delhi Schemes Data ────────────────────────────────────────────────────────
const DELHI_SCHEMES = [
  {
    id: 'mahila_samman', name: 'Mukhyamantri Mahila Samman Yojana', nameHi: 'मुख्यमंत्री महिला सम्मान योजना',
    category: 'Financial', categoryHi: 'वित्तीय',
    description: '₹1,000/month for Delhi women with Voter ID.',
    descriptionHi: 'दिल्ली मतदाता पहचान पत्र वाली महिलाओं को ₹1,000/माह।',
    eligibility: { gender: ['female'], minAge: 18, maxAge: null, incomeLimit: null, caste: [], disability: false },
    documents: ['Delhi Voter ID', 'Aadhaar Card', 'Bank Account'],
    documentsHi: ['दिल्ली मतदाता पहचान पत्र', 'आधार कार्ड', 'बैंक खाता'],
    applyAt: 'delhi.gov.in / Jan Seva Kendra', applyAtHi: 'delhi.gov.in / जन सेवा केंद्र',
  },
  {
    id: 'old_age_pension', name: 'Vridha Pension (Old Age Pension)', nameHi: 'वृद्धा पेंशन योजना',
    category: 'Financial', categoryHi: 'वित्तीय',
    description: '₹2,000/month pension for senior citizens (60+).',
    descriptionHi: '60+ वरिष्ठ नागरिकों को ₹2,000/माह पेंशन।',
    eligibility: { gender: ['male','female','other'], minAge: 60, maxAge: null, incomeLimit: 100000, caste: [], disability: false },
    documents: ['Age Proof', 'Aadhaar', 'Income Certificate', 'Residence Proof'],
    documentsHi: ['आयु प्रमाण', 'आधार', 'आय प्रमाण पत्र', 'निवास प्रमाण'],
    applyAt: 'Social Welfare Dept / e-district portal', applyAtHi: 'समाज कल्याण विभाग / ई-जिला पोर्टल',
  },
  {
    id: 'widow_pension', name: 'Widow Pension Scheme', nameHi: 'विधवा पेंशन योजना',
    category: 'Financial', categoryHi: 'वित्तीय',
    description: '₹2,500/month for widows aged 18–59 below income limit.',
    descriptionHi: '18–59 वर्ष की विधवाओं को ₹2,500/माह।',
    eligibility: { gender: ['female'], minAge: 18, maxAge: 59, incomeLimit: 100000, caste: [], disability: false, widow: true },
    documents: ['Husband\'s Death Certificate', 'Aadhaar', 'Income Certificate'],
    documentsHi: ['पति का मृत्यु प्रमाण पत्र', 'आधार', 'आय प्रमाण पत्र'],
    applyAt: 'e-district.delhigovt.nic.in', applyAtHi: 'e-district.delhigovt.nic.in',
  },
  {
    id: 'disability_pension', name: 'Disability Pension Scheme', nameHi: 'विकलांग पेंशन योजना',
    category: 'Financial', categoryHi: 'वित्तीय',
    description: '₹2,500/month for persons with 40%+ disability.',
    descriptionHi: '40%+ विकलांगता वाले व्यक्तियों को ₹2,500/माह।',
    eligibility: { gender: ['male','female','other'], minAge: 18, maxAge: 59, incomeLimit: 100000, caste: [], disability: true },
    documents: ['Disability Certificate (40%+)', 'Aadhaar', 'Income Certificate'],
    documentsHi: ['विकलांगता प्रमाण पत्र (40%+)', 'आधार', 'आय प्रमाण पत्र'],
    applyAt: 'Social Welfare Dept / e-district portal', applyAtHi: 'समाज कल्याण विभाग / ई-जिला पोर्टल',
  },
  {
    id: 'sc_scholarship', name: 'SC/ST Scholarship Scheme', nameHi: 'SC/ST छात्रवृत्ति योजना',
    category: 'Education', categoryHi: 'शिक्षा',
    description: 'Annual scholarship for SC/ST students in Delhi schools/colleges.',
    descriptionHi: 'दिल्ली स्कूल/कॉलेज में SC/ST छात्रों को वार्षिक छात्रवृत्ति।',
    eligibility: { gender: ['male','female','other'], minAge: 5, maxAge: 30, incomeLimit: 200000, caste: ['SC','ST'], disability: false },
    documents: ['Caste Certificate', 'Income Certificate', 'Enrollment Proof', 'Aadhaar'],
    documentsHi: ['जाति प्रमाण पत्र', 'आय प्रमाण पत्र', 'नामांकन प्रमाण', 'आधार'],
    applyAt: 'e-district.delhigovt.nic.in', applyAtHi: 'e-district.delhigovt.nic.in',
  },
  {
    id: 'obc_scholarship', name: 'OBC Scholarship Scheme', nameHi: 'OBC छात्रवृत्ति योजना',
    category: 'Education', categoryHi: 'शिक्षा',
    description: 'Scholarship for OBC students in Delhi institutions.',
    descriptionHi: 'दिल्ली संस्थानों में OBC छात्रों को छात्रवृत्ति।',
    eligibility: { gender: ['male','female','other'], minAge: 5, maxAge: 30, incomeLimit: 150000, caste: ['OBC'], disability: false },
    documents: ['OBC Certificate', 'Income Certificate', 'Enrollment Proof', 'Aadhaar'],
    documentsHi: ['OBC प्रमाण पत्र', 'आय प्रमाण पत्र', 'नामांकन प्रमाण', 'आधार'],
    applyAt: 'e-district.delhigovt.nic.in', applyAtHi: 'e-district.delhigovt.nic.in',
  },
  {
    id: 'ladli', name: 'Ladli Scheme (Girl Child Education)', nameHi: 'लाड़ली योजना (बालिका शिक्षा)',
    category: 'Education', categoryHi: 'शिक्षा',
    description: 'Financial support for girl child in Delhi govt schools (Class 1–12).',
    descriptionHi: 'दिल्ली सरकारी स्कूल में बालिका शिक्षा के लिए वित्तीय सहायता।',
    eligibility: { gender: ['female'], minAge: 5, maxAge: 18, incomeLimit: 100000, caste: [], disability: false },
    documents: ['Birth Certificate', 'School Enrollment', 'Family Income Certificate'],
    documentsHi: ['जन्म प्रमाण पत्र', 'विद्यालय नामांकन', 'पारिवारिक आय प्रमाण पत्र'],
    applyAt: 'School Principal / WCD Dept', applyAtHi: 'विद्यालय प्राचार्य / महिला एवं बाल विकास विभाग',
  },
  {
    id: 'ayushman', name: 'Ayushman Bharat — Delhi', nameHi: 'आयुष्मान भारत — दिल्ली',
    category: 'Health', categoryHi: 'स्वास्थ्य',
    description: '₹5 lakh/year health insurance for economically weak families.',
    descriptionHi: 'आर्थिक रूप से कमजोर परिवारों के लिए ₹5 लाख/वर्ष स्वास्थ्य बीमा।',
    eligibility: { gender: ['male','female','other'], minAge: 0, maxAge: null, incomeLimit: 500000, caste: [], disability: false },
    documents: ['Aadhaar', 'Ration Card / SECC proof', 'Income Certificate'],
    documentsHi: ['आधार', 'राशन कार्ड / SECC प्रमाण', 'आय प्रमाण पत्र'],
    applyAt: 'pmjay.gov.in / empanelled hospitals', applyAtHi: 'pmjay.gov.in / सूचीबद्ध अस्पताल',
  },
  {
    id: 'mohalla_clinic', name: 'Mohalla Clinic — Free OPD', nameHi: 'मोहल्ला क्लिनिक — निःशुल्क OPD',
    category: 'Health', categoryHi: 'स्वास्थ्य',
    description: 'Free doctor consultation, medicines & tests. Open to ALL Delhi residents.',
    descriptionHi: 'निःशुल्क डॉक्टर परामर्श, दवाएं व जांच। सभी दिल्ली निवासियों के लिए।',
    eligibility: { gender: ['male','female','other'], minAge: 0, maxAge: null, incomeLimit: null, caste: [], disability: false },
    documents: ['Any ID proof (optional)'],
    documentsHi: ['कोई भी पहचान पत्र (वैकल्पिक)'],
    applyAt: 'Nearest Mohalla Clinic (walk-in)', applyAtHi: 'नजदीकी मोहल्ला क्लिनिक (सीधे जाएं)',
  },
  {
    id: 'pm_awas', name: 'PM Awas Yojana (Urban) — Delhi', nameHi: 'PM आवास योजना (शहरी) — दिल्ली',
    category: 'Housing', categoryHi: 'आवास',
    description: 'Subsidised housing loan for EWS/LIG/MIG urban poor (no pucca house).',
    descriptionHi: 'EWS/LIG/MIG शहरी गरीबों के लिए सब्सिडी वाला आवास ऋण।',
    eligibility: { gender: ['male','female','other'], minAge: 18, maxAge: null, incomeLimit: 600000, caste: [], disability: false },
    documents: ['Aadhaar', 'Income Certificate', 'Affidavit of no pucca house', 'Bank Account'],
    documentsHi: ['आधार', 'आय प्रमाण पत्र', 'पक्के मकान न होने का शपथ पत्र', 'बैंक खाता'],
    applyAt: 'pmaymis.gov.in / DDA offices', applyAtHi: 'pmaymis.gov.in / DDA कार्यालय',
  },
  {
    id: 'rozgar_bazaar', name: 'Rozgar Bazaar — Free Job Portal', nameHi: 'रोजगार बाज़ार — निःशुल्क जॉब पोर्टल',
    category: 'Employment', categoryHi: 'रोजगार',
    description: 'Free job portal for unemployed Delhi youth (18–45).',
    descriptionHi: 'बेरोजगार दिल्ली युवाओं के लिए निःशुल्क जॉब पोर्टल।',
    eligibility: { gender: ['male','female','other'], minAge: 18, maxAge: 45, incomeLimit: null, caste: [], disability: false },
    documents: ['Delhi Domicile', 'Resume / Educational Certificates'],
    documentsHi: ['दिल्ली अधिवास', 'रिज्यूमे / शैक्षणिक प्रमाण पत्र'],
    applyAt: 'jobs.delhi.gov.in', applyAtHi: 'jobs.delhi.gov.in',
  },
  {
    id: 'free_ration', name: 'PM Garib Kalyan Anna Yojana (Free Ration)', nameHi: 'PM गरीब कल्याण अन्न योजना',
    category: 'Food', categoryHi: 'खाद्य',
    description: '5 kg free grain/person/month for BPL/AAY ration card holders.',
    descriptionHi: 'BPL/AAY राशन कार्ड धारकों को 5 किलो निःशुल्क अनाज/व्यक्ति/माह।',
    eligibility: { gender: ['male','female','other'], minAge: 0, maxAge: null, incomeLimit: 100000, caste: [], disability: false, rationCard: true },
    documents: ['Ration Card', 'Aadhaar (linked)'],
    documentsHi: ['राशन कार्ड', 'आधार (राशन कार्ड से जुड़ा)'],
    applyAt: 'Nearest Fair Price Shop (PDS)', applyAtHi: 'नजदीकी उचित मूल्य की दुकान (PDS)',
  },
];

const INCOME_MAP  = { '1': 80000, '2': 150000, '3': 350000, '4': 700000 };
const GENDER_MAP  = { '1': 'male', '2': 'female', '3': 'other' };
const CASTE_MAP   = { '1': 'GENERAL', '2': 'SC', '3': 'ST', '4': 'OBC' };
const CAT_EMOJI   = { Financial: '💰', Education: '📚', Housing: '🏠', Health: '🏥', Employment: '💼', Food: '🌾' };

function checkEligibility(profile) {
  const eligible = [], partial = [];
  for (const s of DELHI_SCHEMES) {
    const e = s.eligibility;
    const fail = [];
    if (e.minAge  && profile.age < e.minAge)                         fail.push(`min age ${e.minAge}`);
    if (e.maxAge  && profile.age > e.maxAge)                         fail.push(`max age ${e.maxAge}`);
    if (!e.gender.includes(profile.gender))                          fail.push('gender');
    if (e.incomeLimit && profile.income > e.incomeLimit)             fail.push(`income ≤ ₹${(e.incomeLimit/100000).toFixed(1)}L`);
    if (e.caste?.length && !e.caste.includes(profile.caste))         fail.push(`caste: ${e.caste.join('/')}`);
    if (e.disability && !profile.disability)                         fail.push('disability cert needed');
    if (e.widow && !profile.widow)                                   fail.push('widow status');
    if (e.rationCard && !profile.rationCard)                         fail.push('BPL ration card');
    if (fail.length === 0)            eligible.push(s);
    else if (fail.length <= 2 && !fail.includes('gender')) partial.push({ scheme: s, reasons: fail });
  }
  return { eligible, partial };
}

// ── Translations ──────────────────────────────────────────────────────────────
const T = {
  en: {
    langSelect: { type: 'langSelect', text: 'Welcome to PS-CRM! Please select your language to continue.' },
    menu: { type: 'menu', text: 'How can I help you today? Please choose an option below.' },
    invalid: { type: 'text', text: 'Sorry, I didn\'t understand that. Please choose from the menu options below.' },
    cancel: { type: 'text', text: 'Conversation reset. How can I help you?' },

    // Complaint
    askTitle:    { type: 'input', text: 'Step 1/6 — Enter the **title** of your complaint.\n\n*Example: Broken street light near park*' },
    askDesc:     { type: 'input', text: 'Step 2/6 — Please describe your complaint in detail.\n\n*Example: The street light near main market has not been working for 2 weeks.*' },
    askWard:     { type: 'ward',  text: 'Step 3/6 — Select your **Ward** by clicking a letter below.' },
    askAddress:  { type: 'input', text: 'Step 4/6 — Enter your **address** or nearby landmark.\n\n*Example: Near Main Market, Sector 12*' },
    askName:     { type: 'input', text: 'Step 5/6 — Enter your **full name**.' },
    askEmail:    { type: 'input', text: 'Step 6/6 — Enter your **email address** to receive updates.' },
    confirmComplaint: (d) => ({ type: 'confirm', text: 'Please review your complaint before submitting.', data: d }),
    submitSuccess: (id, sla, cat, urg) => ({ type: 'success', text: `Your complaint has been registered successfully!`, data: { id, sla, category: cat, urgency: urg } }),
    submitFail:  { type: 'error', text: 'Failed to submit complaint. Please try again.' },
    invalidWard: { type: 'text', text: 'Please select a valid ward (A–Z) from the options.' },

    // Track
    askTrackId:  { type: 'input', text: 'Enter your **Complaint ID** to track its status.\n\n*Example: CMP-A3A073B2*' },
    notFound:    (id) => ({ type: 'error', text: `Complaint **${id}** was not found. Please check the ID and try again.` }),
    trackResult: (c) => ({ type: 'trackResult', data: c }),

    // My Complaints
    askEmailForComplaints: { type: 'input', text: 'Enter your **registered email address** to view your complaints.' },
    noComplaints: (e) => ({ type: 'error', text: `No complaints found for **${e}**.` }),
    myComplaintsList: (list) => ({ type: 'complaintList', data: list }),

    // Feedback
    askFeedbackId:    { type: 'input', text: 'Enter the **Complaint ID** of your resolved complaint to submit feedback.\n\n*Example: CMP-A3A073B2*' },
    notResolved:      { type: 'error', text: 'This complaint is not resolved yet. Feedback can only be given after resolution.' },
    alreadyFeedback:  { type: 'error', text: 'Feedback has already been submitted for this complaint.' },
    askFeedbackEmail: { type: 'input', text: 'Enter your **email address** to submit feedback.' },
    askRating:        { type: 'rating', text: 'How would you rate our service for this complaint?' },
    askComment:       { type: 'input', text: 'Add a comment about your experience (optional). Type SKIP to skip.' },
    feedbackSuccess:  { type: 'success', text: 'Thank you for your feedback! Your rating has been recorded.' },
    feedbackFail:     { type: 'error', text: 'Failed to submit feedback. Please try again.' },
    invalidRating:    { type: 'text', text: 'Please select a rating between 1 and 5.' },

    // Stats
    stats: (d) => ({ type: 'stats', data: d }),

    // Schemes
    schemeIntro:     { type: 'input', text: 'Let\'s check your eligibility for Delhi government schemes.\n\nStep 1/5 — What is your **age**?' },
    schemeAskGender: { type: 'schemeGender', text: 'Step 2/5 — What is your **gender**?' },
    schemeAskIncome: { type: 'schemeIncome', text: 'Step 3/5 — What is your approximate **annual household income**?' },
    schemeAskCaste:  { type: 'schemeCaste', text: 'Step 4/5 — What is your **social category**?' },
    schemeAskExtra:  { type: 'schemeExtra', text: 'Step 5/5 — Any additional details? Select all that apply.' },
    schemeResult:    (eligible, partial, lang) => ({ type: 'schemeResult', data: { eligible, partial }, lang }),
    schemeDetail:    (scheme, lang) => ({ type: 'schemeDetail', data: scheme, lang }),
    schemeInvalidAge:{ type: 'text', text: 'Please enter a valid age (1–120).' },
    schemeInvalidOpt:{ type: 'text', text: 'Please choose from the options provided.' },
  },
  hi: {
    langSelect: { type: 'langSelect', text: 'PS-CRM में आपका स्वागत है! जारी रखने के लिए भाषा चुनें।' },
    menu: { type: 'menu', text: 'आज मैं आपकी कैसे मदद कर सकता हूँ? नीचे विकल्प चुनें।' },
    invalid: { type: 'text', text: 'क्षमा करें, मैं समझ नहीं पाया। कृपया मेनू से कोई विकल्प चुनें।' },
    cancel: { type: 'text', text: 'बातचीत रीसेट हो गई। मैं कैसे मदद करूं?' },

    askTitle:    { type: 'input', text: 'चरण 1/6 — अपनी शिकायत का **शीर्षक** लिखें।\n\n*उदाहरण: पार्क के पास टूटी सड़क*' },
    askDesc:     { type: 'input', text: 'चरण 2/6 — अपनी शिकायत का **विस्तृत विवरण** लिखें।' },
    askWard:     { type: 'ward',  text: 'चरण 3/6 — अपना **वार्ड** चुनें।' },
    askAddress:  { type: 'input', text: 'चरण 4/6 — अपना **पता या नजदीकी लैंडमार्क** लिखें।' },
    askName:     { type: 'input', text: 'चरण 5/6 — अपना **पूरा नाम** लिखें।' },
    askEmail:    { type: 'input', text: 'चरण 6/6 — अपडेट पाने के लिए **ईमेल पता** लिखें।' },
    confirmComplaint: (d) => ({ type: 'confirm', text: 'सबमिट करने से पहले अपनी शिकायत की समीक्षा करें।', data: d }),
    submitSuccess: (id, sla, cat, urg) => ({ type: 'success', text: 'आपकी शिकायत सफलतापूर्वक दर्ज हो गई!', data: { id, sla, category: cat, urgency: urg } }),
    submitFail:  { type: 'error', text: 'शिकायत जमा नहीं हो सकी। कृपया पुनः प्रयास करें।' },
    invalidWard: { type: 'text', text: 'कृपया A से Z के बीच एक वैध वार्ड चुनें।' },

    askTrackId:  { type: 'input', text: 'स्थिति जानने के लिए अपनी **शिकायत ID** दर्ज करें।\n\n*उदाहरण: CMP-A3A073B2*' },
    notFound:    (id) => ({ type: 'error', text: `शिकायत **${id}** नहीं मिली। ID जांचकर पुनः प्रयास करें।` }),
    trackResult: (c) => ({ type: 'trackResult', data: c }),

    askEmailForComplaints: { type: 'input', text: 'अपनी शिकायतें देखने के लिए **पंजीकृत ईमेल** दर्ज करें।' },
    noComplaints: (e) => ({ type: 'error', text: `**${e}** के लिए कोई शिकायत नहीं मिली।` }),
    myComplaintsList: (list) => ({ type: 'complaintList', data: list }),

    askFeedbackId:    { type: 'input', text: 'फ़ीडबैक देने के लिए हल हुई शिकायत की **ID** दर्ज करें।' },
    notResolved:      { type: 'error', text: 'यह शिकायत अभी हल नहीं हुई। हल होने के बाद ही फ़ीडबैक दे सकते हैं।' },
    alreadyFeedback:  { type: 'error', text: 'इस शिकायत पर फ़ीडबैक पहले ही दिया जा चुका है।' },
    askFeedbackEmail: { type: 'input', text: 'फ़ीडबैक के लिए अपना **ईमेल** दर्ज करें।' },
    askRating:        { type: 'rating', text: 'इस शिकायत पर हमारी सेवा को रेट करें।' },
    askComment:       { type: 'input', text: 'अपना अनुभव लिखें (वैकल्पिक)। छोड़ने के लिए SKIP लिखें।' },
    feedbackSuccess:  { type: 'success', text: 'फ़ीडबैक के लिए धन्यवाद! आपकी रेटिंग दर्ज हो गई।' },
    feedbackFail:     { type: 'error', text: 'फ़ीडबैक जमा नहीं हो सका। कृपया पुनः प्रयास करें।' },
    invalidRating:    { type: 'text', text: 'कृपया 1 से 5 के बीच रेटिंग चुनें।' },

    stats: (d) => ({ type: 'stats', data: d }),

    schemeIntro:     { type: 'input', text: 'दिल्ली सरकारी योजनाओं में आपकी पात्रता जाँचते हैं।\n\nचरण 1/5 — आपकी **उम्र** क्या है?' },
    schemeAskGender: { type: 'schemeGender', text: 'चरण 2/5 — आपका **लिंग** क्या है?' },
    schemeAskIncome: { type: 'schemeIncome', text: 'चरण 3/5 — आपकी अनुमानित **वार्षिक घरेलू आय** क्या है?' },
    schemeAskCaste:  { type: 'schemeCaste', text: 'चरण 4/5 — आपकी **सामाजिक श्रेणी** क्या है?' },
    schemeAskExtra:  { type: 'schemeExtra', text: 'चरण 5/5 — अतिरिक्त जानकारी। लागू सभी विकल्प चुनें।' },
    schemeResult:    (eligible, partial, lang) => ({ type: 'schemeResult', data: { eligible, partial }, lang }),
    schemeDetail:    (scheme, lang) => ({ type: 'schemeDetail', data: scheme, lang }),
    schemeInvalidAge:{ type: 'text', text: 'कृपया वैध आयु (1–120) दर्ज करें।' },
    schemeInvalidOpt:{ type: 'text', text: 'कृपया दिए गए विकल्पों में से चुनें।' },
  },
};

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

// ── Main handler ─────────────────────────────────────────────────────────────
async function processMessage(sessionId, input, extra = {}) {
  const session = getSession(sessionId);
  const text    = (input || '').trim();
  const upper   = text.toUpperCase();

  // Global resets
  if (['MENU','BACK','START'].includes(upper) || extra.action === 'menu') {
    session.step = session.lang ? 'MENU' : 'LANG_SELECT';
    session.data = {};
    const tr = T[session.lang || 'en'];
    return session.lang ? tr.menu : tr.langSelect;
  }
  if (['RESET','RESTART','HI','HELLO'].includes(upper) || extra.action === 'reset') {
    resetSession(sessionId);
    return T.en.langSelect;
  }

  // ── Language select ────────────────────────────────────────────────────────
  if (session.step === 'LANG_SELECT') {
    if (text === '1' || extra.lang === 'en') { session.lang = 'en'; session.step = 'MENU'; return T.en.menu; }
    if (text === '2' || extra.lang === 'hi') { session.lang = 'hi'; session.step = 'MENU'; return T.hi.menu; }
    return T.en.langSelect;
  }

  const tr = T[session.lang || 'en'];
  const lang = session.lang || 'en';

  // ── Menu ──────────────────────────────────────────────────────────────────
  if (session.step === 'MENU') {
    const choice = extra.choice || text;
    if (choice === '1') { session.step = 'FILE_TITLE';  return tr.askTitle; }
    if (choice === '2') { session.step = 'TRACK_ID';    return tr.askTrackId; }
    if (choice === '3') { session.step = 'MY_EMAIL';    return tr.askEmailForComplaints; }
    if (choice === '4') { session.step = 'FEEDBACK_ID'; return tr.askFeedbackId; }
    if (choice === '5') {
      const total      = await Complaint.countDocuments();
      const resolved   = await Complaint.countDocuments({ status: 'Resolved' });
      const inProgress = await Complaint.countDocuments({ status: 'In Progress' });
      const pending    = await Complaint.countDocuments({ status: 'Pending' });
      const rate       = total > 0 ? Math.round((resolved / total) * 100) : 0;
      session.step = 'MENU';
      return tr.stats({ total, resolved, inProgress, pending, rate });
    }
    if (choice === '6') {
      session.step = 'SCHEME_AGE';
      session.data = { schemeProfile: {} };
      return tr.schemeIntro;
    }
    return tr.menu;
  }

  // ── File Complaint ────────────────────────────────────────────────────────
  if (session.step === 'FILE_TITLE')   { session.data.title = text; session.step = 'FILE_DESC'; return tr.askDesc; }
  if (session.step === 'FILE_DESC')    { session.data.description = text; session.step = 'FILE_WARD'; return tr.askWard; }
  if (session.step === 'FILE_WARD') {
    const ward = (extra.ward || upper).replace('WARD','').trim();
    if (ward.length !== 1 || !/^[A-Z]$/.test(ward)) return tr.invalidWard;
    session.data.ward = ward; session.step = 'FILE_ADDRESS'; return tr.askAddress;
  }
  if (session.step === 'FILE_ADDRESS') { session.data.address = text; session.step = 'FILE_NAME'; return tr.askName; }
  if (session.step === 'FILE_NAME')    { session.data.name = text; session.step = 'FILE_EMAIL'; return tr.askEmail; }
  if (session.step === 'FILE_EMAIL')   { session.data.email = text; session.step = 'FILE_CONFIRM'; return tr.confirmComplaint(session.data); }
  if (session.step === 'FILE_CONFIRM') {
    if (upper === 'YES' || extra.confirm === true) {
      try {
        const { setSLADeadline }            = require('../config/slaService');
        const { sendComplaintConfirmation } = require('../config/emailService');
        const { category, urgency }         = classifyComplaint(session.data.title, session.data.description);
        const deadline                      = setSLADeadline(urgency);
        const complaint = await Complaint.create({
          title: session.data.title, description: session.data.description,
          category, urgency,
          citizen:  { name: session.data.name, email: session.data.email, phone: '' },
          location: { address: session.data.address, ward: `Ward ${session.data.ward}` },
          sla:      { deadline, escalated: false, escalatedAt: null },
        });
        try { sendComplaintConfirmation(complaint); } catch(_) {}
        const id  = complaint.complaintNumber || `CMP-${complaint._id.toString().slice(-8).toUpperCase()}`;
        const sla = new Date(deadline).toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN');
        session.step = 'MENU'; session.data = {};
        return tr.submitSuccess(id, sla, category, urgency);
      } catch (err) {
        console.error('[Chatbot] Submit error:', err.message);
        session.step = 'MENU';
        return tr.submitFail;
      }
    }
    session.step = 'MENU'; session.data = {};
    return tr.menu;
  }

  // ── Track ─────────────────────────────────────────────────────────────────
  if (session.step === 'TRACK_ID') {
    const cmpId = upper.startsWith('CMP-') ? upper : `CMP-${upper}`;
    const c = await Complaint.findOne({ complaintNumber: cmpId }).lean();
    session.step = 'MENU';
    if (!c) return tr.notFound(cmpId);
    return tr.trackResult(c);
  }

  // ── My Complaints ─────────────────────────────────────────────────────────
  if (session.step === 'MY_EMAIL') {
    const list = await Complaint.find({ 'citizen.email': text.toLowerCase() }).sort({ createdAt: -1 }).lean();
    session.step = 'MENU';
    if (!list.length) return tr.noComplaints(text);
    return tr.myComplaintsList(list);
  }

  // ── Feedback ──────────────────────────────────────────────────────────────
  if (session.step === 'FEEDBACK_ID') {
    const cmpId = upper.startsWith('CMP-') ? upper : `CMP-${upper}`;
    const c = await Complaint.findOne({ complaintNumber: cmpId }).lean();
    if (!c) return tr.notFound(cmpId);
    if (c.status !== 'Resolved') return tr.notResolved;
    session.data.complaintId = c._id.toString();
    session.step = 'FEEDBACK_EMAIL';
    return tr.askFeedbackEmail;
  }
  if (session.step === 'FEEDBACK_EMAIL') {
    const existing = await Feedback.findOne({ complaint: session.data.complaintId, citizenEmail: text.toLowerCase() });
    if (existing) { session.step = 'MENU'; return tr.alreadyFeedback; }
    session.data.citizenEmail = text.toLowerCase();
    session.step = 'FEEDBACK_RATING';
    return tr.askRating;
  }
  if (session.step === 'FEEDBACK_RATING') {
    const rating = parseInt(extra.rating || text);
    if (isNaN(rating) || rating < 1 || rating > 5) return tr.invalidRating;
    session.data.rating = rating;
    session.step = 'FEEDBACK_COMMENT';
    return tr.askComment;
  }
  if (session.step === 'FEEDBACK_COMMENT') {
    const comment   = upper === 'SKIP' ? '' : text;
    const sentiment = session.data.rating >= 4 ? 'Positive' : session.data.rating === 3 ? 'Neutral' : 'Negative';
    try {
      await Feedback.create({ complaint: session.data.complaintId, citizenEmail: session.data.citizenEmail, citizenName: session.data.citizenEmail, rating: session.data.rating, comment, sentiment });
      session.step = 'MENU'; session.data = {};
      return tr.feedbackSuccess;
    } catch (err) {
      session.step = 'MENU';
      return tr.feedbackFail;
    }
  }

  // ── Delhi Scheme Checker ──────────────────────────────────────────────────
  if (session.step === 'SCHEME_AGE') {
    const age = parseInt(text);
    if (isNaN(age) || age < 1 || age > 120) return tr.schemeInvalidAge;
    session.data.schemeProfile.age = age;
    session.data.schemeProfile.residency = 'delhi';
    session.step = 'SCHEME_GENDER';
    return tr.schemeAskGender;
  }
  if (session.step === 'SCHEME_GENDER') {
    const gender = GENDER_MAP[extra.choice || text];
    if (!gender) return tr.schemeInvalidOpt;
    session.data.schemeProfile.gender = gender;
    session.step = 'SCHEME_INCOME';
    return tr.schemeAskIncome;
  }
  if (session.step === 'SCHEME_INCOME') {
    const income = INCOME_MAP[extra.choice || text];
    if (income === undefined) return tr.schemeInvalidOpt;
    session.data.schemeProfile.income = income;
    session.step = 'SCHEME_CASTE';
    return tr.schemeAskCaste;
  }
  if (session.step === 'SCHEME_CASTE') {
    const caste = CASTE_MAP[extra.choice || text];
    if (!caste) return tr.schemeInvalidOpt;
    session.data.schemeProfile.caste = caste;
    session.step = 'SCHEME_EXTRA';
    return tr.schemeAskExtra;
  }
  if (session.step === 'SCHEME_EXTRA') {
    const chosen = extra.choices || text.split(/\s+/);
    const s = new Set(chosen.map(x => String(x).trim()));
    session.data.schemeProfile.disability = s.has('1');
    session.data.schemeProfile.widow      = s.has('2');
    session.data.schemeProfile.rationCard = s.has('3');
    const { eligible, partial } = checkEligibility(session.data.schemeProfile);
    session.data.schemeResults = eligible;
    session.step = 'SCHEME_RESULT';
    return tr.schemeResult(eligible, partial, lang);
  }
  if (session.step === 'SCHEME_RESULT') {
    const idx = parseInt(extra.schemeIdx !== undefined ? extra.schemeIdx : text) - 1;
    if (!isNaN(idx) && idx >= 0 && session.data.schemeResults?.[idx]) {
      return tr.schemeDetail(session.data.schemeResults[idx], lang);
    }
    session.step = 'MENU'; session.data = {};
    return tr.menu;
  }

  return tr.invalid;
}

// ── Express handler ───────────────────────────────────────────────────────────
exports.chat = async (req, res) => {
  try {
    const { message, sessionId, extra } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'sessionId required' });
    const response = await processMessage(sessionId, message || '', extra || {});
    res.json({ response });
  } catch (err) {
    console.error('[Chatbot Controller]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.resetChat = (req, res) => {
  const { sessionId } = req.body;
  if (sessionId) resetSession(sessionId);
  res.json({ ok: true });
};