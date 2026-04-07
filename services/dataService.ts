import { db, auth } from '../firebase';
import { collection, addDoc, getDocs, getDoc, query, where, doc, updateDoc, deleteDoc, orderBy, Timestamp, setDoc, runTransaction, limit, startAt, endAt, writeBatch } from 'firebase/firestore';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { Teacher, Student, UserRole, Application, SystemSettings, Receipt, Division, AssessmentData, SelfCareAssessment, AssessmentDay, VtcApplication, StudentDailyRegister, WeeklyLessonPlan, AssessmentRating, TopicOverride, CustomTopicEntry } from '../types';
import { CLASS_LIST_SKILLS } from '../utils/classListSkills';
import { findPrePrimarySkill } from '../utils/assessmentWorkflow';

// Collections
const TEACHERS_COLLECTION = 'teachers';
const STUDENTS_COLLECTION = 'students';
const APPLICATIONS_COLLECTION = 'applications';
const VTC_APPLICATIONS_COLLECTION = 'vtcApplications';
const SETTINGS_COLLECTION = 'settings';
const RECEIPTS_COLLECTION = 'receipts';
const ASSESSMENT_RECORDS_COLLECTION = 'assessment_records';

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

export const determineSpecialNeedsLevel = (dob: string): string => {
  const age = calculateAge(dob);
  if (age >= 11) return 'Level 3'; 
  if (age >= 9) return 'Level 2';  
  if (age >= 7) return 'Level 1B'; 
  return 'Level 1A'; 
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
        specialNeedsLevels: ['Level 1A', 'Level 1B', 'Level 2', 'Level 3'],
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

export const addTeacher = async (name: string, subject: string, assignedClass: string) => {
  try {
    await addDoc(collection(db, TEACHERS_COLLECTION), {
      name,
      subject,
      assignedClass,
      role: UserRole.TEACHER,
      pin: '1234',
      createdAt: new Date()
    });
    return true;
  } catch (error) {
    console.error("Error adding teacher: ", error);
    return false;
  }
};

export const updateTeacher = async (id: string, data: Partial<Teacher>) => {
  try {
    const docRef = doc(db, TEACHERS_COLLECTION, id);
    await updateDoc(docRef, data as any);
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
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Teacher));
};

export const getTeacherById = async (id: string): Promise<Teacher | null> => {
  const docRef = doc(db, TEACHERS_COLLECTION, id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Teacher;
  }
  return null;
};

export const getTeacherByClass = async (className: string): Promise<Teacher | null> => {
    const q = query(collection(db, TEACHERS_COLLECTION), where("assignedClass", "==", className));
    const snap = await getDocs(q);
    if (!snap.empty) {
        return { id: snap.docs[0].id, ...snap.docs[0].data() } as Teacher;
    }
    return null;
};

export const searchTeachers = async (searchTerm: string): Promise<Teacher[]> => {
  if (!searchTerm) return [];
  const all = await getTeachers();
  return all.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()));
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
        assignedClass: app.isSpecialNeeds ? (app.level || '') : (app.grade || '') 
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
    
    return { pin, studentId: customId };
  } catch (error) {
    console.error("Error enrolling student:", error);
    return null;
  }
};

