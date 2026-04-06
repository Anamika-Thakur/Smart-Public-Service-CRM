// Backend sensitive word filter for complaint validation
// Uses bad-words library + custom Hindi/regional word list for India-specific context
const Filter = require('bad-words');

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
  
  // Regional variations
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
const hasSensitiveWords = (text) => {
  if (!text || typeof text !== 'string') return false;
  
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
 * Validates complaint text fields for sensitive words
 * @param {Object} complaintData - Complaint data object
 * @returns {Object} - { valid: boolean, field: string (if invalid) }
 */
const validateComplaintFields = (complaintData) => {
  // Check title
  if (complaintData.title && hasSensitiveWords(complaintData.title)) {
    return { valid: false, field: 'title' };
  }
  
  // Check description
  if (complaintData.description && hasSensitiveWords(complaintData.description)) {
    return { valid: false, field: 'description' };
  }
  
  // Check remarks if it exists
  if (complaintData.remarks && hasSensitiveWords(complaintData.remarks)) {
    return { valid: false, field: 'remarks' };
  }
  
  // Check location line1
  if (complaintData.location?.line1 && hasSensitiveWords(complaintData.location.line1)) {
    return { valid: false, field: 'location.line1' };
  }
  
  return { valid: true };
};

module.exports = { hasSensitiveWords, validateComplaintFields };
