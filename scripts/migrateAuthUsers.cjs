const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const admin = require('firebase-admin');

const serviceAccountPath = path.resolve(process.cwd(), 'servicekey.json');
const DEFAULT_TEACHER_PASSWORD = 'coha@2026';
const DEFAULT_ADMIN_AUTH_PASSWORD = '111111';
const TEMP_MATRON_PASSWORD = 'coha@2026';

const UserRole = {
  ADMIN: 'ADMIN',
  TEACHER: 'TEACHER',
  PARENT: 'PARENT',
  VTC_STUDENT: 'VTC_STUDENT',
  MATRON: 'MATRON',
};

if (!fs.existsSync(serviceAccountPath)) {
  console.error('Missing servicekey.json in the project root.');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(require(serviceAccountPath)),
});

const db = admin.firestore();
const auth = admin.auth();

const encodeAuthId = (value) => (
  Buffer.from(value).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '').toLowerCase()
);

const authEmailFor = (role, id) => `${role.toLowerCase()}-${encodeAuthId(id)}@coha.local`;

const authPasswordFor = (password) => (
  String(password || '').length >= 6 ? String(password) : `coha-${password}`
);

const hashPin = (value) => crypto.createHash('sha256').update(value).digest('hex');

async function upsertAuthUser({ email, password, displayName, claims }) {
  let user;
  try {
    user = await auth.getUserByEmail(email);
    await auth.updateUser(user.uid, { password, displayName, disabled: false });
  } catch (error) {
    if (error.code !== 'auth/user-not-found') throw error;
    user = await auth.createUser({ email, password, displayName, emailVerified: true, disabled: false });
  }

  await auth.setCustomUserClaims(user.uid, claims);
  return user;
}

async function writeLoginIndex({ role, targetId, name, subtitle }) {
  await db.collection('login_index').doc(`${role}_${targetId}`).set({
    role,
    targetId,
    name,
    subtitle: subtitle || '',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
}

async function migrateAdmin() {
  await upsertAuthUser({
    email: 'admin@coha.com',
    password: DEFAULT_ADMIN_AUTH_PASSWORD,
    displayName: 'Circle of Hope Academy Admin',
    claims: { role: UserRole.ADMIN, adminRole: 'super_admin' },
  });
  console.log('Admin Auth account ready.');
}

async function migrateTeachers() {
  const snap = await db.collection('teachers').get();
  for (const doc of snap.docs) {
    const teacher = doc.data();
    const password = teacher.pin || DEFAULT_TEACHER_PASSWORD;
    const assignedClasses = teacher.assignedClasses || (teacher.assignedClass ? [teacher.assignedClass] : []);
    const assignedStudentIds = teacher.assignedStudentIds || [];

    await upsertAuthUser({
      email: authEmailFor(UserRole.TEACHER, doc.id),
      password: authPasswordFor(password),
      displayName: teacher.name || 'Teacher',
      claims: {
        role: UserRole.TEACHER,
        teacherId: doc.id,
        assignedClasses,
        assignedStudentIds,
      },
    });

    await writeLoginIndex({
      role: UserRole.TEACHER,
      targetId: doc.id,
      name: teacher.name || 'Teacher',
      subtitle: teacher.subject || assignedClasses.join(', '),
    });
  }
  console.log(`Teacher Auth accounts ready: ${snap.size}`);
}

async function migrateParents() {
  const snap = await db.collection('students').get();
  for (const doc of snap.docs) {
    const student = doc.data();
    if (!student.parentPin) continue;
    await upsertAuthUser({
      email: authEmailFor(UserRole.PARENT, doc.id),
      password: authPasswordFor(student.parentPin),
      displayName: student.parentName || `Parent of ${student.name || doc.id}`,
      claims: {
        role: UserRole.PARENT,
        studentIds: [doc.id],
      },
    });

    await writeLoginIndex({
      role: UserRole.PARENT,
      targetId: doc.id,
      name: student.name || doc.id,
      subtitle: student.assignedClass || student.grade || student.level || '',
    });
  }
  console.log(`Parent Auth accounts ready: ${snap.size}`);
}

async function migrateVtcStudents() {
  const snap = await db.collection('vtcApplications').get();
  let count = 0;
  for (const doc of snap.docs) {
    const app = doc.data();
    const allowed = ['APPROVED', 'PAYMENT_REQUIRED', 'VERIFYING', 'VERIFIED'].includes(app.status);
    if (!allowed || !app.pin) continue;
    const name = `${app.firstName || ''} ${app.surname || ''}`.trim() || doc.id;
    await upsertAuthUser({
      email: authEmailFor(UserRole.VTC_STUDENT, doc.id),
      password: authPasswordFor(app.pin),
      displayName: name,
      claims: {
        role: UserRole.VTC_STUDENT,
        applicationId: doc.id,
      },
    });

    await writeLoginIndex({
      role: UserRole.VTC_STUDENT,
      targetId: doc.id,
      name,
      subtitle: app.status || 'VTC Student',
    });
    count += 1;
  }
  console.log(`VTC Auth accounts ready: ${count}`);
}

async function migrateMatrons() {
  const snap = await db.collection('matrons').where('is_active', '==', true).get();
  for (const doc of snap.docs) {
    const matron = doc.data();
    await upsertAuthUser({
      email: authEmailFor(UserRole.MATRON, doc.id),
      password: TEMP_MATRON_PASSWORD,
      displayName: matron.name || 'Matron',
      claims: {
        role: UserRole.MATRON,
        matronId: doc.id,
      },
    });

    await doc.ref.set({ pin: hashPin(TEMP_MATRON_PASSWORD) }, { merge: true });
    await writeLoginIndex({
      role: UserRole.MATRON,
      targetId: doc.id,
      name: matron.name || 'Matron',
      subtitle: 'Care & medication',
    });
  }
  console.log(`Matron Auth accounts ready: ${snap.size}. Temporary password: ${TEMP_MATRON_PASSWORD}`);
}

async function main() {
  await migrateAdmin();
  await migrateTeachers();
  await migrateParents();
  await migrateVtcStudents();
  await migrateMatrons();
  console.log('Auth migration complete.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
