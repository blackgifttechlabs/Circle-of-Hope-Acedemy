import React from 'react';

export enum UserRole {
  ADMIN = 'ADMIN',
  TEACHER = 'TEACHER',
  PARENT = 'PARENT',
  VTC_STUDENT = 'VTC_STUDENT',
  MATRON = 'MATRON'
}

export enum Division {
  MAINSTREAM = 'Mainstream',
  SPECIAL_NEEDS = 'Special Needs'
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  pin: string;
}

export interface Teacher extends User {
  subject?: string;
  email?: string;
  assignedClass?: string;
  assignedClasses?: string[];
  assignedStudentIds?: string[];
  activeTermId?: string;
  activeTeachingClass?: string;
}

export interface MenuItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

export interface FeeItem {
  id: string;
  category: string;
  amount: string; 
  frequency: string;
  notes?: string;
}

export interface SupplyItem {
  id: string;
  name: string;
  isRequired: boolean;
}

export interface Holiday {
  id: string;
  name: string;
  type: 'Public Holiday' | 'Other';
  otherType?: string;
  startDate: string;
  endDate?: string;
}

export interface TermCalendar {
  id: string;
  termName: string;
  learnersOpeningDate: string;
  learnersClosingDate: string;
  teachersOpeningDate: string;
  teachersClosingDate: string;
  holidays: Holiday[];
  schoolDays: number;
}

export interface HostelHoliday {
  id: string;
  name: string;
  startDate: string;
  endDate?: string;
}

export interface HostelCalendar {
  id: string;
  termName: string;
  hostelOpeningDate: string;
  hostelClosingDate: string;
  staffOpeningDate: string;
  staffClosingDate: string;
  holidays: HostelHoliday[];
  hostelDays: number;
}

export interface SubAdmin {
  id: string;
  name: string;
  pin: string;
}

export interface SystemSettings {
  id?: string;
  schoolName?: string;
  adminName: string;
  adminPin: string;
  admins?: SubAdmin[];
  
  fees: FeeItem[];
  uniforms: SupplyItem[];
  stationery: SupplyItem[];
  grades: string[];
  specialNeedsLevels: string[];
  schoolCalendars?: TermCalendar[];
  hostelCalendars?: HostelCalendar[];
  address?: string;
  
  termStartDate: string;
  termStartTime: string;
  
  lastStudentId?: number; 
  activeTermId?: string;
}

// Assessment Specific Types

export type AssessmentRating = 'FM' | 'AM' | 'NM';

export interface AssessmentComponent {
  id: string;
  name: string;
}

export interface AssessmentArea {
  id: string;
  name: string;
  components: AssessmentComponent[];
}

export const PRE_PRIMARY_AREAS: AssessmentArea[] = [
  {
    id: 'language',
    name: 'Language Development',
    components: [
      { id: 'listening', name: 'Listening and Responding' },
      { id: 'speaking', name: 'Speaking and Communication' },
      { id: 'prep_reading', name: 'Preparatory Reading' },
      { id: 'incidental_reading', name: 'Incidental Reading' },
      { id: 'prep_writing', name: 'Preparatory Writing' },
    ]
  },
  {
    id: 'physical',
    name: 'Physical Development',
    components: [
      { id: 'gross_motor', name: 'Gross-Motor Development' },
      { id: 'fine_muscle', name: 'Fine Muscle Control' },
      { id: 'balance', name: 'Balance' },
      { id: 'eye_hand', name: 'Eye-Hand Coordination' },
      { id: 'eye_foot', name: 'Eye-Foot Coordination' },
      { id: 'body_awareness', name: 'Body Awareness' },
    ]
  },
  {
    id: 'math',
    name: 'Preparatory Mathematics',
    components: [
      { id: 'number_concept', name: 'Number Concept' },
      { id: 'problem_solving', name: 'Problem Solving' },
      { id: 'classification', name: 'Classification' },
      { id: 'seriation', name: 'Seriation' },
      { id: 'spatial_relations', name: 'Spatial Relations' },
      { id: 'measurement', name: 'Measurement' },
    ]
  },
  {
    id: 'arts',
    name: 'Arts',
    components: [
      { id: 'visual_art', name: 'Visual Art: Draw, paint, model, construct' },
      { id: 'music', name: 'Music: Sing, play instruments' },
      { id: 'dance', name: 'Dance: Free & choreographed' },
      { id: 'drama', name: 'Drama: Mime, role-play, dramatise' },
    ]
  },
  {
    id: 'environmental',
    name: 'Environmental Learning',
    components: [
      { id: 'general_info', name: 'General information on Themes' },
      { id: 'health', name: 'Health' },
      { id: 'safety', name: 'Safety' },
      { id: 'weather', name: 'Weather' },
      { id: 'special_occasions', name: 'Special occasions' },
    ]
  },
  {
    id: 'religious',
    name: 'Religious and Moral Education',
    components: [
      { id: 'morals', name: 'Morals and Values' },
      { id: 'social', name: 'Social development' },
      { id: 'emotional', name: 'Emotional development' },
    ]
  }
];

