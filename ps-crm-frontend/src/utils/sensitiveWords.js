// Frontend sensitive word detection using bad-words library + custom Hindi word list
import { Filter } from 'bad-words';

// Initialize bad-words filter
const filter = new Filter();

// Custom Hindi/regional offensive words extending bad-words list
const CUSTOM_WORDS = [
  // Hindi/Devanagari offensive words (transliteration)
  'gaali', 'gali', 'randii', 'randi', 'bhenchod', 'maderchod', 'chutiya',
  'chod', 'lund', 'rand', 'harami', 'haram', 'jhandu', 'jhantu', 'nalayak',
  'bekar', 'gadha', 'gandu', 'kutte', 'suar', 'ullu', 'chirkut', 'buddu',
  'hookah', 'hathkandi', 'chapri', 'chamcha', 'makkhichaps', 'jhagda',
  'bebakof', 'badmash', 'badmaash', 'gundagardi', 'lath', 'pithau',
  'ghadha', 'khichdi', 'makhmali', 'makdi', 'chunnu', 'munnu',
  'badmaashi', 'gundaism', 'jhunjhuna', 'chappal', 'chatpati',
  
  // Regional variations (Punjabi, Marathi, Bengali influenced)
  'oye', 'sadda', 'pagal', 'paagal', 'kutta', 'soor', 'gadhe',
  'jhunjhunaa', 'chotaa', 'bhaagna', 'marwana', 'pitna', 'kata',
  'doglapan', 'bewakoof', 'bewkoof', 'nakli', 'naqli', 'nakara',
  
  // Slang and abusive references
  'teri maa', 'tera baap', 'bap re', 'aajao', 'aa jaao',
  'sale', 'kamina', 'kameena', 'dalaal', 'bhikari', 'nakaam',
  'nakamyaab', 'nateeja', 'natije', 'jaanwar', 'shaitan',
  
  // Sexual/explicit reference terms
  'jhagra', 'gunda', 'dacoit', 'lootera', 'chhor', 'chor', 'pakda',
  'marpit', 'chhanp', 'maarpeet', 'marpeet',
];

// Add custom words to filter
filter.addWords(...CUSTOM_WORDS);

/**
 * Detects sensitive/offensive words in text using bad-words + custom Hindi word list
 * @param {string} text - Text to check
 * @returns {boolean} - True if sensitive words found
 */
export const hasSensitiveWords = (text) => {
  if (!text) return false;
  
  // Check using bad-words library
  if (filter.isProfane(text)) return true;
  
  // Additional custom check for Hindi/regional words
  const lowerText = text.toLowerCase().trim();
  return CUSTOM_WORDS.some(word => {
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
