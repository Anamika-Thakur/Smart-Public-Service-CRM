import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLang, tx } from '../../context/LanguageContext';
import API from '../../api';

const UGC = { High: '#E65100', Medium: '#1565C0', Low: '#1B7A3E' };

const CATEGORY_MAP = {
  'Sanitation':      { dept: 'Sanitation & Solid Waste Management', icon: '🗑️' },
  'Roads':           { dept: 'Roads & Infrastructure',              icon: '🚧' },
  'Water':           { dept: 'Water Supply & Drainage',             icon: '🚰' },
  'Electricity':     { dept: 'Street Lighting',                     icon: '💡' },
  'Health':          { dept: 'Health Services',                     icon: '🏥' },
  'Education':       { dept: 'Education (MCD Schools)',             icon: '🎓' },
  'Infrastructure':  { dept: 'Building & Planning',                 icon: '🏗️' },
  'Environment':     { dept: 'Parks & Horticulture',                icon: '🌿' },
  'Finance':         { dept: 'Property Tax',                        icon: '💰' },
  'Administration':  { dept: 'Birth & Death Registration',          icon: '📄' },
  'Food Safety':     { dept: 'Food Safety & Slaughterhouse',        icon: '🍽️' },
  'Safety':          { dept: 'Fire Services',                       icon: '🚒' },
  'Animal Welfare':  { dept: 'Veterinary Services',                 icon: '🐾' },
  'Encroachment':    { dept: 'Encroachment Removal',                icon: '🚫' },
  'Signage':         { dept: 'Advertisement & Signage',             icon: '📢' },
  'Other':           { dept: 'Other',                               icon: '📋' },
};

const ALL_CATEGORIES = Object.keys(CATEGORY_MAP);

