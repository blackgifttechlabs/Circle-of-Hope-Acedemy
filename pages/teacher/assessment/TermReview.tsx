import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Download, FileSpreadsheet, Printer } from 'lucide-react';
import { getStudentsByAssignedClass, getTopicAssessments } from '../../../services/dataService';
import { Student, TopicAssessmentRecord } from '../../../types';
import { getTopicsForSubjectAndGrade } from '../../../utils/assessmentTopics';
import { getGradeDisplayValue } from '../../../utils/assessmentWorkflow';
import { getTopicHeaderHeight, getTopicHeaderLines, getTopicLabelParts } from '../../../utils/topicLabelFormat';
import { navigateBackOr } from '../../../utils/navigation';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const LOGO_URL = 'https://i.ibb.co/LzYXwYfX/logo.png';

async function urlToBase64(url: string): Promise<{ data: string; format: string }> {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const format = blob.type.includes('png') ? 'PNG' : 'JPEG';
      const base64 = result.split(',')[1];
      resolve({ data: base64, format });
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

const getSymbol = (average: number | null): string => {
  if (average === null) return '';
  if (average >= 80) return 'A';
  if (average >= 70) return 'B';
  if (average >= 60) return 'C';
  if (average >= 50) return 'D';
  if (average >= 40) return 'E';
  return 'U';
};

const MAX_TOPIC_CHARS = 22;

export default function TermReview({ user }: { user: any }) {
  const { subject, term } = useParams<{ subject: string, term: string }>();
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [assessments, setAssessments] = useState<TopicAssessmentRecord[]>([]);

  const sheetRef = useRef<HTMLDivElement>(null);

  let topics = getTopicsForSubjectAndGrade(subject || '', user?.assignedClass || '');
  if (topics.length === 0) {
    const uniqueTopics = new Set(assessments.map(a => a.topic));
    topics = Array.from(uniqueTopics);
  }

  useEffect(() => {
    if (user?.assignedClass && subject && term) {
      const termId = term.toLowerCase().replace(' ', '-');
      
      Promise.all([
        getStudentsByAssignedClass(user.assignedClass),
        getTopicAssessments(user.assignedClass, termId, subject)
      ]).then(([studentsData, assessmentsData]) => {
        const sorted = studentsData.sort((a: Student, b: Student) => a.name.localeCompare(b.name));
        setStudents(sorted);
        setAssessments(assessmentsData);
      });
    }
  }, [user, subject, term]);

  const getStudentMark = (studentId: string, topic: string) => {
    const record = assessments.find(a => a.studentId === studentId && a.topic === topic);
    return record ? record.mark : null;
  };

  const calculateStudentTotal = (studentId: string) => {
    const studentMarks = assessments.filter(a => a.studentId === studentId).map(a => a.mark);
    if (studentMarks.length === 0) return null;
    return studentMarks.reduce((a, b) => a + b, 0);
  };

  const calculateStudentAverage = (studentId: string) => {
    const total = calculateStudentTotal(studentId);
    if (total === null || topics.length === 0) return null;
    return Math.round((total / (topics.length * 10)) * 100);
  };

  const calculateTopicAverage = (topic: string) => {
    const topicMarks = assessments.filter(a => a.topic === topic).map(a => a.mark);
    if (topicMarks.length === 0) return null;
    const sum = topicMarks.reduce((a, b) => a + b, 0);
    return Math.round((sum / (topicMarks.length * 10)) * 100);
  };

  const generatePDF = async () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = 210;
    const marginL = 10;
    const marginR = 10;
    const usableW = pageW - marginL - marginR;

    let logoLoaded = false;
    try {
      const { data, format } = await urlToBase64(LOGO_URL);
      doc.addImage(data, format as any, marginL, 6, 18, 18);
      logoLoaded = true;
    } catch (e) {
      console.warn('Logo failed to load for PDF:', e);
    }

    const textStartX = logoLoaded ? marginL + 20 : marginL;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
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
    doc.setFont('helvetica', 'bold');
    doc.text('END OF TERM SUMMARY', pageW / 2, 34, { align: 'center' });

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Teacher: ${user?.name || ''}`, marginL, 40);
    doc.text(`Grade: ${getGradeDisplayValue(user?.assignedClass || '') || ''}`, marginL, 45);
    doc.text(`Subject: ${subject}`, marginL, 50);
    doc.text(`Term: ${term}`, marginL, 55);

    const termCols = topics.length + 3;
    const noW = 7;
    const markW = Math.max(4.9, Math.min(6.2, (usableW - noW - 36) / termCols));
    const summaryW = markW + 1;
    const topicMarkW = markW;
    const headerHeight = getTopicHeaderHeight(topics, true);
    const headerHeightMm = Math.max(28, Math.min(38, headerHeight * 0.23));

    const termBlockW = topics.length * topicMarkW + summaryW * 3;
    const nameW = usableW - noW - termBlockW;

    const colWidths: number[] = [
      noW,
      nameW,
      ...Array(topics.length).fill(topicMarkW),
      summaryW, summaryW, summaryW,
    ];

    const topicLabels = topics.map((topic) => getTopicLabelParts(topic, MAX_TOPIC_CHARS));
    const termSuffixes = ['TOTAL', 'AVERAGE', 'SYMBOL'];
    const allDataLabels = [...topicLabels.map((item) => item.display), ...termSuffixes];

    const head = [['No', 'Name', ...allDataLabels]];

    const body = students.map((student, index) => {
      const marks = topics.map((topic) => {
        const m = getStudentMark(student.id, topic);
        return m !== null ? String(m) : '';
      });
      const total = calculateStudentTotal(student.id);
      const avg = calculateStudentAverage(student.id);
      return [
        String(index + 1),
        student.name,
        ...marks,
        total !== null ? String(total) : '',
        avg !== null ? String(avg) : '',
        getSymbol(avg),
      ];
    });

    const symIdx = 2 + topics.length + 2;
    const summaryColIndices = new Set([2 + topics.length, 2 + topics.length + 1, 2 + topics.length + 2]);

    autoTable(doc, {
      startY: 59,
      head: head,
      body: body,
      theme: 'grid',
      tableWidth: usableW,
      styles: {
        fontSize: 6,
        cellPadding: { top: 0.8, bottom: 0.8, left: 0.5, right: 0.5 },
        halign: 'center',
        valign: 'middle',
        lineColor: [0, 0, 0],
        lineWidth: 0.2,
        font: 'courier',
        textColor: [0, 0, 0],
      },
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: 'normal',
        fontSize: 5,
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
        styles[1] = { cellWidth: nameW, halign: 'left', font: 'helvetica', fontSize: 7 };
        return styles;
      })(),
      bodyStyles: {
        minCellHeight: 5.5,
        textColor: [0, 0, 0],
        fontSize: 6.5,
      },
      willDrawCell: (data) => {
        if (data.row.section === 'head' && data.column.index >= 2) {
          data.cell.text = [];
        }
        if (data.row.section === 'body' && summaryColIndices.has(data.column.index)) {
          data.cell.text = [];
        }
      },
      didDrawCell: (data) => {
        const { x, y, width, height } = data.cell;

        if (data.row.section === 'head' && data.column.index >= 2) {
          const relIdx = data.column.index - 2;
          const isSummary = relIdx >= topics.length;

          doc.saveGraphicsState();
          doc.setFontSize(5);
          if (isSummary) {
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0, 0, 0);
            doc.text(termSuffixes[relIdx - topics.length], x + width / 2 + 1.2, y + height - 1.5, {
              angle: 90,
              align: 'left',
            });
          } else {
            const lines = getTopicHeaderLines(topics[relIdx], 22);
            doc.setFont('helvetica', 'normal');
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
            doc.setFontSize(6.5);
            const isSymbol = data.column.index === symIdx;
            if (isSymbol && val === 'U') {
              doc.setTextColor(200, 0, 0);
            } else {
              doc.setTextColor(0, 0, 0);
            }
            doc.setFont('helvetica', 'bold');
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
            doc.setFontSize(6.5);
            doc.setFont('courier', 'normal');
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

    doc.save(`${subject}_${term}_Summary.pdf`);
  };

  const generateExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Term Summary', {
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

    const termCols = topics.length + 3;
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
        c.font = { bold: true, size: 9 };
      }
      if (right) {
        sheet.mergeCells(`F${rowNum}:${lastLetter}${rowNum}`);
        const c = sheet.getCell(`F${rowNum}`);
        c.value = right;
        c.font = { bold: true, size: 9 };
        c.alignment = { horizontal: 'right' };
      }
    });

    sheet.mergeCells(`A7:${lastLetter}7`);
    const titleCell = sheet.getCell('A7');
    titleCell.value = 'END OF TERM SUMMARY';
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.font = { bold: true, size: 14 };
    sheet.getRow(7).height = 22;

    const infoRows: [string, string][] = [
      ['A9:D9', `Teacher: ${user?.name || ''}`],
      ['A10:D10', `Grade: ${getGradeDisplayValue(user?.assignedClass || '') || ''}`],
      ['A11:D11', `Subject: ${subject}`],
      ['A12:D12', `Term: ${term}`],
    ];
    infoRows.forEach(([range, val]) => {
      sheet.mergeCells(range);
      const c = sheet.getCell(range.split(':')[0]);
      c.value = val;
      c.font = { bold: true, size: 10 };
    });

    sheet.getColumn(1).width = 4.5;
    sheet.getColumn(2).width = 26;
    for (let i = 3; i <= totalCols; i++) {
      const relIdx = i - 3;
      const isSummary = relIdx >= topics.length;
      sheet.getColumn(i).width = isSummary ? 7 : 4.8;
    }

    const HDR_ROW = 14;
    sheet.getRow(HDR_ROW).height = getTopicHeaderHeight(topics, true);

    const hdrBaseStyle: Partial<ExcelJS.Style> = {
      alignment: { textRotation: 90, vertical: 'middle', horizontal: 'center', wrapText: true },
      border: thinBorder,
    };

    ['No', 'Name'].forEach((v, i) => {
      const c = sheet.getCell(HDR_ROW, i + 1);
      c.value = v;
      c.font = { bold: true, size: 9 };
      c.alignment = { horizontal: 'center', vertical: 'bottom', wrapText: true };
      c.border = thinBorder;
    });

    let col = 3;
    topics.forEach((topic) => {
      const lines = getTopicHeaderLines(topic, 22);
      const c = sheet.getCell(HDR_ROW, col++);
      c.value = lines[0];
      c.font = { size: 8 };
      Object.assign(c, { ...hdrBaseStyle });
      c.border = thinBorder;
    });

    ['TOTAL', 'AVERAGE', 'SYMBOL'].forEach((label, li) => {
      const isSymbol = li === 2;
      const c = sheet.getCell(HDR_ROW, col++);
      c.value = label;
      c.font = { bold: true, size: 8 };
      c.alignment = {
        textRotation: 90,
        vertical: 'bottom',
        horizontal: 'center',
        wrapText: false,
      };
      c.border = isSymbol ? symBorder : thinBorder;
    });

    const DATA_START = 15;

    students.forEach((student, index) => {
      const rowNum = DATA_START + index;
      const row = sheet.getRow(rowNum);
      row.height = 14;

      const fillColor = index % 2 === 1 ? 'FFF8F9FA' : 'FFFFFFFF';
      const applyFill = (c: ExcelJS.Cell) => {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
      };

      const noCell = row.getCell(1);
      noCell.value = index + 1;
      noCell.alignment = { horizontal: 'center', vertical: 'middle' };
      noCell.font = { size: 9 };
      noCell.border = thinBorder;
      applyFill(noCell);

      const nameCell = row.getCell(2);
      nameCell.value = student.name;
      nameCell.alignment = { horizontal: 'left', vertical: 'middle' };
      nameCell.font = { size: 9 };
      nameCell.border = thinBorder;
      applyFill(nameCell);

      let colIdx = 3;
      topics.forEach((topic) => {
        const mark = getStudentMark(student.id, topic);
        const c = row.getCell(colIdx++);
        c.value = mark !== null ? mark : '';
        c.alignment = { horizontal: 'center', vertical: 'middle' };
        c.font = { name: 'Courier New', size: 8 };
        c.border = thinBorder;
        applyFill(c);
      });

      const total = calculateStudentTotal(student.id);
      const avg = calculateStudentAverage(student.id);
      const sym = getSymbol(avg);

      const totalCell = row.getCell(colIdx++);
      totalCell.value = total !== null ? total : '';
      totalCell.alignment = { horizontal: 'center', vertical: 'middle' };
      totalCell.font = { bold: true, size: 9 };
      totalCell.border = thinBorder;
      applyFill(totalCell);

      const avgCell = row.getCell(colIdx++);
      avgCell.value = avg !== null ? avg : '';
      avgCell.alignment = { horizontal: 'center', vertical: 'middle' };
      avgCell.font = { bold: true, size: 9 };
      avgCell.border = thinBorder;
      applyFill(avgCell);

      const symCell = row.getCell(colIdx++);
      symCell.value = sym;
      symCell.alignment = { horizontal: 'center', vertical: 'middle' };
      symCell.font = {
        bold: true,
        size: 10,
        color: { argb: sym === 'U' ? 'FFCC0000' : 'FF000000' },
      };
      symCell.border = symBorder;
      applyFill(symCell);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    saveAs(blob, `${subject}_${term}_Summary.xlsx`);
  };

  return (
    <div className="w-full px-5 py-6 print:p-0 print:m-0">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #summary-sheet, #summary-sheet * { visibility: visible; }
          #summary-sheet {
            position: absolute; left: 0; top: 0; width: 100%;
          }
          @page { size: portrait; margin: 10mm; }
        }

        th.topic-th {
          height: calc(var(--topic-header-height, 7.5rem) + 0.5rem);
          overflow: hidden;
          padding: 0 !important;
          vertical-align: bottom;
          display: table-cell;
          position: relative;
        }

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

        #summary-table {
          width: 100%;
          table-layout: fixed;
          border-collapse: collapse;
        }
      `}</style>

      <div className="mb-6 flex justify-between items-center print:hidden">
        <div>
          <button 
            onClick={() => navigateBackOr(navigate as any, `/teacher/assess/${encodeURIComponent(subject || '')}`)}
            className="mb-4 p-2 hover:bg-slate-100 rounded-full transition-colors inline-flex"
          >
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <h1 className="text-2xl font-bold text-slate-900">Term Review</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">{subject} • {term}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={generateExcel}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm"
          >
            <FileSpreadsheet size={17} /> Excel
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors font-medium text-sm"
          >
            <Printer size={17} /> Print
          </button>
          <button
            onClick={generatePDF}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
          >
            <Download size={17} /> PDF
          </button>
        </div>
      </div>

      <hr className="border-slate-200 mb-8 print:hidden" />

      {topics.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl print:hidden">
          <h2 className="text-xl font-bold text-slate-700 mb-2">Topics Coming Soon</h2>
          <p className="text-slate-500">Topics for {subject} in {user?.assignedClass} are not yet available. They will be added in the future.</p>
        </div>
      ) : (
        (() => {
          const headerHeight = getTopicHeaderHeight(topics, true);
          return (
        <div 
          id="summary-sheet"
          className="bg-white rounded-2xl border border-slate-200 overflow-x-auto shadow-sm mb-8 print:border-none print:shadow-none print:rounded-none"
          style={{ ['--topic-header-height' as any]: `${headerHeight / 16}rem` }}
        >
          <div className="hidden print:block mb-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-16 h-16 flex-shrink-0 overflow-hidden">
                <img src={LOGO_URL} alt="School Logo" className="w-full h-full object-contain" />
              </div>
              <div className="text-xs font-bold leading-5">
                <p>Registered with Ministry Of Education</p>
                <p>Reg. No 7826</p>
              </div>
            </div>
            <h2 className="text-lg font-bold text-center mb-2">END OF TERM SUMMARY</h2>
            <div className="text-sm">
              <p><strong>Teacher:</strong> {user?.name || ''}</p>
              <p><strong>Grade:</strong> {getGradeDisplayValue(user?.assignedClass || '') || ''}</p>
              <p><strong>Subject:</strong> {subject}</p>
              <p><strong>Term:</strong> {term}</p>
            </div>
          </div>

          <table id="summary-table" className="w-full text-left border-collapse min-w-max">
            <thead>
              <tr className="bg-slate-50">
                <th className="border border-black p-2 text-xs font-bold text-slate-700 uppercase tracking-wider text-center w-10">
                  No
                </th>
                <th className="border border-black p-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Learner Name
                </th>
                {topics.map((topic, i) => (
                  <th key={topic} className="border border-black topic-th w-8">
                    <div className="th-inner">
                      <span className="rotate-header" title={topic}>
                        {getTopicHeaderLines(topic, 22)[0]}
                      </span>
                    </div>
                  </th>
                ))}
                <th className="border border-black topic-th w-10 bg-blue-50/50">
                  <div className="th-inner">
                    <span className="rotate-header-bold">TOTAL</span>
                  </div>
                </th>
                <th className="border border-black topic-th w-10 bg-blue-50/50">
                  <div className="th-inner">
                    <span className="rotate-header-bold">AVERAGE</span>
                  </div>
                </th>
                <th className="border border-black topic-th w-10 bg-blue-50/50 border-r-2 border-r-red-600">
                  <div className="th-inner">
                    <span className="rotate-header-bold">SYMBOL</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {students.map((student, index) => {
                const total = calculateStudentTotal(student.id);
                const avg = calculateStudentAverage(student.id);
                const sym = getSymbol(avg);
                return (
                  <tr key={student.id} className="even:bg-slate-50">
                    <td className="border border-black p-1 text-center font-mono text-sm">
                      {index + 1}
                    </td>
                    <td className="border border-black p-1 px-2 font-sans text-sm whitespace-nowrap">
                      {student.name}
                    </td>
                    {topics.map(topic => {
                      const mark = getStudentMark(student.id, topic);
                      return (
                        <td key={topic} className="border border-black p-1 text-center font-mono text-sm">
                          {mark !== null ? mark : ''}
                        </td>
                      );
                    })}
                    <td className="border border-black p-1 text-center font-bold text-sm bg-blue-50/30">
                      {total !== null ? total : ''}
                    </td>
                    <td className="border border-black p-1 text-center font-bold text-sm bg-blue-50/30">
                      {avg !== null ? avg : ''}
                    </td>
                    <td className={`border border-black border-r-2 border-r-red-600 p-1 text-center font-bold text-sm bg-blue-50/30 ${sym === 'U' ? 'text-red-600' : ''}`}>
                      {sym}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="print:hidden">
              <tr className="bg-slate-50">
                <td colSpan={2} className="border border-black p-2 font-bold text-slate-700 text-right">
                  Topic Average
                </td>
                {topics.map(topic => {
                  const tAvg = calculateTopicAverage(topic);
                  return (
                    <td key={topic} className="border border-black p-2 text-center font-bold text-slate-700">
                      {tAvg !== null ? `${tAvg}%` : '-'}
                    </td>
                  );
                })}
                <td colSpan={3} className="border border-black p-2 text-center font-bold text-slate-700 bg-blue-50/50">
                  -
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
          );
        })()
      )}
    </div>
  );
}
