import { Application, Student } from '../types';

const SCHOOL_LOGO_URL = 'https://i.ibb.co/LzYXwYfX/logo.png';
const DEFAULT_SCHOOL_NAME = 'Circle of Hope Academy';
const SCHOOL_CONTACTS = {
  phonePrimary: '+264 81 666 4074',
  phoneSecondary: '+264 85 266 4074',
  email: 'circleofhopeacademy@yahoo.com',
  paymentEmail: 'acoha67@gmail.com',
  website: 'www.coha-academy.com',
};

const escapeHtml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const formatPhoneForWhatsapp = (value?: string) => {
  const digits = (value || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('264')) return digits;
  if (digits.startsWith('0')) return `264${digits.slice(1)}`;
  return digits;
};

export const getPortalLoginUrl = () => `${window.location.origin}${window.location.pathname}#/login`;

export const getApplicationParentEmail = (app: Application) => app.fatherEmail || app.motherEmail || app.emergencyEmail || '';
export const getApplicationParentPhone = (app: Application) => formatPhoneForWhatsapp(app.fatherPhone || app.motherPhone || app.emergencyCell || '');
export const getStudentParentEmail = (student: Student) => student.fatherEmail || student.motherEmail || student.emergencyEmail || '';
export const getStudentParentPhone = (student: Student) => formatPhoneForWhatsapp(student.fatherPhone || student.motherPhone || student.emergencyCell || '');

const getParentName = (studentOrApp: Partial<Application & Student>) => (
  studentOrApp.fatherName || studentOrApp.motherName || studentOrApp.parentName || 'Parent / Guardian'
);

const getLearnerName = (studentOrApp: Partial<Application & Student>) => (
  studentOrApp.name || `${studentOrApp.firstName || ''} ${studentOrApp.surname || ''}`.trim()
);

const getLearnerClass = (studentOrApp: Partial<Application & Student>) => (
  studentOrApp.assignedClass || studentOrApp.grade || studentOrApp.level || 'Assigned class pending'
);

