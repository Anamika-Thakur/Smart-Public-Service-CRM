import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLang, tx } from '../context/LanguageContext';
import LanguageToggle from '../components/layout/LanguageToggle';
import API from '../api';

export default function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { lang } = useLang();
  const [registerType, setRegisterType] = useState('citizen'); // 'citizen' or 'officer'
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', phone: '', department: 'PWD Department' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pendingSuccess, setPendingSuccess] = useState(false);

  const departments = ['PWD Department', 'Jal Board', 'Electricity Board', 'Municipal Corp', 'Health Department', 'Education Dept', 'Revenue Dept', 'Other'];

  const handleRegister = async () => {
    setError('');
    if (!form.name || !form.email || !form.password) { setError(tx('Please fill all required fields', lang)); return; }
    if (form.password !== form.confirm)               { setError(tx('Passwords do not match', lang)); return; }
    if (form.password.length < 6)                     { setError(tx('Password must be at least 6 characters', lang)); return; }
    if (registerType === 'officer' && !form.department) { setError(lang === 'hi' ? 'कृपया विभाग चुनें' : 'Please select a department'); return; }

    setLoading(true);
    try {
      const res = await API.post('/auth/register', {
        name: form.name,
        email: form.email,
        password: form.password,
        phone: form.phone,
        role: registerType,
        department: registerType === 'officer' ? form.department : undefined,
      });

      // Officer registration — show pending screen
      if (res.data.pending) {
        setPendingSuccess(true);
        setLoading(false);
        return;
      }

      // Citizen — login immediately
      login(res.data.data);
      navigate('/citizen/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || (lang === 'hi' ? 'पंजीकरण विफल हुआ' : 'Registration failed'));
    }
    setLoading(false);
  };

  // Officer pending success screen
  if (pendingSuccess) {
    return (
      <div style={{ minHeight: '100vh', background: '#F4F6FB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans',sans-serif" }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: 48, maxWidth: 480, width: '100%', textAlign: 'center', boxShadow: '0 8px 32px rgba(15,37,87,0.1)' }}>
          <div style={{ fontSize: 64, marginBottom: 20 }}>⏳</div>
          <h2 style={{ fontFamily: "'Noto Serif',serif", fontSize: 24, fontWeight: 700, color: '#0F2557', marginBottom: 12 }}>
            {lang === 'hi' ? 'पंजीकरण प्राप्त हुआ!' : 'Registration Submitted!'}
          </h2>
          <p style={{ fontSize: 14, color: '#555', lineHeight: 1.7, marginBottom: 24 }}>
            {lang === 'hi'
              ? `${form.name}, आपकी अधिकारी पंजीकरण अर्जी सफलतापूर्वक जमा की गई है। एडमिन द्वारा समीक्षा के बाद आपको ईमेल पर सूचित किया जाएगा।`
              : `${form.name}, your officer registration request has been submitted successfully. You will be notified by email once an admin reviews your application.`}
          </p>
          <div style={{ background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: 10, padding: 16, marginBottom: 28, textAlign: 'left' }}>
            <div style={{ fontWeight: 700, color: '#92400E', marginBottom: 8, fontSize: 14 }}>
              {lang === 'hi' ? '📋 अगले कदम:' : '📋 What happens next:'}
            </div>
            {[
              lang === 'hi' ? '✅ आपको एक पुष्टि ईमेल मिला है' : '✅ You received a confirmation email',
              lang === 'hi' ? '⏳ एडमिन आपकी अर्जी की समीक्षा करेगा' : '⏳ Admin will review your application',
              lang === 'hi' ? '📧 मंजूरी/अस्वीकृति पर ईमेल मिलेगा' : '📧 You\'ll get an email on approval/rejection',
              lang === 'hi' ? '🔐 मंजूरी के बाद लॉगिन करें' : '🔐 Login once approved',
            ].map((s, i) => (
              <div key={i} style={{ fontSize: 13, color: '#78350F', marginBottom: 6 }}>{s}</div>
            ))}
          </div>
          <button
            onClick={() => navigate('/login')}
            style={{ width: '100%', padding: '13px', background: '#E8620A', color: '#fff', border: 'none', borderRadius: 9, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
            {lang === 'hi' ? '← लॉगिन पेज पर जाएं' : '← Go to Login Page'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Left Panel */}
      <div style={styles.left}>
        <div style={styles.leftInner}>
          <div style={styles.leftLogo} onClick={() => navigate('/')}>
            <div style={styles.emblem}>🏛️</div>
            <div>
              <div style={styles.logoText}>{tx('PS-CRM Gov Portal', lang)}</div>
              <div style={styles.logoSub}>{tx('Smart Public Service CRM', lang)}</div>
            </div>
          </div>
          <h1 style={styles.leftH1}>{tx('Join the Digital Governance Platform', lang)}</h1>
          <p style={styles.leftP}>
            {tx('Register as a citizen to file complaints, track resolutions, and hold your government accountable.', lang)}
          </p>
          <div style={styles.features}>
            {[
              { icon: '📝', text: tx('File complaints in minutes', lang) },
              { icon: '🔍', text: tx('Real-time status tracking', lang) },
              { icon: '🔔', text: tx('Instant email notifications', lang) },
              { icon: '⭐', text: tx('Rate your experience', lang) },
            ].map((f, i) => (
              <div key={i} style={styles.featureRow}>
                <span style={styles.featureIcon}>{f.icon}</span>
                <span style={styles.featureText}>{f.text}</span>
              </div>
            ))}
          </div>
          <div style={styles.flags}>
            {['#FF9933', '#FFF', '#138808'].map(c => (
              <div key={c} style={{ width: 32, height: 8, background: c, borderRadius: 2 }} />
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div style={styles.right}>
        <div style={{ position: 'absolute', top: 20, right: 28 }}>
          <LanguageToggle />
        </div>

        <div style={styles.form}>
          <h2 style={styles.formTitle}>{tx('Create Account', lang)}</h2>

          {/* Register type toggle */}
          <div style={styles.typeToggle}>
            <button
              style={{ ...styles.typeBtn, ...(registerType === 'citizen' ? styles.typeBtnActive : {}) }}
              onClick={() => { setRegisterType('citizen'); setError(''); }}>
              👤 {lang === 'hi' ? 'नागरिक' : 'Citizen'}
            </button>
            <button
              style={{ ...styles.typeBtn, ...(registerType === 'officer' ? styles.typeBtnActive : {}) }}
              onClick={() => { setRegisterType('officer'); setError(''); }}>
              🧑‍💼 {lang === 'hi' ? 'अधिकारी' : 'Field Officer'}
            </button>
          </div>

          {/* Officer info notice */}
          {registerType === 'officer' && (
            <div style={styles.officerNotice}>
              <div style={{ fontWeight: 700, color: '#92400E', fontSize: 13, marginBottom: 4 }}>
                ⏳ {lang === 'hi' ? 'अधिकारी पंजीकरण' : 'Officer Registration'}
              </div>
              <div style={{ fontSize: 12, color: '#78350F', lineHeight: 1.5 }}>
                {lang === 'hi'
                  ? 'अधिकारी खाते एडमिन अनुमोदन के बाद ही सक्रिय होते हैं। पंजीकरण के बाद आपको ईमेल मिलेगा।'
                  : 'Officer accounts require admin approval before you can login. You will be notified by email once reviewed.'}
              </div>
            </div>
          )}

          <p style={styles.formSub}>
            {registerType === 'officer'
              ? (lang === 'hi' ? 'अधिकारी खाता बनाएं — एडमिन अनुमोदन आवश्यक' : 'Create officer account — admin approval required')
              : tx('Register as a citizen to access the portal', lang)}
          </p>

          {error && <div style={styles.error}>{error}</div>}

          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>{tx('👤 Full Name *', lang)}</label>
              <input style={styles.input} placeholder={tx('Your full name', lang)}
                value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>{tx('📱 Phone Number', lang)}</label>
              <input style={styles.input} placeholder={tx('10-digit mobile', lang)}
                value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>{tx('📧 Email Address *', lang)}</label>
            <input style={styles.input} type="email" placeholder={tx('Your email address', lang)}
              value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>

          {/* Department — only for officer */}
          {registerType === 'officer' && (
            <div style={styles.formGroup}>
              <label style={styles.label}>🏢 {lang === 'hi' ? 'विभाग *' : 'Department *'}</label>
              <select style={styles.input} value={form.department}
                onChange={e => setForm(f => ({ ...f, department: e.target.value }))}>
                {departments.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
          )}

          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>{tx('🔒 Password *', lang)}</label>
              <input style={styles.input} type="password" placeholder={tx('Min 6 characters', lang)}
                value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>{tx('🔒 Confirm Password *', lang)}</label>
              <input style={styles.input} type="password" placeholder={tx('Repeat password', lang)}
                value={form.confirm} onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleRegister()} />
            </div>
          </div>

          <div style={styles.terms}>
            <input type="checkbox" id="terms" style={{ marginRight: 8 }} defaultChecked />
            <label htmlFor="terms" style={{ fontSize: 13, color: '#6B7FA3' }}>
              {lang === 'hi' ? 'मैं ' : 'I agree to the '}
              <span style={{ color: '#0F2557', fontWeight: 600 }}>{tx('Terms of Service', lang)}</span>
              {lang === 'hi' ? ' और ' : ' and '}
              <span style={{ color: '#0F2557', fontWeight: 600 }}>{tx('Privacy Policy', lang)}</span>
              {lang === 'hi' ? ' से सहमत हूं' : ''}
            </label>
          </div>

          <button style={styles.btn} onClick={handleRegister} disabled={loading}>
            {loading
              ? tx('⏳ Creating Account...', lang)
              : registerType === 'officer'
                ? (lang === 'hi' ? '📝 पंजीकरण अर्जी जमा करें' : '📝 Submit Registration Request')
                : tx('✅ Create Account', lang)}
          </button>

          <div style={styles.loginLink}>
            {tx('Already have an account?', lang)}{' '}
            <span onClick={() => navigate('/login')} style={{ color: '#0F2557', fontWeight: 700, cursor: 'pointer' }}>
              {tx('Sign in here', lang)}
            </span>
          </div>

          <div style={styles.divider}>
            <div style={styles.dividerLine} />
            <span style={styles.dividerText}>{tx('or', lang)}</span>
            <div style={styles.dividerLine} />
          </div>

          <button style={styles.btnGuest} onClick={() => navigate('/public')}>
            {tx('🌐 Continue as Guest (View Public Dashboard)', lang)}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container:      { display: 'flex', minHeight: '100vh', fontFamily: "'DM Sans',sans-serif", position: 'relative' },
  left:           { flex: 1, background: 'linear-gradient(135deg,#0F2557 0%,#1A3A6E 50%,#1E5096 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' },
  leftInner:      { maxWidth: 440 },
  leftLogo:       { display: 'flex', alignItems: 'center', gap: 14, marginBottom: 48, cursor: 'pointer' },
  emblem:         { width: 50, height: 50, borderRadius: 12, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 },
  logoText:       { fontFamily: "'Noto Serif',serif", fontSize: 18, fontWeight: 700, color: '#fff' },
  logoSub:        { fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 2 },
  leftH1:         { fontFamily: "'Noto Serif',serif", fontSize: 34, fontWeight: 700, color: '#fff', lineHeight: 1.2, marginBottom: 16 },
  leftP:          { fontSize: 15, color: 'rgba(255,255,255,0.65)', lineHeight: 1.7, marginBottom: 36 },
  features:       { display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 40 },
  featureRow:     { display: 'flex', alignItems: 'center', gap: 12 },
  featureIcon:    { width: 36, height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 },
  featureText:    { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  flags:          { display: 'flex', flexDirection: 'column', gap: 3, width: 32 },
  right:          { width: 560, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', background: '#FAFBFE', position: 'relative' },
  form:           { width: '100%', maxWidth: 460 },
  formTitle:      { fontFamily: "'Noto Serif',serif", fontSize: 26, fontWeight: 700, color: '#0F2557', marginBottom: 16 },
  typeToggle:     { display: 'flex', gap: 0, marginBottom: 20, border: '1.5px solid #D8E2F0', borderRadius: 10, overflow: 'hidden' },
  typeBtn:        { flex: 1, padding: '10px', border: 'none', background: '#fff', color: '#6B7FA3', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" },
  typeBtnActive:  { background: '#0F2557', color: '#fff' },
  officerNotice:  { background: '#FFFBEB', border: '1.5px solid #FCD34D', borderRadius: 8, padding: '12px 16px', marginBottom: 16 },
  formSub:        { fontSize: 14, color: '#6B7FA3', marginBottom: 20 },
  formRow:        { display: 'flex', gap: 14 },
  formGroup:      { marginBottom: 18, flex: 1 },
  label:          { display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13, color: '#3A4E70' },
  input:          { width: '100%', padding: '11px 14px', border: '1.5px solid #D8E2F0', borderRadius: 8, fontSize: 14, fontFamily: "'DM Sans',sans-serif", outline: 'none', background: '#fff', boxSizing: 'border-box' },
  terms:          { display: 'flex', alignItems: 'center', marginBottom: 20 },
  btn:            { width: '100%', padding: '13px', background: '#E8620A', color: '#fff', border: 'none', borderRadius: 9, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" },
  error:          { background: '#FEE2E2', color: '#C62828', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 },
  loginLink:      { textAlign: 'center', fontSize: 13, color: '#6B7FA3', marginTop: 20 },
  divider:        { display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' },
  dividerLine:    { flex: 1, height: 1, background: '#D8E2F0' },
  dividerText:    { fontSize: 13, color: '#9EB3CC' },
  btnGuest:       { width: '100%', padding: '12px', background: 'transparent', color: '#0F2557', border: '1.5px solid #D8E2F0', borderRadius: 9, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" },
};