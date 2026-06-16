const admin = require('firebase-admin');

const SERVICE_ACCOUNT_ENV = 'FIREBASE_SERVICE_ACCOUNT_JSON';
const PARENT_PIN = '2026';
const TEACHER_PIN = '1234';
const ACADEMIC_YEAR = '2026/2027';
const SEED_BATCH = 'learners-2026-special-needs';

const roster = [
  {
    className: 'Level 3',
    primaryTeacher: 'Ms Menete Kalenga',
    assistants: [],
    learners: [
      ['Halwoodi Joseph', '2014-09-25', '0812109047'],
      ['Kambinda Politoh Hebron', '2009-06-29', '0816579792'],
      ['Antunes Manuel Ulisses', '2015-01-03', '0814892420'],
      ['Mtileni Shawn Tuyoleni', '2016-06-15', '0816664630'],
      ['Shooya Gloria', '2013-01-14', '0812222567'],
      ['Isikia Roman Opotuli', '2012-12-19', '0812423586'],
      ['Fillemon Meitavelo', '2011-06-07', '0812753806'],
      ['Uushona Monika Natangwe', '', ''],
      ['Mwiila Jeckonia Nghilifavali', '2013-07-29', '0812802595'],
      ['Sheelongo Vision', '2015-10-20', '0812727945'],
      ['Iileka Joyce', '2011-12-25', '0812440021'],
      ['Sankombo Etuuva', '2017-12-03', '0811298998'],
      ['Iita Vaino Omwene- Etuna', '2012-04-17', '0812935136'],
      ['Kafula Silas', '2012-12-05', '0812371872'],
      ['Hedimbi Fillipus', '2014-11-19', '0817689713'],
      ['Kandjomba Soinni', '2015-01-20', '0817848692'],
    ],
  },
  {
    className: 'Level 2',
    primaryTeacher: 'Mr Thomas Nangolo',
    assistants: ['Mrs Hilaria Gabriel'],
    learners: [
      ['Antonio Genesis', '2019-05-26', '0812532043'],
      ['Enkono Grace', '2017-04-18', '0813230491'],
      ['Hambabi Queen', '2018-10-16', '0814081639'],
      ['Lomboleni Angie', '2017-09-13', '0811292417'],
      ['Shipanga Loide', '2013-12-29', '0816472894'],
      ['Adafo Estevato', '2016-01-26', '0814892420'],
      ['Adafo Jonata', '2013-02-16', '0814892420'],
      ['Agustino Adelino', '2014-09-18', '0812305572'],
      ['Hamuntenya Jeicob', '2017-07-16', '0814308579'],
      ['Itula Amon', '2018-01-28', '0814974622'],
      ['Kambonde Johannes', '2017-08-18', '0812438936'],
      ['Katukula Mubiana', '2012-06-09', '0812354189'],
      ['Johannes Tobias', '2014-10-02', '0812951981'],
      ['Samuel Josef', '2014-03-07', '0812596375'],
      ['Shihepo Meameno', '2010-07-05', '0812331972'],
      ['Shomoshili Maxton', '2015-09-19', '0812033395'],
      ['Sinvula Owen', '2012-05-02', '0813439414'],
      ['Ainima Naftal', '2018-01-04', '0812348828'],
      ['Dumeni Hiskiel', '2016-03-05', '0817736065'],
      ['Negumbo Secilia K', '2018-03-15', '0814390388'],
      ['Mamili Steven', '2019-07-10', '0812118488'],
      ['Sure Shivinga', '2018-07-15', '0812202025'],
    ],
  },
  {
    className: 'Level 1',
    primaryTeacher: 'Mrs Lovis Mikka',
    assistants: ['Ms Loini Negongo'],
    learners: [
      ['Asteria Hailapa', '2019-10-26', '0812160278'],
      ['De Miranda Carlos Kabanda', '2021-09-03', '0814669688'],
      ['Gideon Shaan- Denany', '2020-10-15', '0817489162'],
      ['Imbondi Rian Natangwe', '2019-01-30', '0814004457'],
      ['Kashupi Mario Hafeni', '2018-12-11', '0812927791'],
      ['Kamulumbu Tangi Simaneka', '2017-06-06', '0812289623'],
      ['Mbinga Tulonga', '2019-05-19', '0817092332'],
      ['Namupala Newman Walter', '2019-09-20', '0813782864'],
      ['Naundobe Richie', '2019-08-25', '0814061406'],
      ['Petrus John Diocotale', '2018-09-10', '0812384206'],
      ['Rweenya Maxton', '2020-02-17', '0812607264'],
      ['Shipanga Moses Shikongo', '2021-10-20', '0816090076'],
      ['Tomas Adafo', '2019-04-12', '0814892420'],
      ['Lungameni Mecs', '2018-05-06', '0813173997'],
      ['Kadhila Veikko', '2020-01-23', '0813395505'],
      ['Uunona Ndinokwafi', '2019-12-20', '0811478460'],
      ['Protasiu Victory', '2020-10-31', '0812839941'],
      ['Ryan Hakali', '2021-07-06', '0812092958'],
      ['Kagadhinwa Frans Tangi', '2018-07-17', '0811502627'],
      ['Mario Haikali', '2019-12-19', '0816824400'],
    ],
  },
];

