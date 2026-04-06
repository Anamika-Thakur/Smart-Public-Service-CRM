// Backend sensitive word filter for complaint validation
const SENSITIVE_WORDS = [
  // Common English offensive words
  'damn', 'hell', 'bastard', 'asshole', 'idiot', 'stupid', 'moron',
  'retard', 'crap', 'piss', 'sucks', 'shit', 'suck', 'fuck', 'fucking',
  'bitched', 'bitching', 'bitch', 'asshat', 'jackass', 'douchebag',
  
  // Hindi/Devanagari offensive words (transliteration)
  'gaali', 'gali', 'randii', 'randi', 'bhenchod', 'maderchod', 'chutiya',
  'chod', 'lund', 'rand', 'harami', 'haram', 'jhandu', 'jhantu', 'nalayak',
  'bekar', 'gadha', 'gandu', 'kutte', 'suar', 'ullu', 'chirkut', 'buddu',
  'hookah', 'hathkandi', 'chapri', 'chamcha', 'makkhichaps', 'jhagda',
  'bebakof', 'badmash', 'badmaash', 'gundagardi', 'lath', 'pithau',
  'ghadha', 'khichdi', 'makhmali', 'makdi', 'chunnu', 'munnu',
  'badmaashi', 'gundaism', 'jhunjhuna', 'chappal', 'chatpati',
  
  // Regional variations
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
const hasSensitiveWords = (text) => {
  if (!text || typeof text !== 'string') return false;
  
  const lowerText = text.toLowerCase().trim();
  
  // Check against word list
  return SENSITIVE_WORDS.some(word => {
    // Use word boundaries to avoid partial matches
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
