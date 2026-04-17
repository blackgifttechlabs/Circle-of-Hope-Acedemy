import { db, auth } from '../firebase';
import { collection, collectionGroup, addDoc, getDocs, getDoc, query, where, doc, updateDoc, deleteDoc, orderBy, Timestamp, setDoc, runTransaction, limit, startAt, endAt, writeBatch } from 'firebase/firestore';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { Teacher, Student, UserRole, Application, SystemSettings, Receipt, Division, AssessmentData, SelfCareAssessment, AssessmentDay, VtcApplication, StudentDailyRegister, WeeklyLessonPlan, AssessmentRating, TopicOverride, CustomTopicEntry, PaymentProof, HomeworkAssignment, HomeworkSubmission, UploadedDocument, ActivityLog, Matron, StudentMedication, MatronLog, MedicationAdministration, MatronLogCategory } from '../types';
import { CLASS_LIST_SKILLS } from '../utils/classListSkills';
import { findPrePrimarySkill } from '../utils/assessmentWorkflow';
import { getPaymentOptionLabel, isRegistrationFeeOption } from '../utils/paymentOptions';
import { hashPin } from '../utils/crypto';

// Collections
const TEACHERS_COLLECTION = 'teachers';
export const STUDENTS_COLLECTION = 'students';
const APPLICATIONS_COLLECTION = 'applications';
const VTC_APPLICATIONS_COLLECTION = 'vtcApplications';
const SETTINGS_COLLECTION = 'settings';
const RECEIPTS_COLLECTION = 'receipts';
const ASSESSMENT_RECORDS_COLLECTION = 'assessment_records';
const PAYMENT_PROOFS_COLLECTION = 'payment_proofs';
const HOMEWORK_ASSIGNMENTS_COLLECTION = 'homework_assignments';
const HOMEWORK_SUBMISSIONS_COLLECTION = 'homework_submissions';
const STUDENT_DOCUMENTS_COLLECTION = 'student_documents';
const ACTIVITY_LOGS_COLLECTION = 'activity_logs';
const MATRONS_COLLECTION = 'matrons';
const STUDENT_MEDICATIONS_COLLECTION = 'student_medications';
const MATRON_LOGS_COLLECTION = 'matron_logs';
const MEDICATION_ADMINISTRATIONS_COLLECTION = 'medication_administrations';

// Admin Auth Configuration
const ADMIN_EMAIL = "admin@coha.com";
const ADMIN_AUTH_PASSWORD = "111111"; 

const calculateAge = (dobString: string): number => {
  const today = new Date();
  const birthDate = new Date(dobString);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

const normalizeSpecialNeedsLabel = (value?: string): string => {
  const trimmed = value?.trim() || '';
  if (!trimmed) return '';
  if (trimmed === 'Level 1A' || trimmed === 'Level 1B') return 'Level 1';
  if (trimmed.startsWith('Level 1A - Stage')) return trimmed.replace('Level 1A', 'Level 1');
  if (trimmed.startsWith('Level 1B - Stage')) return trimmed.replace('Level 1B', 'Level 1');
  return trimmed;
};

const normalizeClassLabel = (value?: string): string => normalizeSpecialNeedsLabel(value);

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (!value || typeof value !== 'object') return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const stripUndefinedFields = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value
      .map((item) => stripUndefinedFields(item))
      .filter((item) => item !== undefined);
  }

  if (isPlainObject(value)) {
    return Object.entries(value).reduce<Record<string, unknown>>((acc, [key, item]) => {
      if (item === undefined) return acc;
      const sanitized = stripUndefinedFields(item);
      if (sanitized !== undefined) acc[key] = sanitized;
      return acc;
    }, {});
  }

  return value;
};

const uniqueNonEmpty = (values: Array<string | undefined | null>) => (
  Array.from(new Set(values.map((value) => normalizeClassLabel(value || '')).filter(Boolean)))
);

const normalizeTeacherRecord = (teacher: Teacher): Teacher => {
  const assignedClasses = uniqueNonEmpty([...(teacher.assignedClasses || []), teacher.assignedClass]);
  return {
    ...teacher,
    assignedClasses,
    assignedClass: assignedClasses[0] || '',
    assignedStudentIds: Array.from(new Set((teacher.assignedStudentIds || []).filter(Boolean))),
    activeTeachingClass: normalizeClassLabel(teacher.activeTeachingClass) || teacher.activeTeachingClass || assignedClasses[0] || '',
  };
};

const normalizeStudentRecord = (student: Student): Student => ({
  ...student,
  level: normalizeClassLabel(student.level) || student.level,
  assignedClass: normalizeClassLabel(student.assignedClass) || student.assignedClass,
});

const normalizeSpecialNeedsLevels = (levels?: string[]): string[] => {
  const normalized = uniqueNonEmpty(levels || []);
  return normalized.length ? normalized : ['Level 1', 'Level 2', 'Level 3'];
};

const parseStudentTargetClass = (targetClass: string) => {
  const normalizedClass = normalizeClassLabel(targetClass);
  const isSpecialNeeds = normalizedClass.startsWith('Level ');
  return {
    normalizedClass,
    division: isSpecialNeeds ? Division.SPECIAL_NEEDS : Division.MAINSTREAM,
    grade: isSpecialNeeds ? '' : normalizedClass,
    level: isSpecialNeeds ? normalizedClass : '',
  };
};

const getStudentDisplayClass = (student: Student) => normalizeClassLabel(student.assignedClass || student.grade || student.level || '');
const matchesTeachingClass = (student: Student, className: string) => {
  const normalizedClass = normalizeClassLabel(className);
  const studentClass = getStudentDisplayClass(student);
  if (!normalizedClass || !studentClass) return false;
  return studentClass === normalizedClass || studentClass.startsWith(`${normalizedClass} - Stage`);
};

export const determineSpecialNeedsLevel = (dob: string): string => {
  const age = calculateAge(dob);
  if (age >= 11) return 'Level 3'; 
  if (age >= 9) return 'Level 2';  
  return 'Level 1'; 
};

export const seedAdminUser = async () => {
  try {
    await createUserWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_AUTH_PASSWORD);
    const settings = await getSystemSettings();
    if (!settings) {
      await saveSystemSettings({
        schoolName: 'Circle of Hope Academy',
        adminName: 'Victoria Joel',
        adminPin: '1111',
        termStartDate: '2026-01-14',
        termStartTime: '07:30',
        grades: ['Grade 0', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7'],
        specialNeedsLevels: ['Level 1', 'Level 2', 'Level 3'],
        fees: [
          { id: '1', category: 'Tuition (Special Classes)', amount: '2300', frequency: 'Monthly', notes: 'Due by 5th' },
          { id: '2', category: 'Tuition (Termly)', amount: '7100', frequency: 'Termly', notes: 'Discounted rate' },
        ],
        uniforms: [], 
        stationery: [], 
        lastStudentId: 0
      });
    }
  } catch (error: any) {
    if (error.code !== 'auth/email-already-in-use') {
      console.error("Error seeding admin user:", error);
    }
  }
};

export const addTeacher = async (
  name: string,
  subject: string,
  assignedClass: string,
  extras?: Partial<Teacher>
) => {
  try {
    const normalizedClasses = uniqueNonEmpty([assignedClass, ...(extras?.assignedClasses || [])]);
    const docRef = await addDoc(collection(db, TEACHERS_COLLECTION), {
      name,
      subject,
      assignedClass: normalizedClasses[0] || '',
      assignedClasses: normalizedClasses,
      assignedStudentIds: extras?.assignedStudentIds || [],
      role: UserRole.TEACHER,
      pin: '1234',
      activeTeachingClass: extras?.activeTeachingClass || normalizedClasses[0] || '',
      createdAt: new Date()
    });
    return docRef.id;
  } catch (error) {
    console.error("Error adding teacher: ", error);
    return null;
  }
};

export const updateTeacher = async (id: string, data: Partial<Teacher>) => {
  try {
    const docRef = doc(db, TEACHERS_COLLECTION, id);
    const nextAssignedClasses = data.assignedClasses
      ? uniqueNonEmpty(data.assignedClasses)
      : data.assignedClass
        ? uniqueNonEmpty([data.assignedClass])
        : undefined;

    const payload: Record<string, any> = {
      ...data,
      assignedClass: nextAssignedClasses
        ? nextAssignedClasses[0] || ''
        : (data.assignedClass ? normalizeClassLabel(data.assignedClass) : data.assignedClass),
      assignedClasses: nextAssignedClasses || data.assignedClasses,
      assignedStudentIds: data.assignedStudentIds
        ? Array.from(new Set(data.assignedStudentIds.filter(Boolean)))
        : data.assignedStudentIds,
    };

    const normalizedActiveTeachingClass = data.activeTeachingClass
      ? normalizeClassLabel(data.activeTeachingClass)
      : (nextAssignedClasses && nextAssignedClasses.length > 0 ? nextAssignedClasses[0] : undefined);

    if (normalizedActiveTeachingClass !== undefined) {
      payload.activeTeachingClass = normalizedActiveTeachingClass;
    }

    Object.keys(payload).forEach((key) => {
      if (payload[key] === undefined) {
        delete payload[key];
      }
    });

    await updateDoc(docRef, payload as any);
    return true;
  } catch (error) {
    console.error("Error updating teacher:", error);
    return false;
  }
};

export const uploadLessonPlan = async (plan: Omit<WeeklyLessonPlan, 'id' | 'uploadedAt'>) => {
  try {
    const docRef = await addDoc(collection(db, 'lesson_plans'), {
      ...plan,
      uploadedAt: new Date().toISOString()
    });
    const teacher = await getTeacherById(plan.teacherId);
    await addActivityLog({
      category: 'LESSON_PLAN',
      action: `${teacher?.name || 'Teacher'} submitted a lesson plan for ${plan.classLevel}`,
      actorId: plan.teacherId,
      actorName: teacher?.name || 'Teacher',
      actorRole: UserRole.TEACHER,
      targetId: docRef.id,
      targetName: `${plan.classLevel} lesson plan`,
      details: `Term: ${plan.termId}. Week: ${plan.weekNumber || '-'}. Theme: ${plan.theme || '-'}.`,
    });
    return docRef.id;
  } catch (error) {
    console.error("Error uploading lesson plan:", error);
    throw error;
  }
};

export const getLessonPlans = async (teacherId: string, classLevel: string) => {
  try {
    const q = query(
      collection(db, 'lesson_plans'),
      where('teacherId', '==', teacherId),
      where('classLevel', '==', classLevel)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WeeklyLessonPlan));
  } catch (error) {
    console.error("Error fetching lesson plans:", error);
    return [];
  }
};

export const deleteHomeworkSubmissions = async (submissionIds: string[]) => {
    try {
        const batch = writeBatch(db);
        submissionIds.forEach(id => {
            batch.delete(doc(db, HOMEWORK_SUBMISSIONS_COLLECTION, id));
        });
        await batch.commit();
        return true;
    } catch (error) {
        console.error("Error deleting homework submissions:", error);
        return false;
    }
};

export const dismissMatronAlert = async (alertId: string) => {
  try {
    const docRef = doc(db, 'alert_dismissals', alertId);
    await setDoc(docRef, { dismissedAt: Timestamp.now() });
    return true;
  } catch (error) {
    console.error("Error dismissing alert:", error);
    return false;
  }
};

export const getDismissedAlerts = async (): Promise<string[]> => {
  try {
    const q = query(collection(db, 'alert_dismissals'));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.id);
  } catch (error) {
    return [];
  }
};

export const getMedicationAdministrations = async (startDate?: Date, endDate?: Date): Promise<MedicationAdministration[]> => {
  try {
    let q;
    if (startDate && endDate) {
      q = query(
        collection(db, MEDICATION_ADMINISTRATIONS_COLLECTION),
        where("time_given", ">=", Timestamp.fromDate(startDate)),
        where("time_given", "<=", Timestamp.fromDate(endDate)),
        orderBy("time_given", "desc")
      );
    } else {
      q = query(collection(db, MEDICATION_ADMINISTRATIONS_COLLECTION), orderBy("time_given", "desc"));
    }
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MedicationAdministration));
  } catch (error) {
    console.error("Error fetching medication administrations:", error);
    return [];
  }
};

export const getAllLessonPlans = async () => {
  try {
    const q = query(collection(db, 'lesson_plans'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WeeklyLessonPlan));
  } catch (error) {
    console.error("Error fetching all lesson plans:", error);
    return [];
  }
};

