const mongoose = require('mongoose');
const crypto   = require('crypto');

// ─── Sub-schemas ────────────────────────────────────────────────────────────

const imageSchema = {
  data:       { type: String },
  name:       { type: String },
  type:       { type: String },
  uploadedAt: { type: Date, default: Date.now },
};

/**
 * One entry per citizen who filed this complaint.
 * entryId is the unique, citizen-invisible identifier so that
 * individual filer details never bleed into each other.
 */
const filerSchema = new mongoose.Schema(
  {
    entryId: {
      type:    String,
      unique:  true,   // globally unique across the whole collection
      default: () => crypto.randomBytes(16).toString('hex'), // e.g. "a3f9c2…"
    },
    citizen: {
      name:  { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String },
    },
    description: { type: String },   // filer's own description of the issue
    images:      [imageSchema],      // filer's own before-images
    filedAt:     { type: Date, default: Date.now },
  },
  { _id: false }                     // no extra _id per filer sub-doc
);

// ─── Main complaint schema ───────────────────────────────────────────────────

const complaintSchema = new mongoose.Schema(
  {
    // ── Public identifier (shared across all duplicate filers) ──────────────
    complaintNumber: {
      type:   String,
      unique: true,
      sparse: true,
    }, // e.g. CMP-71705289

    // ── Deduplication fingerprint ───────────────────────────────────────────
    /**
     * SHA-256 hash of lowercase(ward + "|" + locality + "|" + category).
     * Two complaints are "the same issue" when this key matches AND
     * status is still open (Pending / In Progress).
     * Indexed for fast lookup.
     */
    duplicateKey: {
      type:  String,
      index: true,
    },

    // ── Issue details (owned by the complaint, not any single filer) ────────
    title:    { type: String, required: true },
    category: {
      type:    String,
      enum:    ['Roads', 'Water', 'Electricity', 'Sanitation', 'Other'],
      default: 'Other',
    },
    urgency: {
      type:    String,
      enum:    ['Low', 'Medium', 'High'],
      default: 'Low',
    },
    status: {
      type:    String,
      enum:    ['Pending', 'In Progress', 'Resolved', 'Escalated'],
      default: 'Pending',
    },

    // ── Location (the shared, de-duplication-relevant location) ─────────────
    location: {
      address:  { type: String },
      ward:     { type: String },
      locality: { type: String },   // ← NEW: needed for dedup fingerprint
    },

    // ── All citizens who reported this exact issue ───────────────────────────
    /**
     * Instead of a single `citizen` object, we now keep an array.
     * The FIRST element is the original filer; subsequent elements are
     * duplicate filers merged in later.
     * Each element has its own unique `entryId`.
     */
    filers: {
      type:     [filerSchema],
      default:  [],
    },

    // ── Semantic embedding of the FIRST filer's description ─────────────────
    /**
     * 768-dimension vector from Gemini text-embedding-004.
     * Stored on the complaint so incoming duplicates can be compared
     * via cosine similarity before being merged.
     * Not exposed in public-facing API responses.
     */
    descriptionEmbedding: {
      type:   [Number],
      default: undefined,   // omitted entirely when not set
      select: false,        // never returned in queries unless explicitly asked
    },

    // ── Officer / resolution fields (shared) ────────────────────────────────
    assignedTo: { type: String,  default: null },
    resolution: { type: String,  default: null },
    afterImages:[imageSchema],

    sla: {
      deadline:    { type: Date },
      escalated:   { type: Boolean, default: false },
      escalatedAt: { type: Date,    default: null },
    },
  },
  { timestamps: true }
);

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Build the deduplication key from the complaint's location + category.
 * Exported so the controller can call it before saving.
 *
 * @param {string} ward
 * @param {string} locality
 * @param {string} category
 * @returns {string} hex SHA-256 hash
 */
complaintSchema.statics.buildDuplicateKey = function (ward, locality, category) {
  const raw = [ward, locality, category]
    .map(s => (s || '').trim().toLowerCase())
    .join('|');
  return crypto.createHash('sha256').update(raw).digest('hex');
};

/**
 * Find an open complaint that matches ward + locality + category.
 * Returns null if none found.
 */
complaintSchema.statics.findOpenDuplicate = async function (ward, locality, category) {
  const key = this.buildDuplicateKey(ward, locality, category);
  return this.findOne({
    duplicateKey: key,
    status: { $in: ['Pending', 'In Progress'] },
  });
};

// ─── Auto-generate complaintNumber after first save ──────────────────────────

complaintSchema.post('save', async function (doc) {
  if (!doc.complaintNumber) {
    doc.complaintNumber = `CMP-${doc._id.toString().slice(-8).toUpperCase()}`;
    await doc.constructor.updateOne(
      { _id: doc._id },
      { complaintNumber: doc.complaintNumber }
    );
  }
});

// ─── Model ───────────────────────────────────────────────────────────────────

const Complaint = mongoose.model('Complaint', complaintSchema);
module.exports = Complaint;