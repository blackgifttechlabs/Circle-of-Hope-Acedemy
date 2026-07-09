import admin from 'firebase-admin';
import nodemailer from 'nodemailer';

const APPLICATIONS_COLLECTION = 'applications';
const AUTOMATED_REPLIES_COLLECTION = 'automated_replies';
const DEFAULT_SCHOOL_NAME = 'Circle of Hope Academy';
const SCHOOL_LOGO_URL = process.env.MAIL_SCHOOL_LOGO_URL
  || (process.env.APP_PUBLIC_URL ? `${process.env.APP_PUBLIC_URL.replace(/\/$/, '')}/logo.png` : '/logo.png');
const SCHOOL_CONTACTS = {
  phonePrimary: '+264 81 666 4074',
  phoneSecondary: '+264 85 266 4074',
  email: 'circleofhopeacademy@yahoo.com',
  paymentEmail: 'acoha67@gmail.com',
  website: 'www.coha-academy.com',
  address: 'Elcin Centre Old Ongwediva, Oshana Region, Namibia',
  postal: 'P.O. Box 3675, Ondangwa',
};

const getServiceAccount = () => {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (projectId && clientEmail && privateKey) {
    return { projectId, clientEmail, privateKey };
  }

  throw new Error('Missing Firebase service account environment variables.');
};

