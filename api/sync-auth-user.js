import admin from 'firebase-admin';

const encodeAuthId = (value) => (
  Buffer.from(String(value)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '').toLowerCase()
);

const authEmailFor = (role, id) => `${String(role).toLowerCase()}-${encodeAuthId(id)}@coha.local`;

const authPasswordFor = (password) => {
  const safePassword = String(password || '');
  return safePassword.length >= 6 ? safePassword : `coha-${safePassword}`;
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
    throw Object.assign(new Error('Only admin users can sync Auth accounts.'), { statusCode: 403 });
  }
  return decoded;
};

const roleClaims = (payload) => {
  if (payload.role === 'TEACHER') {
    return {
      role: 'TEACHER',
      teacherId: payload.targetId,
      assignedClasses: payload.assignedClasses || [],
      assignedStudentIds: payload.assignedStudentIds || [],
    };
  }

  if (payload.role === 'PARENT') {
    return { role: 'PARENT', studentIds: [payload.targetId] };
  }

  if (payload.role === 'MATRON') {
    return { role: 'MATRON', matronId: payload.targetId };
  }

  if (payload.role === 'VTC_STUDENT') {
    return { role: 'VTC_STUDENT', applicationId: payload.targetId };
  }

  if (payload.role === 'ADMIN') {
    return {
      role: payload.adminRole === 'sub_admin' ? 'SUB_ADMIN' : 'ADMIN',
      adminId: payload.targetId,
      adminRole: payload.adminRole || 'sub_admin',
    };
  }

  throw Object.assign(new Error('Unsupported Auth role.'), { statusCode: 400 });
};

const upsertAuthUser = async ({ email, password, displayName, claims }) => {
  let user;
  try {
    user = await admin.auth().getUserByEmail(email);
    await admin.auth().updateUser(user.uid, {
      password: authPasswordFor(password),
      displayName,
      disabled: false,
    });
  } catch (error) {
    if (error.code !== 'auth/user-not-found') throw error;
    user = await admin.auth().createUser({
      email,
      password: authPasswordFor(password),
      displayName,
      emailVerified: true,
      disabled: false,
    });
  }

  await admin.auth().setCustomUserClaims(user.uid, claims);
  return user;
};

const writeLoginIndex = async ({ role, targetId, name, subtitle }) => {
  await admin.firestore().collection('login_index').doc(`${role}_${targetId}`).set({
    role,
    targetId,
    name,
    subtitle: subtitle || '',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, message: 'Method not allowed.' });
  }

  try {
    getAdminApp();
    await verifyAdminRequest(req);

    const payload = req.body || {};
    if (!payload.role || !payload.targetId || !payload.password || !payload.name) {
      return res.status(400).json({ success: false, message: 'role, targetId, password, and name are required.' });
    }

    const email = payload.email || authEmailFor(payload.role, payload.targetId);
    const claims = roleClaims(payload);
    const user = await upsertAuthUser({
      email,
      password: payload.password,
      displayName: payload.name,
      claims,
    });

    await writeLoginIndex({
      role: payload.role,
      targetId: payload.targetId,
      name: payload.name,
      subtitle: payload.subtitle,
    });

    return res.status(200).json({
      success: true,
      uid: user.uid,
      email,
    });
  } catch (error) {
    console.error('sync-auth-user failed:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Auth sync failed.',
    });
  }
}