export const deleteTeacher = async (id: string) => {
  try {
    await deleteDoc(doc(db, TEACHERS_COLLECTION, id));
    return true;
  } catch (error) {
    console.error("Error deleting teacher:", error);
    return false;
  }
};

export const getTeachers = async (): Promise<Teacher[]> => {
  const q = query(collection(db, TEACHERS_COLLECTION));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => normalizeTeacherRecord({ id: doc.id, ...doc.data() } as Teacher));
};

export const getTeacherById = async (id: string): Promise<Teacher | null> => {
  const docRef = doc(db, TEACHERS_COLLECTION, id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return normalizeTeacherRecord({ id: docSnap.id, ...docSnap.data() } as Teacher);
  }
  return null;
};

export const getTeacherByClass = async (className: string): Promise<Teacher | null> => {
    const normalizedClass = normalizeClassLabel(className);
    const teachers = await getTeachers();
    const match = teachers.find((teacher) => (teacher.assignedClasses || []).includes(normalizedClass));
    if (match) return match;
    return null;
};

export const searchTeachers = async (searchTerm: string): Promise<Teacher[]> => {
  if (!searchTerm) return [];
  const all = await getTeachers();
  return all.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()));
};

export const getStudentsForTeacher = async (teacherId: string): Promise<Student[]> => {
  const [teacher, students] = await Promise.all([getTeacherById(teacherId), getStudents()]);
  if (!teacher) return [];

  const assignedStudentIds = new Set(teacher.assignedStudentIds || []);
  const assignedClasses = new Set(teacher.assignedClasses || []);

  return students.filter((student) => {
    if (student.assignedTeacherId === teacherId) return true;
    if (assignedStudentIds.has(student.id)) return true;
    if (!assignedStudentIds.size && assignedClasses.size) {
      return assignedClasses.has(getStudentDisplayClass(student));
    }
    return false;
  });
};

export const getStudentsForTeacherByClass = async (teacherId: string, className: string): Promise<Student[]> => {
  const students = await getStudentsForTeacher(teacherId);
  return students.filter((student) => matchesTeachingClass(student, className));
};

export const getTeacherTeachingClasses = async (teacherId: string): Promise<string[]> => {
  const [teacher, students] = await Promise.all([getTeacherById(teacherId), getStudentsForTeacher(teacherId)]);
  return uniqueNonEmpty([
    ...((teacher?.assignedClasses || []) as string[]),
    ...(students.map((student) => getStudentDisplayClass(student))),
  ]);
};

export const syncTeacherAssignments = async (
  teacherId: string,
  assignedClasses: string[],
  assignedStudentIds: string[]
) => {
  try {
    const teacher = await getTeacherById(teacherId);
    if (!teacher) return false;

    const normalizedClasses = uniqueNonEmpty(assignedClasses);
    const normalizedStudentIds = Array.from(new Set(assignedStudentIds.filter(Boolean)));
    const allStudents = await getStudents();
    const previouslyAssignedIds = new Set([
      ...(teacher.assignedStudentIds || []),
      ...allStudents.filter((student) => student.assignedTeacherId === teacherId).map((student) => student.id),
    ]);

    const batch = writeBatch(db);
    const teacherRef = doc(db, TEACHERS_COLLECTION, teacherId);
    batch.update(teacherRef, {
      assignedClasses: normalizedClasses,
      assignedClass: normalizedClasses[0] || '',
      assignedStudentIds: normalizedStudentIds,
      activeTeachingClass: normalizeClassLabel(teacher.activeTeachingClass) || normalizedClasses[0] || '',
    });

    previouslyAssignedIds.forEach((studentId) => {
      if (normalizedStudentIds.includes(studentId)) return;
      const studentRef = doc(db, STUDENTS_COLLECTION, studentId);
      batch.update(studentRef, {
        assignedTeacherId: '',
        assignedTeacherName: '',
      });
    });

    normalizedStudentIds.forEach((studentId) => {
      const student = allStudents.find((item) => item.id === studentId);
      if (!student) return;
      const studentClass = getStudentDisplayClass(student);
      const studentRef = doc(db, STUDENTS_COLLECTION, studentId);
      batch.update(studentRef, {
        assignedTeacherId: teacherId,
        assignedTeacherName: teacher.name,
        assignedClass: studentClass || student.assignedClass || '',
      });
    });

    await batch.commit();
    return true;
  } catch (error) {
    console.error('Error syncing teacher assignments:', error);
    return false;
  }
};

export const transferStudentToTeacherAndClass = async (
  studentId: string,
  targetClass: string,
  teacherId: string,
  actorName: string = 'Admin',
  actorId: string = 'admin'
) => {
  try {
    const [student, teacher, teachers] = await Promise.all([
      getStudentById(studentId),
      getTeacherById(teacherId),
      getTeachers(),
    ]);
    if (!student || !teacher) return false;

    const previousTeacherId = student.assignedTeacherId;
    const target = parseStudentTargetClass(targetClass);
    const batch = writeBatch(db);

    batch.update(doc(db, STUDENTS_COLLECTION, studentId), {
      assignedClass: target.normalizedClass,
      division: target.division,
      grade: target.grade,
      level: target.level,
      assignedTeacherId: teacherId,
      assignedTeacherName: teacher.name,
    });

    const nextTeacherStudentIds = Array.from(new Set([...(teacher.assignedStudentIds || []), studentId]));
    const nextTeacherClasses = uniqueNonEmpty([...(teacher.assignedClasses || []), target.normalizedClass]);
    batch.update(doc(db, TEACHERS_COLLECTION, teacherId), {
      assignedStudentIds: nextTeacherStudentIds,
      assignedClasses: nextTeacherClasses,
      assignedClass: nextTeacherClasses[0] || '',
      activeTeachingClass: normalizeClassLabel(teacher.activeTeachingClass) || target.normalizedClass,
    });

    if (previousTeacherId && previousTeacherId !== teacherId) {
      const previousTeacher = teachers.find((item) => item.id === previousTeacherId);
      if (previousTeacher) {
        batch.update(doc(db, TEACHERS_COLLECTION, previousTeacherId), {
          assignedStudentIds: (previousTeacher.assignedStudentIds || []).filter((id) => id !== studentId),
        });
      }
    }

    await batch.commit();
    await addActivityLog({
      category: 'STUDENT',
      action: `${actorName} transferred ${student.name} to ${target.normalizedClass}`,
      actorId,
      actorName,
      actorRole: UserRole.ADMIN,
      targetId: studentId,
      targetName: student.name,
      details: `Assigned teacher: ${teacher.name}. Previous teacher: ${student.assignedTeacherName || 'Unassigned'}.`,
    });
    return true;
  } catch (error) {
    console.error('Error transferring student:', error);
    return false;
  }
};

export const createStudentByAdmin = async ({
    firstName,
    surname,
    dob,
    targetClass,
    adminName,
    adminId = 'admin',
}: {
    firstName: string;
    surname: string;
    dob: string;
    targetClass: string;
    adminName: string;
    adminId?: string;
}): Promise<{ success: boolean; student?: Student; message?: string }> => {
  try {
    const cleanFirstName = firstName.trim();
    const cleanSurname = surname.trim();
    const cleanTargetClass = targetClass.trim();
    if (!cleanFirstName || !cleanSurname || !dob || !cleanTargetClass) {
      return { success: false, message: 'Student name, surname, date of birth, and class are required.' };
    }

    const customId = await generateStudentId();
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    const target = parseStudentTargetClass(cleanTargetClass);
    const teachers = await getTeachers();
    const targetTeacher = teachers.find((teacher) => (teacher.assignedClasses || []).includes(target.normalizedClass));
    const name = `${cleanFirstName} ${cleanSurname}`.trim();
    const academicYear = `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`;

    const studentData: Student = {
      id: customId,
      name,
      firstName: cleanFirstName,
      surname: cleanSurname,
      dob,
      role: UserRole.PARENT,
      grade: target.grade,
      level: target.level,
      assignedClass: target.normalizedClass,
      division: target.division,
      assignedTeacherId: targetTeacher?.id || '',
      assignedTeacherName: targetTeacher?.name || '',
      parentPin: pin,
      parentName: 'Parent / Guardian',
      studentStatus: 'ENROLLED',
      academicYear,
      enrolledAt: Timestamp.now(),
      ...(target.division === Division.SPECIAL_NEEDS
        ? { assessment: { teacherAssessments: {}, isComplete: false } }
        : {}),
    };

    await setDoc(doc(db, STUDENTS_COLLECTION, customId), {
      ...studentData,
      createdBy: adminName,
      createdAt: Timestamp.now(),
    });

    await addActivityLog({
      category: 'STUDENT',
      action: `${adminName} added student ${name}`,
      actorId: adminId,
      actorName: adminName,
      actorRole: UserRole.ADMIN,
      targetId: customId,
      targetName: name,
      details: `Class: ${target.normalizedClass}. Parent PIN generated.`,
    });

    if (targetTeacher) {
      const nextTeacherStudentIds = Array.from(new Set([...(targetTeacher.assignedStudentIds || []), customId]));
      const nextTeacherClasses = uniqueNonEmpty([...(targetTeacher.assignedClasses || []), target.normalizedClass]);
      await updateDoc(doc(db, TEACHERS_COLLECTION, targetTeacher.id), {
        assignedStudentIds: nextTeacherStudentIds,
        assignedClasses: nextTeacherClasses,
        assignedClass: nextTeacherClasses[0] || '',
        activeTeachingClass: normalizeClassLabel(targetTeacher.activeTeachingClass) || target.normalizedClass,
      });
    }

    return { success: true, student: studentData };
  } catch (error) {
    console.error('Error creating student by admin:', error);
    return { success: false, message: 'Failed to create student.' };
  }
};

const generateStudentId = async (): Promise<string> => {
  const settingsRef = doc(db, SETTINGS_COLLECTION, 'general');
  try {
    const newId = await runTransaction(db, async (transaction) => {
      const settingsDoc = await transaction.get(settingsRef);
      if (!settingsDoc.exists()) { throw "Settings document does not exist!"; }
      
      const currentCount = settingsDoc.data().lastStudentId || 0;
      const nextCount = currentCount + 1;
      transaction.update(settingsRef, { lastStudentId: nextCount });
      return nextCount;
    });
    return `C-${newId.toString().padStart(4, '0')}`;
  } catch (e) {
    return `C-${Date.now().toString().slice(-4)}`; 
  }
};

export const approveApplicationInitial = async (app: Application): Promise<{pin: string, studentId: string} | null> => {
  try {
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    const customId = await generateStudentId();

    const studentData: any = {
        ...app,
        name: `${app.firstName} ${app.surname}`,
        parentName: app.fatherName || app.motherName,
        parentPin: pin,
        role: UserRole.PARENT,
        studentStatus: 'WAITING_PAYMENT', 
        enrolledAt: Timestamp.now(),
        division: app.division || (app.isSpecialNeeds ? Division.SPECIAL_NEEDS : Division.MAINSTREAM),
        level: app.level || (app.isSpecialNeeds ? determineSpecialNeedsLevel(app.dob) : ''),
        grade: app.grade || '',
        assignedClass: normalizeClassLabel(app.isSpecialNeeds ? (app.level || '') : (app.grade || ''))
    };
    
    if (studentData.division === Division.SPECIAL_NEEDS) {
        studentData.assessment = {
            teacherAssessments: {},
            isComplete: false
        };
    }
    
    const { id, ...dataToSave } = studentData;

    await setDoc(doc(db, STUDENTS_COLLECTION, customId), {
        ...dataToSave,
        id: customId 
    });

    const uploadedDocs = [
      app.birthCertificate
        ? [{
            studentId: customId,
            studentName: `${app.firstName} ${app.surname}`,
            parentName: app.fatherName || app.motherName || 'Parent',
            documentType: 'BIRTH_CERTIFICATE' as const,
            title: app.birthCertificate.title || 'Birth Certificate',
            fileName: app.birthCertificate.fileName,
            mimeType: app.birthCertificate.mimeType,
            fileBase64: app.birthCertificate.fileBase64,
            uploadedAt: Timestamp.now(),
          }]
        : [],
      ...(app.medicalDocuments || []).map((item) => ({
        studentId: customId,
        studentName: `${app.firstName} ${app.surname}`,
        parentName: app.fatherName || app.motherName || 'Parent',
        documentType: 'MEDICAL_DOCUMENT' as const,
        title: item.title || 'Medical Document',
        fileName: item.fileName,
        mimeType: item.mimeType,
        fileBase64: item.fileBase64,
        uploadedAt: Timestamp.now(),
      })),
      ...(app.otherDocuments || []).map((item) => ({
        studentId: customId,
        studentName: `${app.firstName} ${app.surname}`,
        parentName: app.fatherName || app.motherName || 'Parent',
        documentType: 'OTHER_DOCUMENT' as const,
        title: item.title || 'Other Document',
        fileName: item.fileName,
        mimeType: item.mimeType,
        fileBase64: item.fileBase64,
        uploadedAt: Timestamp.now(),
      })),
    ].flat();

    for (const item of uploadedDocs) {
      await addDoc(collection(db, STUDENT_DOCUMENTS_COLLECTION), JSON.parse(JSON.stringify(item)));
    }
    
    return { pin, studentId: customId };
  } catch (error) {
    console.error("Error enrolling student:", error);
    return null;
  }
};

