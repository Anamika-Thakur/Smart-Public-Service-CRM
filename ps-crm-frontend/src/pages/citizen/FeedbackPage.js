import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLang, tx } from '../../context/LanguageContext';
import API from '../../api';

// ── Real Platform Ratings from API ───────────────────────────────────────────
function PlatformRatings({ lang }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    API.get('/feedback')
      .then(res => setData(res.data.data?.summary || null))
      .catch(() => {});
  }, []);

  const avgRating    = data?.avgRating    ? `${data.avgRating} ★` : '—';
  const totalReviews = data?.totalRatings ?? '—';
  const satisfaction = data?.totalRatings
    ? `${Math.round((data.positive / data.totalRatings) * 100)}%`
    : '—';

  return (
    <div style={{ ...styles.card, marginTop: 16, background: 'linear-gradient(135deg,#0F2557,#1A3A6E)' }}>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>
        {tx('Platform Ratings', lang)}
      </div>
      {[
        { label: tx('Average Rating', lang),    value: avgRating,    color: '#F59E0B' },
        { label: tx('Total Reviews', lang),     value: totalReviews, color: '#fff' },
        { label: tx('Satisfaction Rate', lang), value: satisfaction, color: '#4ade80' },
      ].map((s, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{s.label}</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: s.color }}>{s.value}</span>
        </div>
      ))}
      {!data && (
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: 4 }}>
          {lang === 'hi' ? 'डेटा लोड हो रहा है...' : 'Loading data...'}
        </div>
      )}
    </div>
  );
}