const WARD_ZONE_MAP = {
  // Central Zone
  'Chandni Chowk': 'Central Zone',
  'Chandani Mahal': 'Central Zone',
  'Delhi Gate': 'Central Zone',
  'Bazar Sita Ram': 'Central Zone',
  'Ballimaran': 'Central Zone',
  'Ram Nagar': 'Central Zone',
  'Quraish Nagar': 'Central Zone',
  'Pahar Ganj': 'Central Zone',
  'Karol Bagh': 'Central Zone',
  'Dev Nagar': 'Central Zone',
  'West Patel Nagar': 'Central Zone',
  'East Patel Nagar': 'Central Zone',
  'Ranjeet Nagar': 'Central Zone',
  'Baljeet Nagar': 'Central Zone',
  'Karam Pura': 'Central Zone',
  'Moti Nagar': 'Central Zone',
  'Ramesh Nagar': 'Central Zone',
  'Punjabi Bagh': 'Central Zone',
  'Civil Lines': 'Central Zone',
  'Jama Masjid': 'Central Zone',
  'Sadar Bazar': 'Central Zone',
  'Model Town': 'Central Zone',
  'Kamla Nagar': 'Central Zone',
  'Shastri Nagar': 'Central Zone',
  'Kishan Ganj': 'Central Zone',
  'Daryaganj': 'Central Zone',
  'Sidhartha Nagar': 'Central Zone',
  'Lajpat Nagar': 'Central Zone',
  'Andrews Ganj': 'Central Zone',
  'Amar Colony': 'Central Zone',
  'Kotla Mubarakpur': 'Central Zone',
  'Hauz Khas': 'Central Zone',
  'Malviya Nagar': 'Central Zone',
  'Green Park': 'Central Zone',
  'Munirka': 'Central Zone',
  'R.K Puram': 'Central Zone',
  'Vasant Vihar': 'Central Zone',
  'Lado Sarai': 'Central Zone',
  'Mehrauli': 'Central Zone',
  'Vasant Kunj': 'Central Zone',
  'Aya Nagar': 'Central Zone',
  'Bhati': 'Central Zone',
  'Chhatarpur': 'Central Zone',
  'Said-Ul-Ajaib': 'Central Zone',
  'Deoli': 'Central Zone',
  'Tigri': 'Central Zone',
  'Sangam Vihar-A': 'Central Zone',
  'Dakshin Puri': 'Central Zone',
  'Madangir': 'Central Zone',
  'Pushp Vihar': 'Central Zone',
  'Khanpur': 'Central Zone',
  'Sangam Vihar-C': 'Central Zone',
  'Sangam Vihar-B': 'Central Zone',
  'Tughlakabad Extension': 'Central Zone',
  'Chitaranjan Park': 'Central Zone',
  'Chirag Delhi': 'Central Zone',
  'Greater Kailash': 'Central Zone',
  'Sri Niwas Puri': 'Central Zone',
  'Kalkaji': 'Central Zone',
  'Govind Puri': 'Central Zone',
  'Harkesh Nagar': 'Central Zone',
  'Tughlakabad': 'Central Zone',
  'Pul Pehladpur': 'Central Zone',
  'Badarpur': 'Central Zone',
  'Molarband': 'Central Zone',
  'Meethapur': 'Central Zone',
  'Hari Nagar Extension': 'Central Zone',
  'Jaitpur': 'Central Zone',
  'Madanpur Khadar East': 'Central Zone',
  'Madanpur Khadar West': 'Central Zone',
  'Sarita Vihar': 'Central Zone',
  'Abul Fazal Enclave': 'Central Zone',
  'Zakir Nagar': 'Central Zone',
  'New Ashok Nagar': 'Central Zone',
  'Mayur Vihar Phase-I': 'Central Zone',
  'Trilokpuri': 'Central Zone',
  'Kondli': 'Central Zone',
  'Gharoli': 'Central Zone',
  'Kalyanpuri': 'Central Zone',
  'Mayur Vihar Phase-II': 'Central Zone',
  'Patpar Ganj': 'Central Zone',
  'Vinod Nagar': 'Central Zone',
  'Mandawali': 'Central Zone',
  'Pandav Nagar': 'Central Zone',
  'Lalita Park': 'Central Zone',
  'Shakarpur': 'Central Zone',
  'Laxmi Nagar': 'Central Zone',
  'Preet Vihar': 'Central Zone',
  'I.P Extension': 'Central Zone',
  'Anand Vihar': 'Central Zone',
  'Vishwas Nagar': 'Central Zone',
  'Anarkali': 'Central Zone',
  'Jagat Puri': 'Central Zone',
  'Geeta Colony': 'Central Zone',
  'Krishna Nagar': 'Central Zone',
  'Gandhi Nagar': 'Central Zone',
  'Shastri Park': 'Central Zone',
  'Azad Nagar': 'Central Zone',
  'Shahdara': 'Central Zone',
  'Jhilmil': 'Central Zone',
  'Dilshad Colony': 'Central Zone',
  'Sundar Nagri': 'Central Zone',
  'Dilshad Garden': 'Central Zone',
  'Nand Nagri': 'Central Zone',
  'Ashok Nagar': 'Central Zone',
  'Ram Nagar East': 'Central Zone',
  'Rohtash Nagar': 'Central Zone',
  'Welcome Colony': 'Central Zone',
  'Seelampur': 'Central Zone',
  'Gautam Puri': 'Central Zone',
  'Chauhan Banger': 'Central Zone',
  'Maujpur': 'Central Zone',
  'Braham Puri': 'Central Zone',
  'Bhajanpura': 'Central Zone',
  'Ghonda': 'Central Zone',
  'Yamuna Vihar': 'Central Zone',
  'Subash Mohalla': 'Central Zone',
  'Kabir Nagar': 'Central Zone',
  'Gorakh Park': 'Central Zone',
  'Kardam Puri': 'Central Zone',
  'Harsh Vihar': 'Central Zone',
  'Saboli': 'Central Zone',
  'Gokal Puri': 'Central Zone',
  'Joharipur': 'Central Zone',
  'Karawal Nagar-East': 'Central Zone',
  'Dayalpur': 'Central Zone',
  'Mustafabad': 'Central Zone',
  'Nehru Vihar': 'Central Zone',
  'Brij Puri': 'Central Zone',
  'Sri Ram Colony': 'Central Zone',
  'Sadatpur': 'Central Zone',
  'Karawal Nagar-West': 'Central Zone',
  'Sonia Vihar': 'Central Zone',
  'Sabapur': 'Central Zone',

  // North Zone
  'Narela': 'North Zone',
  'Bankner': 'North Zone',
  'Holambi Kalan': 'North Zone',
  'Alipur': 'North Zone',
  'Bakhtawarpur': 'North Zone',
  'Burari': 'North Zone',
  'Kadipur': 'North Zone',
  'Mukundpur': 'North Zone',
  'Sant Nagar': 'North Zone',
  'Jharoda': 'North Zone',
  'Timarpur': 'North Zone',
  'Malka Ganj': 'North Zone',
  'Mukherjee Nagar': 'North Zone',
  'Dhirpur': 'North Zone',
  'Adarsh Nagar': 'North Zone',
  'Azadpur': 'North Zone',
  'Bhalswa': 'North Zone',
  'Jahangir Puri': 'North Zone',
  'Sarup Nagar': 'North Zone',
  'Samaypur Badli': 'North Zone',

  // North West Zone
  'Rohini-A': 'North West Zone',
  'Rohini-B': 'North West Zone',
  'Rithala': 'North West Zone',
  'Vijay Vihar': 'North West Zone',
  'Budh Vihar': 'North West Zone',
  'Pooth Kalan': 'North West Zone',
  'Begumpur': 'North West Zone',
  'Shahbaad Dairy': 'North West Zone',
  'Pooth Khurd': 'North West Zone',
  'Bawana': 'North West Zone',
  'Nangal Thakran': 'North West Zone',
  'Kanjhawala': 'North West Zone',
  'Rani Khera': 'North West Zone',
  'Nangloi': 'North West Zone',
  'Nilothi': 'North West Zone',
  'Kirari': 'North West Zone',
  'Prem Nagar': 'North West Zone',
  'Nithari': 'North West Zone',
  'Aman Vihar': 'North West Zone',
  'Mangol Puri': 'North West Zone',
  'Sultanpuri-A': 'North West Zone',
  'Sultanpuri-B': 'North West Zone',
  'Jawalapuri': 'North West Zone',
  'Nangloi Jat': 'North West Zone',
  'Nihal Vihar': 'North West Zone',
  'Guru Harkishan Nagar': 'North West Zone',
  'Mangolpuri-A': 'North West Zone',
  'Mangolpuri-B': 'North West Zone',
  'Rohini-C': 'North West Zone',
  'Rohini-F': 'North West Zone',
  'Rohini-E': 'North West Zone',
  'Rohini-D': 'North West Zone',
  'Shalimar Bagh-A': 'North West Zone',
  'Shalimar Bagh-B': 'North West Zone',
  'Pitam Pura': 'North West Zone',
  'Saraswati Vihar': 'North West Zone',
  'Paschim Vihar': 'North West Zone',
  'Rani Bagh': 'North West Zone',
  'Kohat Enclave': 'North West Zone',
  'Shakur Pur': 'North West Zone',
  'Tri Nagar': 'North West Zone',
  'Keshav Puram': 'North West Zone',
  'Ashok Vihar': 'North West Zone',
  'Wazir Pur': 'North West Zone',
  'Sangam Park': 'North West Zone',

  // West Zone
  'Madipur': 'West Zone',
  'Raghubir Nagar': 'West Zone',
  'Vishnu Garden': 'West Zone',
  'Rajouri Garden': 'West Zone',
  'Chaukhandi Nagar': 'West Zone',
  'Subhash Nagar': 'West Zone',
  'Hari Nagar': 'West Zone',
  'Fateh Nagar': 'West Zone',
  'Tilak Nagar': 'West Zone',
  'Khyala': 'West Zone',
  'Keshopur': 'West Zone',
  'Janak Puri South': 'West Zone',
  'Mahaveer Enclave': 'West Zone',
  'Janak Puri West': 'West Zone',
  'Vikas Puri': 'West Zone',
  'Hastsal': 'West Zone',
  'Shiv Vihar': 'West Zone',
  'Bhakkar Wala': 'West Zone',
  'Baprola': 'West Zone',
  'Vikas Nagar': 'West Zone',
  'Mohan Garden-West': 'West Zone',
  'Mohan Garden-East': 'West Zone',
  'Uttam Nagar': 'West Zone',
  'Binda Pur': 'West Zone',
  'Dabri': 'West Zone',
  'Sagarpur': 'West Zone',
  'Manglapuri': 'West Zone',

  // South West Zone
  'Dwarka-B': 'South West Zone',
  'Dwarka-A': 'South West Zone',
  'Matiala': 'South West Zone',
  'Kakrola': 'South West Zone',
  'Nangli Sakrawati': 'South West Zone',
  'Chhawala': 'South West Zone',
  'Isapur': 'South West Zone',
  'Najafgarh': 'South West Zone',
  'Dichaon Kalan': 'South West Zone',
  'Roshan Pura': 'South West Zone',
  'Dwarka-C': 'South West Zone',
  'Bijwasan': 'South West Zone',
  'Kapashera': 'South West Zone',
  'Mahipalpur': 'South West Zone',
  'Raj Nagar': 'South West Zone',
  'Palam': 'South West Zone',
  'Madhu Vihar': 'South West Zone',
  'Mahavir Enclave': 'South West Zone',
  'Sadh Nagar': 'South West Zone',
  'Naraina': 'South West Zone',
  'Inder Puri': 'South West Zone',
  'Rajinder Nagar': 'South West Zone',

  // New Delhi Zone
  'Inder Puri': 'New Delhi Zone',
  'Rajinder Nagar': 'New Delhi Zone'
};
const WARDS = Object.keys(WARD_ZONE_MAP);