export const buildApplicationApprovalEmailHtml = ({
  app,
  pin,
  studentId,
  portalUrl,
  schoolName = DEFAULT_SCHOOL_NAME,
}: {
  app: Application;
  pin: string;
  studentId: string;
  portalUrl: string;
  schoolName?: string;
}) => {
  const parentName = escapeHtml(getParentName(app));
  const learnerName = escapeHtml(getLearnerName(app));
  const learnerClass = escapeHtml(getLearnerClass(app));
  const safePortalUrl = escapeHtml(portalUrl);

  return `
  <div style="margin:0;padding:32px;background:#f4f7fb;font-family:Arial,sans-serif;color:#0f172a;">
    <div style="max-width:760px;margin:0 auto;background:#ffffff;border:1px solid #dbe3ef;box-shadow:0 16px 40px rgba(15,23,42,0.08);overflow:hidden;">
      <div style="background:linear-gradient(135deg,#1e3a8a 0%,#0f172a 100%);padding:28px 32px;color:#ffffff;">
        <table role="presentation" style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="vertical-align:middle;">
              <img src="${SCHOOL_LOGO_URL}" alt="${escapeHtml(schoolName)} logo" style="width:68px;height:68px;border-radius:14px;background:#ffffff;padding:8px;display:block;" />
            </td>
            <td style="padding-left:18px;vertical-align:middle;">
              <div style="font-size:12px;font-weight:700;letter-spacing:0.24em;text-transform:uppercase;color:#bfdbfe;">Admission Office</div>
              <div style="font-size:28px;font-weight:800;line-height:1.1;margin-top:6px;">Conditional Admission Approval</div>
              <div style="font-size:14px;color:#cbd5e1;margin-top:8px;">Parent portal access and registration fee guidance for ${learnerName}</div>
            </td>
          </tr>
        </table>
      </div>

      <div style="padding:32px;">
        <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">Dear ${parentName},</p>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.8;">
          We are pleased to inform you that the application for <strong>${learnerName}</strong> has been approved in principle.
          Your parent portal account has been created automatically so that you can complete the payment stage and track the learner's progress.
        </p>

        <div style="margin:24px 0;padding:20px 22px;border:1px solid #fed7aa;background:#fff7ed;">
          <div style="font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:0.18em;color:#c2410c;">Important Next Step</div>
          <div style="font-size:15px;line-height:1.8;color:#7c2d12;margin-top:10px;">
            Please upload proof of payment for the <strong>registration fee</strong> after logging into the parent portal. The school will review the uploaded image and confirm the payment from the administration side.
          </div>
        </div>

        <div style="margin:28px 0 24px;">
          <div style="font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:0.18em;color:#1d4ed8;margin-bottom:12px;">Portal Credentials</div>
          <table role="presentation" style="width:100%;border-collapse:collapse;border:1px solid #dbe3ef;">
            <tr>
              <td style="width:34%;padding:12px 14px;background:#f8fafc;border-bottom:1px solid #dbe3ef;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.12em;color:#475569;">Learner</td>
              <td style="padding:12px 14px;border-bottom:1px solid #dbe3ef;font-size:14px;font-weight:700;color:#0f172a;">${learnerName}</td>
            </tr>
            <tr>
              <td style="padding:12px 14px;background:#f8fafc;border-bottom:1px solid #dbe3ef;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.12em;color:#475569;">Student ID</td>
              <td style="padding:12px 14px;border-bottom:1px solid #dbe3ef;font-size:14px;font-weight:700;color:#0f172a;">${escapeHtml(studentId)}</td>
            </tr>
            <tr>
              <td style="padding:12px 14px;background:#f8fafc;border-bottom:1px solid #dbe3ef;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.12em;color:#475569;">Parent PIN</td>
              <td style="padding:12px 14px;border-bottom:1px solid #dbe3ef;font-size:18px;font-weight:800;letter-spacing:0.22em;color:#1d4ed8;">${escapeHtml(pin)}</td>
            </tr>
            <tr>
              <td style="padding:12px 14px;background:#f8fafc;border-bottom:1px solid #dbe3ef;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.12em;color:#475569;">Class Applied</td>
              <td style="padding:12px 14px;border-bottom:1px solid #dbe3ef;font-size:14px;font-weight:700;color:#0f172a;">${learnerClass}</td>
            </tr>
            <tr>
              <td style="padding:12px 14px;background:#f8fafc;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.12em;color:#475569;">Portal Link</td>
              <td style="padding:12px 14px;font-size:14px;font-weight:700;color:#0f172a;"><a href="${safePortalUrl}" style="color:#1d4ed8;text-decoration:none;">${safePortalUrl}</a></td>
            </tr>
          </table>
        </div>

        <div style="margin:28px 0 24px;">
          <div style="font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:0.18em;color:#1d4ed8;margin-bottom:12px;">How To Log In</div>
          <table role="presentation" style="width:100%;border-collapse:separate;border-spacing:0 10px;">
            <tr>
              <td style="width:40px;vertical-align:top;">
                <div style="width:30px;height:30px;line-height:30px;text-align:center;background:#dbeafe;color:#1d4ed8;font-weight:800;border-radius:999px;">1</div>
              </td>
              <td style="font-size:14px;line-height:1.8;color:#334155;">Open the portal link above and choose the <strong>Parent</strong> login option.</td>
            </tr>
            <tr>
              <td style="vertical-align:top;">
                <div style="width:30px;height:30px;line-height:30px;text-align:center;background:#dbeafe;color:#1d4ed8;font-weight:800;border-radius:999px;">2</div>
              </td>
              <td style="font-size:14px;line-height:1.8;color:#334155;">In the search box, type the learner's name: <strong>${learnerName}</strong>. You may also search using the student ID <strong>${escapeHtml(studentId)}</strong>.</td>
            </tr>
            <tr>
              <td style="vertical-align:top;">
                <div style="width:30px;height:30px;line-height:30px;text-align:center;background:#dbeafe;color:#1d4ed8;font-weight:800;border-radius:999px;">3</div>
              </td>
              <td style="font-size:14px;line-height:1.8;color:#334155;">Click the learner name when it appears in the search results.</td>
            </tr>
            <tr>
              <td style="vertical-align:top;">
                <div style="width:30px;height:30px;line-height:30px;text-align:center;background:#dbeafe;color:#1d4ed8;font-weight:800;border-radius:999px;">4</div>
              </td>
              <td style="font-size:14px;line-height:1.8;color:#334155;">Enter the parent PIN <strong>${escapeHtml(pin)}</strong> to access the dashboard.</td>
            </tr>
            <tr>
              <td style="vertical-align:top;">
                <div style="width:30px;height:30px;line-height:30px;text-align:center;background:#dbeafe;color:#1d4ed8;font-weight:800;border-radius:999px;">5</div>
              </td>
              <td style="font-size:14px;line-height:1.8;color:#334155;">On the dashboard, upload an image of the registration-fee proof of payment for school review.</td>
            </tr>
          </table>
        </div>

        <div style="margin-top:24px;padding:20px 22px;background:#eff6ff;border:1px solid #bfdbfe;">
          <div style="font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:0.18em;color:#1d4ed8;">Need Help?</div>
          <div style="margin-top:10px;font-size:14px;line-height:1.9;color:#1e3a8a;">
            Email: <strong>${SCHOOL_CONTACTS.email}</strong><br />
            Payment queries: <strong>${SCHOOL_CONTACTS.paymentEmail}</strong><br />
            Contact: <strong>${SCHOOL_CONTACTS.phonePrimary}</strong> / <strong>${SCHOOL_CONTACTS.phoneSecondary}</strong>
          </div>
        </div>

        <p style="margin:28px 0 0;font-size:15px;line-height:1.8;color:#334155;">
          Kind regards,<br />
          <strong>Admissions Office</strong><br />
          ${escapeHtml(schoolName)}
        </p>
      </div>
    </div>
  </div>`;
};