export const updateStudent = async (id: string, data: Partial<Student>) => {
  try {
    const docRef = doc(db, STUDENTS_COLLECTION, id);
    const payload: Partial<Student> = { ...data };

    if (payload.assignedClass !== undefined) {
      payload.assignedClass = payload.assignedClass ? normalizeClassLabel(payload.assignedClass) : payload.assignedClass;
    }

    if (payload.level !== undefined) {
      payload.level = payload.level ? normalizeClassLabel(payload.level) : payload.level;
    }

    const sanitizedPayload = stripUndefinedFields(payload) as Partial<Student>;
    if (Object.keys(sanitizedPayload).length === 0) return true;

    await updateDoc(docRef, sanitizedPayload as any);
    return true;
  } catch (error) {
    console.error("Error updating student:", error);
    return false;
  }
};

export const deleteStudent = async (id: string) => {
  try {
    await deleteDoc(doc(db, STUDENTS_COLLECTION, id));
    return true;
  } catch (error) {
    console.error("Error deleting student:", error);
    return false;
  }
};

export const getStudents = async (): Promise<Student[]> => {
  const q = query(collection(db, STUDENTS_COLLECTION));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => normalizeStudentRecord({ id: doc.id, ...doc.data() } as Student));
};

export const getStudentsByStatus = async (status: string): Promise<Student[]> => {
    const q = query(collection(db, STUDENTS_COLLECTION), where("studentStatus", "==", status));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => normalizeStudentRecord({ id: doc.id, ...doc.data() } as Student));
};

export const getHostelStudents = async (): Promise<Student[]> => {
    const q = query(collection(db, STUDENTS_COLLECTION), where("needsHostel", "==", true));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs
      .map(doc => normalizeStudentRecord({ id: doc.id, ...doc.data() } as Student))
      .filter(student => !!student.dorm);
};

/**
 * Updated to support Stage-based fuzzy matching.
 * Teachers assigned to "Level 1B" will see "Level 1B - Stage 1", etc.
 */
export const getStudentsByAssignedClass = async (className: string): Promise<Student[]> => {
    const q = query(collection(db, STUDENTS_COLLECTION));
    const querySnapshot = await getDocs(q);
    const all = querySnapshot.docs.map(doc => normalizeStudentRecord({ id: doc.id, ...doc.data() } as Student));
    return all.filter((student) => matchesTeachingClass(student, className));
};

export const getStudentsByDorm = async (dorm: string): Promise<Student[]> => {
    const q = query(collection(db, STUDENTS_COLLECTION), where("dorm", "==", dorm));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => normalizeStudentRecord({ id: doc.id, ...doc.data() } as Student));
};

export const updateStudentDorm = async (studentId: string, dorm: string) => {
    try {
        const docRef = doc(db, STUDENTS_COLLECTION, studentId);
        await updateDoc(docRef, { dorm });
        return true;
    } catch (error) {
        console.error("Error updating student dorm:", error);
        return false;
    }
};

export const getStudentById = async (id: string): Promise<Student | null> => {
  const docRef = doc(db, STUDENTS_COLLECTION, id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return normalizeStudentRecord({ id: docSnap.id, ...docSnap.data() } as Student);
  }
  return null;
};

export const searchStudents = async (searchTerm: string): Promise<Student[]> => {
  if (!searchTerm) return [];
  const all = await getStudents();
  return all.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));
};

export const getReceipts = async (): Promise<Receipt[]> => {
    const q = query(collection(db, RECEIPTS_COLLECTION), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Receipt));
};

export const getReceiptsForStudent = async (studentId: string): Promise<Receipt[]> => {
    const receipts = await getReceipts();
    return receipts.filter(r => r.usedByStudentId === studentId);
};

export const addActivityLog = async (data: Omit<ActivityLog, 'id' | 'createdAt'>) => {
    try {
        // Sanitize data to remove undefined values
        const sanitizedData = Object.fromEntries(
            Object.entries(data).filter(([_, v]) => v !== undefined)
        );

        await addDoc(collection(db, ACTIVITY_LOGS_COLLECTION), {
            ...sanitizedData,
            createdAt: Timestamp.now(),
        });
        return true;
    } catch (error) {
        console.error('Error adding activity log:', error);
        return false;
    }
};

export const getActivityLogs = async (maxResults = 1000): Promise<ActivityLog[]> => {
    try {
        const q = query(collection(db, ACTIVITY_LOGS_COLLECTION), orderBy('createdAt', 'desc'), limit(maxResults));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as ActivityLog));
    } catch (error) {
        console.error('Error fetching activity logs:', error);
        return [];
    }
};

export const addReceipt = async (number: string, amount: string, date: string) => {
    try {
        await addDoc(collection(db, RECEIPTS_COLLECTION), {
            number: number.trim(),
            amount,
            date,
            isUsed: false,
            createdAt: Timestamp.now()
        });
        return true;
    } catch (e) {
        console.error(e);
        return false;
    }
};

export const deleteReceipt = async (id: string) => {
    await deleteDoc(doc(db, RECEIPTS_COLLECTION, id));
    return true;
};

export const submitPaymentReceipt = async (studentId: string, receiptNumber: string) => {
    try {
        await updateStudent(studentId, {
            receiptNumber: receiptNumber,
            receiptSubmissionDate: Timestamp.now(),
            studentStatus: 'PAYMENT_VERIFICATION', 
            paymentRejected: false 
        });
        return true;
    } catch (e) {
        console.error(e);
        return false;
    }
};

export const verifyPayment = async (studentId: string, receiptNumber: string): Promise<{success: boolean, message: string}> => {
    try {
        const q = query(collection(db, RECEIPTS_COLLECTION), where("number", "==", receiptNumber), where("isUsed", "==", false));
        const snap = await getDocs(q);

        if (snap.empty) {
            return { success: false, message: 'Receipt not found or already used.' };
        }

        const receiptDoc = snap.docs[0];
        await updateDoc(doc(db, RECEIPTS_COLLECTION, receiptDoc.id), {
            isUsed: true,
            usedByStudentId: studentId
        });

        const student = await getStudentById(studentId);
        
        let nextStatus = 'ASSESSMENT';
        if (student && student.division === Division.MAINSTREAM) {
            nextStatus = 'ENROLLED'; 
        }

        await updateStudent(studentId, {
            studentStatus: nextStatus as any
        });

        return { success: true, message: 'Payment verified.' };
    } catch (e) {
        console.error(e);
        return { success: false, message: 'System error.' };
    }
};

export const rejectPayment = async (studentId: string) => {
    await updateStudent(studentId, {
        studentStatus: 'WAITING_PAYMENT',
        receiptNumber: '',
        paymentRejected: true
    });
};

const buildSchoolReceiptNumber = () => {
    const stamp = Date.now().toString().slice(-8);
    return `COHA-${stamp}`;
};

const getNextStatusAfterPayment = (student?: Student | null): Student['studentStatus'] => {
    if (!student) return 'ENROLLED';
    if (student.studentStatus === 'ENROLLED') return 'ENROLLED';
    return student.division === Division.MAINSTREAM ? 'ENROLLED' : 'ASSESSMENT';
};

export const submitPaymentProof = async (
    data: Omit<PaymentProof, 'id' | 'submittedAt' | 'status'>
) => {
    try {
        const student = await getStudentById(data.studentId);
        const payload = JSON.parse(JSON.stringify({
            ...data,
            submittedAt: Timestamp.now(),
            status: 'PENDING'
        }));
        const docRef = await addDoc(collection(db, PAYMENT_PROOFS_COLLECTION), payload);

        const isRegistrationProof = isRegistrationFeeOption(data.termId);
        const nextStatus = isRegistrationProof
          ? (
              student?.studentStatus === 'ENROLLED'
                ? 'ENROLLED'
                : student?.studentStatus === 'ASSESSMENT'
                  ? 'ASSESSMENT'
                  : 'PAYMENT_VERIFICATION'
            )
          : (student?.studentStatus || 'ENROLLED');

        await updateStudent(data.studentId, {
            receiptSubmissionDate: Timestamp.now(),
            studentStatus: nextStatus,
            paymentRejected: isRegistrationProof ? false : student?.paymentRejected || false,
        });

        await addActivityLog({
            category: 'PAYMENT',
            action: `${data.parentName || 'Parent'} submitted payment proof for ${data.studentName}`,
            actorId: data.studentId,
            actorName: data.parentName || 'Parent',
            actorRole: UserRole.PARENT,
            targetId: data.studentId,
            targetName: data.studentName,
            details: `Payment for ${data.termId}. Class: ${data.studentClass || '-'}.`,
        });

        return { success: true, id: docRef.id };
    } catch (error) {
        console.error('Error submitting payment proof:', error);
        return { success: false, id: null };
    }
};

export const submitHomeworkAsMatron = async (
    data: Omit<HomeworkSubmission, 'id' | 'submittedAt' | 'status' | 'teacherId'>,
    matronId: string,
    matronName: string
) => {
    try {
        const teacher = data.className ? await getTeacherByClass(data.className) : null;
        const payload = JSON.parse(JSON.stringify({
            ...data,
            teacherId: teacher?.id || '',
            matronId,
            matronName,
            submittedAt: Timestamp.now(),
            status: 'SUBMITTED',
        }));
        const docRef = await addDoc(collection(db, HOMEWORK_SUBMISSIONS_COLLECTION), payload);
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error('Error submitting homework as matron:', error);
        return { success: false, id: null };
    }
};

