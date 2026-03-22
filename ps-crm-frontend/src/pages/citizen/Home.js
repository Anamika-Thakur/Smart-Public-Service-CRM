import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLang, tx } from '../../context/LanguageContext';
import LanguageToggle from '../../components/layout/LanguageToggle';

const faqs = {
  en: [
    { q: 'How do I track my complaint?', a: 'Use your PSCRM-ID received after submission on the Track Status page — no login needed.' },
    { q: 'Can I re-raise a complaint?', a: 'Yes. If your complaint was closed without resolution, you can re-raise it from your citizen dashboard or file a new one.' },
    { q: 'What departments are covered?', a: 'Roads, Water, Electricity, Sanitation, Public Health, Education, and more across all municipal wards.' },
    { q: 'Is my personal information safe?', a: 'Yes. All data is encrypted and stored securely. Your personal details are never shared publicly.' },
    { q: 'How do I provide feedback after resolution?', a: 'Once your complaint is marked Resolved, you will receive an email with a feedback link, or you can visit the feedback page from your dashboard.' },
  ],
  hi: [
    { q: 'मैं अपनी शिकायत कैसे ट्रैक करूं?', a: 'ट्रैक स्टेटस पेज पर जमा करने के बाद मिले अपने PSCRM-ID का उपयोग करें — लॉगिन की आवश्यकता नहीं।' },
    { q: 'क्या मैं शिकायत फिर से दर्ज कर सकता हूं?', a: 'हाँ। अगर आपकी शिकायत बिना समाधान के बंद कर दी गई, तो आप अपने नागरिक डैशबोर्ड से इसे फिर से दर्ज कर सकते हैं।' },
    { q: 'कौन से विभाग शामिल हैं?', a: 'सड़कें, जल, बिजली, स्वच्छता, सार्वजनिक स्वास्थ्य, शिक्षा और सभी नगरपालिका वार्डों में और अधिक।' },
    { q: 'क्या मेरी व्यक्तिगत जानकारी सुरक्षित है?', a: 'हाँ। सभी डेटा एन्क्रिप्टेड और सुरक्षित रूप से संग्रहीत है। आपकी व्यक्तिगत जानकारी कभी सार्वजनिक रूप से साझा नहीं की जाती।' },
    { q: 'समाधान के बाद मैं फ़ीडबैक कैसे दूं?', a: 'एक बार आपकी शिकायत हल के रूप में चिह्नित होने पर, आपको फ़ीडबैक लिंक के साथ ईमेल मिलेगा, या आप अपने डैशबोर्ड से फ़ीडबैक पेज पर जा सकते हैं।' },
  ],
};

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { lang } = useLang();
  const [openFaq, setOpenFaq] = useState(null);
  const [realStats, setRealStats] = useState(null);

  const T = (key) => tx(key, lang);

  useEffect(() => {
    fetch('http://localhost:5000/api/dashboard/public')
      .then(res => res.json())
      .then(data => { if (data.success) setRealStats(data.data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (user) {
      if (user.role === 'admin') navigate('/admin/dashboard');
      else if (user.role === 'officer') navigate('/officer/dashboard');
      else navigate('/citizen/dashboard');
    }
  }, [user, navigate]);

  const resolutionRate = realStats
    ? ((realStats.resolved / (realStats.total || 1)) * 100).toFixed(1)
    : null;

  const currentFaqs = faqs[lang] || faqs.en;

  const featureCards = [
    {
      icon: '📝', color: '#E8620A',
      title: T('File a Complaint'),
      desc: T('Submit via web, app, WhatsApp or SMS in any language. AI handles classification.'),
      cta: T('Submit Now →'), action: () => navigate('/login'), badge: T('🔐 Login Required'),
    },
    {
      icon: '🔍', color: '#2563EB',
      title: T('Track Your Complaint') || (lang === 'hi' ? 'शिकायत ट्रैक करें' : 'Track Your Complaint'),
      desc: T("Enter your PSCRM-ID to see real-time progress, SLA countdown and proof."),
      cta: T('Track Status →'), action: () => navigate('/citizen/track'), badge: null,
    },
    {
      icon: '📊', color: '#16A34A',
      title: T('Public Dashboard'),
      desc: T('Live ward rankings, complaint heatmaps and resolution analytics — no login needed.'),
      cta: T('Open Dashboard →'), action: () => navigate('/public'), badge: null,
    },
    {
      icon: 'ℹ️', color: '#7C3AED',
      title: lang === 'hi' ? 'यह कैसे काम करता है' : 'How It Works',
      desc: T('Understand the 6-step automated grievance lifecycle from submission to resolution.'),
      cta: T('Learn More →'), action: () => navigate('/public'), badge: null,
    },
  ];

  const steps = [
    { step: '01', icon: '📝', title: T('Submit'),        desc: T('File your complaint online with details and photos') },
    { step: '02', icon: '🧠', title: T('AI Processing'), desc: T('Auto-categorized and routed to the right department') },
    { step: '03', icon: '🔄', title: T('Resolution'),    desc: T('Officer works on it with live SLA tracking') },
    { step: '04', icon: '✅', title: T('Feedback'),      desc: T('Rate the resolution and provide your feedback') },
  ];

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: '#FAFBFE', minHeight: '100vh' }}>

      {/* ── Top Government Bar ── */}
      <div style={styles.topbar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', gap: 3 }}>
            {['#FF9933', '#FFF', '#138808'].map(c => (
              <div key={c} style={{ width: 5, height: 16, borderRadius: 2, background: c }} />
            ))}
          </div>
          <span style={styles.topbarText}>
            {T('Government of India · Ministry of Personnel, Public Grievances & Pensions')}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
          {['Screen Reader', 'Skip to Content', 'A-', 'A', 'A+'].map(t => (
            <span key={t} style={styles.tbLink}>{t}</span>
          ))}
          {/* ── Language Toggle ── */}
          <LanguageToggle />
        </div>
      </div>

      {/* ── Sticky Header ── */}
      <header style={styles.header}>
        <div style={styles.brand} onClick={() => navigate('/')}>
          <div style={styles.emblem}>🏛️</div>
          <div>
            <div style={styles.brandMain}>{T('PS-CRM Gov Portal')}</div>
            <div style={styles.brandSub}>
              {T('Smart Public Service CRM')} · {T('Centralized Grievance Management')}
            </div>
          </div>
        </div>

        <nav style={{ display: 'flex', gap: 2 }}>
          {[
            { label: T('Home'),      path: '/' },
            { label: T('Submit'),    path: '/citizen/submit' },
            { label: T('Track'),     path: '/citizen/track' },
            { label: T('Dashboard'), path: '/public' },
            { label: T('Features'),  path: '/public' },
          ].map(({ label, path }) => (
            <button key={label} style={styles.navBtn} onClick={() => navigate(path)}>
              {label}
            </button>
          ))}
        </nav>

        <div style={{ display: 'flex', gap: 10 }}>
          <button style={styles.btnRegister} onClick={() => navigate('/register')}>
            {T('Register / Login →')}
          </button>
        </div>
      </header>

      {/* ── Hero ── */}
      <section style={styles.hero}>
        <div style={styles.heroInner}>
          <div>
            <div style={styles.heroTag}>
              <span style={styles.pdot} />
              {T('🇮🇳 Digital India · AI-Powered Governance · 2025')}
            </div>
            <h1 style={styles.heroH1}>
              {lang === 'hi'
                ? <>आपकी शिकायतें, <span style={{ color: '#F47B20' }}>पारदर्शी रूप से हल</span> AI बुद्धिमत्ता से</>
                : <>Your Complaints,{' '}<span style={{ color: '#F47B20' }}>Resolved Transparently</span>{' '}with AI Intelligence</>
              }
            </h1>
            <p style={styles.heroSub}>
              {T('PS-CRM is a centralized AI command center for citizen grievance management — NLP auto-classifies complaints, routes them to the right officer instantly, and ensures transparent end-to-end resolution.')}
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button style={styles.btnHero} onClick={() => navigate('/login')}>
                {T('📝 File a Complaint →')}
              </button>
              <button style={styles.btnHeroSec} onClick={() => navigate('/citizen/track')}>
                {T('🔍 Track Your Complaint')}
              </button>
            </div>
          </div>

          <div style={styles.heroCard}>
            <div style={styles.hcHeader}>
              <span style={styles.liveDot} />
              {T('PLATFORM STATISTICS · LIVE')}
            </div>
            <div style={styles.hcGrid}>
              {[
                { n: realStats ? realStats.total.toLocaleString('en-IN') : '...', l: T('Complaints Tracked') },
                { n: realStats ? `${resolutionRate}%` : '...', l: T('Resolution Rate') },
                { n: realStats ? realStats.resolved.toLocaleString('en-IN') : '...', l: T('Resolved') },
                { n: realStats ? realStats.pending.toLocaleString('en-IN') : '...', l: T('Pending') },
              ].map((s, i) => (
                <div key={i} style={styles.hcItem}>
                  <div style={styles.hcNum}>{s.n}</div>
                  <div style={styles.hcLbl}>{s.l}</div>
                </div>
              ))}
            </div>
            <div style={{ ...styles.hcNote, marginTop: 16 }}>
              {realStats ? '' : lang === 'hi' ? '⏳ लाइव डेटा लोड हो रहा है...' : '⏳ Loading live data...'}
            </div>
          </div>
        </div>
      </section>

      {/* ── Feature Cards ── */}
      <section style={{ background: '#F4F6FB', padding: '52px 0' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 40px' }}>
          <div style={styles.featGrid}>
            {featureCards.map((f, i) => (
              <div key={i} style={{ ...styles.featCard, borderTop: `3px solid ${f.color}` }}>
                <div style={{ fontSize: 38, marginBottom: 14 }}>{f.icon}</div>
                <div style={styles.featTitle}>{f.title}</div>
                {f.badge && <span style={styles.loginBadge}>{f.badge}</span>}
                <div style={styles.featDesc}>{f.desc}</div>
                <button style={{ ...styles.featCta, color: f.color }} onClick={f.action}>
                  {f.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section style={{ background: '#fff', padding: '60px 40px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={styles.sectionTitle}>{T('How It Works')}</h2>
          <p style={styles.sectionSub}>{T('Simple 4-step process to resolve your grievance')}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }}>
            {steps.map((s, i) => (
              <div key={i} style={styles.stepCard}>
                <div style={styles.stepNum}>{s.step}</div>
                <div style={{ fontSize: 32, marginBottom: 12 }}>{s.icon}</div>
                <div style={styles.stepTitle}>{s.title}</div>
                <div style={styles.stepDesc}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section style={{ background: '#FAFBFE', padding: '60px 40px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <h2 style={{ ...styles.sectionTitle, textAlign: 'center' }}>
            {T('Frequently Asked Questions')}
          </h2>
          <p style={{ ...styles.sectionSub, textAlign: 'center' }}>
            {T('Everything you need to know about PS-CRM')}
          </p>
          <div style={{ marginTop: 32 }}>
            {currentFaqs.map((f, i) => (
              <div key={i} style={styles.faqItem}>
                <button style={styles.faqQ} onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  <span>{f.q}</span>
                  <span style={{ fontSize: 20, color: '#9BADC0', display: 'inline-block', transform: openFaq === i ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>∨</span>
                </button>
                {openFaq === i && <div style={styles.faqA}>{f.a}</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={styles.footer}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: 48, marginBottom: 36 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 8, background: '#E8620A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🏛️</div>
                <div style={{ fontWeight: 700, color: '#1A2B4A', fontSize: 20 }}>Smart<span style={{ color: '#E8620A' }}>CRM</span></div>
              </div>
              <div style={{ fontSize: 13, color: '#6B7FA3', lineHeight: 1.8 }}>
                {lang === 'hi'
                  ? 'प्रौद्योगिकी के माध्यम से नागरिकों और भारत सरकार के बीच विश्वास बनाना।'
                  : 'Building trust between citizens and Government of India through technology.'
                }
              </div>
            </div>
            <div>
              <div style={styles.footerHeading}>{T('Quick Links')}</div>
              {[
                { l: T('Raise Complaint'), p: '/login' },
                { l: T('Track Status'),    p: '/citizen/track' },
                { l: T('Public Dashboard'), p: '/public' },
              ].map(item => (
                <div key={item.p} style={styles.footerLink} onClick={() => navigate(item.p)}>{item.l}</div>
              ))}
            </div>
            <div>
              <div style={styles.footerHeading}>{T('Contact')}</div>
              <div style={styles.footerContact}>📧 grievance@pscrm.gov.in</div>
              <div style={styles.footerContact}>📞 1800-111-555</div>
              <div style={styles.footerContact}>📍 {lang === 'hi' ? 'नगर निगम, सिटी सेंटर' : 'Municipal Corporation, City Center'}</div>
            </div>
          </div>
          <div style={styles.footerBottom}>
            {T('© 2026 Government of India – Smart Public Service CRM. All rights reserved.')}
          </div>
        </div>
      </footer>
    </div>
  );
}

const styles = {
  topbar: { background: '#0F2557', height: 36, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 40px', borderBottom: '3px solid #E8620A' },
  topbarText: { fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: 500 },
  tbLink: { fontSize: 11, color: 'rgba(255,255,255,0.55)', cursor: 'pointer' },
  header: { background: '#fff', borderBottom: '1px solid #E2E8F0', height: 72, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 40px', boxShadow: '0 2px 8px rgba(15,37,87,0.06)', position: 'sticky', top: 0, zIndex: 200 },
  brand: { display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' },
  emblem: { width: 48, height: 48, borderRadius: 10, background: 'linear-gradient(135deg,#0F2557,#1565C0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 },
  brandMain: { fontFamily: "'Noto Serif', serif", fontSize: 17, fontWeight: 700, color: '#0F2557' },
  brandSub: { fontSize: 11, color: '#6B7FA3', marginTop: 2 },
  navBtn: { padding: '7px 14px', borderRadius: 7, fontSize: 13, fontWeight: 500, cursor: 'pointer', border: 'none', background: 'transparent', color: '#3A4E70', fontFamily: "'DM Sans', sans-serif" },
  btnRegister: { padding: '10px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: 'none', background: '#E8620A', color: '#fff' },
  hero: { background: 'linear-gradient(135deg,#0F2557 0%,#1A3A6E 50%,#1E5096 100%)', padding: '72px 40px 64px' },
  heroInner: { maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 56, alignItems: 'center' },
  heroTag: { display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 20, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', padding: '6px 16px', borderRadius: 100, fontSize: 11, color: 'rgba(255,255,255,0.85)', fontWeight: 600, letterSpacing: 1 },
  pdot: { display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: '#4ade80' },
  heroH1: { fontFamily: "'Noto Serif', serif", fontSize: 'clamp(28px,3.5vw,44px)', fontWeight: 700, color: '#fff', lineHeight: 1.15, marginBottom: 18 },
  heroSub: { fontSize: 15, color: 'rgba(255,255,255,0.72)', lineHeight: 1.8, marginBottom: 30 },
  btnHero: { padding: '13px 26px', borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: 'pointer', border: 'none', background: '#E8620A', color: '#fff' },
  btnHeroSec: { padding: '13px 26px', borderRadius: 9, fontSize: 14, fontWeight: 600, cursor: 'pointer', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1.5px solid rgba(255,255,255,0.3)' },
  heroCard: { background: 'rgba(255,255,255,0.09)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 16, padding: '26px 24px' },
  hcHeader: { fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: 'rgba(255,255,255,0.55)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 7 },
  liveDot: { width: 7, height: 7, borderRadius: '50%', background: '#4ade80', display: 'inline-block', boxShadow: '0 0 6px #4ade80' },
  hcGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  hcItem: { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '14px 12px' },
  hcNum: { fontSize: 28, fontWeight: 700, color: '#fff', letterSpacing: '-0.5px', lineHeight: 1.1 },
  hcLbl: { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 5, fontWeight: 500 },
  hcNote: { fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 12, textAlign: 'center' },
  featGrid: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 20 },
  featCard: { background: '#fff', borderRadius: 14, padding: '28px 22px', boxShadow: '0 2px 12px rgba(15,37,87,0.07)', display: 'flex', flexDirection: 'column' },
  featTitle: { fontWeight: 700, fontSize: 16, color: '#0F2557', marginBottom: 8 },
  loginBadge: { display: 'inline-block', fontSize: 11, background: '#FEF3C7', color: '#D97706', fontWeight: 700, padding: '3px 9px', borderRadius: 20, marginBottom: 10, alignSelf: 'flex-start' },
  featDesc: { fontSize: 13, color: '#6B7FA3', lineHeight: 1.7, flex: 1, marginBottom: 18 },
  featCta: { fontSize: 13, fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left', fontFamily: "'DM Sans',sans-serif" },
  sectionTitle: { fontFamily: "'Noto Serif', serif", fontSize: 28, fontWeight: 700, color: '#0F2557', marginBottom: 8 },
  sectionSub: { color: '#6B7FA3', marginBottom: 32, fontSize: 14 },
  stepCard: { textAlign: 'center', padding: '28px 20px', background: '#F8FAFC', borderRadius: 12 },
  stepNum: { fontSize: 11, fontWeight: 700, color: '#E8620A', letterSpacing: 2, marginBottom: 12 },
  stepTitle: { fontWeight: 700, fontSize: 16, color: '#0F2557', marginBottom: 8 },
  stepDesc: { fontSize: 13, color: '#6B7FA3', lineHeight: 1.6 },
  faqItem: { borderBottom: '1px solid #E8EEF8' },
  faqQ: { width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 4px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 600, color: '#1A2B4A', fontFamily: "'DM Sans',sans-serif", textAlign: 'left', gap: 12 },
  faqA: { padding: '0 4px 18px', fontSize: 14, color: '#6B7FA3', lineHeight: 1.7 },
  footer: { background: '#fff', borderTop: '1px solid #E2E8F0', padding: '48px 40px 24px' },
  footerHeading: { fontWeight: 700, color: '#0F2557', fontSize: 15, marginBottom: 16 },
  footerLink: { fontSize: 13, color: '#6B7FA3', marginBottom: 10, cursor: 'pointer' },
  footerContact: { fontSize: 13, color: '#6B7FA3', marginBottom: 10, lineHeight: 1.6 },
  footerBottom: { borderTop: '1px solid #E2E8F0', paddingTop: 20, textAlign: 'center', fontSize: 12, color: '#9BADC0' },
};