export interface TermAssessmentRecord {
  id?: string;
  studentId: string;
  termId: string;
  grade: string;
  recordedClass?: string;
  ratings: Record<string, AssessmentRating>; // key is component id
  rawScores?: Record<string, 1 | 2 | 3 | null>; // key is skill id
  remarks?: string;
  isComplete: boolean;
  updatedAt: string;
}

export interface TopicAssessmentRecord {
  id?: string;
  studentId: string;
  grade: string;
  recordedClass?: string;
  termId: string;
  subject: string;
  topic: string;
  topicId?: string;
  theme?: string;
  mark: number;
  updatedAt: string;
}

export interface TopicOverride {
  id?: string;
  grade: string;
  termId: string;
  subject: string;
  originalTopic: string;
  topic: string;
  deleted?: boolean;
  theme?: string;
  updatedAt: string;
}

export interface CustomTopicEntry {
  id?: string;
  grade: string;
  termId: string;
  subject: string;
  topic: string;
  theme?: string;
  createdAt: string;
}

export interface DailyRegisterRecord {
  status: 'present' | 'absent';
  timestamp: string;
}

export interface StudentDailyRegister {
  id: string; // studentId
  studentName: string;
  attendance: Record<string, DailyRegisterRecord>; // Key is YYYY-MM-DD
}

export type AssessmentResponse = 'Yes' | 'No' | 'Yes with help';

export interface SelfCareAssessment {
  s1: AssessmentResponse; // drink from a cup
  s2: AssessmentResponse; // feed self with a spoon
  s3: AssessmentResponse; // wash hands
  s4: AssessmentResponse; // wash and dry him
  s5: AssessmentResponse; // dress and undress him
  s6: AssessmentResponse; // brush teeth and hair by him
  s7: AssessmentResponse; // go to the toilet by himself
  s8: AssessmentResponse; // assist with simple tasks around the home
  s9: AssessmentResponse; // can be send around with messages
  comments?: string;
  completedDate: string;
  calculatedScore: number; // Out of 5
}

export interface ABCLog {
  id: string;
  antecedent: string;
  behaviour: string;
  consequence: string;
  isPositive: boolean;
  time: string;
}

export interface AssessmentDay {
  date?: string;
  completed: boolean;
  // Form 1: Main Assessment (5 areas, score /5 each)
  scores: {
    numbers: number;
    reading: number;
    selfCare: number;
    behaviour: number;
    senses: number;
  };
  // Form 2: Learn To Think (Specific task for the day)
  thinkingTask?: {
    taskId: string; // T1, T2 etc
    description: string;
    response: AssessmentResponse;
  };
  thinkingScore: number; // Converted from response to /5
  // Form 3: ABC Behaviour (Positive/Negative -> /5)
  abcScore: number;
  abcLogs?: ABCLog[];
  dailyTotalScore?: number; // Normalized 0.0 - 5.0 score for the day
}

export interface AssessmentData {
  parentSelfCare?: SelfCareAssessment;
  teacherAssessments: { [day: number]: AssessmentDay }; // Days 1-14
  finalAverage?: number;
  stage?: 1 | 2 | 3;
  isComplete: boolean;
  parentSelfCareScore?: number; // Legacy/Quick access
}

