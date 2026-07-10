import admin from 'firebase-admin';

const getServiceAccount = () => {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  return {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };
};

const getAdminApp = () => admin.apps.length ? admin.app() : admin.initializeApp({ credential: admin.credential.cert(getServiceAccount()) });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed.' });
  try {
    getAdminApp();
    const pin = String(req.body?.pin || '');
    const settings = (await admin.firestore().collection('settings').doc('general').get()).data() || {};
    let account = null;
    if (pin && pin === settings.adminPin) account = { id: 'admin', name: settings.adminName || 'Admin', adminRole: 'super_admin' };
    if (!account && Array.isArray(settings.admins)) {
      const match = settings.admins.find((item) => item.pin === pin);
      if (match) account = { id: match.id, name: match.name, adminRole: match.adminRole || 'sub_admin' };
    }
    if (!account) return res.status(401).json({ message: 'Invalid admin PIN.' });

    const user = await admin.auth().getUserByEmail('admin@coha.com');
    const token = await admin.auth().createCustomToken(user.uid, {
      role: account.adminRole === 'sub_admin' ? 'SUB_ADMIN' : 'ADMIN',
      adminId: account.id,
      adminRole: account.adminRole,
    });
    return res.status(200).json({ token, account });
  } catch (error) {
    console.error('Admin login endpoint failed:', error);
    return res.status(500).json({ message: 'Admin authentication is not configured correctly.' });
  }
}