export const getPaymentProofs = async (): Promise<PaymentProof[]> => {
    const q = query(collection(db, PAYMENT_PROOFS_COLLECTION), orderBy('submittedAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as PaymentProof));
};

export const getPaymentProofsForStudent = async (studentId: string): Promise<PaymentProof[]> => {
    const q = query(collection(db, PAYMENT_PROOFS_COLLECTION), where('studentId', '==', studentId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as PaymentProof))
      .sort((a, b) => {
        const aTime = a.submittedAt?.seconds || 0;
        const bTime = b.submittedAt?.seconds || 0;
        return bTime - aTime;
      });
};

export const approvePaymentProof = async ({
    proofId,
    studentId,
    amount,
    termId,
    academicYear,
    adminName,
    adminId,
    notes,
}: {
    proofId: string;
    studentId: string;
    amount: number;
    termId: string;
    academicYear: string;
    adminName: string;
    adminId?: string;
    notes?: string;
}) => {
    try {
        const [student, settings, teachers] = await Promise.all([
          getStudentById(studentId),
          getSystemSettings(),
          getTeachers(),
        ]);
        if (!student) {
            return { success: false, message: 'Student not found.' };
        }

        const existingReceipts = await getReceiptsForStudent(studentId);
        const isRegistrationProof = isRegistrationFeeOption(termId);
        const targetClass = normalizeClassLabel(student.assignedClass || student.grade || student.level || '');
        const target = targetClass ? parseStudentTargetClass(targetClass) : null;
        const targetTeacher = targetClass
          ? teachers.find((teacher) => (teacher.assignedClasses || []).includes(targetClass))
          : null;

        let yearlyFees = 0;
        (settings?.fees || []).forEach(f => {
            const feeAmount = parseFloat(f.amount) || 0;
            let multiplier = 1;
            if (f.frequency === 'Monthly') multiplier = 12;
            else if (f.frequency === 'Termly') multiplier = 3;
            yearlyFees += feeAmount * multiplier;
        });

        const paidBefore = existingReceipts.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
        const balanceAfterPayment = yearlyFees - (paidBefore + amount);
        const receiptNumber = buildSchoolReceiptNumber();

        const receiptRef = await addDoc(collection(db, RECEIPTS_COLLECTION), {
            number: receiptNumber,
            amount: amount.toFixed(2),
            date: new Date().toISOString(),
            isUsed: true,
            usedByStudentId: studentId,
            type: 'SCHOOL_RECEIPT',
            termId,
            academicYear,
            studentName: student.name,
            studentClass: student.assignedClass || student.grade || student.level || '',
            paymentCategory: 'FEES',
            paymentLabel: getPaymentOptionLabel(termId, settings),
            generatedAt: Timestamp.now(),
            generatedBy: adminName,
            createdAt: Timestamp.now(),
            balanceAfterPayment,
            paymentProofId: proofId,
            notes: notes || '',
        });

        await updateDoc(doc(db, PAYMENT_PROOFS_COLLECTION, proofId), {
            status: 'APPROVED',
            reviewedAt: Timestamp.now(),
            reviewedBy: adminName,
            reviewedReceiptId: receiptRef.id,
            reviewNotes: notes || '',
        });

        const nextStatus = isRegistrationProof
          ? getNextStatusAfterPayment(student)
          : (student.studentStatus || 'ENROLLED');

        const studentPayload: Partial<Student> = {
            studentStatus: nextStatus,
            paymentRejected: false,
            academicYear,
        };

        if (targetClass && target) {
          studentPayload.assignedClass = targetClass;
          studentPayload.grade = target.grade;
          studentPayload.level = target.level;
          studentPayload.division = target.division;
        }

        if (targetTeacher) {
          studentPayload.assignedTeacherId = targetTeacher.id;
          studentPayload.assignedTeacherName = targetTeacher.name;
        }

        await updateStudent(studentId, studentPayload);

        if (targetTeacher) {
          const nextTeacherStudentIds = Array.from(new Set([...(targetTeacher.assignedStudentIds || []), studentId]));
          const nextTeacherClasses = uniqueNonEmpty([...(targetTeacher.assignedClasses || []), targetClass]);
          await updateDoc(doc(db, TEACHERS_COLLECTION, targetTeacher.id), {
            assignedStudentIds: nextTeacherStudentIds,
            assignedClasses: nextTeacherClasses,
            assignedClass: nextTeacherClasses[0] || '',
            activeTeachingClass: normalizeClassLabel(targetTeacher.activeTeachingClass) || targetClass,
          });
        }

        if (student.assignedTeacherId && targetTeacher && student.assignedTeacherId !== targetTeacher.id) {
          const previousTeacher = teachers.find((teacher) => teacher.id === student.assignedTeacherId);
          if (previousTeacher) {
            await updateDoc(doc(db, TEACHERS_COLLECTION, previousTeacher.id), {
              assignedStudentIds: (previousTeacher.assignedStudentIds || []).filter((id) => id !== studentId),
            });
          }
        }

        await addActivityLog({
          category: 'PAYMENT',
          action: `${adminName} approved a payment proof for ${student.name}`,
          actorId: adminId || 'admin',
          actorName: adminName,
          actorRole: UserRole.ADMIN,
          targetId: studentId,
          targetName: student.name,
          details: `Receipt ${receiptNumber}. Amount N$ ${amount.toFixed(2)}. Payment for ${getPaymentOptionLabel(termId, settings)}.`,
        });

        return { success: true, receiptId: receiptRef.id, receiptNumber, nextStatus, assignedClass: targetClass };
    } catch (error) {
        console.error('Error approving payment proof:', error);
        return { success: false, message: 'Failed to approve payment proof.' };
    }
};

export const recordAdminPayment = async ({
    studentId,
    amount,
    paymentCategory,
    termId,
    paymentLabel,
    academicYear,
    adminName,
    adminId,
    notes,
}: {
    studentId: string;
    amount: number;
    paymentCategory: 'FEES' | 'OTHER';
    termId?: string;
    paymentLabel?: string;
    academicYear: string;
    adminName: string;
    adminId?: string;
    notes?: string;
}): Promise<{ success: boolean; receipt?: Receipt; student?: Student; message?: string }> => {
    try {
        const [student, settings] = await Promise.all([
          getStudentById(studentId),
          getSystemSettings(),
        ]);
        if (!student) {
            return { success: false, message: 'Student not found.' };
        }
        if (!amount || amount <= 0) {
            return { success: false, message: 'Enter a valid payment amount.' };
        }

        const existingReceipts = await getReceiptsForStudent(studentId);
        const feeReceipts = existingReceipts.filter((receipt) => receipt.paymentCategory !== 'OTHER');
        const paidBefore = feeReceipts.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

        let yearlyFees = 0;
        (settings?.fees || []).forEach((fee) => {
            const feeAmount = parseFloat(fee.amount) || 0;
            let multiplier = 1;
            if (fee.frequency === 'Monthly') multiplier = 12;
            else if (fee.frequency === 'Termly') multiplier = 3;
            yearlyFees += feeAmount * multiplier;
        });

        const isFeesPayment = paymentCategory === 'FEES';
        const receiptNumber = buildSchoolReceiptNumber();
        const safeTermId = isFeesPayment ? termId || settings?.activeTermId || settings?.schoolCalendars?.[0]?.id || '' : '';
        const safePaymentLabel = isFeesPayment
          ? getPaymentOptionLabel(safeTermId, settings)
          : (paymentLabel?.trim() || 'Other payment');
        const balanceAfterPayment = isFeesPayment ? yearlyFees - (paidBefore + amount) : yearlyFees - paidBefore;

        const receiptPayload = {
            number: receiptNumber,
            amount: amount.toFixed(2),
            date: new Date().toISOString(),
            isUsed: true,
            usedByStudentId: studentId,
            type: 'SCHOOL_RECEIPT' as const,
            termId: safeTermId,
            academicYear,
            studentName: student.name,
            studentClass: student.assignedClass || student.grade || student.level || '',
            paymentCategory,
            paymentLabel: safePaymentLabel,
            manualEntry: true,
            generatedAt: Timestamp.now(),
            generatedBy: adminName,
            createdAt: Timestamp.now(),
            balanceAfterPayment,
            notes: notes || '',
        };

        const receiptRef = await addDoc(collection(db, RECEIPTS_COLLECTION), receiptPayload);
        const nextStatus = isFeesPayment ? getNextStatusAfterPayment(student) : (student.studentStatus || 'ENROLLED');

        await updateStudent(studentId, {
            studentStatus: nextStatus,
            paymentRejected: false,
            academicYear,
        });

        const updatedStudent = await getStudentById(studentId);
        await addActivityLog({
            category: 'PAYMENT',
            action: `${adminName} processed a transaction for ${student.name}`,
            actorId: adminId || 'admin',
            actorName: adminName,
            actorRole: UserRole.ADMIN,
            targetId: studentId,
            targetName: student.name,
            details: `Receipt ${receiptNumber}. Amount N$ ${amount.toFixed(2)}. Payment for ${safePaymentLabel}.`,
        });

        return {
            success: true,
            receipt: { id: receiptRef.id, ...receiptPayload },
            student: updatedStudent || student,
        };
    } catch (error) {
        console.error('Error recording admin payment:', error);
        return { success: false, message: 'Failed to record payment.' };
    }
};

export const rejectPaymentProof = async (proofId: string, studentId: string, adminName: string, notes?: string) => {
    try {
        const student = await getStudentById(studentId);
        const proofSnap = await getDoc(doc(db, PAYMENT_PROOFS_COLLECTION, proofId));
        const proof = proofSnap.exists() ? proofSnap.data() as PaymentProof : null;
        const isRegistrationProof = isRegistrationFeeOption(proof?.termId);
        await updateDoc(doc(db, PAYMENT_PROOFS_COLLECTION, proofId), {
            status: 'REJECTED',
            reviewedAt: Timestamp.now(),
            reviewedBy: adminName,
            reviewNotes: notes || '',
        });
        await updateStudent(studentId, {
            studentStatus: isRegistrationProof
              ? (
                  student?.studentStatus === 'ENROLLED'
                    ? 'ENROLLED'
                    : student?.studentStatus === 'ASSESSMENT'
                      ? 'ASSESSMENT'
                      : 'WAITING_PAYMENT'
                )
              : (student?.studentStatus || 'ENROLLED'),
            paymentRejected: isRegistrationProof,
        });
        await addActivityLog({
            category: 'PAYMENT',
            action: `${adminName} rejected payment proof for ${student?.name || proof?.studentName || studentId}`,
            actorId: 'admin',
            actorName: adminName,
            actorRole: UserRole.ADMIN,
            targetId: studentId,
            targetName: student?.name || proof?.studentName || studentId,
            details: notes || 'No notes recorded.',
        });
        return true;
    } catch (error) {
        console.error('Error rejecting payment proof:', error);
        return false;
    }
};

export const createHomeworkAssignment = async (
    data: Omit<HomeworkAssignment, 'id' | 'createdAt'>
) => {
    try {
        const payload = JSON.parse(JSON.stringify({
            ...data,
            createdAt: Timestamp.now(),
        }));
        const docRef = await addDoc(collection(db, HOMEWORK_ASSIGNMENTS_COLLECTION), payload);
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error('Error creating homework assignment:', error);
        return { success: false, id: null };
    }
};

export const getHomeworkAssignmentsForClass = async (className: string): Promise<HomeworkAssignment[]> => {
    const q = query(collection(db, HOMEWORK_ASSIGNMENTS_COLLECTION), where('className', '==', className));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as HomeworkAssignment))
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
};

export const getHomeworkAssignmentsForClasses = async (classNames: string[]): Promise<HomeworkAssignment[]> => {
    const uniqueClasses = Array.from(new Set(classNames.filter(Boolean)));
    if (uniqueClasses.length === 0) return [];

    const chunks: string[][] = [];
    for (let i = 0; i < uniqueClasses.length; i += 10) {
      chunks.push(uniqueClasses.slice(i, i + 10));
    }

    const snapshots = await Promise.all(chunks.map((classChunk) => {
      const q = query(collection(db, HOMEWORK_ASSIGNMENTS_COLLECTION), where('className', 'in', classChunk));
      return getDocs(q);
    }));

    return snapshots
      .flatMap((snap) => snap.docs.map(d => ({ id: d.id, ...d.data() } as HomeworkAssignment)))
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
};

export const getHomeworkAssignmentsByTeacher = async (teacherId: string): Promise<HomeworkAssignment[]> => {
    const q = query(collection(db, HOMEWORK_ASSIGNMENTS_COLLECTION), where('teacherId', '==', teacherId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as HomeworkAssignment))
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
};

export const submitHomeworkSubmission = async (
    data: Omit<HomeworkSubmission, 'id' | 'submittedAt' | 'status' | 'teacherId'>
) => {
    try {
        const teacher = data.className ? await getTeacherByClass(data.className) : null;
        const payload = JSON.parse(JSON.stringify({
            ...data,
            teacherId: teacher?.id || '',
            submittedAt: Timestamp.now(),
            status: 'SUBMITTED',
        }));
        const docRef = await addDoc(collection(db, HOMEWORK_SUBMISSIONS_COLLECTION), payload);
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error('Error submitting homework:', error);
        return { success: false, id: null };
    }
};

export const getHomeworkSubmissionsForStudent = async (studentId: string): Promise<HomeworkSubmission[]> => {
    const q = query(collection(db, HOMEWORK_SUBMISSIONS_COLLECTION), where('studentId', '==', studentId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as HomeworkSubmission))
      .sort((a, b) => (b.submittedAt?.seconds || 0) - (a.submittedAt?.seconds || 0));
};

export const getHomeworkSubmissionsForStudents = async (studentIds: string[]): Promise<HomeworkSubmission[]> => {
    const uniqueStudentIds = Array.from(new Set(studentIds.filter(Boolean)));
    if (uniqueStudentIds.length === 0) return [];

    const chunks: string[][] = [];
    for (let i = 0; i < uniqueStudentIds.length; i += 10) {
      chunks.push(uniqueStudentIds.slice(i, i + 10));
    }

    const snapshots = await Promise.all(chunks.map((studentChunk) => {
      const q = query(collection(db, HOMEWORK_SUBMISSIONS_COLLECTION), where('studentId', 'in', studentChunk));
      return getDocs(q);
    }));

    return snapshots
      .flatMap((snap) => snap.docs.map(d => ({ id: d.id, ...d.data() } as HomeworkSubmission)))
      .sort((a, b) => (b.submittedAt?.seconds || 0) - (a.submittedAt?.seconds || 0));
};

