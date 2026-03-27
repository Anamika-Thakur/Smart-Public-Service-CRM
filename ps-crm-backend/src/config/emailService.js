const nodemailer = require('nodemailer');

const getTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: { rejectUnauthorized: false },
  });
};

const testEmail = async () => {
  try {
    await getTransporter().verify();
    console.log('[Email] Connection verified successfully');
  } catch (error) {
    console.error('[Email] Connection failed:', error.message);
  }
};
testEmail();

// ── Shared HTML wrapper ───────────────────────────────────────────────────────
const htmlWrapper = (title, accentColor, icon, bodyHtml) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:600px;">
        <tr>
          <td style="background:linear-gradient(135deg,#0F2557 0%,#1a3a7a 100%);padding:28px 32px;text-align:center;">
            <div style="font-size:28px;margin-bottom:8px;">${icon}</div>
            <h1 style="color:#fff;margin:0;font-size:20px;font-weight:700;letter-spacing:0.5px;">PS-CRM Gov Portal</h1>
            <p style="color:rgba(255,255,255,0.7);margin:4px 0 0;font-size:12px;">Government of Delhi · Smart Public Service CRM</p>
          </td>
        </tr>
        <tr>
          <td style="background:${accentColor};padding:14px 32px;text-align:center;">
            <p style="color:#fff;margin:0;font-size:15px;font-weight:700;letter-spacing:0.3px;">${title}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            ${bodyHtml}
          </td>
        </tr>
        <tr>
          <td style="background:#f8f9fb;padding:20px 32px;border-top:1px solid #e8ecf0;text-align:center;">
            <p style="color:#888;font-size:12px;margin:0;">This is an automated message from PS-CRM System.</p>
            <p style="color:#888;font-size:12px;margin:4px 0 0;">© 2026 Government of Delhi · Smart Public Service CRM</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

// ── Complaint details table ───────────────────────────────────────────────────
const detailsTable = (rows) => `
<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:16px 0;border-radius:8px;overflow:hidden;border:1px solid #e8ecf0;">
  ${rows.map(([label, value], i) => `
  <tr style="background:${i % 2 === 0 ? '#f8f9fb' : '#fff'};">
    <td style="padding:10px 14px;font-size:13px;color:#666;font-weight:600;width:40%;border-bottom:1px solid #e8ecf0;">${label}</td>
    <td style="padding:10px 14px;font-size:13px;color:#1a1a2e;border-bottom:1px solid #e8ecf0;">${value}</td>
  </tr>`).join('')}
</table>`;

// ── Urgency badge ─────────────────────────────────────────────────────────────
const urgencyBadge = (urgency) => {
  const colors = { High: '#dc2626', Medium: '#d97706', Low: '#16a34a' };
  return `<span style="background:${colors[urgency] || '#666'};color:#fff;padding:2px 10px;border-radius:12px;font-size:12px;font-weight:700;">${urgency}</span>`;
};

// ── Track button — links using complaintNumber ────────────────────────────────
const trackButton = (complaintNumber) => `
<div style="text-align:center;margin:24px 0 8px;">
  <a href="http://localhost:3000/citizen/track?id=${complaintNumber}"
     style="background:linear-gradient(135deg,#E8620A,#F47B20);color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;display:inline-block;">
    🔍 Track Your Complaint
  </a>
</div>`;

// ── Login button ──────────────────────────────────────────────────────────────
const loginButton = () => `
<div style="text-align:center;margin:24px 0 8px;">
  <a href="http://localhost:3000/login"
     style="background:linear-gradient(135deg,#0F2557,#1a3a7a);color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;display:inline-block;">
    🔐 Login to PS-CRM Portal
  </a>
</div>`;

// ── Format complaintNumber for display (fallback to last-8 of _id) ────────────
const displayId = (complaint) =>
  complaint.complaintNumber || `CMP-${complaint._id.toString().slice(-8).toUpperCase()}`;