const normalize = (value) => value.trim().toLowerCase().replace(/\s+/g, ' ');
const seedKeyFor = (name, className) => `${SEED_BATCH}:${normalize(className)}:${normalize(name)}`;

const splitName = (name) => {
  const parts = name.trim().split(/\s+/);
  return {
    surname: parts[0] || '',
    firstName: parts.slice(1).join(' ') || parts[0] || '',
  };
};

const chunk = (items, size) => {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const parseServiceAccount = () => {
  const raw = process.env[SERVICE_ACCOUNT_ENV];
  if (!raw) {
    throw new Error(`Missing ${SERVICE_ACCOUNT_ENV}.`);
  }
  return JSON.parse(raw);
};

const loadCollection = async (db, collectionName) => {
  const snapshot = await db.collection(collectionName).get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

const allocateStudentIds = async (db, count) => {
  if (count === 0) return [];
  const settingsRef = db.collection('settings').doc('general');
  const start = await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(settingsRef);
    const current = snapshot.exists ? Number(snapshot.get('lastStudentId') || 0) : 0;
    transaction.set(settingsRef, { lastStudentId: current + count }, { merge: true });
    return current + 1;
  });

  return Array.from({ length: count }, (_, index) => `C-${String(start + index).padStart(4, '0')}`);
};

