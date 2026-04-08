import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  getAssessmentRecordsForClass,
  getCustomTopicEntries,
  getStudentsByAssignedClass,
  getSystemSettings,
  getTeacherByClass,
  getTopicAssessments,
  getTopicOverrides,
} from '../services/dataService';
import { Student, SystemSettings, TermAssessmentRecord, TopicAssessmentRecord } from '../types';
import {
  getAssessmentSubjects,
  getDefaultThemesForSubject,
  getDefaultTopicsForTheme,
  getGradeDisplayValue,
  getSubjectLabel,
  isGrade1To7Class,
} from './assessmentWorkflow';
import { generateSummaryReportPDF, generateSummaryReportPDFBundle } from './pdfGenerator';
import { getTopicHeaderHeight, getTopicHeaderLines, getTopicLabelParts } from './topicLabelFormat';

const LOGO_URL = 'https://i.ibb.co/LzYXwYfX/logo.png';
const PDF_FONT_FAMILY = 'helvetica';
const MAX_TOPIC_CHARS = 22;

export const REPORT_TERMS = [
  { id: 'term-1', fallbackName: 'Term 1' },
  { id: 'term-2', fallbackName: 'Term 2' },
  { id: 'term-3', fallbackName: 'Term 3' },
] as const;

type ReportTermId = typeof REPORT_TERMS[number]['id'];

type AssessmentTermSnapshot = {
  id: ReportTermId;
  name: string;
  assessments: TopicAssessmentRecord[];
  topics: string[];
};

type AssessmentReportSnapshot = {
  className: string;
  teacherName: string;
  subject: string;
  subjectLabel: string;
  standardWorkflow: boolean;
  students: Student[];
  terms: AssessmentTermSnapshot[];
};

type GradeSummarySnapshot = {
  assessments: Record<string, TopicAssessmentRecord[]>;
  topicCounts: Record<string, number>;
};

const getSymbol = (average: number | null): string => {
  if (average === null) return '';
  if (average >= 80) return 'A';
  if (average >= 70) return 'B';
  if (average >= 60) return 'C';
  if (average >= 50) return 'D';
  if (average >= 40) return 'E';
  return 'U';
};

