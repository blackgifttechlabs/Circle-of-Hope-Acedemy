import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  getCustomTopicEntries,
  getStudentsByAssignedClass,
  getSystemSettings,
  getTopicAssessments,
  getTopicOverrides,
} from '../services/dataService';
import { Student, SystemSettings, TopicAssessmentRecord } from '../types';
import { getTopicsForSubjectAndGrade } from './assessmentTopics';
import { getGradeDisplayValue } from './assessmentWorkflow';
import { getNonPromotionalSubjects, getPromotionalSubjects } from './subjects';

const SCHOOL_LOGO_URL = 'https://i.ibb.co/LzYXwYfX/logo.png';
const PRINCIPAL_SIGNATURE_URL = 'https://i.ibb.co/MkKndHWd/eraze-result-medium-1.png';

const DEFAULT_TERMS = [
  { id: 'term-1', termName: 'Term 1' },
  { id: 'term-2', termName: 'Term 2' },
  { id: 'term-3', termName: 'Term 3' },
] as const;

export interface Grade1To7ReportCard {
  termId: string;
  termName: string;
  isComplete: boolean;
  updatedAt: string;
  subjectCount: number;
}

type SubjectSnapshot = {
  subject: string;
  records: TopicAssessmentRecord[];
  topicCount: number;
};

const getSymbol = (average: number | null) => {
  if (average === null) return '';
  if (average >= 80) return 'A';
  if (average >= 70) return 'B';
  if (average >= 60) return 'C';
  if (average >= 50) return 'D';
  if (average >= 40) return 'E';
  return 'U';
};

const fetchImage = async (url: string): Promise<string> => {
  try {
    const response = await fetch(url, { mode: 'cors' });
    const blob = await response.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn('Failed to load image for grade report PDF', error);
    return '';
  }
};

const getTerms = (settings: SystemSettings | null) => {
  const configuredTerms = (settings?.schoolCalendars || [])
    .filter((term) => DEFAULT_TERMS.some((item) => item.id === term.id))
    .map((term) => ({ id: term.id, termName: term.termName }));

  return configuredTerms.length > 0 ? configuredTerms : [...DEFAULT_TERMS];
};

const resolveTopics = (
  subject: string,
  grade: string,
  records: TopicAssessmentRecord[],
  customTopics: Array<{ topic: string }>,
  overrides: Array<{ originalTopic: string; topic: string; deleted?: boolean }>
) => {
  const baseTopics = getTopicsForSubjectAndGrade(subject, grade);

  const adjustedTopics = baseTopics.reduce<string[]>((acc, topic) => {
    const override = overrides.find((item) => item.originalTopic === topic);
    if (override?.deleted) return acc;
    acc.push(override?.topic || topic);
    return acc;
  }, []);

  customTopics.forEach((item) => {
    if (!adjustedTopics.includes(item.topic)) adjustedTopics.push(item.topic);
  });

  records.forEach((item) => {
    if (!adjustedTopics.includes(item.topic)) adjustedTopics.push(item.topic);
  });

  return adjustedTopics;
};

const loadSubjectSnapshots = async (
  grade: string,
  termId: string,
  subjects: string[]
): Promise<SubjectSnapshot[]> => {
  return Promise.all(
    subjects.map(async (subject) => {
      const [records, customTopics, overrides] = await Promise.all([
        getTopicAssessments(grade, termId, subject),
        getCustomTopicEntries(grade, termId, subject),
        getTopicOverrides(grade, termId, subject),
      ]);

      const topics = resolveTopics(subject, grade, records, customTopics, overrides);

      return {
        subject,
        records,
        topicCount: topics.length,
      };
    })
  );
};