export const buildApplicationApprovalEmailText = ({
  app,
  pin,
  studentId,
  portalUrl,
  schoolName = DEFAULT_SCHOOL_NAME,
}: {
  app: Application;
  pin: string;
  studentId: string;
  portalUrl: string;
  schoolName?: string;
}) => `Dear ${getParentName(app)},

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

Kind regards,
Admissions Office
${schoolName}`;

export const buildApplicationApprovalWhatsappText = ({
  app,
  pin,
  studentId,
  portalUrl,
  schoolName = DEFAULT_SCHOOL_NAME,
}: {
  app: Application;
  pin: string;
  studentId: string;
  portalUrl: string;
  schoolName?: string;
}) => `Dear ${getParentName(app)},

${getLearnerName(app)} has been conditionally approved by ${schoolName}.

Parent portal login details:
Student ID: ${studentId}
Parent PIN: ${pin}
Portal: ${portalUrl}

Login steps:
1. Open the portal.
2. Choose Parent login.
3. Search for ${getLearnerName(app)}.
4. Select the learner name.
5. Enter PIN ${pin}.
6. Upload proof of payment for the registration fee.

Support:
${SCHOOL_CONTACTS.phonePrimary}
${SCHOOL_CONTACTS.email}`;

export const buildPaymentApprovalEmailHtml = ({
  student,
  schoolName = DEFAULT_SCHOOL_NAME,
}: {
  student: Student;
  schoolName?: string;
}) => {
  const parentName = escapeHtml(getParentName(student));
  const learnerName = escapeHtml(getLearnerName(student));

  return `
  <div style="margin:0;padding:32px;background:#f4f7fb;font-family:Arial,sans-serif;color:#0f172a;">
    <div style="max-width:720px;margin:0 auto;background:#ffffff;border:1px solid #dbe3ef;box-shadow:0 16px 40px rgba(15,23,42,0.08);overflow:hidden;">
      <div style="background:linear-gradient(135deg,#047857 0%,#0f172a 100%);padding:28px 32px;color:#ffffff;">
        <table role="presentation" style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="vertical-align:middle;">
              <img src="${SCHOOL_LOGO_URL}" alt="${escapeHtml(schoolName)} logo" style="width:68px;height:68px;border-radius:14px;background:#ffffff;padding:8px;display:block;" />
            </td>
            <td style="padding-left:18px;vertical-align:middle;">
              <div style="font-size:12px;font-weight:700;letter-spacing:0.24em;text-transform:uppercase;color:#a7f3d0;">Accounts Office</div>
              <div style="font-size:28px;font-weight:800;line-height:1.1;margin-top:6px;">Payment Approved</div>
              <div style="font-size:14px;color:#d1fae5;margin-top:8px;">Enrollment has been confirmed for ${learnerName}</div>
            </td>
          </tr>
        </table>
      </div>
      <div style="padding:32px;">
        <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">Dear ${parentName},</p>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.8;">
          We confirm that the payment submitted for <strong>${learnerName}</strong> has been approved successfully.
          The learner has now been enrolled on the school system.
        </p>
        <table role="presentation" style="width:100%;border-collapse:collapse;border:1px solid #dbe3ef;margin:24px 0;">
          <tr>
            <td style="width:34%;padding:12px 14px;background:#f8fafc;border-bottom:1px solid #dbe3ef;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.12em;color:#475569;">Learner</td>
            <td style="padding:12px 14px;border-bottom:1px solid #dbe3ef;font-size:14px;font-weight:700;color:#0f172a;">${learnerName}</td>
          </tr>
          <tr>
            <td style="padding:12px 14px;background:#f8fafc;border-bottom:1px solid #dbe3ef;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.12em;color:#475569;">Student ID</td>
            <td style="padding:12px 14px;border-bottom:1px solid #dbe3ef;font-size:14px;font-weight:700;color:#0f172a;">${escapeHtml(student.id)}</td>
          </tr>
          <tr>
            <td style="padding:12px 14px;background:#f8fafc;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.12em;color:#475569;">Class</td>
            <td style="padding:12px 14px;font-size:14px;font-weight:700;color:#0f172a;">${escapeHtml(getLearnerClass(student))}</td>
          </tr>
        </table>
        <div style="padding:20px 22px;background:#ecfdf5;border:1px solid #a7f3d0;">
          <div style="font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:0.18em;color:#047857;">Next Communication</div>
          <div style="margin-top:10px;font-size:14px;line-height:1.9;color:#065f46;">
            Please contact the school for further details regarding orientation, reporting dates, and any remaining requirements.
          </div>
        </div>
        <div style="margin-top:24px;font-size:14px;line-height:1.9;color:#334155;">
          Email: <strong>${SCHOOL_CONTACTS.email}</strong><br />
          Contact: <strong>${SCHOOL_CONTACTS.phonePrimary}</strong> / <strong>${SCHOOL_CONTACTS.phoneSecondary}</strong><br />
          Website: <strong>${SCHOOL_CONTACTS.website}</strong>
        </div>
        <p style="margin:28px 0 0;font-size:15px;line-height:1.8;color:#334155;">
          Kind regards,<br />
          <strong>Accounts Office</strong><br />
          ${escapeHtml(schoolName)}
        </p>
      </div>
    </div>
  </div>`;
};