export const updateStudent = async (id: string, data: Partial<Student>) => {
  try {
    const docRef = doc(db, STUDENTS_COLLECTION, id);
    await updateDoc(docRef, data as any);
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
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
};

export const getStudentsByStatus = async (status: string): Promise<Student[]> => {
    const q = query(collection(db, STUDENTS_COLLECTION), where("studentStatus", "==", status));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
};

/**
 * Updated to support Stage-based fuzzy matching.
 * Teachers assigned to "Level 1B" will see "Level 1B - Stage 1", etc.
 */
export const getStudentsByAssignedClass = async (className: string): Promise<Student[]> => {
    const q = query(collection(db, STUDENTS_COLLECTION));
    const querySnapshot = await getDocs(q);
    const all = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
    
    // Client side filtering for flexible partial matching (Base Level check)
    return all.filter(s => {
        if (!s.assignedClass) return false;
        return s.assignedClass === className || s.assignedClass.startsWith(`${className} - Stage`);
    });
};

export const getStudentById = async (id: string): Promise<Student | null> => {
  const docRef = doc(db, STUDENTS_COLLECTION, id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Student;
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

    return { success: true, message: 'Admin created successfully.' };
  } catch (error: any) {
    return { success: false, message: error.message || 'Failed to create admin.' };
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
        
        const vtcAppsQuery = query(collection(db, VTC_APPLICATIONS_COLLECTION), where("status", "==", "PENDING"));
        const vtcAppsSnap = await getDocs(vtcAppsQuery);
        
        return {
            pendingApps: appsSnap.size,
            pendingVerifications: verifySnap.size,
            pendingVtcApps: vtcAppsSnap.size,
            total: appsSnap.size + verifySnap.size + vtcAppsSnap.size
        };
    } catch (e) {
        console.error("Error fetching counts", e);
        return { pendingApps: 0, pendingVerifications: 0, pendingVtcApps: 0, total: 0 };
    }
};

export const getDashboardStats = async () => {
  try {
    const studentsSnap = await getDocs(collection(db, STUDENTS_COLLECTION));
    const teachersSnap = await getDocs(collection(db, TEACHERS_COLLECTION));
    const applicationsSnap = await getDocs(collection(db, APPLICATIONS_COLLECTION));
    const settings = await getSystemSettings();

    const totalStudents = studentsSnap.size;
    const totalTeachers = teachersSnap.size;
    
    let expectedRevenue = 0;
    
    if (settings && settings.fees) {
      settings.fees.forEach(fee => {
        const amount = parseFloat(fee.amount) || 0;
        let multiplier = 1;
        if (fee.frequency === 'Monthly') multiplier = 12; 
        else if (fee.frequency === 'Termly') multiplier = 3; 
        else if (fee.frequency === 'Once-off') multiplier = 1;
        expectedRevenue += (amount * multiplier * totalStudents);
      });
    }

    const defaulters = studentsSnap.docs.map(doc => {
        const d = doc.data();
        return {
            id: doc.id,
            name: d.name,
            grade: d.grade,
            parentName: d.parentName,
            parentPhone: d.fatherPhone || d.motherPhone || 'N/A'
        };
    });

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
      collectedRevenue: 0, 
      outstandingRevenue: expectedRevenue,
      defaulters,
      graphData,
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

    return data;
  }
  return null;
};

export const saveSystemSettings = async (settings: Partial<SystemSettings>) => {
  try {
    await setDoc(doc(db, SETTINGS_COLLECTION, 'general'), settings, { merge: true });
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
      batch.set(ref, {
        studentId,
        grade,
        termId,
        subject,
        topic,
        topicId: options?.topicId,
        theme: options?.theme,
        mark,
        updatedAt: new Date().toISOString()
      }, { merge: true });
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
      batch.set(nextCustomRef, {
        grade,
        termId,
        subject,
        topic: trimmedTopic,
        theme: options.theme,
        createdAt: new Date().toISOString(),
      });
      batch.delete(previousCustomRef);
    } else if (options?.originalTopic) {
      const overrideRef = doc(
        db,
        'topic_overrides',
        buildTopicOverrideDocId(grade, termId, subject, options.originalTopic, options.theme)
      );
      batch.set(overrideRef, {
        grade,
        termId,
        subject,
        originalTopic: options.originalTopic,
        topic: trimmedTopic,
        deleted: false,
        theme: options.theme,
        updatedAt: new Date().toISOString(),
      });
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
        {
          grade,
          termId,
          subject,
          originalTopic: options.originalTopic,
          topic,
          deleted: true,
          theme: options.theme,
          updatedAt: new Date().toISOString(),
        }
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