const urlToBase64 = async (url: string): Promise<{ data: string; format: string }> => {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const format = blob.type.includes('png') ? 'PNG' : 'JPEG';
      resolve({ data: result.split(',')[1], format });
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const getTermName = (settings: SystemSettings | null, termId: ReportTermId) =>
  settings?.schoolCalendars?.find((term) => term.id === termId)?.termName ||
  REPORT_TERMS.find((term) => term.id === termId)?.fallbackName ||
  termId;

const drawPdfLabelValue = (
  doc: jsPDF,
  x: number,
  y: number,
  label: string,
  value: string,
  fontSize = 8
) => {
  doc.setFontSize(fontSize);
  doc.setFont(PDF_FONT_FAMILY, 'bold');
  doc.text(label, x, y);
  const labelWidth = doc.getTextWidth(label);
  doc.setFont(PDF_FONT_FAMILY, 'normal');
  doc.text(value, x + labelWidth + 1, y);
};

const getStudentMark = (
  studentId: string,
  topic: string,
  termAssessments: TopicAssessmentRecord[]
) => {
  const record = termAssessments.find((a) => a.studentId === studentId && a.topic === topic);
  return record ? record.mark : null;
};

const calculateStudentTotal = (
  studentId: string,
  termAssessments: TopicAssessmentRecord[]
) => {
  const studentMarks = termAssessments
    .filter((a) => a.studentId === studentId)
    .map((a) => a.mark);
  if (studentMarks.length === 0) return null;
  return studentMarks.reduce((a, b) => a + b, 0);
};

const calculateStudentAverage = (
  studentId: string,
  termAssessments: TopicAssessmentRecord[],
  termTopics: string[],
  standardWorkflow: boolean
) => {
  const total = calculateStudentTotal(studentId, termAssessments);
  if (total === null || termTopics.length === 0) return null;
  const maxMark = standardWorkflow ? 10 : 3;
  return Math.round((total / (termTopics.length * maxMark)) * 100);
};

const getTopicsForTerm = (
  className: string,
  subject: string,
  termId: string,
  termAssessments: TopicAssessmentRecord[],
  customTopics: Array<{ topic: string }>,
  overrides: Array<{ originalTopic: string; topic: string; deleted?: boolean }>
) => {
  const standardWorkflow = isGrade1To7Class(className);
  const defaultTopics = standardWorkflow
    ? getDefaultTopicsForTheme(className, termId, subject, 'default').map((item) => item.label)
    : getDefaultThemesForSubject(className, termId, subject)
        .flatMap((theme, index) =>
          getDefaultTopicsForTheme(className, termId, subject, String(index)).map((item) => item.label)
        );

  const combinedTopics = defaultTopics.reduce<string[]>((acc, topic) => {
    const override = overrides.find((item) => item.originalTopic === topic);
    if (override?.deleted) return acc;
    acc.push(override?.topic || topic);
    return acc;
  }, []);

  customTopics.forEach((item) => {
    if (!combinedTopics.includes(item.topic)) combinedTopics.push(item.topic);
  });

  termAssessments.forEach((item) => {
    if (!combinedTopics.includes(item.topic)) combinedTopics.push(item.topic);
  });

  return combinedTopics;
};

const buildAssessmentReportSnapshot = async (
  className: string,
  subject: string
): Promise<AssessmentReportSnapshot> => {
  const [studentsData, settings, teacher] = await Promise.all([
    getStudentsByAssignedClass(className),
    getSystemSettings(),
    getTeacherByClass(className),
  ]);

  const students = [...studentsData].sort((a, b) => a.name.localeCompare(b.name));
  const standardWorkflow = isGrade1To7Class(className);

  const terms = await Promise.all(
    REPORT_TERMS.map(async (term) => {
      const [assessments, customTopics, overrides] = await Promise.all([
        getTopicAssessments(className, term.id, subject),
        getCustomTopicEntries(className, term.id, subject),
        getTopicOverrides(className, term.id, subject),
      ]);

      return {
        id: term.id,
        name: getTermName(settings, term.id),
        assessments,
        topics: getTopicsForTerm(className, subject, term.id, assessments, customTopics, overrides),
      };
    })
  );

  return {
    className,
    teacherName: teacher?.name || 'Administrator',
    subject,
    subjectLabel: getSubjectLabel(subject, className),
    standardWorkflow,
    students,
    terms,
  };
};

const appendAssessmentTermToDoc = (
  doc: jsPDF,
  snapshot: AssessmentReportSnapshot,
  term: AssessmentTermSnapshot,
  logo?: { data: string; format: string },
  isFirstPage = false
) => {
  if (!isFirstPage) doc.addPage();

  const pageW = 210;
  const marginL = 10;
  const marginR = 10;
  const usableW = pageW - marginL - marginR;
  const headerHeight = getTopicHeaderHeight(term.topics, snapshot.standardWorkflow);
  const headerHeightMm = Math.max(30, Math.min(60, headerHeight * 0.25));

  if (logo?.data) {
    doc.addImage(logo.data, logo.format as never, marginL, 6, 18, 18);
  }

  const textStartX = logo?.data ? marginL + 20 : marginL;
  doc.setFontSize(8);
  doc.setFont(PDF_FONT_FAMILY, 'bold');
  doc.text('Registered with Ministry Of Education', textStartX, 10);
  doc.text('Reg. No 7826', textStartX, 15);

  doc.setFontSize(7.5);
  doc.text('P O Box 3675, Ondangwa', pageW - marginR, 10, { align: 'right' });
  doc.text('+264 81 666 4074', pageW - marginR, 14, { align: 'right' });
  doc.text('+264 85 266 4074', pageW - marginR, 18, { align: 'right' });
  doc.text('circleofhopeacademy@yahoo.com', pageW - marginR, 22, { align: 'right' });
  doc.text('www.coha-academy.com', pageW - marginR, 26, { align: 'right' });

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.4);
  doc.line(marginL, 28, pageW - marginR, 28);

  doc.setFontSize(12);
  doc.setFont(PDF_FONT_FAMILY, 'bold');
  doc.text(`CONTINUOUS ASSESSMENT - ${term.name.toUpperCase()}`, pageW / 2, 34, { align: 'center' });

  drawPdfLabelValue(doc, marginL, 40, 'Teacher:', snapshot.teacherName);
  drawPdfLabelValue(doc, marginL, 45, 'Class:', getGradeDisplayValue(snapshot.className));
  drawPdfLabelValue(doc, marginL, 50, 'Subject:', snapshot.subjectLabel);

  const noW = 8;
  const summaryW = snapshot.standardWorkflow ? 12 : 13;
  const reservedNameW = snapshot.standardWorkflow ? 34 : 38;
  const computedTopicW = (usableW - noW - reservedNameW - (summaryW * 3)) / Math.max(term.topics.length, 1);
  const topicMarkW = Math.max(
    snapshot.standardWorkflow ? 4.9 : 5.9,
    Math.min(snapshot.standardWorkflow ? 6.4 : 7.4, computedTopicW)
  );
  const nameW = usableW - noW - (term.topics.length * topicMarkW) - (summaryW * 3);
  const colWidths: number[] = [
    noW,
    nameW,
    ...Array(term.topics.length).fill(topicMarkW),
    summaryW, summaryW, summaryW,
  ];

  const topicLabels = term.topics.map((topic) =>
    getTopicLabelParts(topic, snapshot.standardWorkflow ? MAX_TOPIC_CHARS : undefined)
  );
  const termSuffixes = ['TOTAL', 'AVERAGE', 'SYMBOL'];
  const head = [['No', 'Student Name', ...topicLabels.map((item) => item.display), ...termSuffixes]];

  const body = snapshot.students.map((student, index) => {
    const marks = term.topics.map((topic) => {
      const mark = getStudentMark(student.id, topic, term.assessments);
      return mark !== null ? String(mark) : '';
    });
    const total = calculateStudentTotal(student.id, term.assessments);
    const avg = calculateStudentAverage(student.id, term.assessments, term.topics, snapshot.standardWorkflow);
    return [
      String(index + 1),
      student.name,
      ...marks,
      total !== null ? String(total) : '',
      avg !== null ? String(avg) : '',
      getSymbol(avg),
    ];
  });

  const symIdx = 2 + term.topics.length + 2;
  const summaryColIndices = new Set([2 + term.topics.length, 2 + term.topics.length + 1, symIdx]);

  autoTable(doc, {
    startY: 54,
    head,
    body,
    theme: 'grid',
    tableWidth: usableW,
    styles: {
      fontSize: 7,
      cellPadding: { top: 1, bottom: 1, left: 0.5, right: 0.5 },
      halign: 'center',
      valign: 'middle',
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
      font: PDF_FONT_FAMILY,
      textColor: [0, 0, 0],
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'normal',
      fontSize: 6,
      minCellHeight: headerHeightMm,
      halign: 'center',
      valign: 'bottom',
      overflow: 'hidden',
    },
    columnStyles: (() => {
      const styles: Record<string, any> = {};
      colWidths.forEach((w, i) => {
        styles[i] = { cellWidth: w };
      });
      styles[0] = { cellWidth: noW, halign: 'center' };
      styles[1] = { cellWidth: nameW, halign: 'left', font: PDF_FONT_FAMILY, fontSize: 8 };
      return styles;
    })(),
    bodyStyles: {
      minCellHeight: 6,
      textColor: [0, 0, 0],
      fontSize: 7.5,
    },
    willDrawCell: (data) => {
      if (data.row.section === 'head' && data.column.index >= 2) {
        data.cell.text = [];
      }
      if (data.row.section === 'body' && summaryColIndices.has(data.column.index)) {
        data.cell.text = [];
      }
    },
    didParseCell: (data) => {
      if (data.row.section === 'head' && data.column.index === 1) {
        data.cell.styles.halign = 'left';
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.font = PDF_FONT_FAMILY;
      }
    },
    didDrawCell: (data) => {
      const { x, y, width, height } = data.cell;

      if (data.row.section === 'head' && data.column.index >= 2) {
        const topicIndex = data.column.index - 2;
        const isSummary = topicIndex >= term.topics.length;

        doc.saveGraphicsState();
        doc.setFontSize(6);
        if (isSummary) {
          doc.setFont(PDF_FONT_FAMILY, 'bold');
          doc.setTextColor(0, 0, 0);
          doc.text(termSuffixes[topicIndex - term.topics.length], x + width / 2 + 1.2, y + height - 1.5, {
            angle: 90,
            align: 'left',
          });
        } else {
          doc.setFont(PDF_FONT_FAMILY, 'normal');
          doc.setTextColor(0, 0, 0);
          doc.text(
            getTopicHeaderLines(term.topics[topicIndex], snapshot.standardWorkflow ? 22 : 24),
            x + width / 2 + 1.2,
            y + height - 1.5,
            {
              angle: 90,
              align: 'left',
            }
          );
        }
        doc.restoreGraphicsState();
      }

      if (data.column.index === symIdx) {
        doc.saveGraphicsState();
        doc.setDrawColor(180, 0, 0);
        doc.setLineWidth(0.7);
        doc.line(x + width, y, x + width, y + height);
        doc.restoreGraphicsState();
      }

      if (data.row.section === 'body' && summaryColIndices.has(data.column.index)) {
        const val = (data.row.raw as string[])[data.column.index];
        if (val !== undefined && val !== '') {
          doc.saveGraphicsState();
          doc.setFillColor(255, 255, 255);
          doc.rect(x + 0.1, y + 0.1, width - 0.2, height - 0.2, 'F');
          doc.setFontSize(7.5);
          doc.setTextColor(data.column.index === symIdx && val === 'U' ? 200 : 0, 0, 0);
          doc.setFont(PDF_FONT_FAMILY, 'bold');
          doc.text(String(val), x + width / 2, y + height / 2 + 1, { align: 'center' });
          doc.restoreGraphicsState();
        }
      }

      if (
        data.row.section === 'body' &&
        data.row.index % 2 === 1 &&
        !summaryColIndices.has(data.column.index)
      ) {
        doc.saveGraphicsState();
        doc.setFillColor(248, 249, 250);
        doc.rect(x + 0.1, y + 0.1, width - 0.2, height - 0.2, 'F');
        const val = (data.row.raw as string[])[data.column.index];
        if (val !== undefined && val !== '') {
          doc.setFontSize(7.5);
          doc.setFont(PDF_FONT_FAMILY, 'normal');
          doc.setTextColor(0, 0, 0);
          doc.text(
            String(val),
            data.column.index === 1 ? x + 0.7 : x + width / 2,
            y + height / 2 + 1,
            { align: data.column.index === 1 ? 'left' : 'center' }
          );
        }
        doc.restoreGraphicsState();
      }
    },
    margin: { left: marginL, right: marginR },
  });
};

