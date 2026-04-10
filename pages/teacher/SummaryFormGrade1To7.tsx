import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, FileSpreadsheet, Printer } from 'lucide-react';
import { getCustomTopicEntries, getStudentsForTeacherByClass, getTopicAssessments, getSystemSettings, getTeacherById, getTopicOverrides } from '../../services/dataService';
import { Student, TopicAssessmentRecord, SystemSettings } from '../../types';
import { getTopicsForSubjectAndGrade } from '../../utils/assessmentTopics';
import { getNonPromotionalSubjects, getPromotionalSubjects } from '../../utils/subjects';
import { getGradeDisplayValue } from '../../utils/assessmentWorkflow';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Loader } from '../../components/ui/Loader';
import { ActionMenu } from '../../components/ui/ActionMenu';
import { getSelectedTeachingClass, withTeachingClass } from '../../utils/teacherClassSelection';

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

const getSymbolColorClass = (symbol: string) => {
  if (symbol === 'A') return 'text-green-600';
  if (symbol === 'B') return 'text-blue-600';
  if (symbol === 'C') return 'text-amber-600';
  if (symbol === 'D') return 'text-orange-600';
  if (symbol === 'E') return 'text-slate-600';
  return 'text-red-600';
};

export const SummaryFormGrade1To7 = ({ user }: { user: any }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedClass = getSelectedTeachingClass(user, location.search);
  const [students, setStudents] = useState<Student[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [selectedTerm, setSelectedTerm] = useState<string>('');
  const [loading, setLoading] = useState(true);
  
  // subject -> TopicAssessmentRecord[]
  const [assessments, setAssessments] = useState<Record<string, TopicAssessmentRecord[]>>({});
  const [subjectTopicCounts, setSubjectTopicCounts] = useState<Record<string, number>>({});

  const promotionalSubjects = getPromotionalSubjects(selectedClass || '');
  const nonPromotionalSubjects = getNonPromotionalSubjects(selectedClass || '');
  const allSubjects = [...promotionalSubjects, ...nonPromotionalSubjects];

  useEffect(() => {
    const fetchData = async () => {
      if (selectedClass) {
        const [studentsData, settingsData] = await Promise.all([
          getStudentsForTeacherByClass(user.id, selectedClass),
          getSystemSettings()
        ]);
        
        const enrolled = studentsData.filter(s => s.studentStatus === 'ENROLLED');
        const sorted = enrolled.sort((a, b) => a.name.localeCompare(b.name));
        setStudents(sorted);
        setSettings(settingsData);

        if (settingsData) {
          let termId = settingsData.activeTermId || 'term-1';
          if (user?.id) {
            const teacher = await getTeacherById(user.id);
            if (teacher && teacher.activeTermId) {
              termId = teacher.activeTermId;
            }
          }
          const validTermIds = ['term-1', 'term-2', 'term-3'];
          if (!validTermIds.includes(termId)) termId = 'term-1';
          
          setSelectedTerm(termId);
          await loadAssessments(termId, selectedClass);
        }
      }
      setLoading(false);
    };
    fetchData();
  }, [selectedClass, user]);

  const fetchAssessmentSnapshot = async (termId: string, grade: string) => {
    const newAssessments: Record<string, TopicAssessmentRecord[]> = {};
    const newTopicCounts: Record<string, number> = {};
    await Promise.all(
      allSubjects.map(async (subject) => {
        const [records, customTopics, overrides] = await Promise.all([
          getTopicAssessments(grade, termId, subject),
          getCustomTopicEntries(grade, termId, subject),
          getTopicOverrides(grade, termId, subject),
        ]);
        newAssessments[subject] = records;

        const baseTopics = getTopicsForSubjectAndGrade(subject, selectedClass || '');
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

        newTopicCounts[subject] = adjustedTopics.length;
      })
    );
    return { newAssessments, newTopicCounts };
  };

  const loadAssessments = async (termId: string, grade: string) => {
    const { newAssessments, newTopicCounts } = await fetchAssessmentSnapshot(termId, grade);
    setAssessments(newAssessments);
    setSubjectTopicCounts(newTopicCounts);
  };

  const handleTermChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const termId = e.target.value;
    setSelectedTerm(termId);
    if (selectedClass) {
      setLoading(true);
      await loadAssessments(termId, selectedClass);
      setLoading(false);
    }
  };

  const calculateSubjectTotal = (studentId: string, subject: string) => {
    return calculateSubjectTotalFrom(studentId, subject, assessments);
  };

  const calculateSubjectTotalFrom = (
    studentId: string,
    subject: string,
    assessmentMap: Record<string, TopicAssessmentRecord[]>
  ) => {
    const records = assessmentMap[subject] || [];
    const studentMarks = records.filter(a => a.studentId === studentId).map(a => a.mark);
    if (studentMarks.length === 0) return null;
    return studentMarks.reduce((a, b) => a + b, 0);
  };

  const calculateSubjectAverage = (studentId: string, subject: string) => {
    return calculateSubjectAverageFrom(studentId, subject, assessments, subjectTopicCounts);
  };

  const calculateSubjectAverageFrom = (
    studentId: string,
    subject: string,
    assessmentMap: Record<string, TopicAssessmentRecord[]>,
    topicCounts: Record<string, number>
  ) => {
    const total = calculateSubjectTotalFrom(studentId, subject, assessmentMap);
    if (total === null) return null;
    let topicCount = topicCounts[subject] || 0;
    if (topicCount === 0) {
      const records = assessmentMap[subject] || [];
      const studentRecords = records.filter(a => a.studentId === studentId);
      const uniqueTopics = new Set(studentRecords.map(a => a.topic));
      topicCount = uniqueTopics.size;
    }
    if (topicCount === 0) return null;
    return Math.round((total / (topicCount * 10)) * 100);
  };

  const calculateOverallTotal = (studentId: string) => {
    return calculateOverallTotalFrom(studentId, assessments);
  };

  const calculateOverallTotalFrom = (
    studentId: string,
    assessmentMap: Record<string, TopicAssessmentRecord[]>
  ) => {
    let overallTotal = 0;
    let count = 0;
    allSubjects.forEach(subject => {
      const total = calculateSubjectTotalFrom(studentId, subject, assessmentMap);
      if (total !== null) {
        overallTotal += total;
        count++;
      }
    });
    if (count === 0) return null;
    return overallTotal;
  };

  const calculateOverallAverage = (studentId: string) => {
    return calculateOverallAverageFrom(studentId, assessments, subjectTopicCounts);
  };

  const calculateOverallAverageFrom = (
    studentId: string,
    assessmentMap: Record<string, TopicAssessmentRecord[]>,
    topicCounts: Record<string, number>
  ) => {
    let totalAvg = 0;
    let count = 0;
    allSubjects.forEach(subject => {
      const avg = calculateSubjectAverageFrom(studentId, subject, assessmentMap, topicCounts);
      if (avg !== null) {
        totalAvg += avg;
        count++;
      }
    });
    if (count === 0) return null;
    return Math.round(totalAvg / count);
  };

  const generatePDF = async (termIds: string[], mode: 'download' | 'print' = 'download') => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = 297;
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

    for (const [termIndex, termId] of termIds.entries()) {
      if (termIndex > 0) doc.addPage();
      const termName = settings?.schoolCalendars?.find(t => t.id === termId)?.termName || 'Term 1';
      const snapshot = termId === selectedTerm
        ? { newAssessments: assessments, newTopicCounts: subjectTopicCounts }
        : await fetchAssessmentSnapshot(termId, selectedClass);

      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.4);
      doc.line(marginL, 28, pageW - marginR, 28);

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`SUMMARY SHEET - ${termName.toUpperCase()}`, pageW / 2, 34, { align: 'center' });

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`Teacher: ${user?.name || ''}`, marginL, 40);
      doc.text(`Grade: ${getGradeDisplayValue(selectedClass || '') || ''}`, marginL, 45);

      const noW = 7;
      const nameW = 45;
      const subjectCols = allSubjects.length;
      const colW = (usableW - noW - nameW) / (subjectCols * 3);

      const colWidths = [noW, nameW];
      const head1: any[] = [{ content: 'No', rowSpan: 2 }, { content: 'Name', rowSpan: 2 }];
      const head2: any[] = [];

      allSubjects.forEach(sub => {
        head1.push({ content: sub, colSpan: 3, styles: { halign: 'center' } });
        head2.push('TOT', 'AVG', 'SYM');
        colWidths.push(colW, colW, colW);
      });

      const body = students.map((student, index) => {
        const row = [String(index + 1), student.name];
        allSubjects.forEach(sub => {
          const tot = calculateSubjectTotalFrom(student.id, sub, snapshot.newAssessments);
          const avg = calculateSubjectAverageFrom(student.id, sub, snapshot.newAssessments, snapshot.newTopicCounts);
          row.push(tot !== null ? String(tot) : '');
          row.push(avg !== null ? String(avg) : '');
          row.push(getSymbol(avg));
        });
        return row;
      });

      autoTable(doc, {
      startY: 50,
      head: [head1, head2],
      body: body,
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
        1: { cellWidth: nameW, halign: 'left', font: 'helvetica' },
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
          const val = data.cell.raw;
          if (['A', 'B', 'C', 'D', 'E', 'U'].includes(String(val))) {
            const color =
              val === 'A' ? [22, 163, 74] :
              val === 'B' ? [37, 99, 235] :
              val === 'C' ? [217, 119, 6] :
              val === 'D' ? [234, 88, 12] :
              val === 'E' ? [71, 85, 105] :
              [200, 0, 0];
            doc.setTextColor(color[0], color[1], color[2]);
            doc.setFont('helvetica', 'bold');
            doc.text(String(val), data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2 + 1, { align: 'center' });
          }
        }
      },
      margin: { left: marginL, right: marginR },
      });

      const overallHead = [['No', 'Name', 'TOTAL', 'AVERAGE', 'SYMBOL']];
      const overallBody = students.map((student, index) => {
        const overallTot = calculateOverallTotalFrom(student.id, snapshot.newAssessments);
        const overallAvg = calculateOverallAverageFrom(student.id, snapshot.newAssessments, snapshot.newTopicCounts);
        return [
          String(index + 1),
          student.name,
          overallTot !== null ? String(overallTot) : '',
          overallAvg !== null ? String(overallAvg) : '',
          getSymbol(overallAvg),
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
        if (data.row.section === 'body' && data.column.index === 4) {
          const val = String(data.cell.raw || '');
          if (val) {
            const color =
              val === 'A' ? [22, 163, 74] :
              val === 'B' ? [37, 99, 235] :
              val === 'C' ? [217, 119, 6] :
              val === 'D' ? [234, 88, 12] :
              val === 'E' ? [71, 85, 105] :
              [200, 0, 0];
            doc.setTextColor(color[0], color[1], color[2]);
            doc.setFont('helvetica', 'bold');
            doc.text(val, data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2 + 1, { align: 'center' });
          }
        }
      },
      margin: { left: marginL, right: marginR },
      });
    }

    if (mode === 'print') {
      doc.autoPrint();
      window.open(doc.output('bloburl'), '_blank');
    } else {
      doc.save(termIds.length === 1
        ? `Summary_Sheet_${selectedClass}_${settings?.schoolCalendars?.find(t => t.id === termIds[0])?.termName || 'Term_1'}.pdf`
        : `Summary_Sheet_${selectedClass}_All_Terms.pdf`);
    }
  };

  const generateExcel = async (termIds: string[]) => {
    const workbook = new ExcelJS.Workbook();
    for (const termId of termIds) {
      const termName = settings?.schoolCalendars?.find(t => t.id === termId)?.termName || 'Term 1';
      const snapshot = termId === selectedTerm
        ? { newAssessments: assessments, newTopicCounts: subjectTopicCounts }
        : await fetchAssessmentSnapshot(termId, selectedClass);
      const sheet = workbook.addWorksheet(termName, {
        pageSetup: { orientation: 'landscape', fitToPage: true }
      });

      sheet.mergeCells('A1:D1');
      sheet.getCell('A1').value = `SUMMARY SHEET - ${termName.toUpperCase()}`;
      sheet.getCell('A1').font = { bold: true, size: 14 };

      sheet.mergeCells('A3:C3');
      sheet.getCell('A3').value = `Teacher: ${user?.name || ''}`;
      sheet.mergeCells('A4:C4');
      sheet.getCell('A4').value = `Grade: ${getGradeDisplayValue(selectedClass || '') || ''}`;

      const headerRow1 = sheet.getRow(6);
      const headerRow2 = sheet.getRow(7);
      headerRow1.getCell(1).value = 'No';
      headerRow1.getCell(2).value = 'Name';
      sheet.mergeCells('A6:A7');
      sheet.mergeCells('B6:B7');

      let colIdx = 3;
      allSubjects.forEach(sub => {
        sheet.mergeCells(6, colIdx, 6, colIdx + 2);
        headerRow1.getCell(colIdx).value = sub;
        headerRow1.getCell(colIdx).alignment = { horizontal: 'center' };
        headerRow1.getCell(colIdx).font = { bold: true };
        headerRow2.getCell(colIdx).value = 'TOT';
        headerRow2.getCell(colIdx + 1).value = 'AVG';
        headerRow2.getCell(colIdx + 2).value = 'SYM';
        colIdx += 3;
      });

      sheet.getColumn(1).width = 5;
      sheet.getColumn(2).width = 25;

      students.forEach((student, index) => {
        const row = sheet.addRow([index + 1, student.name]);
        let rCol = 3;
        allSubjects.forEach(sub => {
          const tot = calculateSubjectTotalFrom(student.id, sub, snapshot.newAssessments);
          const avg = calculateSubjectAverageFrom(student.id, sub, snapshot.newAssessments, snapshot.newTopicCounts);
          row.getCell(rCol++).value = tot !== null ? tot : '';
          row.getCell(rCol++).value = avg !== null ? avg : '';
          const sym = getSymbol(avg);
          const symCell = row.getCell(rCol++);
          symCell.value = sym;
          const color = sym === 'A' ? 'FF16A34A' : sym === 'B' ? 'FF2563EB' : sym === 'C' ? 'FFD97706' : sym === 'D' ? 'FFEA580C' : sym === 'E' ? 'FF475569' : 'FFCC0000';
          symCell.font = { color: { argb: color }, bold: true };
        });
      });

      const overallStartRow = students.length + 10;
      sheet.getCell(`A${overallStartRow}`).value = 'OVERALL';
      sheet.getCell(`A${overallStartRow}`).font = { bold: true, size: 12 };
      sheet.getRow(overallStartRow + 1).values = ['No', 'Name', 'TOT', 'AVG', 'SYM'];
      students.forEach((student, index) => {
        const row = sheet.getRow(overallStartRow + 2 + index);
        const overallTot = calculateOverallTotalFrom(student.id, snapshot.newAssessments);
        const overallAvg = calculateOverallAverageFrom(student.id, snapshot.newAssessments, snapshot.newTopicCounts);
        const sym = getSymbol(overallAvg);
        row.values = [index + 1, student.name, overallTot !== null ? overallTot : '', overallAvg !== null ? overallAvg : '', sym];
        const color = sym === 'A' ? 'FF16A34A' : sym === 'B' ? 'FF2563EB' : sym === 'C' ? 'FFD97706' : sym === 'D' ? 'FFEA580C' : sym === 'E' ? 'FF475569' : 'FFCC0000';
        row.getCell(5).font = { color: { argb: color }, bold: true };
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, termIds.length === 1
      ? `Summary_Sheet_${selectedClass}_${settings?.schoolCalendars?.find(t => t.id === termIds[0])?.termName || 'Term_1'}.xlsx`
      : `Summary_Sheet_${selectedClass}_All_Terms.xlsx`);
  };

  if (loading) return <Loader />;

  const availableTerms = (settings?.schoolCalendars || []).filter((term) => ['term-1', 'term-2', 'term-3'].includes(term.id));

  return (
    <div className="p-4 sm:p-8 max-w-[1600px] mx-auto">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button 
            onClick={() => navigate(withTeachingClass('/teacher/classes', selectedClass))}
            className="flex items-center text-gray-500 hover:text-blue-900 transition-colors mb-2 text-sm font-bold uppercase tracking-widest"
          >
            <ArrowLeft size={16} className="mr-2" /> Back to My Class
          </button>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Summary Form</h1>
          <p className="text-gray-500 mt-1">End of term summary for all subjects</p>
        </div>
        
        <div className="flex items-center gap-4">
          <select
            value={selectedTerm}
            onChange={handleTermChange}
            className="p-2 border border-gray-200 rounded-lg text-sm font-bold text-gray-700 bg-white"
          >
            {settings?.schoolCalendars?.map(term => (
              <option key={term.id} value={term.id}>{term.termName}</option>
            ))}
          </select>
          <ActionMenu
            label="Excel"
            icon={FileSpreadsheet}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
            items={[
              ...availableTerms.map((term) => ({
                id: `excel-${term.id}`,
                label: term.termName,
                icon: FileSpreadsheet,
                onClick: () => generateExcel([term.id]),
              })),
              {
                id: 'excel-all',
                label: 'All Terms in One File',
                icon: FileSpreadsheet,
                onClick: () => generateExcel(availableTerms.map((term) => term.id)),
              },
            ]}
          />
          <ActionMenu
            label="PDF"
            icon={Download}
            className="bg-blue-600 text-white hover:bg-blue-700"
            items={[
              ...availableTerms.map((term) => ({
                id: `pdf-${term.id}`,
                label: term.termName,
                icon: Download,
                onClick: () => generatePDF([term.id]),
              })),
              {
                id: 'pdf-all',
                label: 'All Terms in One File',
                icon: Download,
                onClick: () => generatePDF(availableTerms.map((term) => term.id)),
              },
            ]}
          />
          <ActionMenu
            label="Print"
            icon={Printer}
            className="bg-slate-800 text-white hover:bg-slate-900"
            items={[
              ...availableTerms.map((term) => ({
                id: `print-${term.id}`,
                label: term.termName,
                icon: Printer,
                onClick: () => generatePDF([term.id], 'print'),
              })),
              {
                id: 'print-all',
                label: 'All Terms in One File',
                icon: Printer,
                onClick: () => generatePDF(availableTerms.map((term) => term.id), 'print'),
              },
            ]}
          />
        </div>
      </div>

      <div className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th rowSpan={2} className="p-3 border-b border-r border-gray-200 bg-gray-50 text-xs font-black text-gray-500 uppercase tracking-widest">No</th>
                <th rowSpan={2} className="p-3 border-b border-r border-gray-200 bg-gray-50 text-xs font-black text-gray-500 uppercase tracking-widest min-w-[200px]">Learner Name</th>
                {allSubjects.map(sub => (
                  <th key={sub} colSpan={3} className="p-3 border-b border-r border-gray-200 bg-gray-50 text-xs font-black text-gray-700 uppercase tracking-widest text-center">{sub}</th>
                ))}
              </tr>
              <tr>
                {allSubjects.map(sub => (
                  <React.Fragment key={sub + '-cols'}>
                    <th className="p-2 border-b border-r border-gray-200 bg-gray-50 text-[10px] font-bold text-gray-500 text-center">TOT</th>
                    <th className="p-2 border-b border-r border-gray-200 bg-gray-50 text-[10px] font-bold text-gray-500 text-center">AVG</th>
                    <th className="p-2 border-b border-r border-gray-200 bg-gray-50 text-[10px] font-bold text-gray-500 text-center">SYM</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map((student, index) => {
                return (
                  <tr key={student.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="p-3 border-b border-r border-gray-200 text-sm text-gray-500 text-center">{index + 1}</td>
                    <td className="p-3 border-b border-r border-gray-200 text-sm font-bold text-gray-900">{student.name}</td>
                    {allSubjects.map(sub => {
                      const tot = calculateSubjectTotal(student.id, sub);
                      const avg = calculateSubjectAverage(student.id, sub);
                      const sym = getSymbol(avg);
                      return (
                        <React.Fragment key={sub + '-' + student.id}>
                          <td className="p-2 border-b border-r border-gray-200 text-center text-sm font-mono">{tot !== null ? tot : '-'}</td>
                          <td className="p-2 border-b border-r border-gray-200 text-center text-sm font-mono">{avg !== null ? avg : '-'}</td>
                          <td className={`p-2 border-b border-r border-gray-200 text-center text-sm font-bold ${getSymbolColorClass(sym)}`}>{sym}</td>
                        </React.Fragment>
                      );
                    })}
                  </tr>
                );
              })}
              {students.length === 0 && (
                <tr>
                  <td colSpan={100} className="p-8 text-center text-gray-500 italic">
                    No enrolled students found in this class.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 text-xs font-black text-gray-700 uppercase tracking-widest">
          Overall
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th className="p-3 border-b border-r border-gray-200 bg-gray-50 text-xs font-black text-gray-500 uppercase tracking-widest">No</th>
                <th className="p-3 border-b border-r border-gray-200 bg-gray-50 text-xs font-black text-gray-500 uppercase tracking-widest min-w-[200px]">Learner Name</th>
                <th className="p-3 border-b border-r border-gray-200 bg-gray-50 text-xs font-black text-gray-500 uppercase tracking-widest text-center">TOT</th>
                <th className="p-3 border-b border-r border-gray-200 bg-gray-50 text-xs font-black text-gray-500 uppercase tracking-widest text-center">AVG</th>
                <th className="p-3 border-b border-gray-200 bg-gray-50 text-xs font-black text-gray-500 uppercase tracking-widest text-center">SYM</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student, index) => {
                const overallTot = calculateOverallTotal(student.id);
                const overallAvg = calculateOverallAverage(student.id);
                const overallSym = getSymbol(overallAvg);
                return (
                  <tr key={`overall-${student.id}`} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="p-3 border-b border-r border-gray-200 text-sm text-gray-500 text-center">{index + 1}</td>
                    <td className="p-3 border-b border-r border-gray-200 text-sm font-bold text-gray-900">{student.name}</td>
                    <td className="p-2 border-b border-r border-gray-200 text-center text-sm font-mono">{overallTot !== null ? overallTot : '-'}</td>
                    <td className="p-2 border-b border-r border-gray-200 text-center text-sm font-mono">{overallAvg !== null ? overallAvg : '-'}</td>
                    <td className={`p-2 border-b border-gray-200 text-center text-sm font-bold ${getSymbolColorClass(overallSym)}`}>{overallSym}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
