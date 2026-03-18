import React from 'react';

export enum UserRole {
  ADMIN = 'ADMIN',
  TEACHER = 'TEACHER',
  PARENT = 'PARENT'
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

export interface SystemSettings {
  id?: string;
  schoolName?: string;
  adminName: string;
  adminPin: string;
  
  fees: FeeItem[];
  uniforms: SupplyItem[];
  stationery: SupplyItem[];
  grades: string[];
  specialNeedsLevels: string[];
  schoolCalendars?: TermCalendar[];
  hostelCalendars?: HostelCalendar[];
  
  termStartDate: string;
  termStartTime: string;
  
  lastStudentId?: number; 
}

// Assessment Specific Types

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
  
  // Office Use
  officeReviewDate?: string;
  officeReviewer?: string;
  officeStatus?: string;
  officeResponseDate?: string;
  officeResponseMethod?: string;
}

export type StudentStatus = 'WAITING_PAYMENT' | 'PAYMENT_VERIFICATION' | 'ASSESSMENT' | 'ENROLLED';

export interface Student extends Partial<Application> {
  id: string;
  name: string; 
  grade: string;
  level?: string;
  stage?: 1 | 2 | 3;
  assignedClass?: string;
  
  parentPin: string;
  parentName: string;
  enrolledAt?: any;
  studentStatus: StudentStatus;
  
  receiptNumber?: string;
  receiptSubmissionDate?: any;
  paymentRejected?: boolean;
  
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
}