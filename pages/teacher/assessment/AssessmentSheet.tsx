import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Download, FileSpreadsheet, Printer } from 'lucide-react';
import { getCustomTopicEntries, getStudentsByAssignedClass, getTopicAssessments, getTopicOverrides } from '../../../services/dataService';
import { CustomTopicEntry, Student, TopicAssessmentRecord, TopicOverride } from '../../../types';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ActionMenu } from '../../../components/ui/ActionMenu';
import {
  getDefaultThemesForSubject,
  getDefaultTopicsForTheme,
  getGradeDisplayValue,
  getSubjectLabel,
  isGrade1To7Class,
} from '../../../utils/assessmentWorkflow';
import { getTopicHeaderHeight, getTopicHeaderLines, getTopicLabelParts } from '../../../utils/topicLabelFormat';
import { navigateBackOr } from '../../../utils/navigation';
import { getSelectedTeachingClass, withTeachingClass } from '../../../utils/teacherClassSelection';

// ─── Constants ────────────────────────────────────────────────────────────────
const LOGO_URL = 'https://i.ibb.co/LzYXwYfX/logo.png';
const PDF_FONT_FAMILY = 'helvetica';
const EXCEL_FONT_FAMILY = 'Arial';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convert an image URL to a base64 data string for embedding in PDF / Excel */
async function urlToBase64(url: string): Promise<{ data: string; format: string }> {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const format = blob.type.includes('png') ? 'PNG' : 'JPEG';
      // Strip the data:image/...;base64, prefix for jsPDF
      const base64 = result.split(',')[1];
      resolve({ data: base64, format });
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function drawPdfLabelValue(
  doc: jsPDF,
  x: number,
  y: number,
  label: string,
  value: string,
  fontSize = 8
) {
  doc.setFontSize(fontSize);
  doc.setFont(PDF_FONT_FAMILY, 'bold');
  doc.text(label, x, y);
  const labelWidth = doc.getTextWidth(label);
  doc.setFont(PDF_FONT_FAMILY, 'normal');
  doc.text(value, x + labelWidth + 1, y);
}

/** Grade symbol from percentage */
const getSymbol = (average: number | null): string => {
  if (average === null) return '';
  if (average >= 80) return 'A';
  if (average >= 70) return 'B';
  if (average >= 60) return 'C';
  if (average >= 50) return 'D';
  if (average >= 40) return 'E';
  return 'U';
};

const MAX_TOPIC_CHARS = 22; // characters visible in one rotated line at 0.6rem

// ─── Component ────────────────────────────────────────────────────────────────
export default function AssessmentSheet({
  user,
  backPath = '/teacher/classes',
  visibleTermIds,
}: {
  user: any;
  backPath?: string;
  visibleTermIds?: string[];
}) {
  const { subject } = useParams<{ subject: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [students, setStudents] = useState<Student[]>([]);
  const [assessmentsT1, setAssessmentsT1] = useState<TopicAssessmentRecord[]>([]);
  const [assessmentsT2, setAssessmentsT2] = useState<TopicAssessmentRecord[]>([]);
  const [assessmentsT3, setAssessmentsT3] = useState<TopicAssessmentRecord[]>([]);
  const [customTopicsT1, setCustomTopicsT1] = useState<CustomTopicEntry[]>([]);
  const [customTopicsT2, setCustomTopicsT2] = useState<CustomTopicEntry[]>([]);
  const [customTopicsT3, setCustomTopicsT3] = useState<CustomTopicEntry[]>([]);
  const [overridesT1, setOverridesT1] = useState<TopicOverride[]>([]);
  const [overridesT2, setOverridesT2] = useState<TopicOverride[]>([]);
  const [overridesT3, setOverridesT3] = useState<TopicOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const className = getSelectedTeachingClass(user, location.search);
  const standardWorkflow = isGrade1To7Class(className);
  const subjectLabel = getSubjectLabel(subject || '', className);
  const resolvedBackPath = withTeachingClass(backPath, className);

  const sheetRef = useRef<HTMLDivElement>(null);

  const getTopicsForTerm = (termId: string, termAssessments: TopicAssessmentRecord[]) => {
    const customTopics =
      termId === 'term-1' ? customTopicsT1 :
      termId === 'term-2' ? customTopicsT2 :
      customTopicsT3;
    const overrides =
      termId === 'term-1' ? overridesT1 :
      termId === 'term-2' ? overridesT2 :
      overridesT3;

    const defaultTopics = standardWorkflow
      ? getDefaultTopicsForTheme(className, termId, subject || '', 'default').map((item) => item.label)
      : getDefaultThemesForSubject(className, termId, subject || '')
          .flatMap((theme, index) =>
            getDefaultTopicsForTheme(className, termId, subject || '', String(index)).map((item) => item.label)
          );

    const combinedTopics = defaultTopics.reduce<string[]>((acc, topic) => {
      const override = overrides.find((item) => item.originalTopic === topic);
      if (override?.deleted) return acc;
      acc.push(override?.topic || topic);
      return acc;
    }, []);

    customTopics.forEach((item) => {
      if (!combinedTopics.includes(item.topic)) {
        combinedTopics.push(item.topic);
      }
    });

    termAssessments.forEach((item) => {
      if (!combinedTopics.includes(item.topic)) {
        combinedTopics.push(item.topic);
      }
    });
    return combinedTopics;
  };

  // ── Data fetching ────────────────────────────────────────────────────────
  useEffect(() => {
    if (className && subject) {
      setLoading(true);
      Promise.all([
        getStudentsByAssignedClass(className),
        getTopicAssessments(className, 'term-1', subject),
        getTopicAssessments(className, 'term-2', subject),
        getTopicAssessments(className, 'term-3', subject),
        getCustomTopicEntries(className, 'term-1', subject),
        getCustomTopicEntries(className, 'term-2', subject),
        getCustomTopicEntries(className, 'term-3', subject),
        getTopicOverrides(className, 'term-1', subject),
        getTopicOverrides(className, 'term-2', subject),
        getTopicOverrides(className, 'term-3', subject),
      ])
        .then(([studentsData, t1, t2, t3, custom1, custom2, custom3, overrides1, overrides2, overrides3]) => {
          const sorted = [...studentsData].sort((a: Student, b: Student) =>
            a.name.localeCompare(b.name)
          );
          setStudents(sorted);
          setAssessmentsT1(t1);
          setAssessmentsT2(t2);
          setAssessmentsT3(t3);
          setCustomTopicsT1(custom1);
          setCustomTopicsT2(custom2);
          setCustomTopicsT3(custom3);
          setOverridesT1(overrides1);
          setOverridesT2(overrides2);
          setOverridesT3(overrides3);
          setLoading(false);
        })
        .catch((err) => {
          console.error('Error fetching sheet data:', err);
          setLoading(false);
        });
    }
  }, [className, subject]);

  // ── Mark helpers ─────────────────────────────────────────────────────────
  const getStudentMark = (
    studentId: string,
    topic: string,
    termAssessments: TopicAssessmentRecord[]
  ) => {
    const record = termAssessments.find(
      (a) => a.studentId === studentId && a.topic === topic
    );
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
    termTopics: string[]
  ) => {
    const total = calculateStudentTotal(studentId, termAssessments);
    if (total === null || termTopics.length === 0) return null;
    const maxMark = standardWorkflow ? 10 : 3;
    return Math.round((total / (termTopics.length * maxMark)) * 100);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // PDF GENERATION
  // ═══════════════════════════════════════════════════════════════════════════
  const generatePDF = async (
    termData?: { name: string; assessments: TopicAssessmentRecord[] },
    mode: 'download' | 'print' = 'download'
  ) => {
    const termsToGen = termData ? [termData] : [
      { name: 'Term 1', assessments: assessmentsT1 },
      { name: 'Term 2', assessments: assessmentsT2 },
      { name: 'Term 3', assessments: assessmentsT3 },
    ];
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = 210;
    const marginL = 10;
    const marginR = 10;
    const usableW = pageW - marginL - marginR;

    const { data, format } = await urlToBase64(LOGO_URL).catch(() => ({ data: '', format: 'PNG' as const }));

    termsToGen.forEach((term, termIndex) => {
      if (termIndex > 0) doc.addPage();
      const termId = term.name.toLowerCase().replace(' ', '-');
      const termTopics = getTopicsForTerm(termId, term.assessments);
      const headerHeight = getTopicHeaderHeight(termTopics, standardWorkflow);
      const headerHeightMm = Math.max(30, Math.min(60, headerHeight * 0.25));
      if (data) {
        doc.addImage(data, format as any, marginL, 6, 18, 18);
      }

      // ── School header ────────────────────────────────────────────────────────
      const textStartX = data ? marginL + 20 : marginL;
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

      // ── Title ────────────────────────────────────────────────────────────────
      doc.setFontSize(12);
      doc.setFont(PDF_FONT_FAMILY, 'bold');
      doc.text(`CONTINUOUS ASSESSMENT - ${term.name.toUpperCase()}`, pageW / 2, 34, { align: 'center' });

      // ── Teacher info ─────────────────────────────────────────────────────────
      drawPdfLabelValue(doc, marginL, 40, 'Teacher:', user?.name || '');
      drawPdfLabelValue(doc, marginL, 45, 'Class:', getGradeDisplayValue(className) || '');
      drawPdfLabelValue(doc, marginL, 50, 'Subject:', subjectLabel);

      // ── Table setup ──────────────────────────────────────────────────────────
      const noW = 8;
      const summaryW = standardWorkflow ? 12 : 13;
      const reservedNameW = standardWorkflow ? 34 : 38;
      const computedTopicW = (usableW - noW - reservedNameW - (summaryW * 3)) / Math.max(termTopics.length, 1);
      const topicMarkW = Math.max(
        standardWorkflow ? 4.9 : 5.9,
        Math.min(standardWorkflow ? 6.4 : 7.4, computedTopicW)
      );
      const nameW = usableW - noW - (termTopics.length * topicMarkW) - (summaryW * 3);
      const colWidths: number[] = [
        noW,
        nameW,
        ...Array(termTopics.length).fill(topicMarkW),
        summaryW, summaryW, summaryW,
      ];

      const topicLabels = termTopics.map((topic) => getTopicLabelParts(topic, standardWorkflow ? MAX_TOPIC_CHARS : undefined));
      const termSuffixes = ['TOTAL', 'AVERAGE', 'SYMBOL'];
      const head = [['No', 'Student Name', ...topicLabels.map((item) => item.display), ...termSuffixes]];

      const body = students.map((student, index) => {
        const marks = termTopics.map((topic) => {
          const m = getStudentMark(student.id, topic, term.assessments);
          return m !== null ? String(m) : '';
        });
        const total = calculateStudentTotal(student.id, term.assessments);
        const avg = calculateStudentAverage(student.id, term.assessments, termTopics);
        return [
          String(index + 1),
          student.name,
          ...marks,
          total !== null ? String(total) : '',
          avg !== null ? String(avg) : '',
          getSymbol(avg),
        ];
      });

      const symIdx = 2 + termTopics.length + 2;
      const summaryColIndices = new Set([
        2 + termTopics.length,
        2 + termTopics.length + 1,
        2 + termTopics.length + 2
      ]);

      autoTable(doc, {
        startY: 54,
        head: head,
        body: body,
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
          const styles: Record<number, any> = {};
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
            const isSummary = topicIndex >= termTopics.length;

            doc.saveGraphicsState();
            doc.setFontSize(6);
            if (isSummary) {
              doc.setFont(PDF_FONT_FAMILY, 'bold');
              doc.setTextColor(0, 0, 0);
              doc.text(termSuffixes[topicIndex - termTopics.length], x + width / 2 + 1.2, y + height - 1.5, {
                angle: 90,
                align: 'left',
              });
            } else {
              const lines = getTopicHeaderLines(termTopics[topicIndex], standardWorkflow ? 22 : 24);
              doc.setFont(PDF_FONT_FAMILY, 'normal');
              doc.setTextColor(0, 0, 0);
              doc.text(lines, x + width / 2 + 1.2, y + height - 1.5, {
                angle: 90,
                align: 'left',
              });
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
            const val = (data.row.raw as any[])[data.column.index];
            if (val !== undefined && val !== '') {
              doc.saveGraphicsState();
              doc.setFillColor(255, 255, 255);
              doc.rect(x + 0.1, y + 0.1, width - 0.2, height - 0.2, 'F');
              doc.setFontSize(7.5);
              const isSymbol = data.column.index === symIdx;
              if (isSymbol && val === 'U') {
                doc.setTextColor(200, 0, 0);
              } else {
                doc.setTextColor(0, 0, 0);
              }
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
            const val = (data.row.raw as any[])[data.column.index];
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
    });

    const outputName = termData
      ? `${subjectLabel}_Assessment_Sheet_${termData.name.replace(' ', '_')}.pdf`
      : `${subjectLabel}_Assessment_Sheet_All_Terms.pdf`;

    if (mode === 'print') {
      doc.autoPrint();
      window.open(doc.output('bloburl'), '_blank');
    } else {
      doc.save(outputName);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // EXCEL GENERATION
  // ═══════════════════════════════════════════════════════════════════════════
  const generateExcel = async (termData?: { name: string; assessments: TopicAssessmentRecord[] }) => {
    const termsToGen = termData ? [termData] : [
      { name: 'Term 1', assessments: assessmentsT1 },
      { name: 'Term 2', assessments: assessmentsT2 },
      { name: 'Term 3', assessments: assessmentsT3 },
    ];
    const workbook = new ExcelJS.Workbook();

    for (const term of termsToGen) {
      const termId = term.name.toLowerCase().replace(' ', '-');
      const termTopics = getTopicsForTerm(termId, term.assessments);
      const headerHeight = getTopicHeaderHeight(termTopics, standardWorkflow);
      const sheet = workbook.addWorksheet(term.name, {
        pageSetup: {
          paperSize: 9,
          orientation: 'portrait',
          fitToPage: true,
          fitToWidth: 1,
          fitToHeight: 0,
          margins: {
            left: 0.25,
            right: 0.25,
            top: 0.25,
            bottom: 0.25,
            header: 0,
            footer: 0,
          },
        },
      });

      const termCols = termTopics.length + 3;
      const totalCols = 2 + termCols;

      const colLetter = (n: number) => sheet.getColumn(n).letter;
      const lastLetter = colLetter(totalCols);

      const thinBorder: Partial<ExcelJS.Borders> = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
      const symBorder: Partial<ExcelJS.Borders> = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'medium', color: { argb: 'FFCC0000' } },
      };

      try {
        const res = await fetch(LOGO_URL);
        const buf = await res.arrayBuffer();
        const imageId = workbook.addImage({
          buffer: buf as any,
          extension: 'png',
        });
        sheet.addImage(imageId, {
          tl: { col: 0, row: 0 } as any,
          br: { col: 1.8, row: 5 } as any,
          editAs: 'oneCell',
        });
      } catch (e) {
        console.warn('Logo failed for Excel:', e);
      }

      const hdrRows = [
        ['Registered with Ministry Of Education', null, 'P O Box 3675, Ondangwa'],
        ['Reg. No 7826', null, '+264 81 666 4074'],
        [null, null, '+264 85 266 4074'],
        [null, null, 'circleofhopeacademy@yahoo.com'],
        [null, null, 'www.coha-academy.com'],
      ];
      hdrRows.forEach(([left, , right], i) => {
        const rowNum = i + 1;
        if (left) {
          sheet.mergeCells(`C${rowNum}:E${rowNum}`);
          const c = sheet.getCell(`C${rowNum}`);
          c.value = left;
          c.font = { name: EXCEL_FONT_FAMILY, bold: true, size: 9 };
        }
        if (right) {
          sheet.mergeCells(`F${rowNum}:${lastLetter}${rowNum}`);
          const c = sheet.getCell(`F${rowNum}`);
          c.value = right;
          c.font = { name: EXCEL_FONT_FAMILY, bold: true, size: 9 };
          c.alignment = { horizontal: 'right' };
        }
      });

      sheet.mergeCells(`A7:${lastLetter}7`);
      const titleCell = sheet.getCell('A7');
      titleCell.value = `CONTINUOUS ASSESSMENT - ${term.name.toUpperCase()}`;
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      titleCell.font = { name: EXCEL_FONT_FAMILY, bold: true, size: 14 };
      sheet.getRow(7).height = 22;

      const infoRows: [string, string, string][] = [
        ['A9', 'Teacher:', user?.name || ''],
        ['A10', 'Class:', getGradeDisplayValue(className) || ''],
        ['A11', 'Subject:', subjectLabel],
      ];
      infoRows.forEach(([cell, label, value]) => {
        const c = sheet.getCell(cell);
        c.value = {
          richText: [
            { font: { name: EXCEL_FONT_FAMILY, bold: true, size: 10 }, text: `${label} ` },
            { font: { name: EXCEL_FONT_FAMILY, size: 10 }, text: value },
          ],
        };
      });

      sheet.getColumn(1).width = 4.5;
      sheet.getColumn(2).width = 26;
      for (let i = 3; i <= totalCols; i++) {
        const relIdx = (i - 3);
        const isSummary = relIdx >= termTopics.length;
        sheet.getColumn(i).width = isSummary ? 10 : 6;
      }

      const HDR_ROW = 13;
      sheet.getRow(HDR_ROW).height = headerHeight;
      const hdrBaseStyle: Partial<ExcelJS.Style> = {
        alignment: { textRotation: 90, vertical: 'bottom', horizontal: 'center', wrapText: false },
        border: thinBorder,
      };

      ['No', 'Student Name'].forEach((v, i) => {
        const c = sheet.getCell(HDR_ROW, i + 1);
        c.value = v;
        c.font = { name: EXCEL_FONT_FAMILY, bold: true, size: 9 };
        c.alignment = {
          horizontal: i === 1 ? 'left' : 'center',
          vertical: 'bottom',
          wrapText: true,
        };
        c.border = thinBorder;
      });

      let col = 3;
      termTopics.forEach((topic) => {
        const lines = getTopicHeaderLines(topic, standardWorkflow ? 22 : 24);
        const c = sheet.getCell(HDR_ROW, col++);
        c.value = lines[0];
        c.font = { name: EXCEL_FONT_FAMILY, size: 8 };
        Object.assign(c, { ...hdrBaseStyle });
        c.border = thinBorder;
      });

      ['TOTAL', 'AVERAGE', 'SYMBOL'].forEach((label, li) => {
        const isSymbol = li === 2;
        const c = sheet.getCell(HDR_ROW, col++);
        c.value = label;
        c.font = { name: EXCEL_FONT_FAMILY, bold: true, size: 8 };
        c.alignment = {
          textRotation: 90,
          vertical: 'bottom',
          horizontal: 'center',
          wrapText: false,
        };
        c.border = isSymbol ? symBorder : thinBorder;
      });

      const DATA_START = 14;
      students.forEach((student, index) => {
        const rowNum = DATA_START + index;
        const row = sheet.getRow(rowNum);
        row.height = 16;
        const fillColor = index % 2 === 1 ? 'FFF8F9FA' : 'FFFFFFFF';
        const applyFill = (c: ExcelJS.Cell) => {
          c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
        };

        const noCell = row.getCell(1);
        noCell.value = index + 1;
        noCell.alignment = { horizontal: 'center', vertical: 'middle' };
        noCell.font = { name: EXCEL_FONT_FAMILY, size: 9 };
        noCell.border = thinBorder;
        applyFill(noCell);

        const nameCell = row.getCell(2);
        nameCell.value = student.name;
        nameCell.alignment = { horizontal: 'left', vertical: 'middle' };
        nameCell.font = { name: EXCEL_FONT_FAMILY, size: 9 };
        nameCell.border = thinBorder;
        applyFill(nameCell);

        let colIdx = 3;
        termTopics.forEach((topic) => {
          const mark = getStudentMark(student.id, topic, term.assessments);
          const c = row.getCell(colIdx++);
          c.value = mark !== null ? mark : '';
          c.alignment = { horizontal: 'center', vertical: 'middle' };
          c.font = { name: EXCEL_FONT_FAMILY, size: 9 };
          c.border = thinBorder;
          applyFill(c);
        });

        const total = calculateStudentTotal(student.id, term.assessments);
        const avg = calculateStudentAverage(student.id, term.assessments, termTopics);
        const sym = getSymbol(avg);

        const totalCell = row.getCell(colIdx++);
        totalCell.value = total !== null ? total : '';
        totalCell.alignment = { horizontal: 'center', vertical: 'middle' };
        totalCell.font = { name: EXCEL_FONT_FAMILY, bold: true, size: 10 };
        totalCell.border = thinBorder;
        applyFill(totalCell);

        const avgCell = row.getCell(colIdx++);
        avgCell.value = avg !== null ? avg : '';
        avgCell.alignment = { horizontal: 'center', vertical: 'middle' };
        avgCell.font = { name: EXCEL_FONT_FAMILY, bold: true, size: 10 };
        avgCell.border = thinBorder;
        applyFill(avgCell);

        const symCell = row.getCell(colIdx++);
        symCell.value = sym;
        symCell.alignment = { horizontal: 'center', vertical: 'middle' };
        symCell.font = {
          name: EXCEL_FONT_FAMILY,
          bold: true,
          size: 11,
          color: { argb: sym === 'U' ? 'FFCC0000' : 'FF000000' },
        };
        symCell.border = symBorder;
        applyFill(symCell);
      });

    }
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    saveAs(blob, termData
      ? `${subjectLabel}_Assessment_Sheet_${termData.name.replace(' ', '_')}.xlsx`
      : `${subjectLabel}_Assessment_Sheet_All_Terms.xlsx`);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500 text-sm">Loading sheet data…</div>
    );
  }

  const allSheetTerms = [
    { id: 'term-1', name: 'Term 1', assessments: assessmentsT1 },
    { id: 'term-2', name: 'Term 2', assessments: assessmentsT2 },
    { id: 'term-3', name: 'Term 3', assessments: assessmentsT3 },
  ];
  const sheetTerms = visibleTermIds?.length
    ? allSheetTerms.filter((term) => visibleTermIds.includes(term.id))
    : allSheetTerms;

  return (
    <div className="w-full px-4 py-6 print:p-0 print:m-0">
      <style>{`
        /* ── Print ──────────────────────────────────────────── */
        @media print {
          body * { visibility: hidden; }
          #assessment-sheet, #assessment-sheet * { visibility: visible; }
          #assessment-sheet {
            position: absolute; left: 0; top: 0; width: 100%;
          }
          @page { size: portrait; margin: 10mm; }
        }

        /* ══════════════════════════════════════════════════════
           TOPIC HEADER CELLS
           Each <th> is a fixed-height flex container that anchors
           its child span to the BOTTOM so every label starts at
           the same baseline regardless of text length.
           ══════════════════════════════════════════════════════ */

        /* The <th> itself acts as the clipping + alignment box */
        th.topic-th {
          height: calc(var(--topic-header-height, 7.5rem) + 0.5rem);
          overflow: hidden;         /* hard clip — nothing escapes */
          padding: 0 !important;
          vertical-align: bottom;
          /* flex column so child spans stack to the bottom */
          display: table-cell;      /* keep table-cell for colgroup */
          position: relative;
        }

        /* Inner wrapper — absolutely fills the <th> and aligns child to bottom */
        th.topic-th .th-inner {
  position: absolute;
  inset: 0;
  overflow: hidden;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 0.35rem;
}

.rotate-header {
  display: block;
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 0.6rem;
  line-height: 1;
  text-align: left;
  max-height: calc(var(--topic-header-height, 7.5rem) - 0.75rem);
}

.rotate-header-bold {
  display: block;
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  white-space: nowrap;
  overflow: hidden;
  font-size: 0.6rem;
  font-weight: 700;
  line-height: 1;
  text-align: center;
  max-height: calc(var(--topic-header-height, 7.5rem) - 0.75rem);
}

        /* ── Table fills page width ─────────────────────────── */
        #assessment-table {
          width: 100%;
          table-layout: fixed;
          border-collapse: collapse;
        }
      `}</style>

      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="mb-6 flex justify-between items-center print:hidden">
        <div>
          <button
            onClick={() => navigateBackOr(navigate as any, resolvedBackPath)}
            className="mb-3 p-2 hover:bg-slate-100 rounded-full transition-colors inline-flex"
          >
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <h1 className="text-2xl font-bold text-slate-900">{subjectLabel} Assessment Sheet</h1>
        </div>
        <div className="flex gap-3">
          <ActionMenu
            label="Excel"
            icon={FileSpreadsheet}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
            items={[
              ...sheetTerms.map((term) => ({
                id: `excel-${term.name}`,
                label: term.name,
                icon: FileSpreadsheet,
                onClick: () => generateExcel(term),
              })),
              ...(sheetTerms.length > 1 ? [{
                id: 'excel-all',
                label: 'All Terms in One File',
                icon: FileSpreadsheet,
                onClick: () => generateExcel(),
              }] : []),
            ]}
          />
          <ActionMenu
            label="Print"
            icon={Printer}
            className="bg-slate-800 text-white hover:bg-slate-900"
            items={[
              ...sheetTerms.map((term) => ({
                id: `print-${term.name}`,
                label: term.name,
                icon: Printer,
                onClick: () => generatePDF(term, 'print'),
              })),
              ...(sheetTerms.length > 1 ? [{
                id: 'print-all',
                label: 'All Terms in One File',
                icon: Printer,
                onClick: () => generatePDF(undefined, 'print'),
              }] : []),
            ]}
          />
          <ActionMenu
            label="PDF"
            icon={Download}
            className="bg-blue-600 text-white hover:bg-blue-700"
            items={[
              ...sheetTerms.map((term) => ({
                id: `pdf-${term.name}`,
                label: term.name,
                icon: Download,
                onClick: () => generatePDF(term),
              })),
              ...(sheetTerms.length > 1 ? [{
                id: 'pdf-all',
                label: 'All Terms in One File',
                icon: Download,
                onClick: () => generatePDF(),
              }] : []),
            ]}
          />
        </div>
      </div>

      {/* ── Sheet preview ────────────────────────────────────────────────── */}
      <div className="space-y-8 print:space-y-0">
        {sheetTerms.map((term, termIdx) => {
          const termId = term.id;
          const termTopics = getTopicsForTerm(termId, term.assessments);
          const headerHeight = getTopicHeaderHeight(termTopics, standardWorkflow);

          return (
          <div
            key={term.name}
            className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto print:border-none print:shadow-none print:break-after-page"
          >
            <div
              id={termIdx === 0 ? "assessment-sheet" : undefined}
              className="p-6 bg-white print:p-0"
              style={{
                minWidth: standardWorkflow ? '760px' : '980px',
                ['--topic-header-height' as any]: `${headerHeight / 16}rem`
              }}
            >
              {/* School header */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 flex-shrink-0 overflow-hidden">
                    <img
                      src={LOGO_URL}
                      alt="School Logo"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="text-xs font-bold leading-5">
                    <p>Registered with Ministry Of Education</p>
                    <p>Reg. No 7826</p>
                  </div>
                </div>
                <div className="text-xs font-bold text-right leading-5">
                  <p>P O Box 3675, Ondangwa</p>
                  <p>+264 81 666 4074</p>
                  <p>+264 85 266 4074</p>
                  <p>circleofhopeacademy@yahoo.com</p>
                  <p>www.coha-academy.com</p>
                </div>
              </div>

              <hr className="border-black mb-3" />

              <div className="flex justify-between items-center mb-3">
                <h2 className="font-bold text-base uppercase tracking-widest">
                  Continuous Assessment - {term.name}
                </h2>
                <div className="flex gap-2 print:hidden">
                  <button
                    onClick={() => generateExcel(term)}
                    className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                    title="Download Term Excel"
                  >
                    <FileSpreadsheet size={16} />
                  </button>
                  <button
                    onClick={() => generatePDF(term)}
                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title="Download Term PDF"
                  >
                    <Download size={16} />
                  </button>
                </div>
              </div>

              <div className="text-xs font-semibold space-y-0.5 mb-3">
                <p>Teacher: <span className="font-normal underline underline-offset-4 px-2">{user?.name}</span></p>
                <p>Grade: <span className="font-normal underline underline-offset-4 px-2">{getGradeDisplayValue(className) || ''}</span></p>
                <p>Subject: <span className="font-normal underline underline-offset-4 px-2">{subjectLabel}</span></p>
              </div>

              {/* ── Assessment Table ──────────────────────────────────────────── */}
              <table className="w-full border-2 border-black text-xs table-fixed border-collapse">
                <colgroup>
                  <col style={{ width: '1.8rem' }} />
                  <col style={{ width: 'auto' }} />
                  {termTopics.map((_, i) => (
                    <col key={`tc-${i}`} style={{ width: standardWorkflow ? '1.9rem' : '2.35rem' }} />
                  ))}
                  <col style={{ width: standardWorkflow ? '2rem' : '2.25rem' }} />
                  <col style={{ width: standardWorkflow ? '2rem' : '2.25rem' }} />
                  <col style={{ width: standardWorkflow ? '2rem' : '2.25rem' }} />
                </colgroup>

                <thead>
                  <tr style={{ height: `calc(${headerHeight / 16}rem + 0.5rem)` }}>
                    <th className="topic-th border border-black">
                      <div className="th-inner">
                        <span className="rotate-header-bold">No</span>
                      </div>
                    </th>
                    <th className="border border-black p-1 align-bottom text-left font-bold text-xs">
                      Student Name
                    </th>
                    {termTopics.map((t, i) => (
                      <th key={`h-${i}`} className="topic-th border border-black">
                        <div className="th-inner">
                          {(() => {
                            const lines = getTopicHeaderLines(t, standardWorkflow ? 22 : 24);
                            return (
                              <span className="rotate-header">{lines[0]}</span>
                            );
                          })()}
                        </div>
                      </th>
                    ))}
                    <th className="topic-th border border-black">
                      <div className="th-inner">
                        <span className="rotate-header-bold">TOTAL</span>
                      </div>
                    </th>
                    <th className="topic-th border border-black">
                      <div className="th-inner">
                        <span className="rotate-header-bold">AVERAGE</span>
                      </div>
                    </th>
                    <th className="topic-th border border-black" style={{ borderRight: '2.5px solid #cc0000' }}>
                      <div className="th-inner">
                        <span className="rotate-header-bold">SYMBOL</span>
                      </div>
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {students.map((student, index) => {
                    const total = calculateStudentTotal(student.id, term.assessments);
                    const avg = calculateStudentAverage(student.id, term.assessments, termTopics);
                    const rowBg = index % 2 === 1 ? 'bg-slate-50' : 'bg-white';

                    return (
                      <tr key={student.id} className={rowBg}>
                        <td className="border border-black p-0.5 text-center font-mono">
                          {index + 1}
                        </td>
                        <td className="border border-black p-0.5 px-1 whitespace-nowrap font-sans">
                          {student.name}
                        </td>
                        {termTopics.map((topic, i) => (
                          <td key={`m-${i}`} className="border border-black p-0.5 text-center font-mono">
                            {getStudentMark(student.id, topic, term.assessments) ?? ''}
                          </td>
                        ))}
                        <td className="border border-black p-0.5 text-center font-mono font-bold">
                          {total ?? ''}
                        </td>
                        <td className="border border-black p-0.5 text-center font-mono font-bold">
                          {avg ?? ''}
                        </td>
                        <td className="border border-black p-0.5 text-center font-mono font-bold" style={{ borderRight: '2.5px solid #cc0000' }}>
                          <span className={getSymbol(avg) === 'U' ? 'text-red-700' : ''}>
                            {getSymbol(avg)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}