export const generateAssessmentSheetPdf = async ({
  className,
  subject,
  termIds,
  mode = 'download',
}: {
  className: string;
  subject: string;
  termIds?: string[];
  mode?: 'download' | 'print';
}) => {
  const snapshot = await buildAssessmentReportSnapshot(className, subject);
  const terms = snapshot.terms.filter((term) => !termIds || termIds.includes(term.id));
  if (terms.length === 0) return;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const logo = await urlToBase64(LOGO_URL).catch(() => ({ data: '', format: 'PNG' }));

  terms.forEach((term, index) => appendAssessmentTermToDoc(doc, snapshot, term, logo, index === 0));

  if (mode === 'print') {
    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');
    return;
  }

  const fileName = terms.length === 1
    ? `${snapshot.subjectLabel}_Assessment_Sheet_${terms[0].name.replace(/\s+/g, '_')}.pdf`
    : `${snapshot.subjectLabel}_Assessment_Sheet_All_Terms.pdf`;
  doc.save(fileName);
};

export const generateAllSubjectsAssessmentPdf = async ({
  className,
  subjectIds,
  mode = 'download',
}: {
  className: string;
  subjectIds?: string[];
  mode?: 'download' | 'print';
}) => {
  const subjects = subjectIds?.length
    ? subjectIds
    : getAssessmentSubjects(className).map((subject) => subject.id);
  if (subjects.length === 0) return;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const logo = await urlToBase64(LOGO_URL).catch(() => ({ data: '', format: 'PNG' }));
  let firstPage = true;

  for (const subject of subjects) {
    const snapshot = await buildAssessmentReportSnapshot(className, subject);
    snapshot.terms.forEach((term) => {
      appendAssessmentTermToDoc(doc, snapshot, term, logo, firstPage);
      firstPage = false;
    });
  }

  if (mode === 'print') {
    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');
    return;
  }

  doc.save(`${className.replace(/\s+/g, '_')}_Assessment_All_Subjects.pdf`);
};