export interface Application {
  id?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  submissionDate: any; 
  approvedStudentId?: string;
  approvedParentPin?: string;
  
  // Learner Details
  surname: string;
  firstName: string;
  dob: string;
  citizenship: string;
  gender: 'Male' | 'Female';
  address: string;
  region: string;
  
  division: Division; 
  grade?: string; 
  level?: string; 
  
  isSpecialNeeds: boolean; 
  specialNeedsType?: string; 
  
  // Parent Details
  fatherName: string;
  fatherPhone: string;
  fatherEmail: string;
  motherName: string;
  motherPhone: string;
  motherEmail?: string;

  // Emergency Contact
  emergencyName: string;
  emergencyRelationship: string;
  emergencyWork: string;
  emergencyCell: string;
  emergencyEmail: string;
  
  // Medical & History
  hasPreviousSchool: boolean;
  previousSchool: string;
  highestGrade: string;
  medicalConditions: string;
  
  // Professionals
  doctorName?: string;
  doctorContact?: string;
  audiologistName?: string;
  audiologistContact?: string;
  therapistName?: string;
  therapistContact?: string;

  // Medical Aid
  hasMedicalAid: boolean;
  medicalAidName?: string;
  medicalAidMemberName?: string;
  medicalAidMemberID?: string;
  medicalAidOption?: string;

  // Languages
  langEnglish: 'Good' | 'Fair' | 'Poor';
  langOther1Name?: string;
  langOther1Rating?: 'Good' | 'Fair' | 'Poor';
  langOther2Name?: string;
  langOther2Rating?: 'Good' | 'Fair' | 'Poor';

  // Consents
  medicalConsent: boolean;
  agreed: boolean;

  // Uploaded Documents
  birthCertificate?: ApplicationFileAttachment | null;
  medicalDocuments?: ApplicationFileAttachment[];
  otherDocuments?: ApplicationFileAttachment[];
  
  // Office Use
  officeReviewDate?: string;
  officeReviewer?: string;
  officeStatus?: string;
  officeResponseDate?: string;
  officeResponseMethod?: string;
}

export interface WeeklyLessonPlan {
  id?: string;
  teacherId: string;
  classLevel: string;
  termId: string;
  theme: string;
  weekNumber: number;
  grade: string;
  dates: string;
  coreSubjects: Record<string, Record<string, string>>; // day -> subject -> activity
  extendedSubjects: Record<string, Record<string, string>>; // day -> subject -> activity
  uploadedAt: string;
}

export type StudentStatus = 'WAITING_PAYMENT' | 'PAYMENT_VERIFICATION' | 'ASSESSMENT' | 'ENROLLED';

export interface Student extends Partial<Application> {
  id: string;
  name: string; 
  role?: UserRole;
  grade: string;
  level?: string;
  stage?: 1 | 2 | 3;
  assignedClass?: string;
  assignedTeacherId?: string;
  assignedTeacherName?: string;
  profileImageBase64?: string;
  
  parentPin: string;
  parentName: string;
  enrolledAt?: any;
  studentStatus: StudentStatus;
  
  receiptNumber?: string;
  receiptSubmissionDate?: any;
  paymentRejected?: boolean;
  academicYear?: string;
  
  assessment?: AssessmentData;
}

export interface Receipt {
  id?: string;
  number: string;
  amount: string;
  date: string;
  isUsed: boolean;
  usedByStudentId?: string;
  createdAt?: any;
  type?: 'BANK_REFERENCE' | 'SCHOOL_RECEIPT';
  termId?: string;
  academicYear?: string;
  studentName?: string;
  studentClass?: string;
  paymentProofId?: string;
  paymentCategory?: 'FEES' | 'OTHER';
  paymentLabel?: string;
  manualEntry?: boolean;
  generatedAt?: any;
  generatedBy?: string;
  balanceAfterPayment?: number;
  notes?: string;
}

export interface ActivityLog {
  id?: string;
  action: string;
  category: 'LOGIN' | 'PAYMENT' | 'STUDENT' | 'LESSON_PLAN' | 'ADMIN' | 'SYSTEM';
  actorId?: string;
  actorName: string;
  actorRole: string;
  targetId?: string;
  targetName?: string;
  details?: string;
  createdAt: any;
}