export const getHomeworkSubmissionsForClass = async (className: string): Promise<HomeworkSubmission[]> => {
    const q = query(collection(db, HOMEWORK_SUBMISSIONS_COLLECTION), where('className', '==', className));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as HomeworkSubmission))
      .sort((a, b) => (b.submittedAt?.seconds || 0) - (a.submittedAt?.seconds || 0));
};

export const getAllHomeworkSubmissions = async (): Promise<HomeworkSubmission[]> => {
    const q = query(collection(db, HOMEWORK_SUBMISSIONS_COLLECTION), orderBy('submittedAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as HomeworkSubmission));
};

export const getAllHomeworkAssignments = async (): Promise<HomeworkAssignment[]> => {
    const q = query(collection(db, HOMEWORK_ASSIGNMENTS_COLLECTION));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as HomeworkAssignment));
};

export const markHomeworkSubmissionReviewed = async (submissionId: string, notes?: string) => {
    try {
        await updateDoc(doc(db, HOMEWORK_SUBMISSIONS_COLLECTION, submissionId), {
            status: 'REVIEWED',
            notes: notes || '',
        });
        return true;
    } catch (error) {
        console.error('Error marking homework reviewed:', error);
        return false;
    }
};

export const uploadStudentDocument = async (
    data: Omit<UploadedDocument, 'id' | 'uploadedAt'>
) => {
    try {
        const payload = JSON.parse(JSON.stringify({
            ...data,
            uploadedAt: Timestamp.now(),
        }));
        const docRef = await addDoc(collection(db, STUDENT_DOCUMENTS_COLLECTION), payload);
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error('Error uploading student document:', error);
        return { success: false, id: null };
    }
};

export const getStudentDocuments = async (studentId: string): Promise<UploadedDocument[]> => {
    const q = query(collection(db, STUDENT_DOCUMENTS_COLLECTION), where('studentId', '==', studentId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as UploadedDocument))
      .sort((a, b) => (b.uploadedAt?.seconds || 0) - (a.uploadedAt?.seconds || 0));
};

// --- ASSESSMENT LOGIC ---

const getNormalizedDailyScore = (dayData: any): number => {
    if (!dayData || !dayData.scores) return 0;
    const s = dayData.scores;
    const inputs = [
        Number(s.numbers) || 0,
        Number(s.reading) || 0,
        Number(s.selfCare) || 0,
        Number(s.behaviour) || 0,
        Number(s.senses) || 0,
        Number(dayData.thinkingScore) || 0,
        Number(dayData.abcScore) || 3
    ];
    const sum = inputs.reduce((a, b) => a + b, 0);
    return parseFloat((sum / inputs.length).toFixed(2));
};

export const calculateDayPercentage = (day: any) => {
    if (!day) return 0;
    const score = (day.dailyTotalScore !== undefined) ? Number(day.dailyTotalScore) : getNormalizedDailyScore(day);
    return Math.round((score / 5) * 100);
};

export const saveParentAssessment = async (studentId: string, assessmentData: Omit<SelfCareAssessment, 'calculatedScore' | 'completedDate'>) => {
    const student = await getStudentById(studentId);
    if (!student || !student.assessment) return false;

    let totalScore = 0;
    const items = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9'] as const;
    
    items.forEach(key => {
        const val = assessmentData[key];
        if (val === 'Yes') totalScore += 1;
        else if (val === 'Yes with help') totalScore += 0.5;
    });

    const calculatedScore = parseFloat(((totalScore / 9) * 5).toFixed(2));

    const finalAssessment: SelfCareAssessment = {
        ...assessmentData,
        completedDate: new Date().toISOString(),
        calculatedScore
    };

    const updatedAssessment = {
        ...student.assessment,
        parentSelfCare: finalAssessment,
        parentSelfCareScore: calculatedScore, 
        parentAssessmentDate: finalAssessment.completedDate
    };
    
    await updateStudent(studentId, { assessment: updatedAssessment });

    return true;
};

export const saveTeacherAssessmentDay = async (studentId: string, day: number, dayData: any) => {
    try {
        const student = await getStudentById(studentId);
        if (!student || !student.assessment) return false;

        const dailyTotalScore = getNormalizedDailyScore(dayData);

        const updatedAssessment = {
            ...student.assessment,
            teacherAssessments: {
                ...student.assessment.teacherAssessments,
                [day]: {
                    ...dayData,
                    dailyTotalScore: dailyTotalScore, 
                    completed: true,
                    date: new Date().toISOString()
                }
            }
        };
        
        await updateStudent(studentId, { assessment: updatedAssessment });
        return true;
    } catch (err) {
        console.error("saveTeacherAssessmentDay failed:", err);
        return false;
    }
};

export const calculateFinalStage = async (studentId: string): Promise<{ success: boolean; assignedClass?: string; error?: string }> => {
    try {
        const student = await getStudentById(studentId);
        if (!student || !student.assessment) {
            return { success: false, error: "Database error: Student record missing." };
        }

        const assessment = student.assessment;
        let daysCount = 0;
        let teacherAggregatePoints = 0;
        
        const dayEntries = Object.entries(assessment.teacherAssessments || {});
        dayEntries.forEach(([dayNum, day]: [string, any]) => {
            if (day.completed) {
                const score = (day.dailyTotalScore !== undefined) ? Number(day.dailyTotalScore) : getNormalizedDailyScore(day);
                teacherAggregatePoints += score;
                daysCount++;
            }
        });

        if (daysCount < 14) {
            return { success: false, error: `Only ${daysCount}/14 days completed.` };
        }

        const teacherAvg = teacherAggregatePoints / daysCount;

        if (!assessment.parentSelfCare) {
            return { success: false, error: "Parent report is missing." };
        }

        const parentScore = Number(assessment.parentSelfCare.calculatedScore) || 0;
        let finalAverage = (teacherAvg * 0.6) + (parentScore * 0.4);
        if (isNaN(finalAverage)) finalAverage = 0;

        let stage: 1 | 2 | 3 = 1;
        if (finalAverage >= 3.8) stage = 3;
        else if (finalAverage >= 2.4) stage = 2;
        else stage = 1;

        const baseLevel = student.level || student.grade || 'Learner';
        const assignedClass = `${baseLevel} - Stage ${stage}`;
        
        await updateStudent(studentId, {
            assessment: { ...assessment, finalAverage, stage, isComplete: true },
            stage: stage,
            assignedClass: assignedClass,
            studentStatus: 'ENROLLED' 
        });
        
        return { success: true, assignedClass };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
};

export const verifyAdminPin = async (pin: string): Promise<any | null> => {
  const settings = await getSystemSettings();
  const validPin = settings ? settings.adminPin : '1111';

  let adminUser = null;

  if (pin === validPin) {
    adminUser = { id: 'admin', name: settings?.adminName || 'Victoria Joel', adminRole: 'super_admin' };
  } else if (settings?.admins) {
    const subAdmin = settings.admins.find(a => a.pin === pin);
    if (subAdmin) {
      adminUser = { id: subAdmin.id, name: subAdmin.name, adminRole: 'sub_admin' };
    }
  }

  if (!adminUser) return null;

  try {
    await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_AUTH_PASSWORD);
    return adminUser;
  } catch (error) {
    console.error("Admin login failed:", error);
    return null;
  }
};

export const createSubAdmin = async (name: string, pin: string): Promise<{success: boolean, message: string}> => {
  try {
    const settings = await getSystemSettings();
    if (!settings) return { success: false, message: 'System settings not found' };

    // Check if PIN matches super admin
    if (pin === settings.adminPin) {
      return { success: false, message: 'This PIN is already in use by the Super Admin.' };
    }

    // Check if PIN matches any existing sub-admin
    if (settings.admins && settings.admins.some(a => a.pin === pin)) {
      return { success: false, message: 'This PIN is already in use by another Admin.' };
    }

    const newAdmin = {
      id: `admin_${Date.now()}`,
      name,
      pin
    };

    const updatedAdmins = [...(settings.admins || []), newAdmin];
    await saveSystemSettings({ admins: updatedAdmins });

    await addActivityLog({
      category: 'ADMIN',
      action: `${settings.adminName || 'Main admin'} created admin ${name}`,
      actorId: 'admin',
      actorName: settings.adminName || 'Main admin',
      actorRole: UserRole.ADMIN,
      targetId: newAdmin.id,
      targetName: name,
      details: 'Sub-admin account created.',
    });

    return { success: true, message: 'Admin created successfully.' };
  } catch (error: any) {
    return { success: false, message: error.message || 'Failed to create admin.' };
  }
};

export const updateAdminAccount = async (
  adminId: string,
  name: string,
  pin: string,
  actorName: string = 'Main admin'
): Promise<{ success: boolean; message: string }> => {
  try {
    const settings = await getSystemSettings();
    if (!settings) return { success: false, message: 'System settings not found.' };

    const cleanName = name.trim();
    const cleanPin = pin.trim();
    if (!cleanName || cleanPin.length < 4) {
      return { success: false, message: 'Admin name and a PIN of at least 4 characters are required.' };
    }

    const isMainAdmin = adminId === 'admin';
    const pinUsedByMain = settings.adminPin === cleanPin && !isMainAdmin;
    const pinUsedByOtherSubAdmin = (settings.admins || []).some((admin) => (
      admin.pin === cleanPin && admin.id !== adminId
    ));
    if (pinUsedByMain || pinUsedByOtherSubAdmin) {
      return { success: false, message: 'This PIN is already in use by another admin.' };
    }

    if (isMainAdmin) {
      await saveSystemSettings({ adminName: cleanName, adminPin: cleanPin });
    } else {
      const admins = settings.admins || [];
      if (!admins.some((admin) => admin.id === adminId)) {
        return { success: false, message: 'Admin account not found.' };
      }
      await saveSystemSettings({
        admins: admins.map((admin) => (
          admin.id === adminId ? { ...admin, name: cleanName, pin: cleanPin } : admin
        )),
      });
    }

    await addActivityLog({
      category: 'ADMIN',
      action: `${actorName} edited admin ${cleanName}`,
      actorId: 'admin',
      actorName,
      actorRole: UserRole.ADMIN,
      targetId: adminId,
      targetName: cleanName,
      details: isMainAdmin ? 'Main admin profile updated.' : 'Sub-admin profile updated.',
    });

    return { success: true, message: 'Admin updated successfully.' };
  } catch (error: any) {
    return { success: false, message: error.message || 'Failed to update admin.' };
  }
};

export const deleteSubAdmin = async (
  adminId: string,
  actorName: string = 'Main admin'
): Promise<{ success: boolean; message: string }> => {
  try {
    if (adminId === 'admin') {
      return { success: false, message: 'The main admin account cannot be deleted.' };
    }

    const settings = await getSystemSettings();
    if (!settings) return { success: false, message: 'System settings not found.' };

    const targetAdmin = (settings.admins || []).find((admin) => admin.id === adminId);
    if (!targetAdmin) {
      return { success: false, message: 'Admin account not found.' };
    }

    await saveSystemSettings({
      admins: (settings.admins || []).filter((admin) => admin.id !== adminId),
    });

    await addActivityLog({
      category: 'ADMIN',
      action: `${actorName} deleted admin ${targetAdmin.name}`,
      actorId: 'admin',
      actorName,
      actorRole: UserRole.ADMIN,
      targetId: adminId,
      targetName: targetAdmin.name,
      details: 'Sub-admin account deleted.',
    });

    return { success: true, message: 'Admin deleted successfully.' };
  } catch (error: any) {
    return { success: false, message: error.message || 'Failed to delete admin.' };
  }
};

export const getAdminProfile = async (adminId: string = 'admin') => {
  const settings = await getSystemSettings();
  if (adminId === 'admin') {
    return { 
      name: settings?.adminName || 'Victoria Joel', 
      id: 'admin',
      adminRole: 'super_admin'
    };
  } else if (settings?.admins) {
    const subAdmin = settings.admins.find(a => a.id === adminId);
    if (subAdmin) {
      return {
        name: subAdmin.name,
        id: subAdmin.id,
        adminRole: 'sub_admin'
      };
    }
  }
  return { 
    name: settings?.adminName || 'Victoria Joel', 
    id: 'admin',
    adminRole: 'super_admin'
  };
};