const calculateSubjectTotalFrom = (
  studentId: string,
  subject: string,
  assessmentMap: Record<string, TopicAssessmentRecord[]>
) => {
  const records = assessmentMap[subject] || [];
  const studentMarks = records.filter((a) => a.studentId === studentId).map((a) => a.mark);
  if (studentMarks.length === 0) return null;
  return studentMarks.reduce((a, b) => a + b, 0);
};

const calculateSubjectAverageFrom = (
  studentId: string,
  subject: string,
  assessmentMap: Record<string, TopicAssessmentRecord[]>,
  topicCounts: Record<string, number>
) => {
  const total = calculateSubjectTotalFrom(studentId, subject, assessmentMap);
  if (total === null) return null;
  const topicCount = topicCounts[subject] || 0;
  if (!topicCount) return null;
  return Math.round((total / (topicCount * 10)) * 100);
};

const calculateOverallTotalFrom = (
  studentId: string,
  subjects: string[],
  assessmentMap: Record<string, TopicAssessmentRecord[]>
) => {
  let overallTotal = 0;
  let count = 0;
  subjects.forEach((subject) => {
    const total = calculateSubjectTotalFrom(studentId, subject, assessmentMap);
    if (total !== null) {
      overallTotal += total;
      count += 1;
    }
  });
  return count === 0 ? null : overallTotal;
};

