import { useLang } from '../../context/LanguageContext';
/**
 * Drop this anywhere in a header/navbar.
 * It shows "हिं" when English is active (click → switch to Hindi)
 * and "EN" when Hindi is active (click → switch to English).
 */
export default function LanguageToggle({ style = {} }) {
  const { lang, toggleLang } = useLang();

  return (
    <button onClick={toggleLang} style={{ ...btnStyle, ...style }} title="Switch Language">
      <span style={flagStyle}>{lang === 'en' ? '🇮🇳' : '🇬🇧'}</span>
      <span style={labelStyle}>{lang === 'en' ? 'हिं' : 'EN'}</span>
    </button>
  );
}

const btnStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '7px 14px',
  borderRadius: 20,
  border: '1.5px solid rgba(255,255,255,0.35)',
  background: 'rgba(255,255,255,0.12)',
  color: '#fff',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: "'DM Sans', sans-serif",
  transition: 'all 0.2s',
  backdropFilter: 'blur(4px)',
};

const flagStyle = { fontSize: 16, lineHeight: 1 };
const labelStyle = { letterSpacing: 0.5 };