export const buildPaymentApprovalEmailText = ({
  student,
  schoolName = DEFAULT_SCHOOL_NAME,
}: {
  student: Student;
  schoolName?: string;
}) => `Dear ${getParentName(student)},

The payment submitted for ${getLearnerName(student)} has been approved successfully.
The learner has now been enrolled on the ${schoolName} system.

Learner details
- Student ID: ${student.id}
- Class: ${getLearnerClass(student)}

Please contact us for further details.
- Email: ${SCHOOL_CONTACTS.email}
- Phones: ${SCHOOL_CONTACTS.phonePrimary} / ${SCHOOL_CONTACTS.phoneSecondary}
- Website: ${SCHOOL_CONTACTS.website}

Kind regards,
Accounts Office
${schoolName}`;

export const buildPaymentApprovalWhatsappText = ({
  student,
  schoolName = DEFAULT_SCHOOL_NAME,
}: {
  student: Student;
  schoolName?: string;
}) => `Dear ${getParentName(student)},

The payment for ${getLearnerName(student)} has been approved successfully.
The learner is now enrolled on the ${schoolName} system.

Student ID: ${student.id}
Class: ${getLearnerClass(student)}

Please contact us for further details:
${SCHOOL_CONTACTS.phonePrimary}
${SCHOOL_CONTACTS.email}`;