const calculateSubjectAverage = (
  studentId: string,
  snapshot: SubjectSnapshot
) => {
  const studentRecords = snapshot.records.filter((item) => item.studentId === studentId);
  if (studentRecords.length === 0) return null;
  const total = studentRecords.reduce((sum, item) => sum + item.mark, 0);
  const topicCount = snapshot.topicCount || new Set(studentRecords.map((item) => item.topic)).size;
  if (topicCount === 0) return null;
  return Math.round((total / (topicCount * 10)) * 100);
};

const calculateClassAverage = (
  studentIds: string[],
  snapshot: SubjectSnapshot
) => {
  const averages = studentIds
    .map((studentId) => calculateSubjectAverage(studentId, snapshot))
    .filter((value): value is number => value !== null);

  if (averages.length === 0) return null;
  return Math.round(averages.reduce((sum, value) => sum + value, 0) / averages.length);
};

const formatDate = (value: any) => {
  if (!value) return '-';
  const date = typeof value === 'string' ? new Date(value) : value?.toDate ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-GB');
};

export const getGrade1To7ReportCards = async (
  student: Student,
  settings?: SystemSettings | null
): Promise<Grade1To7ReportCard[]> => {
  const grade = student.assignedClass || student.grade || '';
  if (!/Grade [1-7]/i.test(grade)) return [];

  const resolvedSettings = settings ?? await getSystemSettings();
  const terms = getTerms(resolvedSettings);
  const subjects = [...getPromotionalSubjects(grade), ...getNonPromotionalSubjects(grade)];

  const cards = await Promise.all(
    terms.map(async (term) => {
      const snapshots = await loadSubjectSnapshots(grade, term.id, subjects);
      let latestUpdatedAt = '';
      let subjectCount = 0;

      snapshots.forEach((snapshot) => {
        const studentRecords = snapshot.records.filter((item) => item.studentId === student.id);
        if (studentRecords.length > 0) {
          subjectCount += 1;
          const latestSubjectDate = [...studentRecords]
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0]?.updatedAt || '';
          if (!latestUpdatedAt || new Date(latestSubjectDate).getTime() > new Date(latestUpdatedAt).getTime()) {
            latestUpdatedAt = latestSubjectDate;
          }
        }
      });

      return {
        termId: term.id,
        termName: term.termName,
        isComplete: subjectCount > 0,
        updatedAt: latestUpdatedAt,
        subjectCount,
      };
    })
  );

  return cards;
};