export interface PaymentProof {
  id?: string;
  studentId: string;
  studentName: string;
  parentName: string;
  studentClass?: string;
  academicYear: string;
  termId: string;
  amountClaimed?: string;
  imageBase64: string;
  fileName: string;
  mimeType: string;
  submittedAt: any;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewedAt?: any;
  reviewedBy?: string;
  reviewedReceiptId?: string;
  reviewNotes?: string;
}

export interface HomeworkAssignment {
  id?: string;
  title: string;
  description: string;
  teacherId: string;
  teacherName: string;
  className: string;
  dueDate?: string;
  subject?: string;
  imageAttachments?: ApplicationFileAttachment[];
  createdAt: any;
}

export interface HomeworkSubmission {
  id?: string;
  assignmentId?: string;
  studentId: string;
  studentName: string;
  parentName: string;
  className?: string;
  imageBase64: string;
  fileName: string;
  mimeType: string;
  submittedAt: any;
  status: 'SUBMITTED' | 'REVIEWED';
  teacherId?: string;
  notes?: string;
}

export interface UploadedDocument {
  id?: string;
  studentId: string;
  studentName: string;
  parentName: string;
  documentType: 'BIRTH_CERTIFICATE' | 'MEDICAL_DOCUMENT' | 'OTHER_DOCUMENT';
  title: string;
  fileName: string;
  mimeType: string;
  fileBase64: string;
  uploadedAt: any;
}

export interface ApplicationFileAttachment {
  title: string;
  fileName: string;
  mimeType: string;
  fileBase64: string;
}

export interface VtcApplication {
  id?: string;
  title: 'Mr' | 'Miss' | 'Mrs';
  surname: string;
  firstName: string;
  dateOfBirth: string;
  gender: 'Male' | 'Female' | 'Other';
  cellNo: string;
  identityNumber: string;
  nationality: string;
  maritalStatus: 'Single' | 'Married';
  residentialAddress: string;
  town: string;
  postalAddress: string;
  emailAddress: string;
  region: string;
  physicallyChallenged: 'Yes' | 'No';
  
  emergencyName: string;
  emergencyCell: string;
  emergencyRelationship: string;
  emergencyRegion: string;
  emergencyEmail: string;
  emergencyTown: string;
  
  highestGradePassed: string;
  nameOfSchool: string;
  schoolTown: string;
  
  status: 'PENDING' | 'PAYMENT_REQUIRED' | 'VERIFYING' | 'APPROVED' | 'VERIFIED' | 'REJECTED';
  submissionDate: any;
  idDocumentUrl?: string;
  resultsUrl?: string;
  photoUrl?: string;
  proofOfPaymentUrl?: string;
  birthCertificate?: ApplicationFileAttachment | null;
  medicalDocuments?: ApplicationFileAttachment[];
  otherDocuments?: ApplicationFileAttachment[];
  pin?: string;
}

export interface Matron {
  id: string;
  name: string;
  pin: string; // stored hashed or plain for simple auth as per spec "stored hashed"
  school_id: string;
  created_by: string;
  created_at: any;
  is_active: boolean;
  role: UserRole.MATRON;
}

export interface StudentMedication {
  id: string;
  student_id: string;
  medicine_name: string;
  dosage: string;
  scheduled_time_from: string; // "08:00"
  scheduled_time_to: string;   // "08:30"
  notes?: string;
  added_by: string;
  is_active: boolean;
  created_at: any;
}

export type MatronLogCategory = 'eating' | 'potty_training' | 'bed_wetting' | 'medication' | 'incident' | 'appointment' | 'behavior' | 'discipline';

export interface MatronLog {
  id: string;
  student_id: string;
  matron_id: string;
  category: MatronLogCategory;
  log_data: any; // JSON
  logged_at: any;
  created_at: any;
}

export interface MedicationAdministration {
  id: string;
  student_medication_id: string;
  student_id: string;
  matron_id: string;
  time_given: any; // timestamp
  was_on_time: boolean;
  minutes_late: number | null;
  side_effects?: string;
  notes?: string;
  created_at: any;
}
