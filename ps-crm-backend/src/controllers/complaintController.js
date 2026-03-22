const Complaint = require('../models/Complaint');
const { setSLADeadline } = require('../config/slaService');
const { sendComplaintConfirmation, sendStatusUpdate } = require('../config/emailService');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// ─── Helpers ─────────────────────────────────────────────────────────────────

const parseImages = (rawImages) => {
  if (!rawImages) return [];
  const arr = typeof rawImages === 'string' ? JSON.parse(rawImages) : rawImages;
  if (!Array.isArray(arr)) return [];
  return arr.map(img => ({
    data:       img.data       || '',
    name:       img.name       || 'image',
    type:       img.type       || 'image/jpeg',
    uploadedAt: new Date(),
  }));
};

/**
 * Urgency rank — used to escalate the shared complaint when a new
 * filer reports higher urgency than the current one.
 */
const URGENCY_RANK = { Low: 1, Medium: 2, High: 3 };

/**
 * Similarity threshold — cosine similarity must exceed this value
 * for two descriptions to be treated as the same issue.
 * 0.82 means ~82% semantic overlap. Tune up (stricter) or down (looser)
 * based on real-world testing.
 */
const SIMILARITY_THRESHOLD = 0.82;

// ─── Semantic helpers ─────────────────────────────────────────────────────────

/**
 * Call Gemini text-embedding-004 and return a 768-dim float array.
 * Falls back to null if the API call fails so we degrade gracefully.
 *
 * @param {string} text
 * @returns {Promise<number[]|null>}
 */
const getEmbedding = async (text) => {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
    const result = await model.embedContent(text);
    return result.embedding.values;          // array of 768 numbers
  } catch (err) {
    console.error('Embedding error (non-fatal):', err.message);
    return null;
  }
};

/**
 * Cosine similarity between two equal-length vectors.
 * Returns a value between -1 and 1; higher = more similar.
 *
 * @param {number[]} a
 * @param {number[]} b
 * @returns {number}
 */
const cosineSimilarity = (a, b) => {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot   += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};

// ─── POST /api/complaints ────────────────────────────────────────────────────

const submitComplaint = async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      urgency   = 'Low',
      location  = {},     // { address, ward, locality }
      citizen   = {},     // { name, email, phone }
      images,
      ...rest
    } = req.body;

    const { ward = '', locality = '', address = '' } = location;
    const deadline = setSLADeadline(urgency);

    // ── 1. Build the exact dedup fingerprint (ward + locality + category) ───
    const duplicateKey = Complaint.buildDuplicateKey(ward, locality, category);

    // ── 2. Generate embedding for the incoming description ──────────────────
    //    We embed title + description together for richer context.
    const incomingText      = `${title} ${description}`.trim();
    const incomingEmbedding = await getEmbedding(incomingText);

    // ── 3. Fetch ALL open complaints with matching location+category ─────────
    //    (could be more than one if somehow multiple exist — we pick the best)
    const candidates = await Complaint
      .find({
        duplicateKey,
        status: { $in: ['Pending', 'In Progress'] },
      })
      .select('+descriptionEmbedding');   // embedding is select:false, opt-in here

    // ── 4. Semantic matching against candidates ──────────────────────────────
    let bestMatch    = null;
    let bestScore    = -1;

    for (const candidate of candidates) {
      // If either side has no embedding (API failed), fall back to exact match
      // (treat any candidate in same ward+locality+category as a duplicate)
      if (!incomingEmbedding || !candidate.descriptionEmbedding?.length) {
        if (!bestMatch) bestMatch = candidate;   // take first as fallback
        continue;
      }

      const score = cosineSimilarity(incomingEmbedding, candidate.descriptionEmbedding);
      console.log(`Semantic similarity vs ${candidate.complaintNumber}: ${score.toFixed(4)}`);

      if (score > bestScore) {
        bestScore = score;
        bestMatch = score >= SIMILARITY_THRESHOLD ? candidate : null;
      }
    }

    if (bestMatch) {
      // ── DUPLICATE PATH ──────────────────────────────────────────────────
      const newFiler = {
        citizen: {
          name:  citizen.name  || '',
          email: citizen.email || '',
          phone: citizen.phone || '',
        },
        description,
        images:  parseImages(images),
        filedAt: new Date(),
      };

      const updateOps = { $push: { filers: newFiler } };
      if (URGENCY_RANK[urgency] > URGENCY_RANK[bestMatch.urgency]) {
        updateOps.$set = { urgency };
      }

      await Complaint.updateOne({ _id: bestMatch._id }, updateOps);
      const merged = await Complaint.findById(bestMatch._id);

      sendComplaintConfirmation({
        ...merged.toObject(),
        citizen:      newFiler.citizen,
        _isDuplicate: true,
      });

      return res.status(200).json({
        success:      true,
        isDuplicate:  true,
        similarityScore: bestScore > 0 ? parseFloat(bestScore.toFixed(4)) : null,
        message: `Your complaint has been linked to an existing report: ${merged.complaintNumber}. A single officer will resolve it.`,
        data: merged,
      });
    }

    // ── FRESH COMPLAINT PATH ─────────────────────────────────────────────────
    const complaint = await Complaint.create({
      ...rest,
      title,
      category,
      urgency,
      duplicateKey,
      descriptionEmbedding: incomingEmbedding ?? undefined,
      location: { address, ward, locality },
      filers: [
        {
          citizen: {
            name:  citizen.name  || '',
            email: citizen.email || '',
            phone: citizen.phone || '',
          },
          description,
          images:  parseImages(images),
          filedAt: new Date(),
        },
      ],
      sla: { deadline, escalated: false, escalatedAt: null },
    });

    const savedComplaint = await Complaint.findById(complaint._id);

    sendComplaintConfirmation({
      ...savedComplaint.toObject(),
      citizen: savedComplaint.filers[0]?.citizen || {},
    });

    return res.status(201).json({ success: true, isDuplicate: false, data: savedComplaint });

  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ─── GET /api/complaints — All complaints (admin only) ──────────────────────

const getAllComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: complaints });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET /api/complaints/track/:complaintNumber — Public track ───────────────

const getComplaintByNumber = async (req, res) => {
  try {
    const complaintNumber = req.params.complaintNumber.toUpperCase();
    const email = (req.query.email || '').trim().toLowerCase();

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Filer email is required to track a complaint.',
      });
    }

    const complaint = await Complaint.findOne({
      complaintNumber,
      'filers.citizen.email': email,
    });

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found for this complaint number and email.',
      });
    }

    const matchedFiler = complaint.filers.find(
      (filer) => (filer.citizen?.email || '').trim().toLowerCase() === email
    );

    const complaintData = complaint.toObject();
    complaintData.citizen = matchedFiler?.citizen || complaintData.filers?.[0]?.citizen || null;
    complaintData.description = matchedFiler?.description || complaintData.filers?.[0]?.description || '';
    complaintData.images = matchedFiler?.images || [];

    res.status(200).json({ success: true, data: complaintData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET /api/complaints/:id — Single complaint by MongoDB _id ───────────────

const getComplaintById = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }
    res.status(200).json({ success: true, data: complaint });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── PUT /api/complaints/:id ─────────────────────────────────────────────────

const updateComplaintStatus = async (req, res) => {
  try {
    const { status, resolution, assignedTo, afterImages } = req.body;

    const updateFields = {
      ...(status                   && { status }),
      ...(resolution               && { resolution }),
      ...(assignedTo !== undefined && { assignedTo }),
    };

    const parsedAfterImages = parseImages(afterImages);
    if (parsedAfterImages.length > 0) {
      updateFields.afterImages = parsedAfterImages;
    }

    const complaint = await Complaint.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true }
    );

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

// Populate officer name for email
    const populatedComplaint = await Complaint.findById(complaint._id).lean();
    if (populatedComplaint.assignedTo) {
      const User = require('../models/User');
      const officer = await User.findById(populatedComplaint.assignedTo).select('name');
      populatedComplaint.assignedOfficerName = officer?.name || 'Field Officer';
    }

    // Send status update to ALL filers so everyone is notified
    for (const filer of (populatedComplaint.filers || [])) {
      sendStatusUpdate({
        ...populatedComplaint,
        citizen: filer.citizen,
      });
    }

    res.status(200).json({ success: true, data: complaint });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET /api/complaints/my ──────────────────────────────────────────────────
// Searches inside the filers array so merged complaints still appear
// for every citizen who reported them.

const getMyComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find({
      'filers.citizen.email': req.user.email,
    }).sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: complaints });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET /api/complaints/assigned ───────────────────────────────────────────

const getAssignedComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find({ assignedTo: req.user._id.toString() })
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: complaints });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── POST /api/complaints/classify ──────────────────────────────────────────

const classifyComplaint = async (req, res) => {
  try {
    const { title, description } = req.body;

    if (!title && !description) {
      return res.status(400).json({ success: false, message: 'Title or description required' });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `You are a government complaint classification system for India.
Classify this public complaint into exactly one category from: Roads, Water, Electricity, Sanitation, Other.
Also determine urgency: High, Medium, or Low.
Also provide the responsible department from: PWD Department, Jal Board, Electricity Board, Municipal Corp, General Dept.

Complaint Title: "${title || ''}"
Complaint Description: "${description || ''}"

Rules:
- Roads: potholes, road damage, footpath, bridge, pavement issues
- Water: water supply, pipe leaks, drainage, flooding, tap water issues
- Electricity: streetlights, power cuts, electrical wires, transformer issues
- Sanitation: garbage, waste collection, sewage, drain blockage, cleanliness
- Other: anything that doesn't fit above

Respond ONLY with valid JSON, no markdown, no extra text:
{"category":"Roads","urgency":"High","department":"PWD Department","reason":"One line explanation"}`;

    const result = await model.generateContent(prompt);
    const raw = result.response.text().replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(raw);

    const validCategories = ['Roads', 'Water', 'Electricity', 'Sanitation', 'Other'];
    const validUrgencies  = ['High', 'Medium', 'Low'];
    const validDepts      = ['PWD Department', 'Jal Board', 'Electricity Board', 'Municipal Corp', 'General Dept'];

    res.status(200).json({
      success: true,
      data: {
        category:   validCategories.includes(parsed.category)  ? parsed.category   : 'Other',
        urgency:    validUrgencies.includes(parsed.urgency)    ? parsed.urgency    : 'Low',
        department: validDepts.includes(parsed.department)     ? parsed.department : 'General Dept',
        reason:     parsed.reason || 'Classified by AI',
      }
    });

  } catch (error) {
    console.error('Gemini classification error:', error.message);
    const text = `${req.body.title || ''} ${req.body.description || ''}`.toLowerCase();
    let category = 'Other', urgency = 'Low', department = 'General Dept', reason = 'Keyword-based classification';

    if (['pothole','road','footpath','bridge','pavement','highway','street','tar'].some(k => text.includes(k))) {
      category = 'Roads'; urgency = 'High'; department = 'PWD Department'; reason = 'Road or infrastructure issue detected';
    } else if (['water','pipe','supply','leak','flood','drainage','tap','borewell'].some(k => text.includes(k))) {
      category = 'Water'; urgency = 'High'; department = 'Jal Board'; reason = 'Water supply or drainage issue detected';
    } else if (['light','electricity','power','wire','transformer','electric','bulb','streetlight'].some(k => text.includes(k))) {
      category = 'Electricity'; urgency = 'Medium'; department = 'Electricity Board'; reason = 'Electricity or lighting issue detected';
    } else if (['garbage','waste','sanitation','trash','smell','sewage','drain','dustbin','litter'].some(k => text.includes(k))) {
      category = 'Sanitation'; urgency = 'High'; department = 'Municipal Corp'; reason = 'Sanitation or waste issue detected';
    }

    res.status(200).json({ success: true, data: { category, urgency, department, reason } });
  }
};

// ─── Exports ─────────────────────────────────────────────────────────────────

module.exports = {
  submitComplaint,
  getAllComplaints,
  getComplaintByNumber,
  getComplaintById,
  updateComplaintStatus,
  getMyComplaints,
  getAssignedComplaints,
  classifyComplaint,
};
