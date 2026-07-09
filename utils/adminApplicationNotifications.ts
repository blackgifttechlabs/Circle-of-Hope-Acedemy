import {
  getPaymentVerificationStudentCountSince,
  getPendingApplicationCountSince,
  getPendingInternshipApplicationCountSince,
  getPendingPaymentProofCountSince,
  getPendingVtcApplicationCountSince,
} from '../services/dataService';

export type AdminApplicationTab = 'student' | 'payments' | 'vtc' | 'internship';

export type AdminApplicationUnreadCounts = Record<AdminApplicationTab, number> & {
  total: number;
};

const DEFAULT_COUNTS: AdminApplicationUnreadCounts = {
  student: 0,
  payments: 0,
  vtc: 0,
  internship: 0,
  total: 0,
};

export const adminApplicationNotificationKey = (tab: AdminApplicationTab, adminId = 'admin') => (
  `coha_seen_admin_application_${tab}_${adminId}`
);

export const markAdminApplicationTabSeen = (tab: AdminApplicationTab, adminId = 'admin') => {
  localStorage.setItem(adminApplicationNotificationKey(tab, adminId), String(Date.now()));
  window.dispatchEvent(new CustomEvent('coha-admin-application-tab-seen', { detail: { tab } }));
};

const getLastSeen = (tab: AdminApplicationTab, adminId = 'admin') => (
  parseInt(localStorage.getItem(adminApplicationNotificationKey(tab, adminId)) || '0', 10) || 0
);

export const getMillis = (value: any) => {
  if (!value) return 0;
  if (typeof value?.toDate === 'function') return value.toDate().getTime();
  if (typeof value?.seconds === 'number') return value.seconds * 1000;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
};

export const getAdminApplicationUnreadCounts = async (adminId = 'admin'): Promise<AdminApplicationUnreadCounts> => {
  try {
    const lastSeenStudent = getLastSeen('student', adminId);
    const lastSeenPayments = getLastSeen('payments', adminId);
    const lastSeenVtc = getLastSeen('vtc', adminId);
    const lastSeenInternship = getLastSeen('internship', adminId);
    const [
      student,
      pendingPaymentProofs,
      paymentVerificationStudents,
      vtc,
      internship,
    ] = await Promise.all([
      getPendingApplicationCountSince(lastSeenStudent),
      getPendingPaymentProofCountSince(lastSeenPayments),
      getPaymentVerificationStudentCountSince(lastSeenPayments),
      getPendingVtcApplicationCountSince(lastSeenVtc),
      getPendingInternshipApplicationCountSince(lastSeenInternship),
    ]);

    const counts: AdminApplicationUnreadCounts = {
      student,
      payments: pendingPaymentProofs + paymentVerificationStudents,
      vtc,
      internship,
      total: 0,
    };

    counts.total = counts.student + counts.payments + counts.vtc + counts.internship;
    return counts;
  } catch (error) {
    console.error('Error fetching application notification counts:', error);
    return DEFAULT_COUNTS;
  }
};
