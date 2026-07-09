import admin from 'firebase-admin';

const AUTOMATED_REPLIES_COLLECTION = 'automated_replies';

const setCorsHeaders = (req, res) => {
  const allowedOrigin = process.env.APP_PUBLIC_URL || req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
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

const verifyAdminRequest = async (req) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) throw Object.assign(new Error('Missing auth token.'), { statusCode: 401 });

  const decoded = await admin.auth().verifyIdToken(token);
  const isAdminEmail = decoded.email === 'admin@coha.com';
  const isAdminRole = ['ADMIN', 'SUPER_ADMIN', 'SUB_ADMIN'].includes(decoded.role);
  if (!isAdminEmail && !isAdminRole) {
    throw Object.assign(new Error('Only admin users can view automated replies.'), { statusCode: 403 });
  }

  return decoded;
};

const serializeDate = (value) => {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  if (typeof value.seconds === 'number') return new Date(value.seconds * 1000).toISOString();
  if (typeof value._seconds === 'number') return new Date(value._seconds * 1000).toISOString();
  return value;
};

const serializeLog = (doc) => {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    incomingAt: serializeDate(data.incomingAt),
    sentAt: serializeDate(data.sentAt),
    createdAt: serializeDate(data.createdAt),
    updatedAt: serializeDate(data.updatedAt),
  };
};

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ success: false, message: 'Method not allowed.' });
  }

  try {
    getAdminApp();
    await verifyAdminRequest(req);

    const rawLimit = Number.parseInt(String(req.query.limit || '1000'), 10);
    const maxResults = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 2000) : 1000;
    const snap = await admin.firestore()
      .collection(AUTOMATED_REPLIES_COLLECTION)
      .orderBy('createdAt', 'desc')
      .limit(maxResults)
      .get();

    return res.status(200).json({
      success: true,
      logs: snap.docs.map(serializeLog),
    });
  } catch (error) {
    console.error('automated-replies failed:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Could not fetch automated replies.',
    });
  }
}