/**
 * FIXED: Sanitizes data to remove undefined values before calling Firestore.
 * Initializes 'level' as an empty string if not applicable.
 */
export const submitApplication = async (applicationData: Partial<Application>) => {
  try {
    const division = applicationData.isSpecialNeeds ? Division.SPECIAL_NEEDS : Division.MAINSTREAM;
    let level = '';
    
    if (division === Division.SPECIAL_NEEDS && applicationData.dob) {
        level = determineSpecialNeedsLevel(applicationData.dob);
    }

    // Sanitize input to remove any undefined properties from the spread
    const sanitizedData = JSON.parse(JSON.stringify(applicationData));

    await addDoc(collection(db, APPLICATIONS_COLLECTION), {
      ...sanitizedData,
      division,
      level,
      grade: division === Division.MAINSTREAM ? (applicationData.grade || '') : '', 
      status: 'PENDING',
      submissionDate: Timestamp.now()
    });
    return true;
  } catch (error) {
    console.error("Error submitting application:", error);
    return false;
  }
};

export const getApplications = async (): Promise<Application[]> => {
  const q = query(collection(db, APPLICATIONS_COLLECTION), orderBy('submissionDate', 'desc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Application));
};

export const getApplicationById = async (id: string): Promise<Application | null> => {
  const docRef = doc(db, APPLICATIONS_COLLECTION, id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Application;
  }
  return null;
};

export const updateApplication = async (id: string, data: Partial<Application>) => {
  try {
    const docRef = doc(db, APPLICATIONS_COLLECTION, id);
    await updateDoc(docRef, data);
    return true;
  } catch (error) {
    console.error("Error updating application:", error);
    return false;
  }
};

export const submitVtcApplication = async (applicationData: any) => {
  try {
    const sanitizedData = JSON.parse(JSON.stringify(applicationData));
    await addDoc(collection(db, VTC_APPLICATIONS_COLLECTION), {
      ...sanitizedData,
      status: 'PENDING',
      submissionDate: Timestamp.now()
    });
    return true;
  } catch (error) {
    console.error("Error submitting VTC application:", error);
    return false;
  }
};

export const getVtcApplications = async (): Promise<any[]> => {
  const q = query(collection(db, VTC_APPLICATIONS_COLLECTION), orderBy('submissionDate', 'desc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getVtcApplicationById = async (id: string): Promise<any | null> => {
  const docRef = doc(db, VTC_APPLICATIONS_COLLECTION, id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() };
  }
  return null;
};

export const updateVtcApplication = async (id: string, data: any) => {
  try {
    const docRef = doc(db, VTC_APPLICATIONS_COLLECTION, id);
    await updateDoc(docRef, data);
    return true;
  } catch (error) {
    console.error("Error updating VTC application:", error);
    return false;
  }
};

export const getPendingActionCounts = async () => {
    try {
        const appsQuery = query(collection(db, APPLICATIONS_COLLECTION), where("status", "==", "PENDING"));
        const appsSnap = await getDocs(appsQuery);
        
        const verifyQuery = query(collection(db, STUDENTS_COLLECTION), where("studentStatus", "==", "PAYMENT_VERIFICATION"));
        const verifySnap = await getDocs(verifyQuery);

        const paymentProofQuery = query(collection(db, PAYMENT_PROOFS_COLLECTION), where('status', '==', 'PENDING'));
        const paymentProofSnap = await getDocs(paymentProofQuery);
        
        const vtcAppsQuery = query(collection(db, VTC_APPLICATIONS_COLLECTION), where("status", "==", "PENDING"));
        const vtcAppsSnap = await getDocs(vtcAppsQuery);

        const homeworkQuery = query(collection(db, HOMEWORK_SUBMISSIONS_COLLECTION), where('status', '==', 'SUBMITTED'));
        const homeworkSnap = await getDocs(homeworkQuery);
        
        return {
            pendingApps: appsSnap.size,
            pendingVerifications: verifySnap.size,
            pendingPaymentProofs: paymentProofSnap.size,
            pendingVtcApps: vtcAppsSnap.size,
            pendingHomeworkSubmissions: homeworkSnap.size,
            total: appsSnap.size + verifySnap.size + paymentProofSnap.size + vtcAppsSnap.size + homeworkSnap.size
        };
    } catch (e) {
        console.error("Error fetching counts", e);
        return { pendingApps: 0, pendingVerifications: 0, pendingPaymentProofs: 0, pendingVtcApps: 0, pendingHomeworkSubmissions: 0, total: 0 };
    }
};

export const getDashboardStats = async () => {
  try {
    const studentsSnap = await getDocs(collection(db, STUDENTS_COLLECTION));
    const teachersSnap = await getDocs(collection(db, TEACHERS_COLLECTION));
    const applicationsSnap = await getDocs(collection(db, APPLICATIONS_COLLECTION));
    const receiptsSnap = await getDocs(collection(db, RECEIPTS_COLLECTION));
    const settings = await getSystemSettings();

    const totalStudents = studentsSnap.size;
    const totalTeachers = teachersSnap.size;
    
    let expectedRevenue = 0;
    let yearlyFeePerStudent = 0;
    
    if (settings && settings.fees) {
      settings.fees.forEach(fee => {
        const amount = parseFloat(fee.amount) || 0;
        let multiplier = 1;
        if (fee.frequency === 'Monthly') multiplier = 12; 
        else if (fee.frequency === 'Termly') multiplier = 3; 
        else if (fee.frequency === 'Once-off') multiplier = 1;
        yearlyFeePerStudent += amount * multiplier;
      });
      expectedRevenue = yearlyFeePerStudent * totalStudents;
    }

    const paidByStudent = new Map<string, number>();
    const receiptDateValue = (value: any) => {
      if (!value) return null;
      if (typeof value?.toDate === 'function') return value.toDate();
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? null : date;
    };
    const formatWeekDay = (date: Date) => date.toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
    const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const endOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
    const activeTerm = settings?.schoolCalendars?.find((term) => term.id === settings.activeTermId) || settings?.schoolCalendars?.[0];
    const termStartRaw = activeTerm ? new Date(activeTerm.learnersOpeningDate || activeTerm.teachersOpeningDate) : null;
    const termEndRaw = activeTerm ? new Date(activeTerm.learnersClosingDate || activeTerm.teachersClosingDate) : null;
    const termStart = termStartRaw && !Number.isNaN(termStartRaw.getTime()) ? startOfDay(termStartRaw) : startOfDay(new Date());
    const termEnd = termEndRaw && !Number.isNaN(termEndRaw.getTime()) ? endOfDay(termEndRaw) : endOfDay(new Date(termStart.getFullYear(), termStart.getMonth() + 2, termStart.getDate()));
    const weeklyPaymentData: Array<{ name: string; range: string; startDate: string; endDate: string; paid: number; receipts: number }> = [];
    const cursor = new Date(termStart);
    while (cursor <= termEnd) {
      const start = startOfDay(cursor);
      const end = endOfDay(new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6));
      const cappedEnd = end > termEnd ? termEnd : end;
      weeklyPaymentData.push({
        name: `W${weeklyPaymentData.length + 1}`,
        range: `${formatWeekDay(start)} - ${formatWeekDay(cappedEnd)}`,
        startDate: start.toISOString(),
        endDate: cappedEnd.toISOString(),
        paid: 0,
        receipts: 0,
      });
      cursor.setDate(cursor.getDate() + 7);
    }

    receiptsSnap.docs.forEach((receiptDoc) => {
      const data = receiptDoc.data();
      const studentId = data.usedByStudentId;
      if (!studentId) return;
      if (data.paymentCategory === 'OTHER') return;
      const amount = parseFloat(data.amount) || 0;
      paidByStudent.set(studentId, (paidByStudent.get(studentId) || 0) + amount);

      const paidAt = receiptDateValue(data.generatedAt || data.createdAt || data.date);
      if (!paidAt || paidAt < termStart || paidAt > termEnd) return;
      const week = weeklyPaymentData.find((item) => {
        const start = new Date(item.startDate);
        const end = new Date(item.endDate);
        return paidAt >= start && paidAt <= end;
      });
      if (week) {
        week.paid += amount;
        week.receipts += 1;
      }
    });

    let collectedRevenue = 0;
    const defaulters = studentsSnap.docs
      .map((doc) => {
        const d = doc.data();
        const paid = paidByStudent.get(doc.id) || 0;
        collectedRevenue += paid;
        const balance = Math.max(yearlyFeePerStudent - paid, 0);
        return {
          id: doc.id,
          name: d.name,
          grade: d.assignedClass || d.grade || d.level || '-',
          parentName: d.parentName,
          parentPhone: d.fatherPhone || d.motherPhone || 'N/A',
          profileImageBase64: d.profileImageBase64 || '',
          paid,
          balance,
        };
      })
      .filter((student) => student.balance > 0);

    const monthCounts = new Array(12).fill(0);
    studentsSnap.forEach(doc => {
      const data = doc.data();
      if (data.enrolledAt) {
        const date = data.enrolledAt.toDate();
        monthCounts[date.getMonth()]++;
      }
    });

    const graphData = [
      { name: 'Jan', students: monthCounts[0] },
      { name: 'Feb', students: monthCounts[1] },
      { name: 'Mar', students: monthCounts[2] },
      { name: 'Apr', students: monthCounts[3] },
      { name: 'May', students: monthCounts[4] },
      { name: 'Jun', students: monthCounts[5] },
      { name: 'Jul', students: monthCounts[6] },
      { name: 'Aug', students: monthCounts[7] },
      { name: 'Sep', students: monthCounts[8] },
      { name: 'Oct', students: monthCounts[9] },
      { name: 'Nov', students: monthCounts[10] },
      { name: 'Dec', students: monthCounts[11] },
    ];

    const recentActivities = applicationsSnap.docs
      .sort((a, b) => b.data().submissionDate - a.data().submissionDate)
      .slice(0, 5)
      .map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          title: 'New Application',
          desc: `${d.firstName} ${d.surname} applied for ${d.grade}`,
          time: d.submissionDate?.toDate().toLocaleDateString()
        };
      });

    return {
      totalStudents,
      totalTeachers,
      totalApps: applicationsSnap.size,
      expectedRevenue,
      collectedRevenue,
      outstandingRevenue: Math.max(expectedRevenue - collectedRevenue, 0),
      defaulters,
      graphData,
      weeklyPaymentData,
      activeTermName: activeTerm?.termName || 'Current Term',
      recentActivities
    };
  } catch (error) {
    console.error("Error fetching stats:", error);
    return null;
  }
};

export const getSystemSettings = async (): Promise<SystemSettings | null> => {
  const docRef = doc(db, SETTINGS_COLLECTION, 'general');
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    const data = docSnap.data() as SystemSettings;
    
    // Enforce strict 3 terms with programmatic IDs
    const ensureTerms = (calendars: any[] | undefined, prefix: string) => {
      const cals = calendars || [];
      const result = [];
      for (let i = 0; i < 3; i++) {
        const existing = cals[i] || {};
        result.push({
          ...existing,
          id: `term-${i + 1}`,
          termName: existing.termName || `Term ${i + 1}`
        });
      }
      return result;
    };

    data.schoolCalendars = ensureTerms(data.schoolCalendars, 'school');
    data.hostelCalendars = ensureTerms(data.hostelCalendars, 'hostel');
    data.specialNeedsLevels = normalizeSpecialNeedsLevels(data.specialNeedsLevels);
    data.hostels = data.hostels || [];

    return data;
  }
  return null;
};

export const saveSystemSettings = async (settings: Partial<SystemSettings>) => {
  try {
    await setDoc(doc(db, SETTINGS_COLLECTION, 'general'), {
      ...settings,
      specialNeedsLevels: settings.specialNeedsLevels
        ? normalizeSpecialNeedsLevels(settings.specialNeedsLevels)
        : settings.specialNeedsLevels,
      hostels: settings.hostels || [],
    }, { merge: true });
    return true;
  } catch (error) {
    console.error("Error saving settings:", error);
    return false;
  }
};

export const searchVtcStudents = async (searchTerm: string): Promise<VtcApplication[]> => {
  if (!searchTerm) return [];
  const all = await getVtcApplications();
  return all.filter(a => 
    (a.status === 'APPROVED' || a.status === 'PAYMENT_REQUIRED' || a.status === 'VERIFYING' || a.status === 'VERIFIED') && 
    `${a.firstName} ${a.surname}`.toLowerCase().includes(searchTerm.toLowerCase())
  );
};