// ─────────────────────────────────────────────────────────────────────────────
// 1. Complaint Submitted Confirmation
// ─────────────────────────────────────────────────────────────────────────────
const sendComplaintConfirmation = async (complaint) => {
  try {
    const cid  = displayId(complaint);
    const body = `
      <p style="color:#333;font-size:15px;margin:0 0 16px;">Dear <strong>${complaint.citizen.name}</strong>,</p>
      <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 20px;">
        Your complaint has been <strong style="color:#16a34a;">successfully registered</strong> on PS-CRM.
        Our AI has classified it and it will be assigned to the appropriate officer shortly.
      </p>
      ${detailsTable([
        ['Complaint ID',  `<code style="background:#f0f4f8;padding:3px 10px;border-radius:4px;font-size:13px;font-weight:700;color:#0F2557;">${cid}</code>`],
        ['Title',         complaint.title],
        ['Category',      complaint.category],
        ['Urgency',       urgencyBadge(complaint.urgency)],
        ['Department',    complaint.department || 'Being assigned'],
        ['Status',        '<span style="color:#d97706;font-weight:700;">Pending Review</span>'],
        ['SLA Deadline',  new Date(complaint.sla.deadline).toLocaleString('en-IN')],
      ])}
      <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:14px;margin:16px 0;">
        <p style="margin:0;font-size:13px;color:#92400e;">
          💡 <strong>Save your Complaint ID: ${cid}</strong> — use it to track progress without logging in.
        </p>
      </div>
      ${trackButton(cid)}`;

    await getTransporter().sendMail({
      from:    `"PS-CRM System" <${process.env.EMAIL_USER}>`,
      to:      complaint.citizen.email,
      subject: `✅ Complaint Registered — ${complaint.title} | ID: ${cid}`,
      html:    htmlWrapper('Complaint Successfully Registered', '#16a34a', '📋', body),
    });
    console.log(`[Email] Confirmation sent to ${complaint.citizen.email} | ID: ${cid}`);
  } catch (error) {
    console.error('[Email Error] Confirmation:', error.message);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. Status Update — smart email based on new status
// ─────────────────────────────────────────────────────────────────────────────
const sendStatusUpdate = async (complaint) => {
  const status = complaint.status;
  const cid    = displayId(complaint);

  const configs = {
    'In Progress': {
      subject:      `🔄 Work Started on Your Complaint — ${complaint.title}`,
      bannerTitle:  'Officer Has Started Working on Your Complaint',
      accentColor:  '#2563eb',
      icon:         '🔄',
      message:      `An officer has been assigned to your complaint and work has officially begun. You can track the live progress using the button below.`,
      extraRows: [
        ['Assigned Officer', complaint.assignedOfficerName || 'Field Officer'],
        ['New Status',       '<span style="color:#2563eb;font-weight:700;">In Progress</span>'],
      ],
    },
    'Resolved': {
      subject:      `🎉 Complaint Resolved — ${complaint.title}`,
      bannerTitle:  'Your Complaint Has Been Resolved!',
      accentColor:  '#16a34a',
      icon:         '✅',
      message:      `Great news! Your complaint has been successfully resolved. We hope the issue has been addressed to your satisfaction.`,
      extraRows: [
        ['New Status',      '<span style="color:#16a34a;font-weight:700;">✅ Resolved</span>'],
        ['Resolution Note', complaint.resolution || 'Issue resolved by field officer'],
      ],
      feedbackNote: true,
    },
    'Escalated': {
      subject:      `🚨 Complaint Escalated — ${complaint.title}`,
      bannerTitle:  'Your Complaint Has Been Escalated',
      accentColor:  '#dc2626',
      icon:         '🚨',
      message:      `Your complaint has been escalated to a senior supervisor due to SLA breach. This ensures your issue gets priority attention immediately.`,
      extraRows: [
        ['New Status', '<span style="color:#dc2626;font-weight:700;">🚨 Escalated</span>'],
      ],
    },
  };

  const config = configs[status] || {
    subject:     `🔔 Complaint Status Update — ${complaint.title}`,
    bannerTitle: 'Your Complaint Status Has Been Updated',
    accentColor: '#6366f1',
    icon:        '🔔',
    message:     `Your complaint status has been updated. Please check below for the latest details.`,
    extraRows:   [['New Status', `<strong>${status}</strong>`]],
  };

  try {
    const body = `
      <p style="color:#333;font-size:15px;margin:0 0 16px;">Dear <strong>${complaint.citizen.name}</strong>,</p>
      <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 20px;">${config.message}</p>
      ${detailsTable([
        ['Complaint ID',  `<code style="background:#f0f4f8;padding:3px 10px;border-radius:4px;font-size:13px;font-weight:700;color:#0F2557;">${cid}</code>`],
        ['Title',         complaint.title],
        ['Category',      complaint.category],
        ['Urgency',       urgencyBadge(complaint.urgency)],
        ...config.extraRows,
        ['SLA Deadline',  new Date(complaint.sla.deadline).toLocaleString('en-IN')],
      ])}
      ${config.feedbackNote ? `
      <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:14px;margin:16px 0;">
        <p style="margin:0;font-size:13px;color:#166534;">
          ⭐ <strong>Please rate your experience</strong> — your feedback helps us improve public services.
          Log in to your dashboard to submit feedback.
        </p>
      </div>` : ''}
      ${trackButton(cid)}`;

    await getTransporter().sendMail({
      from:    `"PS-CRM System" <${process.env.EMAIL_USER}>`,
      to:      complaint.citizen.email,
      subject: config.subject,
      html:    htmlWrapper(config.bannerTitle, config.accentColor, config.icon, body),
    });
    console.log(`[Email] Status update (${status}) sent to ${complaint.citizen.email} | ID: ${cid}`);
  } catch (error) {
    console.error('[Email Error] Status update:', error.message);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. Escalation Alert to Admin
// ─────────────────────────────────────────────────────────────────────────────
const sendEscalationAlert = async (complaint) => {
  try {
    const cid  = displayId(complaint);
    const body = `
      <p style="color:#333;font-size:15px;margin:0 0 16px;">Admin Alert,</p>
      <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 20px;">
        The following complaint has <strong style="color:#dc2626;">exceeded its SLA deadline</strong> and requires immediate attention.
      </p>
      ${detailsTable([
        ['Complaint ID',  `<code style="background:#f0f4f8;padding:3px 10px;border-radius:4px;font-size:13px;font-weight:700;color:#0F2557;">${cid}</code>`],
        ['Title',         complaint.title],
        ['Category',      complaint.category],
        ['Urgency',       urgencyBadge(complaint.urgency)],
        ['Ward',          complaint.location?.ward || 'N/A'],
        ['SLA Deadline',  new Date(complaint.sla.deadline).toLocaleString('en-IN')],
        ['Citizen',       `${complaint.citizen.name} (${complaint.citizen.email})`],
      ])}
      <div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:14px;margin:16px 0;">
        <p style="margin:0;font-size:13px;color:#991b1b;">
          🚨 <strong>Immediate action required.</strong> Please assign a senior officer or escalate through proper channels.
        </p>
      </div>`;

    await getTransporter().sendMail({
      from:    `"PS-CRM System" <${process.env.EMAIL_USER}>`,
      to:      process.env.EMAIL_USER,
      subject: `🚨 SLA BREACH — Complaint Escalated: ${complaint.title} | ID: ${cid}`,
      html:    htmlWrapper('⚠️ Complaint SLA Breach — Escalation Alert', '#dc2626', '🚨', body),
    });
    console.log(`[Email] Escalation alert sent to admin | ID: ${cid}`);
  } catch (error) {
    console.error('[Email Error] Escalation:', error.message);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. Officer Registration Pending
// ─────────────────────────────────────────────────────────────────────────────
const sendOfficerPendingEmail = async ({ name, email, department }) => {
  try {
    const body = `
      <p style="color:#333;font-size:15px;margin:0 0 16px;">Dear <strong>${name}</strong>,</p>
      <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 20px;">
        Your officer registration request has been <strong>successfully received</strong>.
        Your account is currently <strong style="color:#d97706;">awaiting admin approval</strong>.
        You will receive an email notification once your account is reviewed.
      </p>
      ${detailsTable([
        ['Name',       name],
        ['Email',      email],
        ['Department', department || 'Not specified'],
        ['Status',     '<span style="color:#d97706;font-weight:700;">⏳ Pending Approval</span>'],
      ])}
      <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:14px;margin:16px 0;">
        <p style="margin:0;font-size:13px;color:#92400e;">
          ⏳ <strong>Please wait</strong> — you cannot login until your account is approved by the admin.
        </p>
      </div>`;

    await getTransporter().sendMail({
      from:    `"PS-CRM System" <${process.env.EMAIL_USER}>`,
      to:      email,
      subject: `⏳ Officer Registration Received — Awaiting Admin Approval`,
      html:    htmlWrapper('Registration Under Review', '#d97706', '⏳', body),
    });
    console.log(`[Email] Pending notice sent to ${email}`);
  } catch (error) {
    console.error('[Email Error] Officer pending:', error.message);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 5. Officer Approved
// ─────────────────────────────────────────────────────────────────────────────
const sendOfficerApprovalEmail = async (officer) => {
  try {
    const body = `
      <p style="color:#333;font-size:15px;margin:0 0 16px;">Dear <strong>${officer.name}</strong>,</p>
      <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 20px;">
        Congratulations! Your officer account has been <strong style="color:#16a34a;">approved by the admin</strong>.
        You can now login to the PS-CRM portal and start managing assigned complaints.
      </p>
      ${detailsTable([
        ['Name',       officer.name],
        ['Email',      officer.email],
        ['Department', officer.department || 'General'],
        ['Role',       'Field Officer'],
        ['Status',     '<span style="color:#16a34a;font-weight:700;">✅ Approved</span>'],
      ])}
      <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:14px;margin:16px 0;">
        <p style="margin:0;font-size:13px;color:#166534;">
          ✅ <strong>You can now login</strong> using your registered email and password.
        </p>
      </div>
      ${loginButton()}`;

    await getTransporter().sendMail({
      from:    `"PS-CRM System" <${process.env.EMAIL_USER}>`,
      to:      officer.email,
      subject: `✅ Officer Account Approved — You Can Now Login`,
      html:    htmlWrapper('Account Approved — Welcome to PS-CRM!', '#16a34a', '🎉', body),
    });
    console.log(`[Email] Approval email sent to ${officer.email}`);
  } catch (error) {
    console.error('[Email Error] Officer approval:', error.message);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 6. Officer Rejected
// ─────────────────────────────────────────────────────────────────────────────
const sendOfficerRejectionEmail = async (officer, reason) => {
  try {
    const body = `
      <p style="color:#333;font-size:15px;margin:0 0 16px;">Dear <strong>${officer.name}</strong>,</p>
      <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 20px;">
        We regret to inform you that your officer account registration has been <strong style="color:#dc2626;">rejected by the admin</strong>.
      </p>
      ${detailsTable([
        ['Name',       officer.name],
        ['Email',      officer.email],
        ['Department', officer.department || 'Not specified'],
        ['Status',     '<span style="color:#dc2626;font-weight:700;">❌ Rejected</span>'],
        ['Reason',     reason || 'No reason provided. Please contact admin.'],
      ])}
      <div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:14px;margin:16px 0;">
        <p style="margin:0;font-size:13px;color:#991b1b;">
          If you believe this is a mistake, please contact your administrator directly.
        </p>
      </div>`;

    await getTransporter().sendMail({
      from:    `"PS-CRM System" <${process.env.EMAIL_USER}>`,
      to:      officer.email,
      subject: `❌ Officer Registration Rejected — PS-CRM`,
      html:    htmlWrapper('Account Registration Rejected', '#dc2626', '❌', body),
    });
    console.log(`[Email] Rejection email sent to ${officer.email}`);
  } catch (error) {
    console.error('[Email Error] Officer rejection:', error.message);
  }
};

module.exports = {
  sendComplaintConfirmation,
  sendStatusUpdate,
  sendEscalationAlert,
  sendOfficerPendingEmail,
  sendOfficerApprovalEmail,
  sendOfficerRejectionEmail,
};