const calculateOverallAverageFrom = (
  studentId: string,
  subjects: string[],
  assessmentMap: Record<string, TopicAssessmentRecord[]>,
  topicCounts: Record<string, number>
) => {
  let totalAvg = 0;
  let count = 0;
  subjects.forEach((subject) => {
    const avg = calculateSubjectAverageFrom(studentId, subject, assessmentMap, topicCounts);
    if (avg !== null) {
      totalAvg += avg;
      count += 1;
    }
  });
  return count === 0 ? null : Math.round(totalAvg / count);
};

const fetchGradeSummarySnapshot = async (
  className: string,
  subjectIds: string[],
  termId: string
): Promise<GradeSummarySnapshot> => {
  const assessments: Record<string, TopicAssessmentRecord[]> = {};
  const topicCounts: Record<string, number> = {};

  await Promise.all(
    subjectIds.map(async (subject) => {
      const [records, customTopics, overrides] = await Promise.all([
        getTopicAssessments(className, termId, subject),
        getCustomTopicEntries(className, termId, subject),
        getTopicOverrides(className, termId, subject),
      ]);
      assessments[subject] = records;
      topicCounts[subject] = getTopicsForTerm(className, subject, termId, records, customTopics, overrides).length;
    })
  );

  return { assessments, topicCounts };
};