// ── Main FeedbackPage ─────────────────────────────────────────────────────────
export default function FeedbackPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { lang } = useLang();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [aspects, setAspects] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const aspectOptions = lang === 'hi'
    ? ['⚡ त्वरित समाधान', '💬 अच्छा संवाद', '🎯 सटीक समाधान', '👤 व्यावसायिक अधिकारी', '📱 आसान प्रक्रिया', '🔔 समय पर अपडेट']
    : ['⚡ Quick Resolution', '💬 Good Communication', '🎯 Accurate Solution', '👤 Professional Officer', '📱 Easy Process', '🔔 Timely Updates'];

  const toggleAspect = (a) => setAspects(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);

  const labels = ['', tx('Very Poor', lang), tx('Poor', lang), tx('Average', lang), tx('Good', lang), tx('Excellent', lang)];
  const colors = ['', '#DC2626', '#D97706', '#2563EB', '#16A34A', '#0F2557'];
  const emojis = ['', '😠', '😞', '😐', '😊', '🤩'];

  const handleSubmit = async () => {
    if (!rating) { setError(tx('Please select a rating', lang)); return; }
    setLoading(true);
    setError('');
    try {
      await API.post('/feedback', { complaintId: id, rating, comment, aspects });
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.message || (lang === 'hi' ? 'फ़ीडबैक जमा नहीं हो सका' : 'Failed to submit feedback'));
    }
    setLoading(false);
  };

  if (submitted) {
    return (
      <div style={styles.page}>
        <Header navigate={navigate} lang={lang} />
        <div style={styles.centerWrap}>
          <div style={styles.successCard}>
            <div style={{ fontSize: 72, marginBottom: 16 }}>🎉</div>
            <h2 style={styles.successTitle}>{tx('Thank You for Your Feedback!', lang)}</h2>
            <p style={styles.successSub}>{tx('Your feedback helps us improve public services for everyone.', lang)}</p>
            <div style={styles.ratingDisplay}>
              <div style={{ fontSize: 48 }}>{emojis[rating]}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: colors[rating], marginTop: 8 }}>{labels[rating]}</div>
              <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginTop: 8 }}>
                {[1, 2, 3, 4, 5].map(s => (
                  <span key={s} style={{ fontSize: 28, color: s <= rating ? '#F59E0B' : '#E5E7EB' }}>★</span>
                ))}
              </div>
            </div>
            {comment && (
              <div style={styles.commentDisplay}>
                <div style={{ fontSize: 12, color: '#6B7FA3', marginBottom: 6, fontWeight: 600 }}>
                  {lang === 'hi' ? 'आपकी टिप्पणी' : 'YOUR COMMENT'}
                </div>
                <div style={{ fontSize: 14, color: '#3A4E70', lineHeight: 1.6 }}>{comment}</div>
              </div>
            )}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 28 }}>
              <button style={styles.btnPrimary} onClick={() => navigate('/citizen/dashboard')}>
                {tx('📊 My Dashboard', lang)}
              </button>
              <button style={styles.btnOutline} onClick={() => navigate('/citizen/submit')}>
                {tx('📝 New Complaint', lang)}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <Header navigate={navigate} lang={lang} />
      <div style={styles.container}>
        <div style={styles.pageHead}>
          <h1 style={styles.pageTitle}>{tx('⭐ Rate Your Experience', lang)}</h1>
          <p style={styles.pageSub}>
            {tx('Help us improve by sharing your feedback', lang)} — #{id?.slice(-8).toUpperCase()}
          </p>
        </div>

        <div style={styles.grid}>
          {/* Left - Form */}
          <div>
            {error && <div style={styles.error}>{error}</div>}

            {/* Star Rating */}
            <div style={styles.card}>
              <div style={styles.cardTitle}>{tx('⭐ Overall Rating', lang)}</div>
              <div style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map(s => (
                  <span key={s}
                    style={{ fontSize: 52, cursor: 'pointer', color: s <= (hover || rating) ? '#F59E0B' : '#E5E7EB', transition: 'all 0.15s' }}
                    onMouseEnter={() => setHover(s)}
                    onMouseLeave={() => setHover(0)}
                    onClick={() => setRating(s)}>
                    ★
                  </span>
                ))}
              </div>
              {(hover || rating) > 0 && (
                <div style={{ textAlign: 'center', marginTop: 12 }}>
                  <span style={{ fontSize: 36 }}>{emojis[hover || rating]}</span>
                  <div style={{ fontSize: 18, fontWeight: 700, color: colors[hover || rating], marginTop: 4 }}>
                    {labels[hover || rating]}
                  </div>
                </div>
              )}
            </div>

            {/* Aspects */}
            <div style={{ ...styles.card, marginTop: 16 }}>
              <div style={styles.cardTitle}>{tx('👍 What went well? (Optional)', lang)}</div>
              <div style={styles.aspectsGrid}>
                {aspectOptions.map((a, i) => (
                  <div key={i} onClick={() => toggleAspect(a)}
                    style={{ ...styles.aspectChip, ...(aspects.includes(a) ? styles.aspectChipActive : {}) }}>
                    {a}
                  </div>
                ))}
              </div>
            </div>

            {/* Comment */}
            <div style={{ ...styles.card, marginTop: 16 }}>
              <div style={styles.cardTitle}>{tx('💬 Additional Comments (Optional)', lang)}</div>
              <textarea
                style={{ ...styles.input, height: 120, resize: 'vertical' }}
                placeholder={tx('Share your experience in detail...', lang)}
                value={comment}
                onChange={e => setComment(e.target.value)}
              />
              <div style={{ fontSize: 12, color: '#9EB3CC', marginTop: 6, textAlign: 'right' }}>
                {comment.length}/500 {lang === 'hi' ? 'अक्षर' : 'characters'}
              </div>
            </div>

            <button
              style={{ ...styles.btnPrimary, width: '100%', padding: 14, fontSize: 16, marginTop: 16 }}
              onClick={handleSubmit}
              disabled={loading}>
              {loading ? tx('⏳ Submitting...', lang) : tx('✅ Submit Feedback', lang)}
            </button>
          </div>

          {/* Right - Info */}
          <div>
            <div style={styles.card}>
              <div style={styles.cardTitle}>{tx('ℹ️ Why Your Feedback Matters', lang)}</div>
              {[
                { icon: '📊', title: 'Improve Services',   desc: lang === 'hi' ? 'आपकी रेटिंग सुधार की जरूरत वाले क्षेत्रों की पहचान करने में मदद करती है' : 'Your ratings help identify areas needing improvement' },
                { icon: '👮', title: 'Officer Performance', desc: lang === 'hi' ? 'फ़ीडबैक सीधे अधिकारी प्रदर्शन समीक्षाओं को प्रभावित करता है' : 'Feedback directly impacts officer performance reviews' },
                { icon: '🏛️', title: 'Policy Changes',     desc: lang === 'hi' ? 'फ़ीडबैक के रुझान नीति सुधारों को बढ़ावा देते हैं' : 'Trends in feedback drive policy improvements' },
                { icon: '🌟', title: 'Reward Excellence',  desc: lang === 'hi' ? 'उच्च रेटेड अधिकारियों को मान्यता और पुरस्कार मिलते हैं' : 'High-rated officers receive recognition and rewards' },
              ].map((f, i) => (
                <div key={i} style={styles.infoRow}>
                  <div style={styles.infoIcon}>{f.icon}</div>
                  <div>
                    <div style={styles.infoTitle}>{tx(f.title, lang)}</div>
                    <div style={styles.infoDesc}>{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* ✅ Real Platform Ratings */}
            <PlatformRatings lang={lang} />

            <div style={{ ...styles.card, marginTop: 16 }}>
              <div style={styles.cardTitle}>{tx('🔔 What Happens Next?', lang)}</div>
              {[
                lang === 'hi' ? 'फ़ीडबैक सिस्टम में दर्ज किया जाता है'          : 'Feedback is recorded in the system',
                lang === 'hi' ? 'अधिकारी प्रदर्शन स्कोर अपडेट किया जाता है'   : 'Officer performance score is updated',
                lang === 'hi' ? 'विभाग प्रमुख कम रेटिंग की समीक्षा करते हैं'  : 'Department head reviews low ratings',
                lang === 'hi' ? '30 दिनों में सुधार लागू किए जाते हैं'         : 'Improvements implemented in 30 days',
              ].map((text, i) => (
                <div key={i} style={styles.stepRow}>
                  <div style={styles.stepNum}>{String(i + 1).padStart(2, '0')}</div>
                  <div style={{ fontSize: 13, color: '#3A4E70' }}>{text}</div>
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
          {tx('Government of India · Ministry of Personnel, Public Grievances & Pensions', lang)}
        </span>
      </div>
      <header style={{ background: '#fff', borderBottom: '1px solid #D8E2F0', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 40px', boxShadow: '0 2px 12px rgba(15,37,87,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => navigate('/')}>
          <div style={{ width: 40, height: 40, borderRadius: 9, background: 'linear-gradient(135deg,#0F2557,#1565C0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🏛️</div>
          <div>
            <div style={{ fontFamily: "'Noto Serif',serif", fontSize: 16, fontWeight: 700, color: '#0F2557' }}>
              {tx('PS-CRM Gov Portal', lang)}
            </div>
            <div style={{ fontSize: 11, color: '#6B7FA3' }}>{tx('Smart Public Service CRM', lang)}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 9 }}>
          <button style={{ padding: '7px 16px', borderRadius: 8, border: '1.5px solid #0F2557', color: '#0F2557', background: 'transparent', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            onClick={() => navigate('/citizen/dashboard')}>
            {tx('📊 My Dashboard', lang)}
          </button>
          <button style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: '#E8620A', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
            onClick={() => navigate('/citizen/submit')}>
            {tx('📝 New Complaint', lang)}
          </button>
        </div>
      </header>
    </>
  );
}

const styles = {
  page:             { fontFamily: "'DM Sans',sans-serif", background: '#F4F6FB', minHeight: '100vh' },
  container:        { maxWidth: 1100, margin: '0 auto', padding: '40px' },
  pageHead:         { marginBottom: 28 },
  pageTitle:        { fontFamily: "'Noto Serif',serif", fontSize: 26, fontWeight: 700, color: '#0F2557', marginBottom: 6 },
  pageSub:          { color: '#6B7FA3', fontSize: 14 },
  grid:             { display: 'grid', gridTemplateColumns: '1.3fr 0.7fr', gap: 24 },
  card:             { background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 12px rgba(15,37,87,0.06)' },
  cardTitle:        { fontWeight: 700, fontSize: 15, color: '#0F2557', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #F0F4FB' },
  starsRow:         { display: 'flex', justifyContent: 'center', gap: 8, padding: '16px 0' },
  aspectsGrid:      { display: 'flex', flexWrap: 'wrap', gap: 10 },
  aspectChip:       { padding: '8px 16px', borderRadius: 100, border: '1.5px solid #D8E2F0', background: '#F8FAFC', color: '#6B7FA3', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  aspectChipActive: { background: 'rgba(15,37,87,0.08)', border: '1.5px solid #0F2557', color: '#0F2557' },
  input:            { width: '100%', padding: '11px 14px', border: '1.5px solid #D8E2F0', borderRadius: 8, fontSize: 14, fontFamily: "'DM Sans',sans-serif", outline: 'none', boxSizing: 'border-box' },
  btnPrimary:       { padding: '10px 24px', background: '#E8620A', color: '#fff', border: 'none', borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" },
  btnOutline:       { padding: '10px 24px', background: 'transparent', color: '#0F2557', border: '1.5px solid #0F2557', borderRadius: 9, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" },
  error:            { background: '#FEE2E2', color: '#C62828', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 },
  infoRow:          { display: 'flex', gap: 14, marginBottom: 16 },
  infoIcon:         { fontSize: 24, flexShrink: 0 },
  infoTitle:        { fontWeight: 700, fontSize: 13, color: '#0F2557', marginBottom: 3 },
  infoDesc:         { fontSize: 12, color: '#6B7FA3', lineHeight: 1.5 },
  stepRow:          { display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 },
  stepNum:          { width: 26, height: 26, borderRadius: '50%', background: '#0F2557', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 },
  centerWrap:       { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 100px)', padding: 40 },
  successCard:      { background: '#fff', borderRadius: 16, padding: 48, maxWidth: 500, width: '100%', textAlign: 'center', boxShadow: '0 8px 32px rgba(15,37,87,0.12)' },
  successTitle:     { fontFamily: "'Noto Serif',serif", fontSize: 24, fontWeight: 700, color: '#0F2557', marginBottom: 10 },
  successSub:       { color: '#6B7FA3', fontSize: 14, marginBottom: 24 },
  ratingDisplay:    { background: '#F8FAFC', borderRadius: 12, padding: 24, marginBottom: 16 },
  commentDisplay:   { background: '#F8FAFC', borderRadius: 10, padding: 16, textAlign: 'left', marginTop: 16 },
};