const getAdminApp = () => {
  if (admin.apps.length) return admin.app();
  return admin.initializeApp({
    credential: admin.credential.cert(getServiceAccount()),
  });
};

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const getParentName = (app) => app.fatherName || app.motherName || 'Parent / Guardian';
const getLearnerName = (app) => `${app.firstName || ''} ${app.surname || ''}`.trim() || 'the learner';
const getLearnerClass = (app) => app.grade || app.level || 'Assigned class pending';
const getParentEmail = (app) => app.fatherEmail || app.motherEmail || app.emergencyEmail || '';
const getPortalLoginUrl = (req) => {
  const forwardedProto = req.headers['x-forwarded-proto'];
  const proto = Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto || 'https';
  const host = req.headers.host || process.env.APP_PUBLIC_URL?.replace(/^https?:\/\//, '') || '';
  return `${proto}://${host}/login`;
};

const buildApplicationReceivedEmailText = (app, schoolName) => `Dear ${getParentName(app)},

We have received the application for ${getLearnerName(app)}.

Application summary
- Learner: ${getLearnerName(app)}
- Class applied: ${getLearnerClass(app)}

The admissions team will review the information and contact you with the next step. Please keep an eye on your email or phone for updates from the school.

Support contacts
- Email: ${SCHOOL_CONTACTS.email}
- Phones: ${SCHOOL_CONTACTS.phonePrimary} / ${SCHOOL_CONTACTS.phoneSecondary}
- Address: ${SCHOOL_CONTACTS.address}
- Postal: ${SCHOOL_CONTACTS.postal}
- Website: ${SCHOOL_CONTACTS.website}

Kind regards,
Admissions Office
${schoolName}`;

const buildApplicationReceivedEmailHtml = (app, schoolName) => {
  const parentName = escapeHtml(getParentName(app));
  const learnerName = escapeHtml(getLearnerName(app));
  const learnerClass = escapeHtml(getLearnerClass(app));

  return `
  <div style="margin:0;padding:0;background:#eef6ff;font-family:Arial,Helvetica,sans-serif;color:#102033;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#eef6ff;">
      <tr>
        <td align="center" style="padding:34px 14px;">
          <table role="presentation" width="720" cellspacing="0" cellpadding="0" style="width:720px;max-width:100%;border-collapse:collapse;background:#ffffff;border:1px solid #d8e8f8;box-shadow:0 18px 48px rgba(24,28,84,0.14);">
            <tr>
              <td style="padding:0;background:#181c54;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                  <tr>
                    <td style="padding:28px 30px;background:#181c54;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                        <tr>
                          <td width="92" style="vertical-align:top;">
                            <div style="background:#ffffff;border-radius:18px;padding:10px;width:72px;height:72px;">
                              <img src="${SCHOOL_LOGO_URL}" width="52" height="52" alt="${escapeHtml(schoolName)} logo" style="display:block;width:52px;height:52px;border:0;" />
                            </div>
                          </td>
                          <td style="vertical-align:middle;color:#ffffff;">
                            <div style="font-size:11px;font-weight:800;letter-spacing:0.24em;text-transform:uppercase;color:#9fd3ff;">Admissions Office</div>
                            <div style="font-size:28px;font-weight:900;line-height:1.12;margin-top:7px;">Application received</div>
                            <div style="font-size:14px;line-height:1.6;color:#dbeafe;margin-top:8px;">${escapeHtml(schoolName)} has received your learner application.</div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="height:6px;background:#70c8ff;font-size:0;line-height:0;">&nbsp;</td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:30px 30px 8px 30px;background:#ffffff;">
                <p style="margin:0 0 14px 0;font-size:16px;line-height:1.7;color:#102033;">Dear ${parentName},</p>
                <p style="margin:0;font-size:15px;line-height:1.8;color:#334155;">
                  Thank you for applying to <strong style="color:#181c54;">${escapeHtml(schoolName)}</strong>. We have received the application for <strong style="color:#181c54;">${learnerName}</strong>, and our admissions team will review the submitted information.
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:20px 30px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                  <tr>
                    <td style="padding:18px 20px;background:#f4fbff;border:1px solid #cfe8ff;border-radius:0;">
                      <div style="font-size:12px;font-weight:900;letter-spacing:0.18em;text-transform:uppercase;color:#1d4ed8;margin-bottom:12px;">Application Summary</div>
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                        <tr>
                          <td style="padding:10px 0;border-bottom:1px solid #d9edf9;font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:0.12em;color:#64748b;width:38%;">Learner</td>
                          <td style="padding:10px 0;border-bottom:1px solid #d9edf9;font-size:15px;font-weight:800;color:#0f172a;">${learnerName}</td>
                        </tr>
                        <tr>
                          <td style="padding:10px 0;font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:0.12em;color:#64748b;">Class Applied</td>
                          <td style="padding:10px 0;font-size:15px;font-weight:800;color:#0f172a;">${learnerClass}</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:4px 30px 26px 30px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                  <tr>
                    <td style="padding:18px 20px;background:#ffffff;border:1px solid #e2e8f0;">
                      <div style="font-size:12px;font-weight:900;letter-spacing:0.18em;text-transform:uppercase;color:#181c54;margin-bottom:10px;">What happens next</div>
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                        <tr>
                          <td width="30" style="vertical-align:top;padding:6px 0;"><span style="display:inline-block;background:#70c8ff;color:#181c54;font-size:12px;font-weight:900;width:22px;height:22px;line-height:22px;text-align:center;border-radius:50%;">1</span></td>
                          <td style="padding:6px 0;font-size:14px;line-height:1.7;color:#334155;">The admissions team reviews the application and attached documents.</td>
                        </tr>
                        <tr>
                          <td width="30" style="vertical-align:top;padding:6px 0;"><span style="display:inline-block;background:#70c8ff;color:#181c54;font-size:12px;font-weight:900;width:22px;height:22px;line-height:22px;text-align:center;border-radius:50%;">2</span></td>
                          <td style="padding:6px 0;font-size:14px;line-height:1.7;color:#334155;">If approved, the school will send the parent portal login details and registration payment instructions.</td>
                        </tr>
                        <tr>
                          <td width="30" style="vertical-align:top;padding:6px 0;"><span style="display:inline-block;background:#70c8ff;color:#181c54;font-size:12px;font-weight:900;width:22px;height:22px;line-height:22px;text-align:center;border-radius:50%;">3</span></td>
                          <td style="padding:6px 0;font-size:14px;line-height:1.7;color:#334155;">You will be contacted if more information is needed.</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:24px 30px;background:#f8fbff;border-top:1px solid #dbeafe;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                  <tr>
                    <td style="vertical-align:top;">
                      <div style="font-size:12px;font-weight:900;letter-spacing:0.16em;text-transform:uppercase;color:#1d4ed8;margin-bottom:8px;">School Details</div>
                      <div style="font-size:14px;line-height:1.8;color:#334155;">
                        <strong style="color:#181c54;">${escapeHtml(schoolName)}</strong><br />
                        ${escapeHtml(SCHOOL_CONTACTS.address)}<br />
                        ${escapeHtml(SCHOOL_CONTACTS.postal)}
                      </div>
                    </td>
                    <td style="vertical-align:top;text-align:right;">
                      <div style="font-size:12px;font-weight:900;letter-spacing:0.16em;text-transform:uppercase;color:#1d4ed8;margin-bottom:8px;">Contact</div>
                      <div style="font-size:14px;line-height:1.8;color:#334155;">
                        ${SCHOOL_CONTACTS.phonePrimary}<br />
                        ${SCHOOL_CONTACTS.phoneSecondary}<br />
                        <a href="mailto:${SCHOOL_CONTACTS.email}" style="color:#181c54;text-decoration:none;font-weight:800;">${SCHOOL_CONTACTS.email}</a><br />
                        <span style="color:#64748b;">${SCHOOL_CONTACTS.website}</span>
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:18px 30px;background:#181c54;text-align:center;">
                <div style="font-size:12px;line-height:1.6;color:#dbeafe;">This is an automated acknowledgement from ${escapeHtml(schoolName)}. Please keep this email for your records.</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </div>`;
};

const buildApplicationApprovalEmailText = (app, schoolName, pin, studentId, portalUrl) => `Dear ${getParentName(app)},

The application for ${getLearnerName(app)} has been approved in principle by ${schoolName}.

Parent portal login details
- Learner: ${getLearnerName(app)}
- Student ID: ${studentId}
- Parent PIN: ${pin}
- Class Applied: ${getLearnerClass(app)}
- Portal Link: ${portalUrl}

How to log in
1. Open the portal link.
2. Choose the Parent login option.
3. Search for the learner name "${getLearnerName(app)}" or student ID "${studentId}".
4. Click the learner name from the search results.
5. Enter the parent PIN ${pin}.
6. Upload the registration fee proof of payment from the dashboard.

Support contacts
- Email: ${SCHOOL_CONTACTS.email}
- Payment queries: ${SCHOOL_CONTACTS.paymentEmail}
- Phones: ${SCHOOL_CONTACTS.phonePrimary} / ${SCHOOL_CONTACTS.phoneSecondary}
- Address: ${SCHOOL_CONTACTS.address}
- Postal: ${SCHOOL_CONTACTS.postal}

Kind regards,
Admissions Office
${schoolName}`;

const buildApplicationApprovalEmailHtml = (app, schoolName, pin, studentId, portalUrl) => {
  const parentName = escapeHtml(getParentName(app));
  const learnerName = escapeHtml(getLearnerName(app));
  const learnerClass = escapeHtml(getLearnerClass(app));
  const safePin = escapeHtml(pin);
  const safeStudentId = escapeHtml(studentId);
  const safePortalUrl = escapeHtml(portalUrl);

  return `
  <div style="margin:0;padding:0;background:#eef6ff;font-family:Arial,Helvetica,sans-serif;color:#102033;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#eef6ff;">
      <tr>
        <td align="center" style="padding:34px 14px;">
          <table role="presentation" width="720" cellspacing="0" cellpadding="0" style="width:720px;max-width:100%;border-collapse:collapse;background:#ffffff;border:1px solid #d8e8f8;box-shadow:0 18px 48px rgba(24,28,84,0.14);">
            <tr>
              <td style="background:#181c54;padding:28px 30px;color:#ffffff;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                  <tr>
                    <td width="92" style="vertical-align:top;">
                      <div style="background:#ffffff;border-radius:18px;padding:10px;width:72px;height:72px;">
                        <img src="${SCHOOL_LOGO_URL}" width="52" height="52" alt="${escapeHtml(schoolName)} logo" style="display:block;width:52px;height:52px;border:0;" />
                      </div>
                    </td>
                    <td style="vertical-align:middle;">
                      <div style="font-size:11px;font-weight:800;letter-spacing:0.24em;text-transform:uppercase;color:#9fd3ff;">Admissions Office</div>
                      <div style="font-size:28px;font-weight:900;line-height:1.12;margin-top:7px;">Application approved</div>
                      <div style="font-size:14px;line-height:1.6;color:#dbeafe;margin-top:8px;">Parent portal access and registration payment instructions for ${learnerName}.</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr><td style="height:6px;background:#70c8ff;font-size:0;line-height:0;">&nbsp;</td></tr>

            <tr>
              <td style="padding:30px 30px 10px;background:#ffffff;">
                <p style="margin:0 0 14px;font-size:16px;line-height:1.7;color:#102033;">Dear ${parentName},</p>
                <p style="margin:0;font-size:15px;line-height:1.8;color:#334155;">
                  We are pleased to inform you that the application for <strong style="color:#181c54;">${learnerName}</strong> has been approved in principle. Please log in to the parent portal and upload proof of registration payment so enrolment can continue.
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:18px 30px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#f4fbff;border:1px solid #cfe8ff;">
                  <tr><td colspan="2" style="padding:18px 20px 8px;font-size:12px;font-weight:900;letter-spacing:0.18em;text-transform:uppercase;color:#1d4ed8;">Parent Portal Details</td></tr>
                  <tr><td style="padding:10px 20px;border-top:1px solid #d9edf9;font-size:12px;font-weight:800;text-transform:uppercase;color:#64748b;width:36%;">Learner</td><td style="padding:10px 20px;border-top:1px solid #d9edf9;font-size:15px;font-weight:800;color:#0f172a;">${learnerName}</td></tr>
                  <tr><td style="padding:10px 20px;border-top:1px solid #d9edf9;font-size:12px;font-weight:800;text-transform:uppercase;color:#64748b;">Student ID</td><td style="padding:10px 20px;border-top:1px solid #d9edf9;font-size:15px;font-weight:800;color:#0f172a;">${safeStudentId}</td></tr>
                  <tr><td style="padding:10px 20px;border-top:1px solid #d9edf9;font-size:12px;font-weight:800;text-transform:uppercase;color:#64748b;">Parent PIN</td><td style="padding:10px 20px;border-top:1px solid #d9edf9;font-size:22px;font-weight:900;letter-spacing:0.24em;color:#181c54;">${safePin}</td></tr>
                  <tr><td style="padding:10px 20px;border-top:1px solid #d9edf9;font-size:12px;font-weight:800;text-transform:uppercase;color:#64748b;">Class</td><td style="padding:10px 20px;border-top:1px solid #d9edf9;font-size:15px;font-weight:800;color:#0f172a;">${learnerClass}</td></tr>
                  <tr><td style="padding:10px 20px;border-top:1px solid #d9edf9;font-size:12px;font-weight:800;text-transform:uppercase;color:#64748b;">Portal Link</td><td style="padding:10px 20px;border-top:1px solid #d9edf9;font-size:15px;font-weight:800;"><a href="${safePortalUrl}" style="color:#1d4ed8;text-decoration:none;">${safePortalUrl}</a></td></tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:4px 30px 26px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;border:1px solid #e2e8f0;">
                  <tr><td style="padding:18px 20px;">
                    <div style="font-size:12px;font-weight:900;letter-spacing:0.18em;text-transform:uppercase;color:#181c54;margin-bottom:10px;">How to continue</div>
                    <div style="font-size:14px;line-height:1.8;color:#334155;">
                      1. Open the parent portal link above.<br />
                      2. Select <strong>Parent</strong> login.<br />
                      3. Search for <strong>${learnerName}</strong> or student ID <strong>${safeStudentId}</strong>.<br />
                      4. Enter PIN <strong>${safePin}</strong>.<br />
                      5. Upload proof of registration payment from the payment section.
                    </div>
                  </td></tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:24px 30px;background:#f8fbff;border-top:1px solid #dbeafe;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                  <tr>
                    <td style="vertical-align:top;">
                      <div style="font-size:12px;font-weight:900;letter-spacing:0.16em;text-transform:uppercase;color:#1d4ed8;margin-bottom:8px;">School Details</div>
                      <div style="font-size:14px;line-height:1.8;color:#334155;"><strong style="color:#181c54;">${escapeHtml(schoolName)}</strong><br />${escapeHtml(SCHOOL_CONTACTS.address)}<br />${escapeHtml(SCHOOL_CONTACTS.postal)}</div>
                    </td>
                    <td style="vertical-align:top;text-align:right;">
                      <div style="font-size:12px;font-weight:900;letter-spacing:0.16em;text-transform:uppercase;color:#1d4ed8;margin-bottom:8px;">Contact</div>
                      <div style="font-size:14px;line-height:1.8;color:#334155;">${SCHOOL_CONTACTS.phonePrimary}<br />${SCHOOL_CONTACTS.phoneSecondary}<br /><a href="mailto:${SCHOOL_CONTACTS.email}" style="color:#181c54;text-decoration:none;font-weight:800;">${SCHOOL_CONTACTS.email}</a><br /><span style="color:#64748b;">${SCHOOL_CONTACTS.website}</span></div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr><td style="padding:18px 30px;background:#181c54;text-align:center;"><div style="font-size:12px;line-height:1.6;color:#dbeafe;">This automated approval email was sent by ${escapeHtml(schoolName)} Admissions Office.</div></td></tr>
          </table>
        </td>
      </tr>
    </table>
  </div>`;
};

const getTransporter = () => {
  const host = process.env.MAIL_SMTP_HOST;
  const port = parseInt(process.env.MAIL_SMTP_PORT || '587', 10);
  const user = process.env.MAIL_SMTP_USER;
  const pass = process.env.MAIL_SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error('Missing SMTP environment variables.');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: String(process.env.MAIL_SMTP_SECURE || '').toLowerCase() === 'true' || port === 465,
    auth: { user, pass },
  });
};