const generateGradeSummaryPdf = async (
  className: string,
  teacherName: string,
  students: Student[],
  settings: SystemSettings | null,
  termIds: string[],
  mode: 'download' | 'print'
) => {
  const subjects = getAssessmentSubjects(className).map((subject) => subject.id);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = 297;
  const marginL = 10;
  const marginR = 10;
  const usableW = pageW - marginL - marginR;
  const logo = await urlToBase64(LOGO_URL).catch(() => ({ data: '', format: 'PNG' }));

  for (const [index, termId] of termIds.entries()) {
    if (index > 0) doc.addPage();
    const termName = getTermName(settings, termId as ReportTermId);
    const snapshot = await fetchGradeSummarySnapshot(className, subjects, termId);

    if (logo.data) {
      doc.addImage(logo.data, logo.format as never, marginL, 6, 18, 18);
    }

    const textStartX = logo.data ? marginL + 20 : marginL;
    doc.setFontSize(8);
    doc.setFont(PDF_FONT_FAMILY, 'bold');
    doc.text('Registered with Ministry Of Education', textStartX, 10);
    doc.text('Reg. No 7826', textStartX, 15);

    doc.setFontSize(7.5);
    doc.text('P O Box 3675, Ondangwa', pageW - marginR, 10, { align: 'right' });
    doc.text('+264 81 666 4074', pageW - marginR, 14, { align: 'right' });
    doc.text('+264 85 266 4074', pageW - marginR, 18, { align: 'right' });
    doc.text('circleofhopeacademy@yahoo.com', pageW - marginR, 22, { align: 'right' });
    doc.text('www.coha-academy.com', pageW - marginR, 26, { align: 'right' });

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.4);
    doc.line(marginL, 28, pageW - marginR, 28);

    doc.setFontSize(12);
    doc.setFont(PDF_FONT_FAMILY, 'bold');
    doc.text(`SUMMARY SHEET - ${termName.toUpperCase()}`, pageW / 2, 34, { align: 'center' });

    doc.setFontSize(8);
    doc.setFont(PDF_FONT_FAMILY, 'normal');
    doc.text(`Teacher: ${teacherName}`, marginL, 40);
    doc.text(`Grade: ${getGradeDisplayValue(className)}`, marginL, 45);

    const noW = 7;
    const nameW = 45;
    const colW = (usableW - noW - nameW) / (subjects.length * 3);
    const head1: any[] = [{ content: 'No', rowSpan: 2 }, { content: 'Name', rowSpan: 2 }];
    const head2: string[] = [];

    subjects.forEach((subject) => {
      head1.push({ content: subject, colSpan: 3, styles: { halign: 'center' } });
      head2.push('TOT', 'AVG', 'SYM');
    });

    const body = students.map((student, studentIndex) => {
      const row = [String(studentIndex + 1), student.name];
      subjects.forEach((subject) => {
        const total = calculateSubjectTotalFrom(student.id, subject, snapshot.assessments);
        const avg = calculateSubjectAverageFrom(student.id, subject, snapshot.assessments, snapshot.topicCounts);
        row.push(total !== null ? String(total) : '');
        row.push(avg !== null ? String(avg) : '');
        row.push(getSymbol(avg));
      });
      return row;
    });

    autoTable(doc, {
      startY: 50,
      head: [head1, head2],
      body,
      theme: 'grid',
      tableWidth: usableW,
      styles: {
        fontSize: 7,
        cellPadding: 1,
        halign: 'center',
        valign: 'middle',
        lineColor: [0, 0, 0],
        lineWidth: 0.2,
        textColor: [0, 0, 0],
      },
      headStyles: {
        fillColor: [240, 240, 240],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: noW, halign: 'center' },
        1: { cellWidth: nameW, halign: 'left', font: PDF_FONT_FAMILY },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index > 1) {
          const val = String(data.cell.raw || '');
          if (['A', 'B', 'C', 'D', 'E', 'U'].includes(val)) {
            data.cell.text = [''];
          }
        }
      },
      didDrawCell: (data) => {
        if (data.row.section === 'body' && data.column.index > 1) {
          const val = String(data.cell.raw || '');
          if (!['A', 'B', 'C', 'D', 'E', 'U'].includes(val)) return;
          const color =
            val === 'A' ? [22, 163, 74] :
            val === 'B' ? [37, 99, 235] :
            val === 'C' ? [217, 119, 6] :
            val === 'D' ? [234, 88, 12] :
            val === 'E' ? [71, 85, 105] :
            [200, 0, 0];
          doc.setTextColor(color[0], color[1], color[2]);
          doc.setFont(PDF_FONT_FAMILY, 'bold');
          doc.text(val, data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2 + 1, { align: 'center' });
        }
      },
      margin: { left: marginL, right: marginR },
    });

    const overallHead = [['No', 'Name', 'TOTAL', 'AVERAGE', 'SYMBOL']];
    const overallBody = students.map((student, studentIndex) => {
      const total = calculateOverallTotalFrom(student.id, subjects, snapshot.assessments);
      const avg = calculateOverallAverageFrom(student.id, subjects, snapshot.assessments, snapshot.topicCounts);
      return [
        String(studentIndex + 1),
        student.name,
        total !== null ? String(total) : '',
        avg !== null ? String(avg) : '',
        getSymbol(avg),
      ];
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 8,
      head: overallHead,
      body: overallBody,
      theme: 'grid',
      tableWidth: 120,
      styles: {
        fontSize: 7,
        cellPadding: 1,
        halign: 'center',
        valign: 'middle',
        lineColor: [0, 0, 0],
        lineWidth: 0.2,
        textColor: [0, 0, 0],
      },
      headStyles: {
        fillColor: [230, 230, 230],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 55, halign: 'left' },
        2: { cellWidth: 18 },
        3: { cellWidth: 18 },
        4: { cellWidth: 19 },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 4) {
          data.cell.text = [''];
        }
      },
      didDrawCell: (data) => {
        if (data.row.section !== 'body' || data.column.index !== 4) return;
        const val = String(data.cell.raw || '');
        if (!val) return;
        const color =
          val === 'A' ? [22, 163, 74] :
          val === 'B' ? [37, 99, 235] :
          val === 'C' ? [217, 119, 6] :
          val === 'D' ? [234, 88, 12] :
          val === 'E' ? [71, 85, 105] :
          [200, 0, 0];
        doc.setTextColor(color[0], color[1], color[2]);
        doc.setFont(PDF_FONT_FAMILY, 'bold');
        doc.text(val, data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2 + 1, { align: 'center' });
      },
      margin: { left: marginL, right: marginR },
    });
  }

  if (mode === 'print') {
    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');
    return;
  }

  doc.save(
    termIds.length === 1
      ? `Summary_Sheet_${className.replace(/\s+/g, '_')}_${getTermName(settings, termIds[0] as ReportTermId).replace(/\s+/g, '_')}.pdf`
      : `Summary_Sheet_${className.replace(/\s+/g, '_')}_All_Terms.pdf`
  );
};

