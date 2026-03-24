// ps-crm-frontend/src/components/ui/Chatbot.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// ── Unique session ID ──────────────────────────────────────────────────────────
function getSessionId() {
  let id = sessionStorage.getItem('chatbot_session');
  if (!id) { id = 'sess_' + Math.random().toString(36).slice(2); sessionStorage.setItem('chatbot_session', id); }
  return id;
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = {
  // Launcher button
  launcher: {
    position: 'fixed', bottom: '28px', right: '28px', zIndex: 9999,
    width: '60px', height: '60px', borderRadius: '50%',
    background: 'linear-gradient(135deg, #1a56db 0%, #0e3fa8 100%)',
    border: 'none', cursor: 'pointer', boxShadow: '0 4px 20px rgba(26,86,219,0.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  launcherBadge: {
    position: 'absolute', top: '-4px', right: '-4px',
    width: '18px', height: '18px', borderRadius: '50%',
    background: '#e53e3e', border: '2px solid #fff',
    fontSize: '10px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 700,
  },

  // Widget window
  widget: {
    position: 'fixed', bottom: '100px', right: '28px', zIndex: 9998,
    width: '390px', maxWidth: 'calc(100vw - 40px)',
    height: '600px', maxHeight: 'calc(100vh - 130px)',
    background: '#fff', borderRadius: '20px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.18), 0 4px 20px rgba(0,0,0,0.1)',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    animation: 'chatSlideIn 0.3s cubic-bezier(0.34,1.56,0.64,1)',
  },

  // Header
  header: {
    background: 'linear-gradient(135deg, #1a56db 0%, #0e3fa8 100%)',
    padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '12px',
    flexShrink: 0,
  },
  avatar: {
    width: '40px', height: '40px', borderRadius: '50%',
    background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center',
    justifyContent: 'center', fontSize: '20px', flexShrink: 0,
  },
  headerInfo: { flex: 1, minWidth: 0 },
  headerName: { color: '#fff', fontSize: '15px', fontWeight: 600, margin: 0, lineHeight: 1.2 },
  headerSub:  { color: 'rgba(255,255,255,0.75)', fontSize: '12px', margin: 0, marginTop: '2px' },
  headerBtns: { display: 'flex', gap: '6px' },
  headerBtn:  {
    background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '8px',
    color: '#fff', width: '32px', height: '32px', cursor: 'pointer', fontSize: '14px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'background 0.15s',
  },

  // Messages
  messages: {
    flex: 1, overflowY: 'auto', padding: '16px',
    display: 'flex', flexDirection: 'column', gap: '12px',
    background: '#f8fafc',
  },

  // Bubble base
  bubbleRow: { display: 'flex', gap: '8px', alignItems: 'flex-end' },
  bubbleRowUser: { flexDirection: 'row-reverse' },
  botAvatar: {
    width: '28px', height: '28px', borderRadius: '50%',
    background: 'linear-gradient(135deg, #1a56db, #0e3fa8)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '13px', flexShrink: 0, color: '#fff',
  },
  bubble: {
    maxWidth: '78%', padding: '10px 13px', borderRadius: '16px',
    fontSize: '13.5px', lineHeight: 1.55, wordBreak: 'break-word',
  },
  bubbleBot: {
    background: '#fff', color: '#1a202c',
    borderRadius: '16px 16px 16px 4px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
  },
  bubbleUser: {
    background: 'linear-gradient(135deg, #1a56db, #0e3fa8)', color: '#fff',
    borderRadius: '16px 16px 4px 16px',
  },
  bubbleTime: { fontSize: '10.5px', color: '#a0aec0', marginTop: '3px', textAlign: 'right' },

  // Input area
  inputArea: {
    padding: '12px 14px', background: '#fff',
    borderTop: '1px solid #e2e8f0', flexShrink: 0,
    display: 'flex', gap: '8px', alignItems: 'flex-end',
  },
  input: {
    flex: 1, border: '1.5px solid #e2e8f0', borderRadius: '12px',
    padding: '9px 13px', fontSize: '13.5px', outline: 'none', resize: 'none',
    fontFamily: 'inherit', lineHeight: 1.4, maxHeight: '100px', minHeight: '38px',
    transition: 'border-color 0.15s', background: '#f8fafc', color: '#1a202c',
  },
  sendBtn: {
    width: '38px', height: '38px', borderRadius: '10px', flexShrink: 0,
    background: 'linear-gradient(135deg, #1a56db, #0e3fa8)',
    border: 'none', cursor: 'pointer', display: 'flex',
    alignItems: 'center', justifyContent: 'center', transition: 'opacity 0.15s',
  },

  // Quick reply chips
  chips: { display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' },
  chip: {
    padding: '6px 12px', borderRadius: '20px', fontSize: '12.5px', cursor: 'pointer',
    border: '1.5px solid #1a56db', color: '#1a56db', background: '#fff',
    transition: 'all 0.15s', fontFamily: 'inherit', fontWeight: 500, lineHeight: 1.2,
    whiteSpace: 'normal', textAlign: 'left',
  },

  // Cards
  card: {
    background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px',
    padding: '12px', marginTop: '6px', fontSize: '12.5px',
  },
  cardTitle:  { fontWeight: 700, fontSize: '14px', color: '#1a202c', marginBottom: '6px' },
  cardRow:    { display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #f0f4f8', gap: '8px' },
  cardLabel:  { color: '#718096', fontSize: '12px', flexShrink: 0 },
  cardValue:  { color: '#1a202c', fontSize: '12px', fontWeight: 500, textAlign: 'right' },

  // Status badge
  badge: (status) => {
    const map = {
      Pending:     { bg: '#fff8e1', color: '#b7791f' },
      'In Progress':{ bg: '#e3f2fd', color: '#1565c0' },
      Resolved:    { bg: '#e8f5e9', color: '#2e7d32' },
      Escalated:   { bg: '#fce4ec', color: '#c62828' },
    };
    const s = map[status] || { bg: '#f5f5f5', color: '#555' };
    return { padding: '2px 8px', borderRadius: '99px', fontSize: '11px', fontWeight: 600, background: s.bg, color: s.color };
  },

  // Stars
  stars: { display: 'flex', gap: '4px', margin: '8px 0' },
  star:  (active) => ({
    fontSize: '24px', cursor: 'pointer', color: active ? '#f6c90e' : '#cbd5e0',
    transition: 'color 0.1s, transform 0.1s', display: 'inline-block',
  }),

  // Ward grid
  wardGrid: { display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px' },
  wardBtn:  {
    width: '30px', height: '30px', borderRadius: '6px', fontSize: '12px',
    border: '1.5px solid #e2e8f0', background: '#fff', cursor: 'pointer',
    fontWeight: 600, color: '#2d3748', transition: 'all 0.1s',
  },

  // Typing
  typingDot: { width: '7px', height: '7px', borderRadius: '50%', background: '#a0aec0', display: 'inline-block', margin: '0 2px' },

  // Stats bar
  statBar: { background: '#edf2f7', borderRadius: '99px', height: '6px', overflow: 'hidden', margin: '4px 0 8px' },
  statFill: (pct, color) => ({ width: `${pct}%`, height: '100%', background: color, borderRadius: '99px', transition: 'width 0.6s ease' }),

  // Scheme result card
  schemeCard: {
    background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: '12px',
    padding: '10px 12px', cursor: 'pointer', transition: 'border-color 0.15s, box-shadow 0.15s',
  },
  schemeCardHeader: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' },
  schemeName: { fontWeight: 600, fontSize: '13px', color: '#1a202c', flex: 1 },
  schemeCatBadge: {
    fontSize: '10px', fontWeight: 600, padding: '2px 6px', borderRadius: '99px',
    background: '#ebf4ff', color: '#1a56db',
  },
};

// ── Helpers ────────────────────────────────────────────────────────────────────
const fmt = (date) => new Date(date).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
const fmtTime = () => new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
const HL = { text: s => s.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>').replace(/\n/g, '<br/>') };

// ── Sub-components ─────────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div style={{ ...styles.bubbleRow, alignItems: 'flex-end' }}>
      <div style={styles.botAvatar}>🏛️</div>
      <div style={{ ...styles.bubble, ...styles.bubbleBot, padding: '12px 16px' }}>
        {[0,1,2].map(i => (
          <span key={i} style={{ ...styles.typingDot, animation: `typingBounce 1.2s ${i*0.2}s infinite` }} />
        ))}
      </div>
    </div>
  );
}

function BotBubble({ text, children, time }) {
  return (
    <div style={styles.bubbleRow}>
      <div style={styles.botAvatar}>🏛️</div>
      <div style={{ maxWidth: '78%' }}>
        <div style={{ ...styles.bubble, ...styles.bubbleBot }}>
          {text && <span dangerouslySetInnerHTML={{ __html: HL.text(text) }} />}
          {children}
        </div>
        {time && <div style={styles.bubbleTime}>{time}</div>}
      </div>
    </div>
  );
}

function UserBubble({ text, time }) {
  return (
    <div style={{ ...styles.bubbleRow, ...styles.bubbleRowUser }}>
      <div style={{ ...styles.bubble, ...styles.bubbleUser }}>
        <span dangerouslySetInnerHTML={{ __html: HL.text(text) }} />
      </div>
    </div>
  );
}

function MenuMessage({ lang, onChoice }) {
  const items = lang === 'hi' ? [
    { k:'1', icon:'📝', label:'शिकायत दर्ज करें' },
    { k:'2', icon:'🔍', label:'शिकायत ट्रैक करें' },
    { k:'3', icon:'📋', label:'मेरी शिकायतें' },
    { k:'4', icon:'⭐', label:'फ़ीडबैक दें' },
    { k:'5', icon:'📊', label:'लाइव आंकड़े' },
    { k:'6', icon:'🏛️', label:'दिल्ली योजना पात्रता' },
  ] : [
    { k:'1', icon:'📝', label:'File a Complaint' },
    { k:'2', icon:'🔍', label:'Track Complaint' },
    { k:'3', icon:'📋', label:'My Complaints' },
    { k:'4', icon:'⭐', label:'Give Feedback' },
    { k:'5', icon:'📊', label:'Live Stats' },
    { k:'6', icon:'🏛️', label:'Delhi Scheme Eligibility' },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
      {items.map(item => (
        <button key={item.k} onClick={() => onChoice(item.k)} style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '9px 13px', borderRadius: '10px', border: '1.5px solid #e2e8f0',
          background: '#fff', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit',
          color: '#1a202c', transition: 'all 0.15s', textAlign: 'left', width: '100%',
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor='#1a56db'; e.currentTarget.style.background='#ebf4ff'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor='#e2e8f0'; e.currentTarget.style.background='#fff'; }}
        >
          <span style={{ fontSize: '17px' }}>{item.icon}</span>
          <span style={{ fontWeight: 500 }}>{item.label}</span>
        </button>
      ))}
    </div>
  );
}

function LangSelectMessage({ onLang }) {
  return (
    <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
      {[{ code:'en', label:'🇬🇧 English' }, { code:'hi', label:'🇮🇳 हिंदी' }].map(l => (
        <button key={l.code} onClick={() => onLang(l.code)} style={{
          ...styles.chip, flex: 1, justifyContent: 'center', display: 'flex',
          padding: '10px', fontSize: '13.5px', fontWeight: 600,
        }}>
          {l.label}
        </button>
      ))}
    </div>
  );
}

function WardSelector({ onSelect, lang }) {
  return (
    <div style={styles.wardGrid}>
      {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(w => (
        <button key={w} onClick={() => onSelect(w)} style={styles.wardBtn}
          onMouseEnter={e => { e.currentTarget.style.background='#1a56db'; e.currentTarget.style.color='#fff'; e.currentTarget.style.borderColor='#1a56db'; }}
          onMouseLeave={e => { e.currentTarget.style.background='#fff'; e.currentTarget.style.color='#2d3748'; e.currentTarget.style.borderColor='#e2e8f0'; }}
        >{w}</button>
      ))}
    </div>
  );
}

function ConfirmCard({ data, lang, onConfirm, onCancel }) {
  const hi = lang === 'hi';
  const rows = hi ? [
    ['शीर्षक', data.title],['वार्ड', `Ward ${data.ward}`],
    ['पता', data.address],['नाम', data.name],['ईमेल', data.email],
  ] : [
    ['Title', data.title],['Ward', `Ward ${data.ward}`],
    ['Address', data.address],['Name', data.name],['Email', data.email],
  ];
  return (
    <div style={styles.card}>
      {rows.map(([k,v]) => (
        <div key={k} style={styles.cardRow}>
          <span style={styles.cardLabel}>{k}</span>
          <span style={{ ...styles.cardValue, maxWidth:'60%', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{v}</span>
        </div>
      ))}
      <div style={{ display:'flex', gap:'8px', marginTop:'10px' }}>
        <button onClick={onConfirm} style={{
          flex:1, padding:'8px', borderRadius:'8px', border:'none', cursor:'pointer',
          background:'linear-gradient(135deg,#1a56db,#0e3fa8)', color:'#fff',
          fontSize:'13px', fontWeight:600, fontFamily:'inherit',
        }}>{hi ? '✅ जमा करें' : '✅ Submit'}</button>
        <button onClick={onCancel} style={{
          flex:1, padding:'8px', borderRadius:'8px', cursor:'pointer',
          border:'1.5px solid #e2e8f0', background:'#fff',
          color:'#e53e3e', fontSize:'13px', fontWeight:600, fontFamily:'inherit',
        }}>{hi ? '❌ रद्द करें' : '❌ Cancel'}</button>
      </div>
    </div>
  );
}

function SuccessCard({ data, lang }) {
  const hi = lang === 'hi';
  const urgencyColor = { High:'#e53e3e', Medium:'#dd6b20', Low:'#38a169' };
  return (
    <div style={{ ...styles.card, borderLeft:'4px solid #38a169' }}>
      <div style={{ color:'#38a169', fontWeight:700, marginBottom:'8px', fontSize:'14px' }}>
        {hi ? '✅ शिकायत सफलतापूर्वक दर्ज हुई!' : '✅ Complaint Registered!'}
      </div>
      {[
        [hi?'ID':'ID', data.id],
        [hi?'श्रेणी':'Category', data.category],
        [hi?'प्राथमिकता':'Urgency', data.urgency],
        [hi?'SLA समय सीमा':'SLA Deadline', data.sla],
      ].map(([k,v]) => (
        <div key={k} style={styles.cardRow}>
          <span style={styles.cardLabel}>{k}</span>
          <span style={k === (hi?'प्राथमिकता':'Urgency') ? { ...styles.cardValue, color: urgencyColor[v]||'#1a202c' } : styles.cardValue}>{v}</span>
        </div>
      ))}
    </div>
  );
}

function TrackResultCard({ c, lang }) {
  const hi = lang === 'hi';
  const statusIcon = { Pending:'⏳', 'In Progress':'🔄', Resolved:'✅', Escalated:'🚨' };
  const urgencyColor = { High:'#e53e3e', Medium:'#dd6b20', Low:'#38a169' };
  const days = Math.floor((new Date() - new Date(c.createdAt)) / 86400000);
  const sla  = c.sla?.deadline ? fmt(c.sla.deadline) : 'N/A';
  const overdue = c.sla?.deadline && new Date() > new Date(c.sla.deadline) && c.status !== 'Resolved';
  return (
    <div style={{ ...styles.card, borderLeft: `4px solid ${overdue?'#e53e3e':'#1a56db'}` }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px' }}>
        <span style={{ fontWeight:700, fontSize:'13.5px', color:'#1a202c' }}>
          {c.complaintNumber || `CMP-${c._id?.toString().slice(-8).toUpperCase()}`}
        </span>
        <span style={styles.badge(c.status)}>{statusIcon[c.status]||'📋'} {c.status}</span>
      </div>
      <div style={{ fontSize:'13px', color:'#4a5568', marginBottom:'8px', fontStyle:'italic' }}>{c.title}</div>
      {[
        [hi?'श्रेणी':'Category', c.category],
        [hi?'प्राथमिकता':'Urgency', c.urgency, urgencyColor[c.urgency]],
        [hi?'दर्ज तारीख':'Filed On', fmt(c.createdAt)],
        [hi?'SLA':'SLA Deadline', sla],
        [hi?'खुले दिन':'Days Open', `${days} day${days!==1?'s':''}`],
        c.location?.ward ? [hi?'वार्ड':'Ward', c.location.ward] : null,
      ].filter(Boolean).map(([k,v,color]) => (
        <div key={k} style={styles.cardRow}>
          <span style={styles.cardLabel}>{k}</span>
          <span style={{ ...styles.cardValue, ...(color ? {color} : {}) }}>{v}</span>
        </div>
      ))}
      {overdue && (
        <div style={{ marginTop:'8px', padding:'6px 10px', background:'#fff5f5', borderRadius:'8px', fontSize:'12px', color:'#c62828', fontWeight:600 }}>
          🚨 {hi ? 'समय सीमा पार — पर्यवेक्षक को सौंपा गया' : 'OVERDUE — Escalated to supervisor'}
        </div>
      )}
      {c.resolution && (
        <div style={{ marginTop:'8px', padding:'8px 10px', background:'#f0fff4', borderRadius:'8px', fontSize:'12px', color:'#276749' }}>
          <strong>{hi?'समाधान:':'Resolution:'}</strong> {c.resolution}
        </div>
      )}
    </div>
  );
}

function ComplaintListCard({ list, lang }) {
  const hi = lang === 'hi';
  const statusIcon = { Pending:'⏳', 'In Progress':'🔄', Resolved:'✅', Escalated:'🚨' };
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'6px', marginTop:'4px' }}>
      {list.slice(0,5).map((c, i) => (
        <div key={c._id} style={{ ...styles.card, padding:'9px 11px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'6px' }}>
            <span style={{ fontWeight:600, fontSize:'12.5px', color:'#1a202c', flex:1, lineHeight:1.3 }}>
              {c.title?.slice(0,45)}{c.title?.length > 45 ? '...' : ''}
            </span>
            <span style={styles.badge(c.status)}>{statusIcon[c.status]||'📋'} {c.status}</span>
          </div>
          <div style={{ fontSize:'11px', color:'#a0aec0', marginTop:'4px' }}>
            {c.complaintNumber || `CMP-${c._id?.toString().slice(-8).toUpperCase()}`} • {c.category} • {fmt(c.createdAt)}
          </div>
        </div>
      ))}
      {list.length > 5 && (
        <div style={{ textAlign:'center', fontSize:'12px', color:'#718096', padding:'4px' }}>
          +{list.length-5} {hi ? 'और शिकायतें' : 'more complaints'}
        </div>
      )}
    </div>
  );
}

function StatsCard({ data, lang }) {
  const hi = lang === 'hi';
  const resRate = data.total > 0 ? Math.round((data.resolved/data.total)*100) : 0;
  const items = hi ? [
    { label:'कुल शिकायतें', value: data.total, color:'#1a56db', icon:'📋' },
    { label:'हल हुई',       value: data.resolved, color:'#38a169', icon:'✅' },
    { label:'प्रक्रिया में', value: data.inProgress, color:'#3182ce', icon:'🔄' },
    { label:'लंबित',       value: data.pending, color:'#dd6b20', icon:'⏳' },
  ] : [
    { label:'Total',       value: data.total, color:'#1a56db', icon:'📋' },
    { label:'Resolved',    value: data.resolved, color:'#38a169', icon:'✅' },
    { label:'In Progress', value: data.inProgress, color:'#3182ce', icon:'🔄' },
    { label:'Pending',     value: data.pending, color:'#dd6b20', icon:'⏳' },
  ];
  return (
    <div style={styles.card}>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'10px' }}>
        {items.map(item => (
          <div key={item.label} style={{ background:'#f8fafc', borderRadius:'10px', padding:'8px 10px' }}>
            <div style={{ fontSize:'18px', fontWeight:700, color: item.color }}>{item.value}</div>
            <div style={{ fontSize:'11px', color:'#718096', marginTop:'1px' }}>{item.icon} {item.label}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize:'12px', color:'#718096', marginBottom:'4px' }}>
        {hi ? `समाधान दर: ${resRate}%` : `Resolution Rate: ${resRate}%`}
      </div>
      <div style={styles.statBar}><div style={styles.statFill(resRate, '#38a169')} /></div>
    </div>
  );
}

function RatingWidget({ lang, onRate }) {
  const [hovered, setHovered] = useState(0);
  const [selected, setSelected] = useState(0);
  const hi = lang === 'hi';
  const labels = hi
    ? ['','बहुत खराब','खराब','ठीक','अच्छा','बहुत अच्छा']
    : ['','Very Poor','Poor','Average','Good','Excellent'];
  return (
    <div>
      <div style={styles.stars}>
        {[1,2,3,4,5].map(n => (
          <span key={n}
            style={styles.star(n <= (hovered || selected))}
            onMouseEnter={() => setHovered(n)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => { setSelected(n); onRate(n); }}
          >★</span>
        ))}
      </div>
      {(hovered || selected) > 0 && (
        <div style={{ fontSize:'12px', color:'#718096', marginTop:'2px' }}>
          {labels[hovered || selected]}
        </div>
      )}
    </div>
  );
}

function SchemeGenderSelect({ lang, onChoice }) {
  const hi = lang === 'hi';
  const opts = hi
    ? [{ k:'1', label:'👨 पुरुष' },{ k:'2', label:'👩 महिला' },{ k:'3', label:'⚧ अन्य' }]
    : [{ k:'1', label:'👨 Male' },{ k:'2', label:'👩 Female' },{ k:'3', label:'⚧ Other' }];
  return <div style={styles.chips}>{opts.map(o => <button key={o.k} style={styles.chip} onClick={() => onChoice(o.k)}>{o.label}</button>)}</div>;
}

function SchemeIncomeSelect({ lang, onChoice }) {
  const hi = lang === 'hi';
  const opts = hi
    ? [{ k:'1', label:'₹1 लाख से कम' },{ k:'2', label:'₹1–2 लाख' },{ k:'3', label:'₹2–5 लाख' },{ k:'4', label:'₹5 लाख से अधिक' }]
    : [{ k:'1', label:'Below ₹1 Lakh' },{ k:'2', label:'₹1–2 Lakh' },{ k:'3', label:'₹2–5 Lakh' },{ k:'4', label:'Above ₹5 Lakh' }];
  return <div style={styles.chips}>{opts.map(o => <button key={o.k} style={styles.chip} onClick={() => onChoice(o.k)}>{o.label}</button>)}</div>;
}

function SchemeCasteSelect({ lang, onChoice }) {
  const hi = lang === 'hi';
  const opts = hi
    ? [{ k:'1', label:'सामान्य' },{ k:'2', label:'SC' },{ k:'3', label:'ST' },{ k:'4', label:'OBC' }]
    : [{ k:'1', label:'General' },{ k:'2', label:'SC' },{ k:'3', label:'ST' },{ k:'4', label:'OBC' }];
  return <div style={styles.chips}>{opts.map(o => <button key={o.k} style={styles.chip} onClick={() => onChoice(o.k)}>{o.label}</button>)}</div>;
}

function SchemeExtraSelect({ lang, onChoices }) {
  const [selected, setSelected] = useState(new Set());
  const hi = lang === 'hi';
  const opts = hi
    ? [{ k:'1', label:'♿ विकलांगता (40%+)' },{ k:'2', label:'👰 विधवा' },{ k:'3', label:'🌾 BPL राशन कार्ड' },{ k:'4', label:'इनमें से कोई नहीं' }]
    : [{ k:'1', label:'♿ Disability (40%+)' },{ k:'2', label:'👰 Widow' },{ k:'3', label:'🌾 BPL Ration Card' },{ k:'4', label:'None of the above' }];
  const toggle = (k) => {
    const ns = new Set(selected);
    if (k === '4') { onChoices(['4']); return; }
    if (ns.has(k)) ns.delete(k); else ns.add(k);
    setSelected(ns);
  };
  return (
    <div>
      <div style={styles.chips}>
        {opts.map(o => (
          <button key={o.k} onClick={() => toggle(o.k)} style={{
            ...styles.chip,
            background: selected.has(o.k) ? '#ebf4ff' : '#fff',
            borderColor: selected.has(o.k) ? '#1a56db' : '#e2e8f0',
          }}>{o.label}</button>
        ))}
      </div>
      {selected.size > 0 && !selected.has('4') && (
        <button onClick={() => onChoices([...selected])} style={{
          marginTop:'8px', padding:'7px 16px', borderRadius:'8px', border:'none',
          background:'linear-gradient(135deg,#1a56db,#0e3fa8)', color:'#fff',
          fontSize:'12.5px', fontWeight:600, cursor:'pointer', fontFamily:'inherit',
        }}>
          {hi ? 'पात्रता जाँचें →' : 'Check Eligibility →'}
        </button>
      )}
    </div>
  );
}

function SchemeResultCard({ eligible, partial, lang, onSchemeClick }) {
  const hi = lang === 'hi';
  const catEmoji = { Financial:'💰', Education:'📚', Housing:'🏠', Health:'🏥', Employment:'💼', Food:'🌾' };
  if (eligible.length === 0) {
    return (
      <div style={{ ...styles.card, textAlign:'center', padding:'16px' }}>
        <div style={{ fontSize:'28px', marginBottom:'8px' }}>📋</div>
        <div style={{ fontSize:'13px', color:'#718096' }}>
          {hi ? 'आपके प्रोफाइल के अनुसार अभी कोई योजना नहीं मिली।' : 'No schemes matched your current profile.'}
        </div>
      </div>
    );
  }
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
      <div style={{ fontSize:'12px', color:'#718096', fontWeight:600, marginBottom:'2px' }}>
        {hi ? `${eligible.length} योजनाएं मिलीं` : `${eligible.length} scheme${eligible.length!==1?'s':''} found`} 🎯
      </div>
      {eligible.map((s, i) => (
        <div key={s.id} style={styles.schemeCard}
          onClick={() => onSchemeClick(i+1, s)}
          onMouseEnter={e => { e.currentTarget.style.borderColor='#1a56db'; e.currentTarget.style.boxShadow='0 2px 8px rgba(26,86,219,0.12)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor='#e2e8f0'; e.currentTarget.style.boxShadow='none'; }}
        >
          <div style={styles.schemeCardHeader}>
            <span style={{ fontSize:'16px' }}>{catEmoji[s.category]||'📌'}</span>
            <span style={styles.schemeName}>{hi ? s.nameHi : s.name}</span>
            <span style={styles.schemeCatBadge}>{hi ? s.categoryHi : s.category}</span>
          </div>
          <div style={{ fontSize:'12px', color:'#718096', lineHeight:1.4 }}>{hi ? s.descriptionHi : s.description}</div>
          <div style={{ fontSize:'11px', color:'#1a56db', marginTop:'5px', fontWeight:500 }}>
            {hi ? 'विवरण देखें →' : 'Tap for details →'}
          </div>
        </div>
      ))}
      {partial.length > 0 && (
        <div style={{ ...styles.card, background:'#fffbeb', borderColor:'#f6ad55' }}>
          <div style={{ fontSize:'12px', fontWeight:600, color:'#b7791f', marginBottom:'6px' }}>
            ⚠️ {hi ? 'लगभग पात्र' : 'Almost Eligible'}
          </div>
          {partial.slice(0,3).map(({ scheme, reasons }) => (
            <div key={scheme.id} style={{ fontSize:'11.5px', color:'#744210', marginBottom:'3px' }}>
              • {hi ? scheme.nameHi : scheme.name} — {reasons.join(', ')}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SchemeDetailCard({ scheme, lang }) {
  const hi = lang === 'hi';
  const docs = hi ? scheme.documentsHi : scheme.documents;
  return (
    <div style={{ ...styles.card, borderLeft:'4px solid #1a56db' }}>
      <div style={{ ...styles.cardTitle, color:'#1a56db' }}>
        {hi ? scheme.nameHi : scheme.name}
      </div>
      <div style={{ fontSize:'12.5px', color:'#4a5568', marginBottom:'10px', lineHeight:1.4 }}>
        {hi ? scheme.descriptionHi : scheme.description}
      </div>
      <div style={{ fontSize:'11.5px', fontWeight:700, color:'#2d3748', marginBottom:'5px' }}>
        📁 {hi ? 'आवश्यक दस्तावेज:' : 'Documents needed:'}
      </div>
      {docs.map((d,i) => (
        <div key={i} style={{ fontSize:'12px', color:'#4a5568', padding:'2px 0', paddingLeft:'10px' }}>• {d}</div>
      ))}
      <div style={{ marginTop:'10px', padding:'8px 10px', background:'#ebf4ff', borderRadius:'8px' }}>
        <div style={{ fontSize:'11.5px', fontWeight:700, color:'#1a56db', marginBottom:'3px' }}>
          🌐 {hi ? 'आवेदन कहाँ करें:' : 'Apply at:'}
        </div>
        <div style={{ fontSize:'12px', color:'#2b6cb0' }}>{hi ? scheme.applyAtHi : scheme.applyAt}</div>
      </div>
    </div>
  );
}

// ── Main Chatbot Component ─────────────────────────────────────────────────────
export default function Chatbot() {
  const [open, setOpen]       = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput]     = useState('');
  const [typing, setTyping]   = useState(false);
  const [lang, setLang]       = useState(null);
  const [currentStep, setCurrentStep] = useState('LANG_SELECT');
  const [unread, setUnread]   = useState(1);
  const sessionId             = useRef(getSessionId());
  const messagesEndRef        = useRef(null);
  const inputRef              = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, typing]);

  useEffect(() => {
    if (open) {
      setUnread(0);
      if (messages.length === 0) initChat();
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [open]);

  const initChat = async () => {
    await sendToBot('', { action: 'reset' });
  };

  const addMessage = (role, content) => {
    setMessages(prev => [...prev, { role, content, time: fmtTime(), id: Date.now() + Math.random() }]);
  };

  const sendToBot = async (text, extra = {}) => {
    setTyping(true);
    try {
      const { data } = await axios.post(`${API}/chatbot/message`, {
        message: text, sessionId: sessionId.current, extra,
      });
      const resp = data.response;
      setTyping(false);

      // Update lang from response type
      if (resp.type === 'menu') {
        setCurrentStep('MENU');
      } else if (resp.type === 'langSelect') {
        setCurrentStep('LANG_SELECT');
        setLang(null);
      }

      addMessage('bot', resp);
    } catch (err) {
      setTyping(false);
      addMessage('bot', { type: 'error', text: 'Connection error. Please try again.' });
    }
  };

  const handleUserSend = async (text, extra = {}) => {
    const displayText = extra._display || text;
    if (displayText) addMessage('user', { type: 'text', text: displayText });
    await sendToBot(text, extra);
  };

  const handleInput = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.trim()) handleUserSend(input.trim());
      setInput('');
    }
  };

  const handleSendBtn = () => {
    if (input.trim()) { handleUserSend(input.trim()); setInput(''); }
  };

  // ── Render a single bot message ────────────────────────────────────────────
  const renderBotContent = (msg, idx) => {
    const { content, time } = msg;
    const l = lang || 'en';

    switch (content.type) {
      case 'langSelect':
        return (
          <BotBubble key={msg.id} text={content.text} time={time}>
            <LangSelectMessage onLang={(code) => {
              setLang(code);
              addMessage('user', { type:'text', text: code === 'hi' ? '🇮🇳 हिंदी' : '🇬🇧 English' });
              sendToBot('', { lang: code });
            }} />
          </BotBubble>
        );

      case 'menu':
        return (
          <BotBubble key={msg.id} text={content.text} time={time}>
            <MenuMessage lang={l} onChoice={(k) => {
              const labels = l === 'hi'
                ? { '1':'📝 शिकायत दर्ज करें','2':'🔍 शिकायत ट्रैक करें','3':'📋 मेरी शिकायतें','4':'⭐ फ़ीडबैक दें','5':'📊 लाइव आंकड़े','6':'🏛️ दिल्ली योजना पात्रता' }
                : { '1':'📝 File a Complaint','2':'🔍 Track Complaint','3':'📋 My Complaints','4':'⭐ Give Feedback','5':'📊 Live Stats','6':'🏛️ Delhi Scheme Eligibility' };
              addMessage('user', { type:'text', text: labels[k] || k });
              sendToBot('', { choice: k });
            }} />
          </BotBubble>
        );

      case 'ward':
        return (
          <BotBubble key={msg.id} text={content.text} time={time}>
            <WardSelector lang={l} onSelect={(w) => {
              addMessage('user', { type:'text', text: `📍 Ward ${w}` });
              sendToBot('', { ward: w });
            }} />
          </BotBubble>
        );

      case 'confirm':
        return (
          <BotBubble key={msg.id} text={content.text} time={time}>
            <ConfirmCard data={content.data} lang={l}
              onConfirm={() => { addMessage('user',{type:'text',text: l==='hi'?'✅ जमा करें':'✅ Submit'}); sendToBot('', {confirm:true}); }}
              onCancel={() => { addMessage('user',{type:'text',text: l==='hi'?'❌ रद्द करें':'❌ Cancel'}); sendToBot('NO'); }}
            />
          </BotBubble>
        );

      case 'success':
        return (
          <BotBubble key={msg.id} text={content.text} time={time}>
            {content.data && <SuccessCard data={content.data} lang={l} />}
          </BotBubble>
        );

      case 'trackResult':
        return (
          <BotBubble key={msg.id} text={l==='hi'?'शिकायत विवरण यहाँ है:':'Here are the complaint details:'} time={time}>
            <TrackResultCard c={content.data} lang={l} />
          </BotBubble>
        );

      case 'complaintList':
        return (
          <BotBubble key={msg.id} text={l==='hi'?`आपकी ${content.data.length} शिकायतें मिलीं:`:`Found ${content.data.length} complaint${content.data.length!==1?'s':''}:`} time={time}>
            <ComplaintListCard list={content.data} lang={l} />
          </BotBubble>
        );

      case 'stats':
        return (
          <BotBubble key={msg.id} text={l==='hi'?'📊 PS-CRM लाइव आंकड़े:':'📊 PS-CRM Live Statistics:'} time={time}>
            <StatsCard data={content.data} lang={l} />
          </BotBubble>
        );

      case 'rating':
        return (
          <BotBubble key={msg.id} text={content.text} time={time}>
            <RatingWidget lang={l} onRate={(n) => {
              addMessage('user', { type:'text', text:`${'★'.repeat(n)}${'☆'.repeat(5-n)} (${n}/5)` });
              sendToBot('', { rating: n });
            }} />
          </BotBubble>
        );

      case 'schemeGender':
        return (
          <BotBubble key={msg.id} text={content.text} time={time}>
            <SchemeGenderSelect lang={l} onChoice={(k) => {
              const labels = l==='hi' ? {'1':'👨 पुरुष','2':'👩 महिला','3':'⚧ अन्य'} : {'1':'👨 Male','2':'👩 Female','3':'⚧ Other'};
              addMessage('user',{type:'text',text:labels[k]||k});
              sendToBot('',{choice:k});
            }} />
          </BotBubble>
        );

      case 'schemeIncome':
        return (
          <BotBubble key={msg.id} text={content.text} time={time}>
            <SchemeIncomeSelect lang={l} onChoice={(k) => {
              const labels = l==='hi'
                ? {'1':'₹1 लाख से कम','2':'₹1–2 लाख','3':'₹2–5 लाख','4':'₹5 लाख से अधिक'}
                : {'1':'Below ₹1 Lakh','2':'₹1–2 Lakh','3':'₹2–5 Lakh','4':'Above ₹5 Lakh'};
              addMessage('user',{type:'text',text:labels[k]||k});
              sendToBot('',{choice:k});
            }} />
          </BotBubble>
        );

      case 'schemeCaste':
        return (
          <BotBubble key={msg.id} text={content.text} time={time}>
            <SchemeCasteSelect lang={l} onChoice={(k) => {
              const labels = l==='hi' ? {'1':'सामान्य','2':'SC','3':'ST','4':'OBC'} : {'1':'General','2':'SC','3':'ST','4':'OBC'};
              addMessage('user',{type:'text',text:labels[k]||k});
              sendToBot('',{choice:k});
            }} />
          </BotBubble>
        );

      case 'schemeExtra':
        return (
          <BotBubble key={msg.id} text={content.text} time={time}>
            <SchemeExtraSelect lang={l} onChoices={(choices) => {
              addMessage('user',{type:'text', text: choices.includes('4') ? (l==='hi'?'कोई नहीं':'None') : `Selected: ${choices.join(', ')}`});
              sendToBot('',{choices});
            }} />
          </BotBubble>
        );

      case 'schemeResult':
        return (
          <BotBubble key={msg.id}
            text={l==='hi' ? 'आपके लिए पात्र योजनाएं नीचे हैं। विवरण के लिए किसी पर क्लिक करें।' : 'Here are schemes you qualify for. Tap any to see full details.'}
            time={time}
          >
            <SchemeResultCard
              eligible={content.data.eligible}
              partial={content.data.partial}
              lang={l}
              onSchemeClick={(num, scheme) => {
                addMessage('user', { type:'text', text: l==='hi' ? `📄 ${scheme.nameHi}` : `📄 ${scheme.name}` });
                sendToBot('', { schemeIdx: num });
              }}
            />
          </BotBubble>
        );

      case 'schemeDetail':
        return (
          <BotBubble key={msg.id}
            text={l==='hi' ? 'योजना का पूरा विवरण:' : 'Full scheme details:'}
            time={time}
          >
            <SchemeDetailCard scheme={content.data} lang={l} />
          </BotBubble>
        );

      case 'error':
        return (
          <BotBubble key={msg.id} time={time}>
            <div style={{ color:'#c62828', fontSize:'13px' }}>❌ {content.text}</div>
          </BotBubble>
        );

      default:
        return <BotBubble key={msg.id} text={content.text} time={time} />;
    }
  };

  const hi = lang === 'hi';

  return (
    <>
      {/* ── CSS Animations ── */}
      <style>{`
        @keyframes chatSlideIn {
          from { opacity:0; transform: scale(0.85) translateY(20px); }
          to   { opacity:1; transform: scale(1) translateY(0); }
        }
        @keyframes typingBounce {
          0%,60%,100% { transform: translateY(0); opacity:0.4; }
          30%          { transform: translateY(-5px); opacity:1; }
        }
        .chatbot-input:focus { border-color: #1a56db !important; background:#fff !important; }
        .chatbot-send:hover  { opacity: 0.85; }
        .chatbot-launcher:hover { transform:scale(1.08); box-shadow: 0 6px 28px rgba(26,86,219,0.55) !important; }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:#e2e8f0; border-radius:99px; }
      `}</style>

      {/* ── Launcher Button ── */}
      <button
        className="chatbot-launcher"
        style={styles.launcher}
        onClick={() => setOpen(o => !o)}
        title={hi ? 'चैटबॉट खोलें' : 'Open chatbot'}
      >
        {open
          ? <svg width="22" height="22" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="4" x2="4" y2="18"/><line x1="4" y1="4" x2="18" y2="18"/></svg>
          : <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
        }
        {!open && unread > 0 && <div style={styles.launcherBadge}>{unread}</div>}
      </button>

      {/* ── Chat Window ── */}
      {open && (
        <div style={styles.widget}>
          {/* Header */}
          <div style={styles.header}>
            <div style={styles.avatar}>🏛️</div>
            <div style={styles.headerInfo}>
              <p style={styles.headerName}>PS-CRM Assistant</p>
              <p style={styles.headerSub}>
                <span style={{ width:'7px', height:'7px', borderRadius:'50%', background:'#4ade80', display:'inline-block', marginRight:'5px', verticalAlign:'middle' }} />
                {hi ? 'ऑनलाइन' : 'Online'}
              </p>
            </div>
            <div style={styles.headerBtns}>
              {lang && (
                <button style={styles.headerBtn} title={hi?'Reset / Back':'रीसेट'}
                  onClick={() => { handleUserSend('', { action:'menu', _display:'' }); }}
                >
                  🏠
                </button>
              )}
              <button style={styles.headerBtn} title="Close" onClick={() => setOpen(false)}>
                <svg width="14" height="14" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="2" x2="2" y2="12"/><line x1="2" y1="2" x2="12" y2="12"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div style={styles.messages}>
            {messages.map((msg, idx) =>
              msg.role === 'bot'
                ? renderBotContent(msg, idx)
                : <UserBubble key={msg.id} text={msg.content.text} time={msg.time} />
            )}
            {typing && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={styles.inputArea}>
            <textarea
              ref={inputRef}
              className="chatbot-input"
              style={styles.input}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleInput}
              placeholder={hi ? 'यहाँ टाइप करें...' : 'Type a message...'}
              rows={1}
            />
            <button
              className="chatbot-send"
              style={{ ...styles.sendBtn, opacity: input.trim() ? 1 : 0.5 }}
              onClick={handleSendBtn}
              disabled={!input.trim()}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}