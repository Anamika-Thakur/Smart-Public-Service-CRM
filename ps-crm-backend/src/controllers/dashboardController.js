const Complaint = require('../models/Complaint');
const Feedback = require('../models/Feedback');
const Feedback = require('../models/Feedback');

const getDashboardStats = async (req, res) => {
  try {
    // Total complaints
    const total      = await Complaint.countDocuments();
    const pending    = await Complaint.countDocuments({ status: 'Pending' });
    const inProgress = await Complaint.countDocuments({ status: 'In Progress' });
    const resolved   = await Complaint.countDocuments({ status: 'Resolved' });

    // Avg resolution (resolved complaints) in hours
    const resolvedComplaints = await Complaint.find({ status: 'Resolved' }).select('createdAt updatedAt');
    let avgResponse = 0;
    if (resolvedComplaints.length > 0) {
      const totalMs = resolvedComplaints.reduce((sum, c) => sum + (new Date(c.updatedAt) - new Date(c.createdAt)), 0);
      avgResponse = Math.round((totalMs / resolvedComplaints.length) / (1000 * 60 * 60) * 10) / 10;
    }

    // Monthly growth (last 30 vs previous 30 days)
    const now = new Date();
    const last30 = new Date(now); last30.setDate(last30.getDate() - 30);
    const prev30 = new Date(now); prev30.setDate(prev30.getDate() - 60);
    const last30Count = await Complaint.countDocuments({ createdAt: { $gte: last30 } });
    const prev30Count = await Complaint.countDocuments({ createdAt: { $gte: prev30, $lt: last30 } });
    let monthlyGrowth = 0;
    if (prev30Count > 0) {
      monthlyGrowth = ((last30Count - prev30Count) / prev30Count) * 100;
    } else if (last30Count > 0) {
      monthlyGrowth = 100;
    }

    // Escalated rate
    const escalated = await Complaint.countDocuments({ status: 'Escalated' });
    const escalatedRate = total > 0 ? Number(((escalated / total) * 100).toFixed(1)) : 0;

    // Citizen satisfaction from feedback
    const feedbackSummary = await Feedback.aggregate([
      { $group: { _id: null, avgRating: { $avg: '$rating' } } },
    ]);
    const citizenSatisfaction = feedbackSummary[0]?.avgRating ? Number(feedbackSummary[0].avgRating.toFixed(1)) : 0;

    // Complaints by category
    const byCategory = await Complaint.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Complaints by urgency
    const byUrgency = await Complaint.aggregate([
      { $group: { _id: '$urgency', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Complaints by ward
    const byWard = await Complaint.aggregate([
      { $match: { 'location.ward': { $exists: true, $ne: null } } },
      { $group: { _id: '$location.ward', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Recent complaints (last 5)
    const recentComplaints = await Complaint.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title category urgency status createdAt citizen.name');

    // Complaints per day (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const dailyTrend = await Complaint.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        overview: { total, pending, inProgress, resolved },
        avgResponse,
        monthlyGrowth: Number(monthlyGrowth.toFixed(1)),
        escalatedRate,
        citizenSatisfaction,
        byCategory,
        byUrgency,
        byWard,
        recentComplaints,
        dailyTrend,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Public stats - no auth required
const getPublicStats = async (req, res) => {
  try {
    const total      = await Complaint.countDocuments();
    const pending    = await Complaint.countDocuments({ status: 'Pending' });
    const resolved   = await Complaint.countDocuments({ status: 'Resolved' });
    const inProgress = await Complaint.countDocuments({ status: 'In Progress' });

    // By category
    const byCategory = await Complaint.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // By ward — only complaints that have a ward set
    const byWard = await Complaint.aggregate([
      { $match: { 'location.ward': { $exists: true, $ne: null, $ne: '' } } },
      { $group: { _id: '$location.ward', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Escalated rate
    const escalated = await Complaint.countDocuments({ status: 'Escalated' });
    const escalatedRate = total > 0 ? Number(((escalated / total) * 100).toFixed(1)) : 0;

    // Average response time (resolved cases) in hours
    const resolvedComplaints = await Complaint.find({ status: 'Resolved' }).select('createdAt updatedAt');
    let avgResponse = 0;
    if (resolvedComplaints.length > 0) {
      const totalMs = resolvedComplaints.reduce((sum, c) => sum + (new Date(c.updatedAt) - new Date(c.createdAt)), 0);
      const avgMs = totalMs / resolvedComplaints.length;
      avgResponse = Math.round((avgMs / (1000 * 60 * 60)) * 10) / 10; // hours, one decimal
    }

    // Daily trend (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const dailyTrend = await Complaint.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Customer satisfaction
    const feedbackSummary = await Feedback.aggregate([
      { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    const citizenSatisfaction = feedbackSummary[0]?.avgRating ? parseFloat(feedbackSummary[0].avgRating.toFixed(1)) : 0;

    // Monthly growth (last 30 vs previous 30 days)
    const now = new Date();
    const last30 = new Date(now);
    last30.setDate(last30.getDate() - 30);
    const prev30 = new Date(now);
    prev30.setDate(prev30.getDate() - 60);

    const last30Count = await Complaint.countDocuments({ createdAt: { $gte: last30 } });
    const prev30Count = await Complaint.countDocuments({ createdAt: { $gte: prev30, $lt: last30 } });
    let monthlyGrowth = 0;
    if (prev30Count > 0) {
      monthlyGrowth = ((last30Count - prev30Count) / prev30Count) * 100;
    } else if (last30Count > 0) {
      monthlyGrowth = 100;
    }

    res.status(200).json({
      success: true,
      data: {
        total,
        pending,
        resolved,
        inProgress,
        avgResponse,
        byCategory,
        byWard,
        dailyTrend,
        monthlyGrowth: Number(monthlyGrowth.toFixed(1)),
        citizenSatisfaction,
        escalatedRate,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getDashboardStats, getPublicStats };