const writeReplyLog = async (id, data) => {
  await admin.firestore().collection(AUTOMATED_REPLIES_COLLECTION).doc(id).set({
    ...data,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
};

const verifyAdminRequest = async (req) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) throw Object.assign(new Error('Missing auth token.'), { statusCode: 401 });

  const decoded = await admin.auth().verifyIdToken(token);
  const isAdminEmail = decoded.email === 'admin@coha.com';
  const isAdminRole = ['ADMIN', 'SUPER_ADMIN', 'SUB_ADMIN'].includes(decoded.role);
  if (!isAdminEmail && !isAdminRole) {
    throw Object.assign(new Error('Only admin users can send automated replies.'), { statusCode: 403 });
  }

  return decoded;
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, message: 'Method not allowed.' });
  }

  try {
    getAdminApp();

    const { applicationId, applicationType = 'STUDENT', replyType = 'APPLICATION_APPROVED', pin, studentId, portalUrl } = req.body || {};
    if (!applicationId || applicationType !== 'STUDENT' || !['APPLICATION_RECEIVED', 'APPLICATION_APPROVED'].includes(replyType)) {
      return res.status(400).json({ success: false, message: 'Unsupported automated reply request.' });
    }
    if (replyType === 'APPLICATION_APPROVED') {
      await verifyAdminRequest(req);
    }

    const db = admin.firestore();
    const replyDocId = `${replyType}_${applicationId}`;
    const existing = await db.collection(AUTOMATED_REPLIES_COLLECTION).doc(replyDocId).get();
    if (existing.exists && existing.data()?.status === 'SENT') {
      return res.status(200).json({ success: true, skipped: true, message: 'Automated reply already sent.' });
    }

    const applicationSnap = await db.collection(APPLICATIONS_COLLECTION).doc(applicationId).get();
    if (!applicationSnap.exists) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    const app = { id: applicationSnap.id, ...applicationSnap.data() };
    if (replyType === 'APPLICATION_RECEIVED' && app.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: 'Application received replies are only sent for pending applications.' });
    }
    const recipientEmail = getParentEmail(app);
    const recipientName = getParentName(app);
    const learnerName = getLearnerName(app);
    const schoolName = process.env.MAIL_SCHOOL_NAME || DEFAULT_SCHOOL_NAME;
    const resolvedStudentId = studentId || app.approvedStudentId || '';
    const resolvedPin = pin || app.approvedParentPin || '';
    const resolvedPortalUrl = portalUrl || getPortalLoginUrl(req);
    if (replyType === 'APPLICATION_APPROVED' && (!resolvedStudentId || !resolvedPin)) {
      return res.status(400).json({ success: false, message: 'Approved replies require a student ID and parent PIN.' });
    }
    const subject = replyType === 'APPLICATION_APPROVED'
      ? `Conditional Admission Approval: ${learnerName} - ${schoolName}`
      : `Application received for ${learnerName}`;
    const bodyText = replyType === 'APPLICATION_APPROVED'
      ? buildApplicationApprovalEmailText(app, schoolName, resolvedPin, resolvedStudentId, resolvedPortalUrl)
      : buildApplicationReceivedEmailText(app, schoolName);
    const bodyHtml = replyType === 'APPLICATION_APPROVED'
      ? buildApplicationApprovalEmailHtml(app, schoolName, resolvedPin, resolvedStudentId, resolvedPortalUrl)
      : buildApplicationReceivedEmailHtml(app, schoolName);
    const baseLog = {
      applicationId,
      applicationType,
      replyType,
      recipientEmail,
      recipientName,
      learnerName,
      subject,
      bodyText,
      bodyHtml,
      incomingAt: app.submissionDate || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (!recipientEmail) {
      await writeReplyLog(replyDocId, {
        ...baseLog,
        status: 'SKIPPED',
        errorMessage: 'No parent email was provided on the application.',
      });
      return res.status(200).json({ success: true, skipped: true, message: 'No recipient email.' });
    }

    const transporter = getTransporter();
    const info = await transporter.sendMail({
      from: process.env.MAIL_FROM || process.env.MAIL_SMTP_USER,
      to: recipientEmail,
      replyTo: process.env.MAIL_REPLY_TO || process.env.MAIL_FROM || process.env.MAIL_SMTP_USER,
      subject,
      text: bodyText,
      html: bodyHtml,
    });

    await writeReplyLog(replyDocId, {
      ...baseLog,
      status: 'SENT',
      providerMessageId: info.messageId || '',
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      errorMessage: '',
    });

    return res.status(200).json({ success: true, messageId: info.messageId || '' });
  } catch (error) {
    console.error('send-automated-reply failed:', error);
    const statusCode = error.statusCode || 500;
    const { applicationId, applicationType = 'STUDENT', replyType = 'APPLICATION_RECEIVED' } = req.body || {};
    if (applicationId && admin.apps.length && statusCode >= 500) {
      await writeReplyLog(`${replyType}_${applicationId}`, {
        applicationId,
        applicationType,
        replyType,
        recipientEmail: '',
        recipientName: '',
        learnerName: '',
        subject: '',
        bodyText: '',
        status: 'FAILED',
        errorMessage: error.message || 'Automated reply failed.',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      }).catch((logError) => console.error('Could not log automated reply failure:', logError));
    }
    return res.status(statusCode).json({ success: false, message: error.message || 'Automated reply failed.' });
  }
}