const fetchPrePrimaryRecords = async (className: string, termId: string, students: Student[]) => {
  const studentIds = students.map((student) => student.id);
  const records = await getAssessmentRecordsForClass(className, termId, studentIds);
  const recordsMap: Record<string, TermAssessmentRecord> = {};
  records.forEach((record) => {
    recordsMap[record.studentId] = record;
  });
  return recordsMap;
};

export const generateSummarySheetPdf = async ({
  className,
  termIds,
  mode = 'download',
}: {
  className: string;
  termIds: string[];
  mode?: 'download' | 'print';
}) => {
  const [studentsData, settings, teacher] = await Promise.all([
    getStudentsByAssignedClass(className),
    getSystemSettings(),
    getTeacherByClass(className),
  ]);

  const students = [...studentsData]
    .filter((student) => student.studentStatus === 'ENROLLED')
    .sort((a, b) => a.name.localeCompare(b.name));
  const teacherName = teacher?.name || 'Administrator';

  if (isGrade1To7Class(className)) {
    await generateGradeSummaryPdf(className, teacherName, students, settings, termIds, mode);
    return;
  }

  const bundles = await Promise.all(
    termIds.map(async (termId) => ({
      termId,
      termName: getTermName(settings, termId as ReportTermId),
      records: await fetchPrePrimaryRecords(className, termId, students),
    }))
  );

  if (bundles.length === 1) {
    await generateSummaryReportPDF(
      students,
      bundles[0].records,
      bundles[0].termId,
      bundles[0].termName,
      teacherName,
      className,
      'Circle of Hope Academy',
      mode
    );
    return;
  }

  await generateSummaryReportPDFBundle(
    students,
    bundles,
    teacherName,
    className,
    'Circle of Hope Academy',
    mode
  );
};