const main = async () => {
  const serviceAccount = parseServiceAccount();
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });

  const db = admin.firestore();
  const timestamp = admin.firestore.FieldValue.serverTimestamp();

  const existingTeachers = await loadCollection(db, 'teachers');
  const existingStudents = await loadCollection(db, 'students');
  const teacherByName = new Map(existingTeachers.map((teacher) => [normalize(teacher.name || ''), teacher]));
  const studentBySeedKey = new Map(existingStudents.filter((student) => student.seedKey).map((student) => [student.seedKey, student]));

  for (const student of existingStudents) {
    if (student.seedKey) continue;
    const className = student.assignedClass || student.level || '';
    if (!student.name || !className) continue;
    studentBySeedKey.set(seedKeyFor(student.name, className), student);
  }

  const teacherRefs = new Map();
  let createdTeachers = 0;
  let updatedTeachers = 0;

  for (const group of roster) {
    for (const [name, isAssistant] of [[group.primaryTeacher, false], ...group.assistants.map((name) => [name, true])]) {
      const key = normalize(name);
      const existing = teacherByName.get(key);
      const teacherRef = existing ? db.collection('teachers').doc(existing.id) : db.collection('teachers').doc();
      teacherRefs.set(name, { ref: teacherRef, id: teacherRef.id });

      const assignedClasses = Array.from(new Set([...(existing?.assignedClasses || []), group.className]));
      await teacherRef.set({
        name,
        subject: isAssistant ? 'Assistant Teacher' : 'Special Needs',
        role: 'TEACHER',
        pin: existing?.pin || TEACHER_PIN,
        assignedClass: assignedClasses[0] || group.className,
        assignedClasses,
        activeTeachingClass: existing?.activeTeachingClass || group.className,
        assignedStudentIds: Array.from(new Set(existing?.assignedStudentIds || [])),
        seedBatch: SEED_BATCH,
        updatedAt: timestamp,
        ...(existing ? {} : { createdAt: timestamp }),
      }, { merge: true });

      if (existing) updatedTeachers += 1;
      else createdTeachers += 1;
    }
  }

  const allLearners = roster.flatMap((group) => group.learners.map(([name, dob, phone]) => ({ ...splitName(name), name, dob, phone, className: group.className, teacher: group.primaryTeacher })));
  const newLearners = allLearners.filter((learner) => !studentBySeedKey.has(seedKeyFor(learner.name, learner.className)));
  const newIds = await allocateStudentIds(db, newLearners.length);
  const nextIdBySeedKey = new Map(newLearners.map((learner, index) => [seedKeyFor(learner.name, learner.className), newIds[index]]));

  let createdStudents = 0;
  let updatedStudents = 0;
  const studentIdsByClass = new Map(roster.map((group) => [group.className, []]));
  const writes = [];

  for (const learner of allLearners) {
    const seedKey = seedKeyFor(learner.name, learner.className);
    const existing = studentBySeedKey.get(seedKey);
    const studentId = existing?.id || nextIdBySeedKey.get(seedKey);
    const primaryTeacher = teacherRefs.get(learner.teacher);
    const studentRef = db.collection('students').doc(studentId);
    studentIdsByClass.get(learner.className).push(studentId);

    writes.push({
      ref: studentRef,
      data: {
        id: studentId,
        name: learner.name,
        firstName: learner.firstName,
        surname: learner.surname,
        dob: learner.dob,
        role: 'PARENT',
        parentPin: PARENT_PIN,
        parentName: 'Parent / Guardian',
        fatherPhone: learner.phone,
        motherPhone: '',
        emergencyCell: learner.phone,
        studentStatus: 'ENROLLED',
        academicYear: ACADEMIC_YEAR,
        division: 'Special Needs',
        isSpecialNeeds: true,
        grade: '',
        level: learner.className,
        assignedClass: learner.className,
        assignedTeacherId: primaryTeacher.id,
        assignedTeacherName: learner.teacher,
        assessment: existing?.assessment || { teacherAssessments: {}, isComplete: false },
        seedBatch: SEED_BATCH,
        seedKey,
        updatedAt: timestamp,
        ...(existing ? {} : { enrolledAt: timestamp, createdAt: timestamp, createdBy: '2026 seed script' }),
      },
    });

    if (existing) updatedStudents += 1;
    else createdStudents += 1;
  }

  for (const batchWrites of chunk(writes, 450)) {
    const batch = db.batch();
    batchWrites.forEach(({ ref, data }) => batch.set(ref, data, { merge: true }));
    await batch.commit();
  }

  for (const group of roster) {
    const groupStudentIds = studentIdsByClass.get(group.className);
    for (const teacherName of [group.primaryTeacher, ...group.assistants]) {
      const { ref } = teacherRefs.get(teacherName);
      const snapshot = await ref.get();
      const teacher = snapshot.data() || {};
      const assignedStudentIds = Array.from(new Set([...(teacher.assignedStudentIds || []), ...groupStudentIds]));
      await ref.set({
        assignedStudentIds,
        assignedClasses: Array.from(new Set([...(teacher.assignedClasses || []), group.className])),
        assignedClass: teacher.assignedClass || group.className,
        activeTeachingClass: teacher.activeTeachingClass || group.className,
        updatedAt: timestamp,
      }, { merge: true });
    }
  }

  await db.collection('settings').doc('general').set({
    specialNeedsLevels: ['Level 1', 'Level 2', 'Level 3'],
    updatedAt: timestamp,
  }, { merge: true });

  console.log(JSON.stringify({
    projectId: serviceAccount.project_id,
    createdTeachers,
    updatedTeachers,
    createdStudents,
    updatedStudents,
    totalRosterStudents: allLearners.length,
    parentPin: PARENT_PIN,
    teacherPin: TEACHER_PIN,
    incompleteDobRows: allLearners.filter((learner) => !learner.dob).map((learner) => learner.name),
  }, null, 2));
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