// Assessment Records

export const saveAssessmentRecord = async (record: import('../types').TermAssessmentRecord) => {
  try {
    const docRef = doc(db, ASSESSMENT_RECORDS_COLLECTION, record.grade, 'students', record.studentId, 'terms', record.termId);
    await setDoc(docRef, {
      ...record,
      recordedClass: record.recordedClass || record.grade,
      updatedAt: new Date().toISOString()
    });
    return true;
  } catch (error) {
    console.error("Error saving assessment record:", error);
    return false;
  }
};

export const getAssessmentRecord = async (grade: string, studentId: string, termId: string): Promise<import('../types').TermAssessmentRecord | null> => {
  try {
    const docRef = doc(db, ASSESSMENT_RECORDS_COLLECTION, grade, 'students', studentId, 'terms', termId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as import('../types').TermAssessmentRecord;
    }
    return null;
  } catch (error) {
    console.error("Error getting assessment record:", error);
    return null;
  }
};

export const getAssessmentRecordsForStudent = async (grade: string, studentId: string): Promise<import('../types').TermAssessmentRecord[]> => {
  try {
    const q = collection(db, ASSESSMENT_RECORDS_COLLECTION, grade, 'students', studentId, 'terms');
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as import('../types').TermAssessmentRecord));
  } catch (error) {
    console.error("Error getting assessment records for student:", error);
    return [];
  }
};

export const getMatronLogsByDateRange = async (start: Date, end: Date): Promise<MatronLog[]> => {
    return getAllMatronLogs(start, end);
};

export const getAssessmentRecordsForStudentAcrossClasses = async (studentId: string): Promise<import('../types').TermAssessmentRecord[]> => {
  try {
    const q = query(collectionGroup(db, 'terms'), where('studentId', '==', studentId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() } as import('../types').TermAssessmentRecord))
      .map((record) => ({ ...record, recordedClass: record.recordedClass || record.grade }))
      .sort((a, b) => {
        const classCompare = (a.recordedClass || a.grade || '').localeCompare(b.recordedClass || b.grade || '');
        if (classCompare !== 0) return classCompare;
        return new Date(a.updatedAt || 0).getTime() - new Date(b.updatedAt || 0).getTime();
      });
  } catch (error) {
    console.error("Error getting assessment records across classes for student:", error);
    return [];
  }
};

export const getAssessmentRecordsForClass = async (grade: string, termId: string, studentIds: string[]): Promise<import('../types').TermAssessmentRecord[]> => {
  try {
    const records: import('../types').TermAssessmentRecord[] = [];
    for (const studentId of studentIds) {
      const record = await getAssessmentRecord(grade, studentId, termId);
      if (record) {
        records.push(record);
      }
    }
    return records;
  } catch (error) {
    console.error("Error getting assessment records for class:", error);
    return [];
  }
};

const buildTopicDocId = (
  studentId: string,
  termId: string,
  subject: string,
  topic: string,
  theme?: string
) => {
  const themePart = theme ? `_${theme.replace(/\s+/g, '')}` : '';
  return `${studentId}_${termId}_${subject.replace(/\s+/g, '')}${themePart}_${topic.replace(/\s+/g, '')}`;
};

const buildCustomTopicDocId = (
  grade: string,
  termId: string,
  subject: string,
  topic: string,
  theme?: string
) => {
  const themePart = theme ? `_${theme.replace(/\s+/g, '')}` : '';
  return `${grade.replace(/\s+/g, '')}_${termId}_${subject.replace(/\s+/g, '')}${themePart}_${topic.replace(/\s+/g, '')}`;
};

const buildTopicOverrideDocId = (
  grade: string,
  termId: string,
  subject: string,
  originalTopic: string,
  theme?: string
) => {
  const themePart = theme ? `_${theme.replace(/\s+/g, '')}` : '';
  return `${grade.replace(/\s+/g, '')}_${termId}_${subject.replace(/\s+/g, '')}${themePart}_${originalTopic.replace(/\s+/g, '')}`;
};

const getRatingFromAverage = (average: number): AssessmentRating => {
  if (average >= 2.5) return 'FM';
  if (average >= 1.5) return 'AM';
  return 'NM';
};

const syncPrePrimaryAssessmentRecord = async (
  studentId: string,
  grade: string,
  termId: string,
  subject: string,
  topic: string,
  mark: number,
  topicId?: string
) => {
  const skill = findPrePrimarySkill(termId, subject, topic, topicId);
  if (!skill) return;

  const existingRecord = await getAssessmentRecord(grade, studentId, termId);
  const record = existingRecord || {
    studentId,
    termId,
    grade,
    ratings: {},
    rawScores: {},
    isComplete: false,
    updatedAt: new Date().toISOString(),
  };

  const rawScores = {
    ...(record.rawScores || {}),
    [skill.id]: mark as 1 | 2 | 3,
  };

  const subjectThemes = CLASS_LIST_SKILLS[termId]?.[subject] || [];
  let totalScore = 0;
  let count = 0;
  subjectThemes.forEach((theme) => {
    theme.skills.forEach((themeSkill) => {
      if (themeSkill.componentId === skill.componentId) {
        const score = rawScores[themeSkill.id];
        if (score) {
          totalScore += score;
          count += 1;
        }
      }
    });
  });

  const ratings = { ...(record.ratings || {}) };
  if (count > 0) {
    ratings[skill.componentId] = getRatingFromAverage(totalScore / count);
  }

  await saveAssessmentRecord({
    ...record,
    rawScores,
    ratings,
    updatedAt: new Date().toISOString(),
  });
};

const removePrePrimaryAssessmentRecordScore = async (
  studentId: string,
  grade: string,
  termId: string,
  subject: string,
  topic: string,
  topicId?: string
) => {
  const skill = findPrePrimarySkill(termId, subject, topic, topicId);
  if (!skill) return;

  const existingRecord = await getAssessmentRecord(grade, studentId, termId);
  if (!existingRecord?.rawScores) return;

  const rawScores = { ...existingRecord.rawScores };
  delete rawScores[skill.id];

  const subjectThemes = CLASS_LIST_SKILLS[termId]?.[subject] || [];
  let totalScore = 0;
  let count = 0;
  subjectThemes.forEach((theme) => {
    theme.skills.forEach((themeSkill) => {
      if (themeSkill.componentId === skill.componentId) {
        const score = rawScores[themeSkill.id];
        if (score) {
          totalScore += score;
          count += 1;
        }
      }
    });
  });

  const ratings = { ...(existingRecord.ratings || {}) };
  if (count > 0) {
    ratings[skill.componentId] = getRatingFromAverage(totalScore / count);
  } else {
    delete ratings[skill.componentId];
  }

  await saveAssessmentRecord({
    ...existingRecord,
    rawScores,
    ratings,
    updatedAt: new Date().toISOString(),
  });
};

export const saveTopicAssessments = async (
  grade: string,
  termId: string,
  subject: string,
  topic: string,
  marks: Record<string, number>,
  options?: { theme?: string; topicId?: string }
) => {
  try {
    const batch = writeBatch(db);
    for (const [studentId, mark] of Object.entries(marks)) {
      const docId = buildTopicDocId(studentId, termId, subject, topic, options?.theme);
      const ref = doc(db, 'topic_assessments', docId);
      const payload = {
        studentId,
        grade,
        recordedClass: grade,
        termId,
        subject,
        topic,
        topicId: options?.topicId,
        theme: options?.theme,
        mark,
        updatedAt: new Date().toISOString()
      };
      batch.set(
        ref,
        Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined)),
        { merge: true }
      );
    }
    await batch.commit();

    if (CLASS_LIST_SKILLS[termId]?.[subject] && options?.topicId) {
      await Promise.all(
        Object.entries(marks).map(([studentId, mark]) =>
          syncPrePrimaryAssessmentRecord(studentId, grade, termId, subject, topic, mark, options.topicId)
        )
      );
    }
  } catch (error) {
    console.error("Error saving topic assessments:", error);
    throw error;
  }
};

export const getTopicAssessments = async (
  grade: string,
  termId: string,
  subject: string
): Promise<import('../types').TopicAssessmentRecord[]> => {
  try {
    const q = query(
      collection(db, 'topic_assessments'),
      where('grade', '==', grade),
      where('termId', '==', termId),
      where('subject', '==', subject)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as import('../types').TopicAssessmentRecord));
  } catch (error) {
    console.error("Error getting topic assessments:", error);
    return [];
  }
};

export const getTopicAssessmentsForStudent = async (
  studentId: string
): Promise<import('../types').TopicAssessmentRecord[]> => {
  try {
    const q = query(
      collection(db, 'topic_assessments'),
      where('studentId', '==', studentId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as import('../types').TopicAssessmentRecord))
      .map((record) => ({ ...record, recordedClass: record.recordedClass || record.grade }))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  } catch (error) {
    console.error("Error getting topic assessments for student:", error);
    return [];
  }
};

// Daily Register

export const getDailyRegister = async (grade: string): Promise<StudentDailyRegister[]> => {
  try {
    const q = collection(db, 'daily_register', grade, 'students');
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StudentDailyRegister));
  } catch (error) {
    console.error('Error fetching daily register:', error);
    return [];
  }
};

export const markDailyRegister = async (grade: string, studentId: string, studentName: string, date: string, status: 'present' | 'absent') => {
  try {
    const docRef = doc(db, 'daily_register', grade, 'students', studentId);
    const docSnap = await getDoc(docRef);
    
    const timestamp = new Date().toISOString();
    
    if (docSnap.exists()) {
      await updateDoc(docRef, {
        [`attendance.${date}`]: { status, timestamp }
      });
    } else {
      await setDoc(docRef, {
        studentName,
        attendance: {
          [date]: { status, timestamp }
        }
      });
    }
  } catch (error) {
    console.error('Error marking daily register:', error);
    throw error;
  }
};


// Custom Topics Management
export const addCustomTopic = async (grade: string, termId: string, subject: string, topic: string) => {
  try {
    const docId = buildCustomTopicDocId(grade, termId, subject, topic);
    await setDoc(doc(db, 'custom_topics', docId), {
      grade,
      termId,
      subject,
      topic,
      createdAt: new Date().toISOString()
    });
    return true;
  } catch (error) {
    console.error("Error adding custom topic:", error);
    return false;
  }
};

export const getCustomTopics = async (grade: string, termId: string, subject: string): Promise<string[]> => {
  try {
    const q = query(
      collection(db, 'custom_topics'),
      where('grade', '==', grade),
      where('termId', '==', termId),
      where('subject', '==', subject)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data().topic as string);
  } catch (error) {
    console.error("Error getting custom topics:", error);
    return [];
  }
};

export const getCustomTopicEntries = async (
  grade: string,
  termId: string,
  subject: string
): Promise<CustomTopicEntry[]> => {
  try {
    const q = query(
      collection(db, 'custom_topics'),
      where('grade', '==', grade),
      where('termId', '==', termId),
      where('subject', '==', subject)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CustomTopicEntry));
  } catch (error) {
    console.error("Error getting custom topic entries:", error);
    return [];
  }
};

export const getTopicOverrides = async (
  grade: string,
  termId: string,
  subject: string
): Promise<TopicOverride[]> => {
  try {
    const q = query(
      collection(db, 'topic_overrides'),
      where('grade', '==', grade),
      where('termId', '==', termId),
      where('subject', '==', subject)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TopicOverride));
  } catch (error) {
    console.error("Error getting topic overrides:", error);
    return [];
  }
};

