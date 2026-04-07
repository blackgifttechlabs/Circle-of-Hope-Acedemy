import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStudentsByAssignedClass, getSystemSettings, getAssessmentRecordsForClass, getTeacherById } from '../../services/dataService';
import { Student, TermAssessmentRecord, SystemSettings, PRE_PRIMARY_AREAS } from '../../types';
import { Loader } from '../../components/ui/Loader';
import { ArrowLeft, Download, FileSpreadsheet, Printer } from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { ActionMenu } from '../../components/ui/ActionMenu';

import { generateSummaryReportPDF, generateSummaryReportPDFBundle } from '../../utils/pdfGenerator';
import { getAssessmentRecordKey, getGradeDisplayValue } from '../../utils/assessmentWorkflow';

interface SummaryFormPageProps {
  user: any;
}

export const SummaryFormPage: React.FC<SummaryFormPageProps> = ({ user }) => {
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [records, setRecords] = useState<Record<string, TermAssessmentRecord>>({});
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTerm, setSelectedTerm] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      if (user?.assignedClass) {
        const [studentsData, settingsData] = await Promise.all([
          getStudentsByAssignedClass(user.assignedClass),
          getSystemSettings()
        ]);

        const enrolledStudents = studentsData.filter(s => s.studentStatus === 'ENROLLED');
        setStudents(enrolledStudents);
        setSettings(settingsData);

        if (settingsData) {
          let termId = settingsData.activeTermId || 'term-1';
          if (user?.id) {
            const teacher = await getTeacherById(user.id);
            if (teacher && teacher.activeTermId) {
              termId = teacher.activeTermId;
            }
          }
          
          // Ensure termId is valid (one of the 3 terms)
          const validTermIds = ['term-1', 'term-2', 'term-3'];
          if (!validTermIds.includes(termId)) {
            termId = 'term-1';
          }
          
          setSelectedTerm(termId);
          await loadRecords(termId, enrolledStudents);
        }
      }
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const fetchRecordsSnapshot = async (termId: string, studentsList: Student[]) => {
    if (studentsList.length === 0) return {};
    const grade = getAssessmentRecordKey(studentsList[0]);
    const studentIds = studentsList.map(s => s.id);
    const classRecords = await getAssessmentRecordsForClass(grade, termId, studentIds);
    const recordsMap: Record<string, TermAssessmentRecord> = {};
    classRecords.forEach(r => {
      recordsMap[r.studentId] = r;
    });
    return recordsMap;
  };

  const loadRecords = async (termId: string, studentsList: Student[]) => {
    const recordsMap = await fetchRecordsSnapshot(termId, studentsList);
    setRecords(recordsMap);
    return recordsMap;
  };

  const handleTermChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const termId = e.target.value;
    setSelectedTerm(termId);
    if (user?.assignedClass) {
      setLoading(true);
      await loadRecords(termId, students);
      setLoading(false);
    }
  };

  const availableTerms = (settings?.schoolCalendars || []).filter((term) => ['term-1', 'term-2', 'term-3'].includes(term.id));

  const buildSheet = (
    workbook: ExcelJS.Workbook,
    sheetName: string,
    termName: string,
    termRecords: Record<string, TermAssessmentRecord>
  ) => {
    const sheet = workbook.addWorksheet(sheetName, {
      pageSetup: { orientation: 'landscape', fitToPage: true }
    });

    sheet.mergeCells('A1:D1');
    sheet.getCell('A1').value = `SUMMARY SHEET - ${termName.toUpperCase()}`;
    sheet.getCell('A1').font = { bold: true, size: 14 };

    sheet.mergeCells('A3:C3');
    sheet.getCell('A3').value = `Teacher: ${user?.name || ''}`;
    sheet.mergeCells('A4:C4');
    sheet.getCell('A4').value = `Grade: ${getGradeDisplayValue(user?.assignedClass || '') || ''}`;

    let currentCol = 2;
    PRE_PRIMARY_AREAS.forEach((area) => {
      const startCol = currentCol;
      const endCol = currentCol + area.components.length - 1;
      sheet.mergeCells(6, startCol, 6, endCol);
      const cell = sheet.getCell(6, startCol);
      cell.value = area.name;
      cell.font = { bold: true };
      cell.alignment = { horizontal: 'center' };

      area.components.forEach((component, index) => {
        const componentCell = sheet.getCell(7, currentCol + index);
        componentCell.value = component.name;
        componentCell.font = { bold: true, size: 10 };
        componentCell.alignment = {
          textRotation: 90,
          vertical: 'middle',
          horizontal: 'center',
          wrapText: true,
        };
      });
      currentCol = endCol + 1;
    });

    sheet.getColumn(1).width = 25;
    for (let i = 2; i < currentCol; i++) {
      sheet.getColumn(i).width = 6;
    }
    sheet.getRow(7).height = 110;

    students.forEach((student) => {
      const row = sheet.addRow([student.name]);
      let col = 2;
      PRE_PRIMARY_AREAS.forEach((area) => {
        area.components.forEach((component) => {
          row.getCell(col).value = termRecords[student.id]?.ratings?.[component.id] || '';
          row.getCell(col).alignment = { horizontal: 'center' };
          col += 1;
        });
      });
    });
  };

  const generateExcel = async (termIds: string[]) => {
    const workbook = new ExcelJS.Workbook();
    for (const termId of termIds) {
      const termName = settings?.schoolCalendars?.find(t => t.id === termId)?.termName || 'Term 1';
      const termRecords = termId === selectedTerm ? records : await fetchRecordsSnapshot(termId, students);
      buildSheet(workbook, termName, termName, termRecords);
    }

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(
      new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      termIds.length === 1
        ? `Summary_Sheet_${settings?.schoolCalendars?.find(t => t.id === termIds[0])?.termName || 'Term_1'}.xlsx`
        : 'Summary_Sheet_All_Terms.xlsx'
    );
  };

  const generatePdfBundle = async (termIds: string[], mode: 'download' | 'print') => {
    const bundle = await Promise.all(termIds.map(async (termId) => ({
      termId,
      termName: settings?.schoolCalendars?.find(t => t.id === termId)?.termName || 'Term 1',
      records: termId === selectedTerm ? records : await fetchRecordsSnapshot(termId, students),
    })));

    if (bundle.length === 1) {
      await generateSummaryReportPDF(
        students,
        bundle[0].records,
        bundle[0].termId,
        bundle[0].termName,
        user.name || 'Teacher',
        user?.assignedClass || '',
        'Circle of Hope Academy',
        mode
      );
      return;
    }

    await generateSummaryReportPDFBundle(
      students,
      bundle,
      user.name || 'Teacher',
      user?.assignedClass || '',
      'Circle of Hope Academy',
      mode
    );
  };

  if (loading) return <Loader />;

  return (
    <div className="p-4 sm:p-8 max-w-[1600px] mx-auto">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button 
            onClick={() => navigate('/teacher/classes')}
            className="flex items-center text-gray-500 hover:text-coha-900 transition-colors mb-2 text-sm font-bold uppercase tracking-widest"
          >
            <ArrowLeft size={16} className="mr-2" /> Back to My Class
          </button>
          <h1 className="text-3xl font-black text-coha-900 tracking-tight">Summary Form</h1>
          <p className="text-gray-500 mt-1">End of term summary for {getGradeDisplayValue(user?.assignedClass || '') || 'all learners'}</p>
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
            label="PDF"
            icon={Download}
            className="bg-blue-600 text-white hover:bg-blue-700"
            items={[
              ...availableTerms.map((term) => ({
                id: `pdf-${term.id}`,
                label: term.termName,
                icon: Download,
                onClick: () => generatePdfBundle([term.id], 'download'),
              })),
              {
                id: 'pdf-all',
                label: 'All Terms in One File',
                icon: Download,
                onClick: () => generatePdfBundle(availableTerms.map((term) => term.id), 'download'),
              },
            ]}
          />
          <ActionMenu
            label="Print"
            icon={Printer}
            className="bg-coha-900 text-white hover:bg-coha-800"
            items={[
              ...availableTerms.map((term) => ({
                id: `print-${term.id}`,
                label: term.termName,
                icon: Printer,
                onClick: () => generatePdfBundle([term.id], 'print'),
              })),
              {
                id: 'print-all',
                label: 'All Terms in One File',
                icon: Printer,
                onClick: () => generatePdfBundle(availableTerms.map((term) => term.id), 'print'),
              },
            ]}
          />
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
        </div>
      </div>

      <div className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden print:border-none print:shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th className="p-3 border-b border-r border-gray-200 bg-gray-50 text-xs font-black text-gray-500 uppercase tracking-widest sticky left-0 z-10 min-w-[200px]">
                  Learner Name
                </th>
                {PRE_PRIMARY_AREAS.map(area => (
                  <th key={area.id} colSpan={area.components.length} className="p-3 border-b border-r border-gray-200 bg-gray-50 text-xs font-black text-gray-700 uppercase tracking-widest text-center">
                    {area.name}
                  </th>
                ))}
              </tr>
              <tr>
                <th className="p-3 border-b border-r border-gray-200 bg-gray-50 sticky left-0 z-10"></th>
                {PRE_PRIMARY_AREAS.map(area => (
                  area.components.map(comp => (
                    <th key={comp.id} className="p-2 border-b border-r border-gray-200 bg-gray-50 text-[10px] font-bold text-gray-500 text-center min-w-[80px] max-w-[120px] truncate" title={comp.name}>
                      {comp.name}
                    </th>
                  ))
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map((student, index) => {
                const record = records[student.id];
                return (
                  <tr key={student.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="p-3 border-b border-r border-gray-200 text-sm font-bold text-gray-900 sticky left-0 z-10 bg-inherit">
                      {student.name}
                    </td>
                    {PRE_PRIMARY_AREAS.map(area => (
                      area.components.map(comp => {
                        const rating = record?.ratings?.[comp.id];
                        return (
                          <td key={comp.id} className="p-2 border-b border-r border-gray-200 text-center">
                            {rating ? (
                              <span className={`inline-block px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${
                                rating === 'FM' ? 'bg-green-100 text-green-800' :
                                rating === 'AM' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {rating}
                              </span>
                            ) : (
                              <span className="text-gray-300">-</span>
                            )}
                          </td>
                        );
                      })
                    ))}
                  </tr>
                );
              })}
              {students.length === 0 && (
                <tr>
                  <td colSpan={100} className="p-8 text-center text-gray-500 italic">
                    No enrolled learners found in this class.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .max-w-\\[1600px\\] * {
            visibility: visible;
          }
          .max-w-\\[1600px\\] {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0 !important;
          }
          button, select {
            display: none !important;
          }
          table {
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          th {
            background-color: #f8fafc !important;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
};