// ── useVoice hook (Mayur's feature) ─────────────────────────────────────────
function useVoice(lang, onResult) {
  const [listening, setListening] = useState(false);
  const recRef = useRef(null);

  const start = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert('Voice input not supported. Please use Chrome or Edge.'); return; }
    const r = new SR();
    r.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';
    r.continuous     = false;
    r.interimResults = false;
    r.onstart  = () => setListening(true);
    r.onend    = () => setListening(false);
    r.onerror  = () => setListening(false);
    r.onresult = (e) => { onResult(e.results[0][0].transcript); };
    recRef.current = r;
    r.start();
  }, [lang, onResult]);

  const stop = useCallback(() => {
    recRef.current?.stop();
    setListening(false);
  }, []);

  return { listening, start, stop };
}

// ── VoiceInput — input/textarea with mic inside at bottom-right ──────────────
function VoiceInput({ value, onChange, placeholder, lang, multiline = false, style = {} }) {
  const { listening, start, stop } = useVoice(lang, (text) => {
    onChange(value ? value + ' ' + text : text);
  });

  const inputStyle = {
    width: '100%',
    padding: multiline ? '10px 13px 40px 13px' : '10px 44px 10px 13px',
    border: `1.5px solid ${listening ? '#DC2626' : '#D8E2F0'}`,
    borderRadius: 8, fontSize: 14,
    fontFamily: "'DM Sans', sans-serif",
    outline: 'none',
    background: listening ? '#FFF5F5' : '#fff',
    boxSizing: 'border-box',
    transition: 'all 0.2s',
    ...style,
  };

  const micStyle = {
    position: 'absolute',
    right: 10, bottom: 10,
    width: 28, height: 28,
    border: listening ? '1.5px solid #DC2626' : '1.5px solid #D8E2F0',
    borderRadius: '50%',
    background: listening ? '#DC2626' : '#F8FAFC',
    cursor: 'pointer', fontSize: 13,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    animation: listening ? 'micpulse 1s infinite' : 'none',
    transition: 'all 0.2s',
    zIndex: 2,
  };

  return (
    <div style={{ position: 'relative' }}>
      {multiline
        ? <textarea value={value} onChange={e => onChange(e.target.value)}
            placeholder={listening ? (lang === 'hi' ? '🎤 बोलें...' : '🎤 Speak now...') : placeholder}
            style={{ ...inputStyle, resize: 'vertical', minHeight: 120 }} />
        : <input value={value} onChange={e => onChange(e.target.value)}
            placeholder={listening ? (lang === 'hi' ? '🎤 बोलें...' : '🎤 Speak now...') : placeholder}
            style={inputStyle} />
      }
      <button type="button" onClick={listening ? stop : start} style={micStyle} title={listening ? 'Stop' : 'Click to speak'}>
        {listening ? '⏹' : '🎤'}
      </button>
    </div>
  );
}

