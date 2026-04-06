// Custom sensitive word list extending bad-words package
// Includes English offensive words and Hindi/regional abusive terms commonly used in India

const SENSITIVE_WORDS = [
  // Common English offensive words
  'damn', 'hell', 'bastard', 'asshole', 'idiot', 'stupid', 'moron',
  'retard', 'crap', 'piss', 'sucks', 'shit', 'suck', 'fuck', 'fucking',
  'bitched', 'bitching', 'bitch', 'asshat', 'jackass', 'douchebag',
  
  // Hindi/Devanagari offensive words (transliteration and meanings)
  // Gaali, abusive terms commonly used
  'gaali', 'gali', 'randii', 'randi', 'bhenchod', 'maderchod', 'chutiya',
  'chod', 'lund', 'rand', 'harami', 'haram', 'jhandu', 'jhantu', 'nalayak',
  'bekar', 'gadha', 'gandu', 'kutte', 'suar', 'ullu', 'chirkut', 'buddu',
  'hookah', 'hathkandi', 'chapri', 'chamcha', 'makkhichaps', 'jhagda',
  'bebakof', 'badmash', 'badmaash', 'gundagardi', 'lath', 'pithau',
  'ghadha', 'khichdi', 'makhmali', 'makdi', 'chunnu', 'munnu',
  'badmaashi', 'gundaism', 'jhunjhuna', 'chappal', 'chatpati',
  
  // Regional variations (Punjabi, Marathi, Bengali influenced)
  'oye', 'sadda', 'pagal', 'paagal', 'ullu', 'kutta', 'soor', 'gadhe',
  'jhunjhunaa', 'chotaa', 'bhaagna', 'marwana', 'pitna', 'kata',
  'doglapan', 'bewakoof', 'bewkoof', 'nakli', 'naqli', 'nakara',
  
  // Slang and abusive references
  'teri maa', 'tera baap', 'bap re', 'aajao', 'aa jaao',
  'sale', 'kamina', 'kameena', 'dalaal', 'bhikari', 'nakaam',
  'nakamyaab', 'nateeja', 'natije', 'jaanwar', 'shaitan', 'haram',
  
  // Sexual/explicit reference terms
  'jhagra', 'gunda', 'dacoit', 'lootera', 'chhor', 'chor', 'pakda',
  'marpit', 'jhunjhuna', 'chhanp', 'maarpeet', 'marpeet',
];

/**
 * Detects sensitive/offensive words in text
 * @param {string} text - Text to check
 * @returns {boolean} - True if sensitive words found
 */
export const hasSensitiveWords = (text) => {
  if (!text) return false;
  
  const lowerText = text.toLowerCase().trim();
  
  // Check against word list
  return SENSITIVE_WORDS.some(word => {
    // Use word boundaries to avoid partial matches
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    return regex.test(lowerText);
  });
};

/**
 * Gets the error message for sensitive words
 * @param {string} lang - Language ('en' or 'hi')
 * @returns {string} - Error message
 */
export const getSensitiveWordErrorMessage = (lang = 'en') => {
  if (lang === 'hi') {
    return 'आपकी शिकायत में अनुचित भाषा है। कृपया पुनः लिखें।';
  }
  return 'Your complaint contains inappropriate language. Please rephrase.';
};

export default { hasSensitiveWords, getSensitiveWordErrorMessage };
