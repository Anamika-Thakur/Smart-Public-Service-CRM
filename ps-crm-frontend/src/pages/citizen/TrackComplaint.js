import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLang, tx } from '../../context/LanguageContext';
import API from '../../api';

export default function TrackComplaint() {
  const navigate = useNavigate();
  const { lang } = useLang();
  const [complaintId, setComplaintId] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let id = params.get('id');
    if (id) {
      id = id.toUpperCase();
      if (!id.startsWith('CMP-')) id = `CMP-${id}`;
      setComplaintId(id);
      setLoading(true);
      API.get(`/complaints/track/${id}`)
        .then(res => { setComplaint(res.data.data); setLoading(false); })
        .catch(() => { setError('Complaint not found.'); setLoading(false); });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTrack = async () => {
    let input = complaintId.trim().toUpperCase();
    if (!input) {
      setError(lang === 'hi'
        ? 'कृपया शिकायत आईडी दर्ज करें।'
        : 'Please enter a complaint ID.');
      return;
    }
    // Auto-prefix CMP- if user typed just the number part
    if (!input.startsWith('CMP-')) input = `CMP-${input}`;
    setLoading(true);
    setError('');
    setComplaint(null);
    try {
      const res = await API.get(`/complaints/track/${input}`);
      setComplaint(res.data.data);
    } catch (err) {
      setError(lang === 'hi'
        ? 'शिकायत नहीं मिली। कृपया शिकायत आईडी जांचें।'
        : 'Complaint not found. Please check the complaint ID.');
    }
    setLoading(false);
  };

  const handlePrint = () => window.print();

  const handleEmail = async () => {
    if (!complaint) return;
    const subject = `${lang === 'hi' ? 'शिकायत प्रगति रिपोर्ट' : 'Complaint Progress Report'} - ${displayComplaintId(complaint)}`;
    const body = `
${lang === 'hi' ? 'शिकायत प्रगति रिपोर्ट' : 'Complaint Progress Report'}

${lang === 'hi' ? 'शिकायत आईडी' : 'Complaint ID'}: ${displayComplaintId(complaint)}
${lang === 'hi' ? 'शीर्षक' : 'Title'}: ${complaint.title}
${lang === 'hi' ? 'स्थिति' : 'Status'}: ${tx(complaint.status, lang)}
${lang === 'hi' ? 'श्रेणी' : 'Category'}: ${tx(complaint.category, lang)}
${lang === 'hi' ? 'प्राथमिकता' : 'Priority'}: ${tx(complaint.urgency, lang)}

${lang === 'hi' ? 'विवरण' : 'Description'}:
${complaint.description || ''}

${lang === 'hi' ? 'इसे देखने के लिए यहां क्लिक करें' : 'Click here to view'}: ${window.location.origin}/citizen/track?id=${complaint._id || displayComplaintId(complaint)}
    `.trim();
    
    const emailLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = emailLink;
  };

  const handleEmailDuplicate = async () => {
    if (!complaint) return;
    const subject = `${lang === 'hi' ? 'डुप्लिकेट शिकायत जांच' : 'Duplicate Complaint Check'} - ${displayComplaintId(complaint)}`;
    const body = lang === 'hi'
      ? `कृपया निम्नलिखित शिकायत आईडी की डुप्लिकेट जांच करें:\n\nशिकायत आईडी: ${displayComplaintId(complaint)}`
      : `Please check the following complaint ID for duplicates:\n\nComplaint ID: ${displayComplaintId(complaint)}`;
    
    const emailLink = `mailto:grievance@pscrm.gov.in?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = emailLink;
  };

  const handleSendToEmail = async () => {
    if (!userEmail || !complaint) {
      setError(lang === 'hi' ? 'कृपया ईमेल दर्ज करें।' : 'Please enter an email address.');
      return;
    }
    
    try {
      const subject = `${lang === 'hi' ? 'शिकायत प्रगति रिपोर्ट' : 'Complaint Progress Report'} - ${displayComplaintId(complaint)}`;
      const body = `
${lang === 'hi' ? 'शिकायत प्रगति रिपोर्ट' : 'Complaint Progress Report'}

${lang === 'hi' ? 'शिकायत आईडी' : 'Complaint ID'}: ${displayComplaintId(complaint)}
${lang === 'hi' ? 'शीर्षक' : 'Title'}: ${complaint.title}
${lang === 'hi' ? 'स्थिति' : 'Status'}: ${tx(complaint.status, lang)}
${lang === 'hi' ? 'श्रेणी' : 'Category'}: ${tx(complaint.category, lang)}
${lang === 'hi' ? 'प्राथमिकता' : 'Priority'}: ${tx(complaint.urgency, lang)}

${lang === 'hi' ? 'विवरण' : 'Description'}:
${complaint.description || ''}

${lang === 'hi' ? 'लिंक' : 'Link'}: ${window.location.href}
      `.trim();
      
      const emailLink = `mailto:${userEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.location.href = emailLink;
      setError('');
    } catch (err) {
      setError(lang === 'hi' ? 'ईमेल भेजने में त्रुटि हुई।' : 'Error sending email.');
    }
  };

  const statusSteps = ['Pending', 'In Progress', 'Resolved'];
  const currentStep = complaint ? statusSteps.indexOf(complaint.status) : -1;

  const statusColor = {
    Pending:       { bg: '#FEF3C7', color: '#D97706' },
    'In Progress': { bg: '#DBEAFE', color: '#2563EB' },
    Resolved:      { bg: '#DCFCE7', color: '#16A34A' },
    Escalated:     { bg: '#FEE2E2', color: '#DC2626' },
  };

  const buildTimeline = (c) => {
    const events = [];
    if (c.createdAt) {
      events.push({
        icon: '📝', label: 'Complaint Filed',
        desc: lang === 'hi'
          ? `${c.citizen?.name || 'नागरिक'} द्वारा शिकायत दर्ज की गई`
          : `Complaint submitted by ${c.citizen?.name || 'Citizen'}`,
        time: c.createdAt, color: '#0F2557', done: true,
      });
    }
    if (c.assignedTo) {
      events.push({
        icon: '👮', label: 'Officer Assigned',
        desc: lang === 'hi'
          ? 'समीक्षा और कार्रवाई के लिए अधिकारी को सौंपा गया'
          : 'Assigned to officer for review and action',
        time: c.updatedAt, color: '#2563EB', done: true,
      });
    }
    if (c.status === 'In Progress' || c.status === 'Resolved') {
      events.push({
        icon: '🔄', label: 'Work In Progress',
        desc: lang === 'hi'
          ? 'अधिकारी ने शिकायत पर काम शुरू कर दिया है'
          : 'Officer has started working on the complaint',
        time: c.updatedAt, color: '#7C3AED', done: true,
      });
    }
    if (c.status === 'Resolved') {
      events.push({
        icon: '✅', label: 'Complaint Resolved',
        desc: c.resolution || (lang === 'hi' ? 'विभाग द्वारा समस्या हल कर दी गई है' : 'Issue has been resolved by the department'),
        time: c.updatedAt, color: '#16A34A', done: true,
      });
    }
    if (c.status === 'Escalated') {
      events.push({
        icon: '🚨', label: 'Escalated',
        desc: lang === 'hi'
          ? 'SLA समय सीमा पार हो गई — पर्यवेक्षक को एस्केलेट किया गया'
          : 'SLA deadline exceeded — escalated to supervisor',
        time: c.updatedAt, color: '#DC2626', done: true,
      });
    }
    if (c.status !== 'Resolved' && c.status !== 'Escalated') {
      events.push({
        icon: '⏳', label: 'Awaiting Resolution',
        desc: lang === 'hi'
          ? 'नियुक्त अधिकारी द्वारा बंद होने की प्रतीक्षा'
          : 'Pending closure by the assigned officer',
        time: null, color: '#D97706', done: false,
      });
    }
    return events;
  };

  const fmt = (iso) => iso
    ? new Date(iso).toLocaleString(lang === 'hi' ? 'hi-IN' : 'en-IN', {
        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
      })
    : null;

  // Display ID: use complaintNumber if available, else fallback
  const displayComplaintId = (c) =>
    c.complaintNumber || `CMP-${c._id?.slice(-8).toUpperCase()}`;

  return (
    <div style={styles.page}>

      {/* Lightbox */}
      {lightbox && (
        <div style={styles.lightboxOverlay} onClick={() => setLightbox(null)}>
          <div style={styles.lightboxBox} onClick={e => e.stopPropagation()}>
            <button style={styles.lightboxClose} onClick={() => setLightbox(null)}>✕</button>
            <img src={lightbox.src} alt={lightbox.name} style={styles.lightboxImg} />
            <div style={styles.lightboxCaption}>{lightbox.name}</div>
          </div>
        </div>
      )}

      {/* Top Bar */}
      <div style={{ background: '#0F2557', height: 34, display: 'flex', alignItems: 'center', padding: '0 40px', borderBottom: '3px solid #E8620A' }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>
          {tx('Government of Delhi · Ministry of Personnel, Public Grievances & Pensions', lang)}
        </span>
      </div>

      {/* Header */}
      <header style={styles.header}>
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
          <button style={styles.btnOutline} onClick={() => navigate('/citizen/submit')}>
            {tx('📝 File a Complaint', lang)}
          </button>
        </div>
      </header>

      <div style={styles.container}>
        <div style={styles.pageHead}>
          <button 
            style={styles.backBtn} 
            onClick={() => navigate('/citizen')}
            className="no-print"
          >
            ← {tx('Back', lang)}
          </button>
          <h1 style={styles.pageTitle}>{tx('🔍 Track Your Complaint', lang)}</h1>
          <p style={styles.pageSub}>{tx('Enter your complaint ID to see real-time status, photos, and progress report', lang)}</p>
        </div>

        {/* Search Box */}
        <div style={styles.searchCard}>
          <div style={styles.searchInner}>
            <div style={{ flex: 1 }}>
              <label style={styles.label}>{tx('Complaint ID', lang)}</label>
              <input
                style={styles.input}
                placeholder={lang === 'hi' ? 'जैसे: CMP-71705289 या 71705289' : 'e.g. CMP-71705289 or just 71705289'}
                value={complaintId}
                onChange={e => setComplaintId(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleTrack()}
              />
            </div>
            <div style={{ flex: 1, marginLeft: 12 }}>
              <label style={styles.label}>{tx('Email', lang)}</label>
              <input
                style={styles.input}
                placeholder={lang === 'hi' ? 'आपका ईमेल' : 'Your email'}
                type="email"
                value={userEmail}
                onChange={e => setUserEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && complaint && handleSendToEmail()}
              />
            </div>
            <button style={styles.btnTrack} onClick={handleTrack} disabled={loading}>
              {loading ? tx('⏳ Searching...', lang) : tx('🔍 Track', lang)}
            </button>
          </div>
          {complaint && userEmail && (
            <button style={{ ...styles.btnOrange, width: '100%', marginTop: 12, padding: '10px 0' }} onClick={handleSendToEmail}>
              {tx('📧 Send to Email', lang)}
            </button>
          )}
          <div style={{ fontSize: 12, color: '#9BADC0', marginTop: 10 }}>
            💡 {lang === 'hi'
              ? 'शिकायत आईडी के आधार पर केवल आपकी शिकायत ट्रैक की जाएगी।'
              : 'Complaint tracking is now based solely on the complaint ID.'}
          </div>
          {error && <div style={styles.error}>{error}</div>}
        </div>

        {/* Result */}
        {complaint && (
          <>
            {/* Print Header */}
            <div style={styles.printHeader}>
              <strong>PS-CRM — {lang === 'hi' ? 'शिकायत प्रगति रिपोर्ट' : 'Complaint Progress Report'}</strong><br />
              {lang === 'hi' ? 'शिकायत आईडी' : 'Complaint ID'}: {displayComplaintId(complaint)} · {lang === 'hi' ? 'तैयार किया गया' : 'Generated'}: {new Date().toLocaleString(lang === 'hi' ? 'hi-IN' : 'en-IN')}
            </div>

            {/* Action Bar */}
            <div style={styles.actionBar}>
              <div style={{ fontSize: 14, color: '#6B7FA3' }}>
                {lang === 'hi' ? 'परिणाम दिखाया जा रहा है' : 'Showing results for'}{' '}
                <strong style={{ color: '#0F2557' }}>{displayComplaintId(complaint)}</strong>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button style={styles.btnPrint} onClick={handleEmailDuplicate}>
                  {tx('📧 Report Duplicate', lang)}
                </button>
                <button style={styles.btnPrint} onClick={handleEmail}>
                  {tx('📧 Email Report', lang)}
                </button>
                <button style={styles.btnPrint} onClick={handlePrint}>
                  {tx('🖨️ Print / Save Report', lang)}
                </button>
              </div>
            </div>

            <div style={styles.resultGrid}>

              {/* LEFT COLUMN */}
              <div>
                {/* Complaint Details Card */}
                <div style={styles.card}>
                  <div style={styles.cardTitle}>{tx('📋 Complaint Details', lang)}</div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, gap: 12 }}>
                    <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0F2557', margin: 0 }}>{complaint.title}</h2>
                    <span style={{ ...styles.badge, background: statusColor[complaint.status]?.bg, color: statusColor[complaint.status]?.color, whiteSpace: 'nowrap' }}>
                      {tx(complaint.status, lang)}
                    </span>
                  </div>

                  {/* Progress Stepper */}
                  {complaint.status !== 'Escalated' && (
                    <div style={styles.stepperWrap}>
                      {statusSteps.map((s, i) => (
                        <div key={s} style={styles.stepperItem}>
                          {i > 0 && (
                            <div style={{ ...styles.stepperLine, background: i <= currentStep ? '#1B7A3E' : '#D8E2F0' }} />
                          )}
                          <div style={{ ...styles.stepperDot, background: i <= currentStep ? '#1B7A3E' : '#D8E2F0', color: i <= currentStep ? '#fff' : '#6B7FA3', boxShadow: i === currentStep ? '0 0 0 4px rgba(27,122,62,0.15)' : 'none' }}>
                            {i < currentStep ? '✓' : i + 1}
                          </div>
                          <div style={{ fontSize: 11, color: i <= currentStep ? '#1B7A3E' : '#9BADC0', fontWeight: i === currentStep ? 700 : 400, marginTop: 8, textAlign: 'center' }}>
                            {tx(s, lang)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Details Grid */}
                  <div style={styles.detailGrid}>
                    {[
                      { k: tx('Complaint ID', lang),  v: displayComplaintId(complaint) },
                      { k: tx('Category', lang),       v: tx(complaint.category, lang) },
                      { k: tx('Urgency', lang),        v: tx(complaint.urgency, lang) },
                      { k: tx('Ward', lang),           v: complaint.location?.ward || 'N/A' },
                      { k: tx('Submitted On', lang),   v: new Date(complaint.createdAt).toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) },
                      { k: tx('SLA Deadline', lang),   v: complaint.sla?.deadline ? new Date(complaint.sla.deadline).toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A' },
                    ].map((d, i) => (
                      <div key={i} style={styles.detailItem}>
                        <div style={styles.detailKey}>{d.k}</div>
                        <div style={styles.detailVal}>{d.v}</div>
                      </div>
                    ))}
                  </div>

                  {/* Description */}
                  <div style={styles.descBox}>
                    <div style={styles.descLabel}>{tx('Description', lang)}</div>
                    <div style={styles.descText}>
                      {complaint.description?.trim() || (() => {
                        const title = complaint.title?.trim() || tx('public service issue', lang);
                        const category = complaint.category ? tx(complaint.category, lang).toLowerCase() : tx('public service', lang);
                        const urgency = complaint.urgency ? tx(complaint.urgency, lang).toLowerCase() : tx('priority', lang);
                        const ward = complaint.location?.ward || tx('the concerned ward', lang);
                        const locality = complaint.location?.locality?.trim();
                        const locationText = locality ? `${locality}, ${ward}` : ward;

                        return lang === 'hi'
                          ? `यह शिकायत ${locationText} में ${category} श्रेणी के अंतर्गत ${title} से संबंधित प्रतीत होती है और इसे ${urgency} प्राथमिकता के रूप में दर्ज किया गया है। क्षेत्रीय अधिकारी को स्थल का निरीक्षण करके समस्या के कारण की पुष्टि करनी चाहिए और आवश्यक सुधारात्मक कार्रवाई करनी चाहिए।`
                          : `This complaint appears to concern ${title.toLowerCase()} under the ${category} category at ${locationText} and has been marked as ${urgency} priority. The field officer should inspect the site, verify the cause of the issue, and take the necessary corrective action on the ground.`;
                      })()}
                    </div>
                  </div>

                  {/* Resolution Note */}
                  {complaint.resolution && (
                    <div style={{ ...styles.descBox, background: '#DCFCE7', borderColor: '#86EFAC', marginTop: 12 }}>
                      <div style={{ ...styles.descLabel, color: '#16A34A' }}>{tx('✅ Resolution Note', lang)}</div>
                      <div style={styles.descText}>{complaint.resolution}</div>
                    </div>
                  )}
                </div>

                {/* Evidence Photos */}
                {complaint.images?.length > 0 && (
                  <div style={{ ...styles.card, marginTop: 20 }}>
                    <div style={styles.cardTitle}>
                      {tx('📸 Evidence Photos', lang)} ({complaint.images.length})
                    </div>
                    <div style={styles.photoGrid}>
                      {complaint.images.map((img, i) => (
                        <div key={i} style={styles.photoCard} onClick={() => setLightbox({ src: img.data, name: img.name || `Photo ${i + 1}` })}>
                          <img src={img.data} alt={img.name || `Evidence ${i + 1}`} style={styles.photoImg} />
                          <div style={styles.photoFooter}>
                            <span style={styles.photoName}>{img.name?.slice(0, 20) || `Photo ${i + 1}`}</span>
                            <span style={styles.photoView}>🔍 {lang === 'hi' ? 'देखें' : 'View'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize: 12, color: '#6B7FA3', marginTop: 12 }}>
                      {tx('💡 Click any photo to view full size', lang)}
                    </div>
                  </div>
                )}

                {/* Progress Timeline */}
                <div style={{ ...styles.card, marginTop: 20 }}>
                  <div style={styles.cardTitle}>{tx('📅 Progress Timeline', lang)}</div>
                  <div style={styles.timeline}>
                    {buildTimeline(complaint).map((ev, i, arr) => (
                      <div key={i} style={styles.timelineRow}>
                        <div style={styles.timelineLeft}>
                          <div style={{ ...styles.timelineDot, background: ev.done ? ev.color : '#D8E2F0', boxShadow: ev.done ? `0 0 0 4px ${ev.color}22` : 'none' }}>
                            <span style={{ fontSize: 14 }}>{ev.icon}</span>
                          </div>
                          {i < arr.length - 1 && (
                            <div style={{ ...styles.timelineConnector, background: arr[i + 1].done ? ev.color : '#E2E8F4' }} />
                          )}
                        </div>
                        <div style={{ ...styles.timelineContent, opacity: ev.done ? 1 : 0.5 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
                            <div style={{ fontWeight: 700, fontSize: 14, color: ev.done ? '#0F2557' : '#9BADC0' }}>
                              {tx(ev.label, lang)}
                            </div>
                            {ev.time && (
                              <div style={styles.timelineTime}>{fmt(ev.time)}</div>
                            )}
                          </div>
                          <div style={{ fontSize: 13, color: '#6B7FA3', marginTop: 4, lineHeight: 1.6 }}>{ev.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN */}
              <div>
                {/* Citizen Info */}
                <div style={styles.card}>
                  <div style={styles.cardTitle}>{tx('👤 Citizen Info', lang)}</div>
                  {[
                    { k: lang === 'hi' ? 'नाम' : 'Name',   v: complaint.citizen?.name },
                    { k: lang === 'hi' ? 'ईमेल' : 'Email', v: complaint.citizen?.email },
                    { k: lang === 'hi' ? 'फ़ोन' : 'Phone', v: complaint.citizen?.phone || 'N/A' },
                  ].map((d, i) => (
                    <div key={i} style={{ marginBottom: 14 }}>
                      <div style={styles.detailKey}>{d.k}</div>
                      <div style={{ fontSize: 14, color: '#0F2557', fontWeight: 600 }}>{d.v}</div>
                    </div>
                  ))}
                </div>

                {/* SLA Status */}
                <div style={{ ...styles.card, marginTop: 16 }}>
                  <div style={styles.cardTitle}>{tx('⏱️ SLA Status', lang)}</div>
                  {(() => {
                    const deadline = new Date(complaint.sla?.deadline);
                    const now = new Date();
                    const diff = deadline - now;
                    const hoursLeft = Math.floor(diff / (1000 * 60 * 60));
                    const isOverdue = diff < 0;
                    const isResolved = complaint.status === 'Resolved';
                    return (
                      <div style={{ textAlign: 'center', padding: '20px 0' }}>
                        <div style={{ fontSize: 36, fontWeight: 700, color: isResolved ? '#16A34A' : isOverdue ? '#DC2626' : '#0F2557', marginBottom: 8 }}>
                          {isResolved ? '✅' : isOverdue ? tx('OVERDUE', lang) : `${hoursLeft}h`}
                        </div>
                        <div style={{ fontSize: 13, color: '#6B7FA3' }}>
                          {isResolved
                            ? tx('Complaint resolved successfully', lang)
                            : isOverdue
                              ? tx('SLA deadline has passed', lang)
                              : tx('remaining until deadline', lang)}
                        </div>
                        <div style={{ marginTop: 12, padding: '8px 16px', borderRadius: 8, background: isResolved ? '#DCFCE7' : isOverdue ? '#FEE2E2' : '#EEF2FF', color: isResolved ? '#16A34A' : isOverdue ? '#DC2626' : '#0F2557', fontSize: 12, fontWeight: 700 }}>
                          {isResolved
                            ? tx('🎉 Closed on time', lang)
                            : isOverdue
                              ? tx('🚨 Escalated to supervisor', lang)
                              : tx('✅ Within SLA timeline', lang)}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Quick Stats */}
                <div style={{ ...styles.card, marginTop: 16 }}>
                  <div style={styles.cardTitle}>{tx('📊 Quick Stats', lang)}</div>
                  {[
                    { icon: '📅', label: tx('Days Open', lang),        value: Math.floor((new Date() - new Date(complaint.createdAt)) / (1000 * 60 * 60 * 24)) },
                    { icon: '📸', label: tx('Photos Attached', lang),  value: complaint.images?.length || 0 },
                    { icon: '🏷️', label: tx('Priority', lang),         value: tx(complaint.urgency || 'Low', lang) },
                    { icon: '🗂️', label: tx('Department', lang),       value: tx(complaint.category || 'Other', lang) },
                  ].map((s, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < 3 ? '1px solid #F0F4FB' : 'none' }}>
                      <div style={{ fontSize: 13, color: '#6B7FA3' }}>{s.icon} {s.label}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#0F2557' }}>{s.value}</div>
                    </div>
                  ))}
                </div>

                {/* Need Help */}
                <div style={{ ...styles.card, marginTop: 16 }}>
                  <div style={styles.cardTitle}>{tx('🔔 Need Help?', lang)}</div>
                  <p style={{ fontSize: 13, color: '#6B7FA3', marginBottom: 16 }}>
                    {tx('If your complaint is overdue or you need assistance:', lang)}
                  </p>
                  <button style={{ ...styles.btnOrange, width: '100%', padding: '11px 0', borderRadius: 9 }} onClick={() => navigate('/citizen/submit')}>
                    {tx('📝 File New Complaint', lang)}
                  </button>
                  <button style={{ ...styles.btnOutline, width: '100%', padding: '11px 0', borderRadius: 9, marginTop: 10, textAlign: 'center' }} onClick={handlePrint}>
                    {tx('🖨️ Download Report', lang)}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Empty State */}
        {!complaint && !error && (
          <div style={styles.emptyState}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🔍</div>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: '#0F2557', marginBottom: 8 }}>
              {tx('Track Your Complaint', lang)}
            </h3>
            <p style={{ color: '#6B7FA3', fontSize: 14 }}>
              {tx('Enter the complaint ID you received after submission to see real-time status, photos, and full progress timeline', lang)}
            </p>
          </div>
        )}
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-header { display: block !important; }
          body { background: white; }
        }
        .print-header { display: none; }
      `}</style>
    </div>
  );
}

const styles = {
  page: { fontFamily: "'DM Sans',sans-serif", background: '#F4F6FB', minHeight: '100vh' },
  header: { background: '#fff', borderBottom: '1px solid #D8E2F0', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 40px', boxShadow: '0 2px 12px rgba(15,37,87,0.08)' },
  container: { maxWidth: 1100, margin: '0 auto', padding: '40px' },
  pageHead: { marginBottom: 28 },
  backBtn: { padding: '8px 16px', borderRadius: 8, border: '1.5px solid #D8E2F0', background: '#fff', color: '#0F2557', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 16, display: 'inline-flex', alignItems: 'center', gap: 6 },
  pageTitle: { fontFamily: "'Noto Serif',serif", fontSize: 26, fontWeight: 700, color: '#0F2557', marginBottom: 6 },
  pageSub: { color: '#6B7FA3', fontSize: 14 },
  searchCard: { background: '#fff', borderRadius: 12, padding: 28, boxShadow: '0 2px 12px rgba(15,37,87,0.06)', marginBottom: 28 },
  searchInner: { display: 'flex', gap: 16, alignItems: 'flex-end' },
  label: { display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13, color: '#3A4E70' },
  input: { width: '100%', padding: '11px 14px', border: '1.5px solid #D8E2F0', borderRadius: 8, fontSize: 14, fontFamily: "'DM Sans',sans-serif", outline: 'none', boxSizing: 'border-box' },
  btnTrack: { padding: '11px 28px', background: '#0F2557', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' },
  btnOrange: { padding: '7px 16px', borderRadius: 8, border: 'none', background: '#E8620A', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  btnOutline: { padding: '7px 16px', borderRadius: 8, border: '1.5px solid #0F2557', color: '#0F2557', background: 'transparent', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  btnPrint: { padding: '8px 18px', borderRadius: 8, border: '1.5px solid #0F2557', color: '#0F2557', background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  error: { background: '#FEE2E2', color: '#C62828', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginTop: 12 },
  actionBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  printHeader: { display: 'none', marginBottom: 20, fontSize: 14, color: '#0F2557', borderBottom: '2px solid #0F2557', paddingBottom: 10 },
  resultGrid: { display: 'grid', gridTemplateColumns: '1.5fr 0.5fr', gap: 20 },
  card: { background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 12px rgba(15,37,87,0.06)' },
  cardTitle: { fontWeight: 700, fontSize: 15, color: '#0F2557', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #F0F4FB' },
  badge: { padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700 },
  stepperWrap: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, position: 'relative', paddingTop: 8 },
  stepperItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, position: 'relative' },
  stepperLine: { position: 'absolute', top: 14, right: '50%', width: '100%', height: 2, zIndex: 0 },
  stepperDot: { width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, zIndex: 1 },
  detailGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 },
  detailItem: { padding: '12px 14px', background: '#F8FAFC', borderRadius: 8 },
  detailKey: { fontSize: 11, color: '#6B7FA3', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  detailVal: { fontSize: 14, color: '#0F2557', fontWeight: 700 },
  descBox: { background: '#F8FAFC', borderRadius: 8, padding: 16, border: '1px solid #E8EEF8' },
  descLabel: { fontSize: 12, fontWeight: 700, color: '#6B7FA3', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  descText: { fontSize: 14, color: '#3A4E70', lineHeight: 1.7 },
  photoGrid: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginTop: 4 },
  photoCard: { borderRadius: 10, overflow: 'hidden', border: '1.5px solid #D8E2F0', cursor: 'pointer' },
  photoImg: { width: '100%', height: 160, objectFit: 'cover', display: 'block' },
  photoFooter: { padding: '8px 10px', background: '#F8FAFC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  photoName: { fontSize: 11, color: '#6B7FA3' },
  photoView: { fontSize: 11, color: '#0F2557', fontWeight: 600 },
  timeline: { display: 'flex', flexDirection: 'column', gap: 0 },
  timelineRow: { display: 'flex', gap: 16, minHeight: 70 },
  timelineLeft: { display: 'flex', flexDirection: 'column', alignItems: 'center', width: 44, flexShrink: 0 },
  timelineDot: { width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  timelineConnector: { width: 2, flex: 1, minHeight: 20, margin: '4px 0' },
  timelineContent: { paddingBottom: 20, paddingTop: 10, flex: 1 },
  timelineTime: { fontSize: 11, color: '#9BADC0', background: '#F0F4FB', padding: '3px 8px', borderRadius: 6, fontWeight: 500 },
  lightboxOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  lightboxBox: { position: 'relative', maxWidth: '90vw', maxHeight: '90vh', background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' },
  lightboxClose: { position: 'absolute', top: 12, right: 12, width: 32, height: 32, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', fontSize: 14, cursor: 'pointer', zIndex: 1, fontWeight: 700 },
  lightboxImg: { maxWidth: '90vw', maxHeight: '80vh', display: 'block', objectFit: 'contain' },
  lightboxCaption: { padding: '10px 16px', fontSize: 13, color: '#6B7FA3', textAlign: 'center', background: '#F8FAFC' },
  emptyState: { textAlign: 'center', padding: '80px 20px', color: '#6B7FA3' },
};