export const renameTopic = async (
  grade: string,
  termId: string,
  subject: string,
  oldTopic: string,
  newTopic: string,
  options?: { theme?: string; originalTopic?: string; topicId?: string; isCustom?: boolean }
) => {
  try {
    const trimmedTopic = newTopic.trim();
    if (!trimmedTopic) return false;

    const assessments = await getTopicAssessments(grade, termId, subject);
    const matchingAssessments = assessments.filter((item) => (
      item.topic === oldTopic && (!options?.theme || item.theme === options.theme)
    ));

    const batch = writeBatch(db);
    matchingAssessments.forEach((item) => {
      const nextRef = doc(
        db,
        'topic_assessments',
        buildTopicDocId(item.studentId, termId, subject, trimmedTopic, item.theme || options?.theme)
      );
      batch.set(nextRef, {
        ...item,
        topic: trimmedTopic,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      if (item.id) {
        batch.delete(doc(db, 'topic_assessments', item.id));
      }
    });

    if (options?.isCustom) {
      const previousCustomRef = doc(db, 'custom_topics', buildCustomTopicDocId(grade, termId, subject, oldTopic, options.theme));
      const nextCustomRef = doc(db, 'custom_topics', buildCustomTopicDocId(grade, termId, subject, trimmedTopic, options.theme));
      batch.set(
        nextCustomRef,
        Object.fromEntries(
          Object.entries({
            grade,
            termId,
            subject,
            topic: trimmedTopic,
            theme: options.theme,
            createdAt: new Date().toISOString(),
          }).filter(([, value]) => value !== undefined)
        )
      );
      batch.delete(previousCustomRef);
    } else if (options?.originalTopic) {
      const overrideRef = doc(
        db,
        'topic_overrides',
        buildTopicOverrideDocId(grade, termId, subject, options.originalTopic, options.theme)
      );
      batch.set(
        overrideRef,
        Object.fromEntries(
          Object.entries({
            grade,
            termId,
            subject,
            originalTopic: options.originalTopic,
            topic: trimmedTopic,
            deleted: false,
            theme: options.theme,
            updatedAt: new Date().toISOString(),
          }).filter(([, value]) => value !== undefined)
        )
      );
    }

    await batch.commit();
    return true;
  } catch (error) {
    console.error("Error renaming topic:", error);
    return false;
  }
};

export const deleteTopic = async (
  grade: string,
  termId: string,
  subject: string,
  topic: string,
  options?: { theme?: string; originalTopic?: string; isCustom?: boolean }
) => {
  try {
    const batch = writeBatch(db);

    if (options?.isCustom) {
      batch.delete(doc(db, 'custom_topics', buildCustomTopicDocId(grade, termId, subject, topic, options.theme)));
    } else if (options?.originalTopic) {
      batch.set(
        doc(db, 'topic_overrides', buildTopicOverrideDocId(grade, termId, subject, options.originalTopic, options.theme)),
        Object.fromEntries(
          Object.entries({
            grade,
            termId,
            subject,
            originalTopic: options.originalTopic,
            topic,
            deleted: true,
            theme: options.theme,
            updatedAt: new Date().toISOString(),
          }).filter(([, value]) => value !== undefined)
        )
      );
    }

    const assessments = await getTopicAssessments(grade, termId, subject);
    const matchingAssessments = assessments.filter((item) => (
      item.topic === topic && (!options?.theme || item.theme === options.theme)
    ));
    matchingAssessments.forEach((item) => {
      if (item.id) {
        batch.delete(doc(db, 'topic_assessments', item.id));
      }
    });

    const customTopics = await getCustomTopicEntries(grade, termId, subject);
    customTopics
      .filter((item) => item.topic === topic && (!options?.theme || item.theme === options.theme))
      .forEach((item) => {
        if (item.id) {
          batch.delete(doc(db, 'custom_topics', item.id));
        }
      });

    await batch.commit();

    if (CLASS_LIST_SKILLS[termId]?.[subject]) {
      await Promise.all(
        matchingAssessments.map((item) =>
          removePrePrimaryAssessmentRecordScore(
            item.studentId,
            grade,
            termId,
            subject,
            options?.originalTopic || item.topic,
            item.topicId
          )
        )
      );
    }

    return true;
  } catch (error) {
    console.error("Error deleting topic:", error);
    return false;
  }
};

export const getStudentDailyRegister = async (grade: string, studentId: string): Promise<StudentDailyRegister | null> => {
  try {
    const docRef = doc(db, 'daily_register', grade, 'students', studentId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as StudentDailyRegister;
    }
    return null;
  } catch (error) {
    console.error('Error fetching student daily register:', error);
    return null;
  }
};

// --- MATRON MODULE LOGIC ---

export const addMatron = async (name: string, pin: string, createdBy: string) => {
  try {
    const settings = await getSystemSettings();
    const hashedPin = await hashPin(pin);
    const docRef = await addDoc(collection(db, MATRONS_COLLECTION), {
      name,
      pin: hashedPin,
      created_by: createdBy,
      school_id: settings?.schoolName || 'default',
      created_at: Timestamp.now(),
      is_active: true,
      role: UserRole.MATRON
    });
    return docRef.id;
  } catch (error) {
    console.error("Error adding matron: ", error);
    return null;
  }
};

export const getMatrons = async (): Promise<Matron[]> => {
  try {
    const q = query(collection(db, MATRONS_COLLECTION), where("is_active", "==", true));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Matron));
  } catch (error) {
    console.error("Error fetching matrons:", error);
    return [];
  }
};

export const updateMatron = async (id: string, data: Partial<Matron>) => {
  try {
    const docRef = doc(db, MATRONS_COLLECTION, id);
    await updateDoc(docRef, data as any);
    return true;
  } catch (error) {
    console.error("Error updating matron:", error);
    return false;
  }
};

export const deleteMatron = async (id: string) => {
  try {
    const docRef = doc(db, MATRONS_COLLECTION, id);
    await updateDoc(docRef, { is_active: false });
    return true;
  } catch (error) {
    console.error("Error deleting matron:", error);
    return false;
  }
};

export const verifyMatronPin = async (matronId: string, pin: string): Promise<Matron | null> => {
  try {
    const docRef = doc(db, MATRONS_COLLECTION, matronId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      const hashedPin = await hashPin(pin);
      if (data && data.pin === hashedPin && data.is_active) {
        return { id: docSnap.id, ...data } as Matron;
      }
    }
    return null;
  } catch (error) {
    console.error("Error verifying matron pin:", error);
    return null;
  }
};

export const addStudentMedication = async (medication: Omit<StudentMedication, 'id' | 'created_at' | 'is_active'>) => {
  try {
    const docRef = await addDoc(collection(db, STUDENT_MEDICATIONS_COLLECTION), {
      ...medication,
      created_at: Timestamp.now(),
      is_active: true
    });
    return docRef.id;
  } catch (error) {
    console.error("Error adding student medication:", error);
    return null;
  }
};

export const getStudentMedications = async (studentId: string): Promise<StudentMedication[]> => {
  try {
    const q = query(
      collection(db, STUDENT_MEDICATIONS_COLLECTION),
      where("student_id", "==", studentId),
      where("is_active", "==", true)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StudentMedication));
  } catch (error) {
    console.error("Error fetching student medications:", error);
    return [];
  }
};

export const updateStudentMedication = async (id: string, data: Partial<StudentMedication>) => {
  try {
    const docRef = doc(db, STUDENT_MEDICATIONS_COLLECTION, id);
    await updateDoc(docRef, data as any);
    return true;
  } catch (error) {
    console.error("Error updating student medication:", error);
    return false;
  }
};

export const addMatronLog = async (log: Omit<MatronLog, 'id' | 'created_at'>) => {
  try {
    const docRef = await addDoc(collection(db, MATRON_LOGS_COLLECTION), {
      ...log,
      created_at: Timestamp.now()
    });
    return docRef.id;
  } catch (error) {
    console.error("Error adding matron log:", error);
    return null;
  }
};

export const updateMatronLog = async (id: string, data: Pick<MatronLog, 'log_data'>) => {
  try {
    await updateDoc(doc(db, MATRON_LOGS_COLLECTION, id), {
      ...data,
      updated_at: Timestamp.now()
    });
    return true;
  } catch (error) {
    console.error("Error updating matron log:", error);
    return false;
  }
};

export const getMatronLogsForStudent = async (studentId: string, date?: Date): Promise<MatronLog[]> => {
  try {
    let q = query(
      collection(db, MATRON_LOGS_COLLECTION),
      where("student_id", "==", studentId),
      orderBy("logged_at", "desc")
    );

    if (date) {
        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(date);
        end.setHours(23, 59, 59, 999);

        q = query(
          collection(db, MATRON_LOGS_COLLECTION),
          where("student_id", "==", studentId),
          where("logged_at", ">=", Timestamp.fromDate(start)),
          where("logged_at", "<=", Timestamp.fromDate(end)),
          orderBy("logged_at", "desc")
        );
    }
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MatronLog));
  } catch (error) {
    console.error("Error fetching matron logs:", error);
    return [];
  }
};

export const getAllMatronLogs = async (startDate?: Date, endDate?: Date, studentId?: string): Promise<MatronLog[]> => {
  try {
    let q = query(collection(db, MATRON_LOGS_COLLECTION), orderBy("logged_at", "desc"));

    if (startDate && endDate) {
      q = query(
        collection(db, MATRON_LOGS_COLLECTION),
        where("logged_at", ">=", Timestamp.fromDate(startDate)),
        where("logged_at", "<=", Timestamp.fromDate(endDate)),
        orderBy("logged_at", "desc")
      );
    }

    if (studentId) {
      q = query(q, where("student_id", "==", studentId));
    }

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MatronLog));
  } catch (error) {
    console.error("Error fetching all matron logs:", error);
    return [];
  }
};

export const addMedicationAdministration = async (admin: Omit<MedicationAdministration, 'id' | 'created_at'>) => {
  try {
    const docRef = await addDoc(collection(db, MEDICATION_ADMINISTRATIONS_COLLECTION), {
      ...admin,
      created_at: Timestamp.now()
    });
    return docRef.id;
  } catch (error) {
    console.error("Error adding medication administration:", error);
    return null;
  }
};

export const getMedicationAdministrationsForStudent = async (studentId: string, date?: Date): Promise<MedicationAdministration[]> => {
  try {
    let q = query(
      collection(db, MEDICATION_ADMINISTRATIONS_COLLECTION),
      where("student_id", "==", studentId),
      orderBy("time_given", "desc")
    );

    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);

      q = query(
        collection(db, MEDICATION_ADMINISTRATIONS_COLLECTION),
        where("student_id", "==", studentId),
        where("time_given", ">=", Timestamp.fromDate(start)),
        where("time_given", "<=", Timestamp.fromDate(end)),
        orderBy("time_given", "desc")
      );
    }

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MedicationAdministration));
  } catch (error) {
    console.error("Error fetching medication administrations:", error);
    return [];
  }
};

export const getMedicationAdministrationsToday = async (): Promise<MedicationAdministration[]> => {
  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const q = query(
      collection(db, MEDICATION_ADMINISTRATIONS_COLLECTION),
      where("time_given", ">=", Timestamp.fromDate(start)),
      where("time_given", "<=", Timestamp.fromDate(end))
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MedicationAdministration));
  } catch (error) {
    console.error("Error fetching today's medication administrations:", error);
    return [];
  }
};

export const getAllStudentMedications = async (): Promise<StudentMedication[]> => {
    try {
      const q = query(collection(db, STUDENT_MEDICATIONS_COLLECTION), where("is_active", "==", true));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StudentMedication));
    } catch (error) {
      console.error("Error fetching all student medications:", error);
      return [];
    }
};

export const getMatronAlerts = async () => {
  const [students, allMedications, adminsToday, dismissedIds] = await Promise.all([
      getStudents(),
      getAllStudentMedications(),
      getMedicationAdministrationsToday(),
      getDismissedAlerts()
  ]);

  const alerts: any[] = [];
  const now = new Date();
  const currentTimeStr = now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0');

  for (const med of allMedications) {
    const student = students.find(s => s.id === med.student_id);
    if (!student) continue;

    const alertIdBase = `${new Date().toISOString().split('T')[0]}_${med.id}`;

    const admin = adminsToday.find(a => a.student_medication_id === med.id);
    if (!admin) {
      if (currentTimeStr > med.scheduled_time_to) {
        const id = `${alertIdBase}_MISSED`;
        if (dismissedIds.includes(id)) continue;
        alerts.push({
          id,
          type: 'MISSED',
          studentName: student.name,
          medicineName: med.medicine_name,
          dueTime: med.scheduled_time_from + " - " + med.scheduled_time_to
        });
      }
    } else if (!admin.was_on_time) {
      const id = `${alertIdBase}_LATE`;
      if (dismissedIds.includes(id)) continue;
      alerts.push({
        id,
        type: 'LATE',
        studentName: student.name,
        medicineName: med.medicine_name,
        timeGiven: admin.time_given?.toDate ? admin.time_given.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : new Date(admin.time_given).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        dueTime: med.scheduled_time_from + " - " + med.scheduled_time_to,
        minutesLate: admin.minutes_late
      });
    }
  }
  return alerts;
};