export default function SubmitComplaint() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { lang } = useLang();
  const fileInputRef = useRef();
  const debounceRef  = useRef(null);

  const [form, setForm] = useState({
    title: '', description: '', category: 'Other', urgency: 'Low',
    citizen: { name: user?.name || '', email: user?.email || '', phone: '' },
    location: { line1: '', line2: '', ward: '', zone: '' },
  });
  const [images, setImages]       = useState([]);
  const [aiResult, setAiResult]   = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [success, setSuccess]     = useState(null);
  const [error, setError]         = useState('');
  const [dragOver, setDragOver]   = useState(false);

  const autoClassify = async (title, description) => {
    const text = `${title} ${description}`.trim();
    if (text.length < 15) { setAiResult(null); return; }
    setAiLoading(true);
    try {
      const res = await API.post('/complaints/classify', { title, description });
      const { category, urgency, department, reason } = res.data.data;
      setAiResult({ category, urgency, dept: department, reason });
      setForm(f => ({ ...f, category, urgency }));
    } catch (err) {
      console.error('AI classification failed:', err);
      setAiResult(null);
    }
    setAiLoading(false);
  };

  useEffect(() => {
    clearTimeout(debounceRef.current);
    const text = `${form.title} ${form.description}`.trim();
    if (text.length < 15) { setAiResult(null); return; }
    debounceRef.current = setTimeout(() => autoClassify(form.title, form.description), 800);
    return () => clearTimeout(debounceRef.current);
  }, [form.title, form.description]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFiles = (files) => {
    const allowed = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (images.length + allowed.length > 3) {
      setError(lang === 'hi' ? 'अधिकतम 3 फ़ोटो की अनुमति है' : 'Maximum 3 images allowed');
      return;
    }
    allowed.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => setImages(prev => [...prev, { data: e.target.result, name: file.name, type: file.type, size: file.size }]);
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (idx) => setImages(prev => prev.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      setError(lang === 'hi' ? 'शीर्षक और विवरण आवश्यक हैं।' : 'Title and description are required.');
      return;
    }
    if (!form.citizen.name.trim() || !form.citizen.email.trim()) {
      setError(lang === 'hi' ? 'आपका नाम और ईमेल आवश्यक हैं।' : 'Your name and email are required.');
      return;
    }
    if (!form.location.line1.trim()) {
      setError(lang === 'hi' ? 'लाइन 1 अनिवार्य है।' : 'Line 1 is required.');
      return;
    }
    if (!form.location.ward.trim()) {
      setError(lang === 'hi' ? 'कृपया वार्ड चुनें।' : 'Please select your Ward.');
      return;
    }
    if (!form.location.zone.trim()) {
      setError(lang === 'hi' ? 'कृपया जोन स्वचालित रूप से सेट किया गया है।' : 'Zone should be auto-selected based on ward.');
      return;
    }
    setLoading(true); setError('');
    try {
      const res = await API.post('/complaints', {
        ...form,
        images: images.map(img => ({ data: img.data, name: img.name, type: img.type })),
      });
      setSuccess(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || (lang === 'hi' ? 'शिकायत जमा नहीं हो सकी' : 'Failed to submit complaint'));
    }
    setLoading(false);
  };

  // ── Success Screen (Aparna's description + email in URL + Mayur's layout) ──
  if (success) {
    return (
      <div style={styles.page}>
        <Header navigate={navigate} lang={lang} />
        <div style={styles.successWrap}>
          <div style={styles.successCard}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
            <h2 style={styles.successTitle}>{tx('Complaint Submitted Successfully!', lang)}</h2>
            <p style={styles.successSub}>{tx('Your complaint has been registered and assigned for review.', lang)}</p>
            <div style={styles.successInfo}>
              {[
                { k: tx('Complaint ID', lang),    v: success.complaintNumber || `CMP-${success._id?.slice(-8).toUpperCase()}` },
                { k: tx('Title', lang),           v: success.title },
                { k: tx('Description', lang),     v: form.description?.substring(0, 100) || 'N/A', wrap: true },
                { k: tx('Category', lang),        v: success.category },
                { k: tx('Department', lang),      v: CATEGORY_MAP[success.category]?.dept || 'Other' },
                { k: tx('Urgency', lang),         v: tx(success.urgency, lang) },
                { k: tx('Ward', lang),            v: success.location?.ward || 'N/A' },
                { k: tx('Status', lang),          v: tx('Pending Review', lang), highlight: true },
                { k: tx('Evidence Images', lang), v: lang === 'hi'
                    ? `${images.length} फ़ोटो अपलोड की गई`
                    : `${images.length} image${images.length !== 1 ? 's' : ''} uploaded` },
                { k: tx('SLA Deadline', lang),    v: new Date(success.sla?.deadline).toLocaleString(lang === 'hi' ? 'hi-IN' : 'en-IN') },
              ].map((r, i) => (
                <div key={i} style={{
                  display: 'flex',
                  flexDirection: r.wrap ? 'column' : 'row',
                  justifyContent: 'space-between',
                  marginBottom: 12, paddingBottom: 12,
                  borderBottom: '1px solid #E8EEF8',
                }}>
                  <span style={styles.successKey}>{r.k}</span>
                  <span style={{ ...styles.successVal, ...(r.highlight ? { color: '#1B7A3E', fontWeight: 700 } : {}), marginTop: r.wrap ? 4 : 0 }}>
                    {r.v}
                  </span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24 }}>
              {/* Aparna's email in URL + Mayur's track button */}
              <button style={styles.btnPrimary} onClick={() => navigate(`/citizen/track?id=${success.complaintNumber}&email=${encodeURIComponent(form.citizen.email)}`)}>
                {tx('🔍 Track Complaint', lang)}
              </button>
              <button style={styles.btnOutline} onClick={() => {
                setSuccess(null); setImages([]); setAiResult(null);
                setForm({ title: '', description: '', category: 'Other', urgency: 'Low',
                  citizen: { name: user?.name || '', email: user?.email || '', phone: '' },
                  location: { address: '', ward: '' } });
              }}>{tx('➕ Submit Another', lang)}</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Main Form ────────────────────────────────────────────────────────────
  return (
    <div style={styles.page}>
      <style>{`
        @keyframes micpulse {
          0%   { box-shadow: 0 0 0 0 rgba(220,38,38,0.5); }
          70%  { box-shadow: 0 0 0 8px rgba(220,38,38,0); }
          100% { box-shadow: 0 0 0 0 rgba(220,38,38,0); }
        }
      `}</style>

      <Header navigate={navigate} lang={lang} />
      <div style={styles.container}>
        <div style={styles.pageHead}>
          <h1 style={styles.pageTitle}>{tx('📝 File a Complaint', lang)}</h1>
          <p style={styles.pageSub}>{tx('Describe your issue — AI will automatically detect the category and urgency', lang)}</p>
        </div>

        <div style={styles.grid}>
          <div>
            <div style={styles.card}>
              <div style={styles.cardTitle}>{tx('📋 Complaint Details', lang)}</div>
              {error && <div style={styles.error}>{error}</div>}

              {/* Title — with voice (Mayur) */}
              <div style={styles.formGroup}>
                <label style={styles.label}>{tx('Complaint Title *', lang)}</label>
                <VoiceInput
                  lang={lang}
                  value={form.title}
                  onChange={(val) => setForm(f => ({ ...f, title: val }))}
                  placeholder={tx('Brief title of your complaint', lang)}
                />
              </div>

              {/* Description — with voice (Mayur) */}
              <div style={styles.formGroup}>
                <label style={styles.label}>{tx('Complaint Description *', lang)}</label>
                <VoiceInput
                  lang={lang}
                  multiline
                  value={form.description}
                  onChange={(val) => setForm(f => ({ ...f, description: val }))}
                  placeholder={tx('Describe your issue in detail — AI will auto-detect category and urgency...', lang)}
                />
              </div>

              {/* AI Result Box */}
              {aiLoading && (
                <div style={{ ...styles.aiBox, opacity: 0.7 }}>
                  <div style={styles.aiTitle}>{tx('🧠 AI Analyzing...', lang)}</div>
                  <div style={{ fontSize: 13, color: '#6B7FA3' }}>{tx('Detecting category and urgency...', lang)}</div>
                </div>
              )}
              {!aiLoading && aiResult && (
                <div style={styles.aiBox}>
                  <div style={styles.aiTitle}>{tx('🧠 AI Auto-Classification', lang)}</div>
                  <div style={styles.aiGrid}>
                    <div style={styles.aiItem}>
                      <span style={styles.aiKey}>{tx('Category', lang)}</span>
                      <span style={styles.aiVal}>{CATEGORY_MAP[aiResult.category]?.icon} {aiResult.category}</span>
                    </div>
                    <div style={styles.aiItem}>
                      <span style={styles.aiKey}>{tx('Department', lang)}</span>
                      <span style={{ ...styles.aiVal, color: '#1565C0', fontSize: 12 }}>{aiResult.dept}</span>
                    </div>
                    <div style={styles.aiItem}>
                      <span style={styles.aiKey}>{tx('Urgency', lang)}</span>
                      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                        background: `${UGC[aiResult.urgency]}18`, color: UGC[aiResult.urgency] }}>
                        {tx(aiResult.urgency, lang)}
                      </span>
                    </div>
                  </div>
                  {aiResult.reason && (
                    <div style={{ marginTop: 10, fontSize: 12, color: '#6B7FA3', fontStyle: 'italic' }}>💬 {aiResult.reason}</div>
                  )}
                  <div style={{ marginTop: 10, fontSize: 11, color: '#9EB3CC' }}>
                    {lang === 'hi' ? '✅ श्रेणी और जरूरी स्तर नीचे स्वतः भरे गए हैं।' : '✅ Category and urgency auto-filled below. You can still adjust manually.'}
                  </div>
                </div>
              )}

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>{aiResult ? tx('Category (AI detected ✨)', lang) : `${tx('Category', lang)} *`}</label>
                  <select style={{ ...styles.input, borderColor: aiResult ? '#16A34A' : '#D8E2F0' }}
                    value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                    {ALL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>{aiResult ? tx('Urgency (AI detected ✨)', lang) : `${tx('Urgency', lang)} *`}</label>
                  <select style={{ ...styles.input, borderColor: aiResult ? '#16A34A' : '#D8E2F0' }}
                    value={form.urgency} onChange={e => setForm(f => ({ ...f, urgency: e.target.value }))}>
                    {['Low', 'Medium', 'High'].map(u => <option key={u} value={u}>{tx(u, lang)}</option>)}
                  </select>
                </div>
              </div>
              {form.category && CATEGORY_MAP[form.category] && (
                <div style={{ background: '#EEF2FF', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#0F2557', marginTop: -8, marginBottom: 8 }}>
                  🏢 <strong>{tx('Department', lang)}:</strong> {CATEGORY_MAP[form.category].dept}
                </div>
              )}
            </div>

            {/* Photo Evidence */}
            <div style={{ ...styles.card, marginTop: 16 }}>
              <div style={styles.cardTitle}>
                {tx('📸 Photo Evidence', lang)}{' '}
                <span style={{ fontSize: 12, color: '#6B7FA3', fontWeight: 400 }}>{tx('(Optional — max 3 images)', lang)}</span>
              </div>
              <div style={{ ...styles.dropZone, ...(dragOver ? styles.dropZoneActive : {}) }}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
                onClick={() => images.length < 3 && fileInputRef.current.click()}>
                <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />
                <div style={{ fontSize: 40, marginBottom: 10 }}>📷</div>
                <div style={styles.dropText}>{dragOver ? tx('Drop images here!', lang) : tx('Click or drag & drop images here', lang)}</div>
                <div style={styles.dropSub}>{tx('JPG, PNG, WEBP · Max 3 images · 5MB each', lang)}</div>
              </div>
              {images.length > 0 && (
                <div style={styles.previewGrid}>
                  {images.map((img, i) => (
                    <div key={i} style={styles.previewCard}>
                      <img src={img.data} alt={img.name} style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 8 }} />
                      <div style={styles.previewInfo}>
                        <span style={styles.previewName}>{img.name.slice(0, 20)}{img.name.length > 20 ? '...' : ''}</span>
                        <span style={styles.previewSize}>{(img.size / 1024).toFixed(0)} KB</span>
                      </div>
                      <button style={styles.removeBtn} onClick={() => removeImage(i)}>{lang === 'hi' ? '✕ हटाएं' : '✕ Remove'}</button>
                    </div>
                  ))}
                  {images.length < 3 && (
                    <div style={styles.addMoreCard} onClick={() => fileInputRef.current.click()}>
                      <div style={{ fontSize: 32, color: '#C4D4EC' }}>➕</div>
                      <div style={{ fontSize: 12, color: '#9EB3CC', marginTop: 6 }}>{tx('Add more', lang)}</div>
                    </div>
                  )}
                </div>
              )}
              {images.length > 0 && (
                <div style={styles.evidenceTip}>
                  {lang === 'hi'
                    ? `✅ ${images.length} फ़ोटो संलग्न · साक्ष्य अधिकारियों को शिकायत जल्दी हल करने में मदद करता है`
                    : `✅ ${images.length} image${images.length > 1 ? 's' : ''} attached · Evidence helps officers resolve complaints faster`}
                </div>
              )}
            </div>

            {/* Location — Line1/Line2/Ward/Zone */}
            <div style={{ ...styles.card, marginTop: 16 }}>
              <div style={styles.cardTitle}>{tx('📍 Location Details', lang)}</div>

              <div style={{ marginBottom: 16, fontWeight: 'bold', color: '#0F2557' }}>
                {tx('Address', lang)}
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>{tx('Line 1 *', lang)}</label>
                  <input style={styles.input} value={form.location.line1}
                    onChange={e => setForm(f => ({ ...f, location: { ...f.location, line1: e.target.value } }))}
                    placeholder={tx('Building/House No. and Street', lang)} />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>{tx('Line 2', lang)}</label>
                  <input style={styles.input} value={form.location.line2}
                    onChange={e => setForm(f => ({ ...f, location: { ...f.location, line2: e.target.value } }))}
                    placeholder={tx('Area / Landmark / Sector', lang)} />
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    {tx('Ward', lang)} * <span style={{ fontSize: 11, color: '#E8620A', fontWeight: 400 }}>({lang === 'hi' ? 'अनिवार्य' : 'required'})</span>
                  </label>
                  <select style={{ ...styles.input, borderColor: form.location.ward ? '#16A34A' : '#E8620A', color: form.location.ward ? '#0F2557' : '#9EB3CC' }}
                    value={form.location.ward}
                    onChange={e => {
                      const wardValue = e.target.value;
                      setForm(f => ({
                        ...f,
                        location: {
                          ...f.location,
                          ward: wardValue,
                          zone: wardValue ? WARD_ZONE_MAP[wardValue] || '' : ''
                        }
                      }));
                    }}>
                    <option value="">{lang === 'hi' ? '-- वार्ड चुनें --' : '-- Select Ward --'}</option>
                    {WARDS.map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                  {!form.location.ward && (
                    <div style={{ fontSize: 11, color: '#E8620A', marginTop: 4 }}>
                      {lang === 'hi' ? '📍 वार्ड चुनें — सार्वजनिक डैशबोर्ड के लिए जरूरी' : '📍 Required for Ward-wise data on Public Dashboard'}
                    </div>
                  )}
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>{tx('Zone', lang)}</label>
                  <input style={styles.input} value={form.location.zone} readOnly placeholder={tx('Auto-selected from ward', lang)} />
                </div>
              </div>
            </div>

            {/* Citizen Info */}
            <div style={{ ...styles.card, marginTop: 16 }}>
              <div style={styles.cardTitle}>{tx('👤 Your Details', lang)}</div>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>{tx('Full Name *', lang)}</label>
                  <input style={styles.input} placeholder={tx('Your full name', lang)}
                    value={form.citizen.name} onChange={e => setForm(f => ({ ...f, citizen: { ...f.citizen, name: e.target.value } }))} />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>{tx('Email *', lang)}</label>
                  <input style={styles.input} type="email" placeholder={tx('Your email', lang)}
                    value={form.citizen.email} onChange={e => setForm(f => ({ ...f, citizen: { ...f.citizen, email: e.target.value } }))} />
                </div>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>{tx('Phone Number', lang)}</label>
                <input style={styles.input} placeholder={tx('10-digit mobile number', lang)} type="tel" maxLength={10}
                  value={form.citizen.phone}
                  onChange={e => { const val = e.target.value.replace(/\D/g, '').slice(0, 10); setForm(f => ({ ...f, citizen: { ...f.citizen, phone: val } })); }} />
              </div>
            </div>

            <button style={{ ...styles.btnPrimary, width: '100%', padding: 14, fontSize: 16, marginTop: 16 }}
              onClick={handleSubmit} disabled={loading || aiLoading}>
              {loading ? tx('⏳ Submitting...', lang) : images.length > 0
                ? (lang === 'hi' ? `✅ ${images.length} फ़ोटो के साथ शिकायत जमा करें` : `✅ Submit Complaint with ${images.length} Photo${images.length > 1 ? 's' : ''}`)
                : tx('✅ Submit Complaint', lang)}
            </button>
          </div>

          {/* Right Panel */}
          <div>
            <div style={styles.card}>
              <div style={styles.cardTitle}>{tx('🤖 AI Auto-Classification', lang)}</div>
              <p style={{ fontSize: 13, color: '#6B7FA3', marginBottom: 16, lineHeight: 1.6 }}>
                {tx('Just describe your complaint — our AI automatically detects the category, department, and urgency level for you.', lang)}
              </p>
              {Object.entries(CATEGORY_MAP).slice(0, 8).map(([cat, { icon, dept }], i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span style={{ fontSize: 18 }}>{icon}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0F2557' }}>{cat}</div>
                    <div style={{ fontSize: 11, color: '#6B7FA3' }}>{dept}</div>
                  </div>
                </div>
              ))}
              <div style={{ fontSize: 11, color: '#9EB3CC', marginTop: 8 }}>+ {Object.keys(CATEGORY_MAP).length - 8} more departments</div>
            </div>

            <div style={{ ...styles.card, marginTop: 16 }}>
              <div style={styles.cardTitle}>{tx('ℹ️ How It Works', lang)}</div>
              {[
                { step: '01', title: 'Describe Your Issue',  desc: 'Type or speak your complaint' },
                { step: '02', title: 'AI Auto-Classifies',   desc: 'Category & urgency detected instantly' },
                { step: '03', title: 'Add Photo Evidence',   desc: 'Attach photos for faster resolution' },
                { step: '04', title: 'Track & Get Feedback', desc: 'Monitor status and rate the resolution' },
              ].map((s, i) => (
                <div key={i} style={styles.howStep}>
                  <div style={styles.howNum}>{s.step}</div>
                  <div>
                    <div style={styles.howTitle}>{tx(s.title, lang)}</div>
                    <div style={styles.howDesc}>{tx(s.desc, lang)}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ ...styles.card, marginTop: 16, background: 'linear-gradient(135deg,#0F2557,#1A3A6E)' }}>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
                {tx('SLA Guidelines', lang)}
              </div>
              {[
                { u: 'High',   t: '24 hours', c: '#E65100' },
                { u: 'Medium', t: '72 hours', c: '#60A5FA' },
                { u: 'Low',    t: '7 days',   c: '#4ADE80' },
              ].map((s, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>{tx(s.u, lang)} {tx('Urgency', lang)}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: s.c }}>{s.t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Header({ navigate, lang }) {
  return (
    <>
      <div style={{ background: '#0F2557', height: 34, display: 'flex', alignItems: 'center', padding: '0 40px', borderBottom: '3px solid #E8620A' }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>
          {tx('Government of Delhi · Ministry of Personnel, Public Grievances & Pensions', lang)}
        </span>
      </div>
      <header style={{ background: '#fff', borderBottom: '1px solid #D8E2F0', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 40px', boxShadow: '0 2px 12px rgba(15,37,87,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => navigate('/')}>
          <div style={{ width: 40, height: 40, borderRadius: 9, background: 'linear-gradient(135deg,#0F2557,#1565C0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🏛️</div>
          <div>
            <div style={{ fontFamily: "'Noto Serif', serif", fontSize: 16, fontWeight: 700, color: '#0F2557' }}>{tx('PS-CRM Gov Portal', lang)}</div>
            <div style={{ fontSize: 11, color: '#6B7FA3' }}>{tx('Smart Public Service CRM', lang)}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 9 }}>
          <button style={{ padding: '7px 16px', borderRadius: 8, border: '1.5px solid #0F2557', color: '#0F2557', background: 'transparent', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            onClick={() => navigate(-1)}>{tx('← Back', lang)}</button>
          <button style={{ padding: '7px 16px', borderRadius: 8, border: '1.5px solid #0F2557', color: '#0F2557', background: 'transparent', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            onClick={() => navigate('/citizen/track')}>{tx('🔍 Track Complaint', lang)}</button>
        </div>
      </header>
    </>
  );
}

const styles = {
  page:          { fontFamily: "'DM Sans', sans-serif", background: '#F4F6FB', minHeight: '100vh' },
  container:     { maxWidth: 1100, margin: '0 auto', padding: '40px' },
  pageHead:      { marginBottom: 28 },
  pageTitle:     { fontFamily: "'Noto Serif', serif", fontSize: 26, fontWeight: 700, color: '#0F2557', marginBottom: 6 },
  pageSub:       { color: '#6B7FA3', fontSize: 14 },
  grid:          { display: 'grid', gridTemplateColumns: '1.4fr 0.6fr', gap: 24 },
  card:          { background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 12px rgba(15,37,87,0.06)' },
  cardTitle:     { fontWeight: 700, fontSize: 15, color: '#0F2557', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #F0F4FB' },
  formGroup:     { marginBottom: 16, flex: 1 },
  formRow:       { display: 'flex', gap: 16 },
  label:         { display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13, color: '#3A4E70' },
  input:         { width: '100%', padding: '10px 13px', border: '1.5px solid #D8E2F0', borderRadius: 8, fontSize: 14, fontFamily: "'DM Sans', sans-serif", outline: 'none', background: '#fff', boxSizing: 'border-box' },
  aiBox:         { background: 'linear-gradient(135deg,rgba(15,37,87,0.04),rgba(21,101,192,0.06))', border: '1px solid #C4D4EC', borderRadius: 10, padding: 16, marginBottom: 16 },
  aiTitle:       { fontSize: 12, fontWeight: 700, color: '#0F2557', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
  aiGrid:        { display: 'flex', gap: 20, flexWrap: 'wrap' },
  aiItem:        { display: 'flex', flexDirection: 'column', gap: 4 },
  aiKey:         { fontSize: 11, color: '#6B7FA3', fontWeight: 600 },
  aiVal:         { fontSize: 13, fontWeight: 700, color: '#0F2557' },
  dropZone:      { border: '2px dashed #C4D4EC', borderRadius: 12, padding: '32px 20px', textAlign: 'center', cursor: 'pointer', background: '#F8FAFC', transition: 'all 0.2s', marginBottom: 16 },
  dropZoneActive:{ border: '2px dashed #0F2557', background: 'rgba(15,37,87,0.04)' },
  dropText:      { fontSize: 15, fontWeight: 600, color: '#0F2557', marginBottom: 6 },
  dropSub:       { fontSize: 12, color: '#9EB3CC' },
  previewGrid:   { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 12 },
  previewCard:   { borderRadius: 10, overflow: 'hidden', border: '1.5px solid #D8E2F0', background: '#fff' },
  previewInfo:   { display: 'flex', justifyContent: 'space-between', padding: '8px 10px', background: '#F8FAFC' },
  previewName:   { fontSize: 11, color: '#0F2557', fontWeight: 600 },
  previewSize:   { fontSize: 11, color: '#9EB3CC' },
  removeBtn:     { width: '100%', padding: '6px', border: 'none', background: '#FEE2E2', color: '#DC2626', fontSize: 11, fontWeight: 700, cursor: 'pointer' },
  addMoreCard:   { borderRadius: 10, border: '2px dashed #D8E2F0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', minHeight: 140, background: '#F8FAFC' },
  evidenceTip:   { background: '#DCFCE7', color: '#16A34A', padding: '10px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600 },
  btnPrimary:    { padding: '10px 20px', background: '#E8620A', color: '#fff', border: 'none', borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" },
  btnOutline:    { padding: '10px 20px', background: 'transparent', color: '#0F2557', border: '1.5px solid #0F2557', borderRadius: 9, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" },
  error:         { background: '#FEE2E2', color: '#C62828', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 },
  howStep:       { display: 'flex', gap: 14, marginBottom: 16 },
  howNum:        { width: 28, height: 28, borderRadius: '50%', background: '#0F2557', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 },
  howTitle:      { fontWeight: 700, fontSize: 13, color: '#0F2557', marginBottom: 3 },
  howDesc:       { fontSize: 12, color: '#6B7FA3' },
  successWrap:   { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 100px)', padding: 40 },
  successCard:   { background: '#fff', borderRadius: 16, padding: 48, maxWidth: 520, width: '100%', textAlign: 'center', boxShadow: '0 8px 32px rgba(15,37,87,0.12)' },
  successTitle:  { fontFamily: "'Noto Serif', serif", fontSize: 24, fontWeight: 700, color: '#0F2557', marginBottom: 10 },
  successSub:    { color: '#6B7FA3', fontSize: 14, marginBottom: 28 },
  successInfo:   { background: '#F4F6FB', borderRadius: 10, padding: 20, textAlign: 'left' },
  successRow:    { display: 'flex', justifyContent: 'space-between', marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid #E8EEF8' },
  successKey:    { fontSize: 13, color: '#6B7FA3', fontWeight: 600 },
  successVal:    { fontSize: 13, color: '#0F2557', fontWeight: 600 },
};