export const printGrade1To7Report = async (
  student: Student,
  termId: string,
  printedBy: string
) => {
  const grade = student.assignedClass || student.grade || '';
  if (!/Grade [1-7]/i.test(grade)) return;

  const settings = await getSystemSettings();
  const terms = getTerms(settings);
  const selectedTerm = terms.find((term) => term.id === termId) || terms[0];
  const schoolName = settings?.schoolName || 'Circle of Hope Private Academy';
  const subjectsPromotional = getPromotionalSubjects(grade);
  const subjectsNonPromotional = getNonPromotionalSubjects(grade);
  const allSubjects = [...subjectsPromotional, ...subjectsNonPromotional];

  const [classStudentsRaw, subjectSnapshots, schoolLogo, principalSignature] = await Promise.all([
    getStudentsByAssignedClass(grade),
    loadSubjectSnapshots(grade, selectedTerm.id, allSubjects),
    fetchImage(SCHOOL_LOGO_URL),
    fetchImage(PRINCIPAL_SIGNATURE_URL),
  ]);

  const classStudents = classStudentsRaw
    .filter((item) => item.studentStatus === 'ENROLLED' || !item.studentStatus)
    .sort((a, b) => a.name.localeCompare(b.name));
  const classStudentIds = classStudents.map((item) => item.id);

  const buildRows = (subjects: string[]) => subjects.map((subject) => {
    const snapshot = subjectSnapshots.find((item) => item.subject === subject);
    const average = snapshot ? calculateSubjectAverage(student.id, snapshot) : null;
    const classAverage = snapshot ? calculateClassAverage(classStudentIds, snapshot) : null;

    return [
      subject,
      average !== null ? String(average) : '-',
      getSymbol(average) || '-',
      classAverage !== null ? String(classAverage) : '-',
    ];
  });

  const promotionalRows = buildRows(subjectsPromotional);
  const nonPromotionalRows = buildRows(subjectsNonPromotional);

  const overallValues = [...subjectSnapshots]
    .map((snapshot) => calculateSubjectAverage(student.id, snapshot))
    .filter((value): value is number => value !== null);
  const overallAverage = overallValues.length > 0
    ? Math.round(overallValues.reduce((sum, value) => sum + value, 0) / overallValues.length)
    : null;

  const promotionalPassed = subjectsPromotional.filter((subject) => {
    const snapshot = subjectSnapshots.find((item) => item.subject === subject);
    const average = snapshot ? calculateSubjectAverage(student.id, snapshot) : null;
    return average !== null && average >= 40;
  }).length;
  const englishAverage = subjectSnapshots.find((item) => item.subject === 'English');
  const mathAverage = subjectSnapshots.find((item) => item.subject === 'Mathematics');
  const isPromoted =
    promotionalPassed >= 4 &&
    (englishAverage ? (calculateSubjectAverage(student.id, englishAverage) || 0) >= 40 : false) &&
    (mathAverage ? (calculateSubjectAverage(student.id, mathAverage) || 0) >= 40 : false) &&
    (overallAverage || 0) >= 40;

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 8;
  const contentWidth = pageWidth - margin * 2;

  if (schoolLogo) {
    doc.addImage(schoolLogo, 'PNG', margin, 8, 25, 25);
    doc.addImage(schoolLogo, 'PNG', pageWidth - margin - 25, 8, 25, 25);
  }

  doc.setFont('times', 'normal');
  doc.setFontSize(8.5);
  const headerX = margin + 30;
  doc.text('P O Box 3675 Ondangwa', headerX, 14);
  doc.text('Cell: +264 81 666 4074 / +264 85 266 4074', headerX, 19);
  doc.text('Email: circleofhopeacademy@yahoo.com', headerX, 24);
  doc.text('Reg No: 7826 Registered with Ministry of Education', headerX, 29);

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.8);
  doc.line(margin, 36, pageWidth - margin, 36);

  doc.setFont('times', 'bold');
  doc.setFontSize(12);
  doc.text(schoolName, pageWidth / 2, 45, { align: 'center' });
  doc.setFontSize(11);
  doc.text('PROGRESS REPORT', pageWidth / 2, 52, { align: 'center' });

  doc.rect(margin, 56, contentWidth, 18);
  doc.line(margin + 110, 56, margin + 110, 74);
  doc.line(margin + 155, 56, margin + 155, 74);

  doc.setFont('times', 'bold');
  doc.setFontSize(8);
  doc.text(`Name: ${student.name}`, margin + 2, 63);
  doc.text(`Date of Birth: ${student.dob || '-'}`, margin + 112, 63);
  doc.text(getGradeDisplayValue(grade), margin + 157, 63);
  doc.text(`${selectedTerm.termName} ${student.academicYear || new Date().getFullYear()}`, margin + 157, 69);

  autoTable(doc, {
    startY: 74,
    head: [['Promotional Subjects', 'Marks Obtained', 'Symbol', 'Class Average']],
    body: promotionalRows,
    theme: 'grid',
    styles: {
      font: 'times',
      fontSize: 9,
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
      textColor: [0, 0, 0],
      cellPadding: 1.5,
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 105 },
      1: { cellWidth: 28, halign: 'center' },
      2: { cellWidth: 24, halign: 'center' },
      3: { cellWidth: 28, halign: 'center' },
    },
    margin: { left: margin, right: margin },
  });

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY,
    head: [['Non Promotional Subjects', 'Marks Obtained', 'Symbol', 'Class Average']],
    body: nonPromotionalRows,
    theme: 'grid',
    styles: {
      font: 'times',
      fontSize: 9,
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
      textColor: [0, 0, 0],
      cellPadding: 1.5,
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 105 },
      1: { cellWidth: 28, halign: 'center' },
      2: { cellWidth: 24, halign: 'center' },
      3: { cellWidth: 28, halign: 'center' },
    },
    margin: { left: margin, right: margin },
  });

  const afterTablesY = (doc as any).lastAutoTable.finalY + 8;
  doc.setFont('times', 'bold');
  doc.setFontSize(9);
  doc.text(`School Re-Opens: ${settings?.termStartDate ? formatDate(settings.termStartDate) : '-'}`, margin, afterTablesY);

  autoTable(doc, {
    startY: afterTablesY + 4,
    head: [['Grade', 'Range', 'Basic Competency Description']],
    body: [
      ['A', '80%+', 'Achieved competencies exceptionally well'],
      ['B', '70%-79%', 'Achieved competencies very well'],
      ['C', '60%-69%', 'Achieved competencies well'],
      ['D', '50%-59%', 'Achieved competencies satisfactorily'],
      ['E', '40%-49%', 'Achieved competencies the minimum number of competencies to be considered competent'],
      ['U', '0%-39%', 'Ungraded'],
    ],
    theme: 'grid',
    tableWidth: 112,
    styles: {
      font: 'times',
      fontSize: 8.2,
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
      textColor: [0, 0, 0],
      cellPadding: 1.2,
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
    },
    margin: { left: margin },
  });

  autoTable(doc, {
    startY: afterTablesY + 4,
    head: [['A Learner shall be promoted if she/he obtained an:']],
    body: [
      ['a)  An E grade or better in 4 out of 5 promotional subjects'],
      ['b)  An E or better in the language used as medium of learning'],
      ['c)  An E or better in Mathematics'],
      ['d)  An overall average of an E (40%)'],
    ],
    theme: 'grid',
    tableWidth: 80,
    styles: {
      font: 'times',
      fontSize: 8.2,
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
      textColor: [0, 0, 0],
      cellPadding: 1.2,
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'left',
    },
    margin: { left: pageWidth - margin - 80 },
  });

  const footerY = Math.max((doc as any).lastAutoTable.finalY, afterTablesY + 48) + 10;
  doc.setFont('times', 'bold');
  doc.setFontSize(10);
  doc.text('Days absent:', margin, footerY);
  doc.setFont('times', 'normal');
  doc.text('0', margin + 26, footerY);

  doc.setFont('times', 'bold');
  doc.text('Remarks:', margin, footerY + 9);
  doc.text(isPromoted ? 'PROMOTED' : 'INCOMPLETE / REVIEW', margin + 25, footerY + 9);

  doc.setLineWidth(0.8);
  doc.line(margin, footerY + 17, pageWidth - margin, footerY + 17);
  doc.setLineWidth(0.3);
  doc.line(margin, footerY + 18.5, pageWidth - margin, footerY + 18.5);

  const signatureY = footerY + 29;
  const printedDate = formatDate(new Date());

  doc.setFont('times', 'bold');
  doc.text('Principal', margin, signatureY);
  doc.setFont('times', 'normal');
  doc.text('Ms Victoria Joel', margin + 28, signatureY);
  doc.setFont('times', 'bold');
  doc.text('Signature', margin + 84, signatureY);
  doc.line(margin + 108, signatureY, margin + 144, signatureY);
  doc.text('Date', margin + 148, signatureY);
  doc.setFont('times', 'normal');
  doc.text(printedDate, margin + 162, signatureY);
  doc.text(`Printed by: ${printedBy}`, margin, signatureY + 8);

  if (principalSignature) {
    doc.addImage(principalSignature, 'PNG', margin + 104, signatureY - 10, 30, 15);
  }

  doc.save(`Progress_Report_${student.name.replace(/\s+/g, '_')}_${selectedTerm.termName}.pdf`);
};
