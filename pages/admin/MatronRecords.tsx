import React, { useEffect, useState } from 'react';
import { getMatronAlerts, getStudents, getMatronLogsForStudent, getMatrons, getSystemSettings, getAllMatronLogs, getAllStudentMedications, getMedicationAdministrationsToday, getMedicationAdministrations } from '../../services/dataService';
import { Student, MatronLog, Matron, SystemSettings, StudentMedication, MedicationAdministration } from '../../types';
import { Loader } from '../../components/ui/Loader';
import { AlertTriangle, CheckCircle, ChevronDown, ChevronRight, Download, FileText, Printer, User } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export const MatronRecords: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [matrons, setMatrons] = useState<Matron[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);
  const [studentLogs, setStudentLogs] = useState<Record<string, MatronLog[]>>({});
  const [allMedications, setAllMedications] = useState<StudentMedication[]>([]);
  const [allAdministrations, setAllAdministrations] = useState<MedicationAdministration[]>([]);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const fetchData = async () => {
    setLoading(true);
    const start = new Date(dateRange.start);
    start.setHours(0,0,0,0);
    const end = new Date(dateRange.end);
    end.setHours(23,59,59,999);

    const [alertsData, studentsData, matronsData, settingsData, allLogs, allMeds, allAdmins] = await Promise.all([
      getMatronAlerts(),
      getStudents(),
      getMatrons(),
      getSystemSettings(),
      getAllMatronLogs(start, end),
      getAllStudentMedications(),
      getMedicationAdministrations(start, end)
    ]);
    setAlerts(alertsData);
    setStudents(studentsData);
    setMatrons(matronsData);
    setSettings(settingsData);
    setAllMedications(allMeds);
    setAllAdministrations(allAdmins);

    const logsMap: Record<string, MatronLog[]> = {};
    allLogs.forEach(log => {
      if (!logsMap[log.student_id]) logsMap[log.student_id] = [];
      logsMap[log.student_id].push(log);
    });
    setStudentLogs(logsMap);

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const toggleStudent = async (studentId: string) => {
    if (expandedStudentId === studentId) {
      setExpandedStudentId(null);
    } else {
      setExpandedStudentId(studentId);
    }
  };

  const getCompliance = (studentId: string) => {
    const studentMeds = allMedications.filter(m => m.student_id === studentId);
    const studentAdmins = allAdministrations.filter(a => a.student_id === studentId);

    return {
      due: studentMeds.length,
      given: studentAdmins.length,
      onTime: studentAdmins.filter(a => a.was_on_time).length,
      late: studentAdmins.filter(a => !a.was_on_time).length,
      missed: Math.max(0, studentMeds.length - studentAdmins.length)
    };
  };

  const downloadPDF = async () => {
    const doc = new jsPDF() as any;
    const schoolName = settings?.schoolName || 'Circle of Hope Academy';

    // Logo
    try {
        const logoImg = new Image();
        logoImg.src = 'https://i.ibb.co/LzYXwYfX/logo.png';
        doc.addImage(logoImg, 'PNG', 14, 15, 20, 20);
    } catch (e) {}

    // Header
    doc.setFontSize(22);
    doc.text('Hostel Student Care Summary Report', 105, 25, { align: 'center' });

    doc.setFontSize(14);
    doc.text(schoolName, 105, 35, { align: 'center' });
    if (settings?.address) doc.text(settings.address, 105, 42, { align: 'center' });

    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, 52, { align: 'center' });
    doc.text(`Covered Period: ${dateRange.start} to ${dateRange.end}`, 105, 58, { align: 'center' });

    let y = 70;
    for (const student of students) {
      const compliance = getCompliance(student.id);
      const logs = studentLogs[student.id] || [];

      if (y > 230) {
        doc.addPage();
        y = 20;
      }

      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text(`${student.name}`, 14, y);
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(`Room: ${student.assignedClass || 'N/A'} | Age: ${student.dob ? (new Date().getFullYear() - new Date(student.dob).getFullYear()) : 'N/A'}`, 14, y + 6);

      // Compliance Table
      doc.autoTable({
        startY: y + 10,
        head: [['Doses Due', 'Given', 'On Time', 'Late', 'Missed']],
        body: [[compliance.due, compliance.given, compliance.onTime, compliance.late, compliance.missed]],
        theme: 'striped',
        headStyles: { fillColor: [43, 43, 94] }
      });

      // Logs Table
      const tableData = logs.map(log => [
        new Date(log.logged_at?.toDate ? log.logged_at.toDate() : log.logged_at).toLocaleTimeString(),
        log.category.replace('_', ' '),
        matrons.find(m => m.id === log.matron_id)?.name || 'Unknown',
        Object.entries(log.log_data).map(([k, v]) => `${k}: ${v}`).join(', ')
      ]);

      doc.autoTable({
        startY: (doc as any).lastAutoTable.finalY + 2,
        head: [['Time', 'Category', 'Matron', 'Details']],
        body: tableData.length > 0 ? tableData : [['-', 'No logs recorded today', '-', '-']],
        theme: 'plain',
        styles: { fontSize: 8 }
      });

      y = (doc as any).lastAutoTable.finalY + 15;
    }

    // Page numbers
    const pageCount = doc.internal.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.text(`Page ${i} of ${pageCount}`, 105, 285, { align: 'center' });
        doc.text(schoolName, 14, 285);
    }

    doc.save(`matron_summary_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const downloadExcel = async () => {
    const workbook = new ExcelJS.Workbook();

    // Summary Sheet
    const summarySheet = workbook.addWorksheet('Medication Compliance');
    summarySheet.columns = [
        { header: 'Student Name', key: 'name', width: 25 },
        { header: 'Room', key: 'room', width: 15 },
        { header: 'Total Doses Due', key: 'due', width: 15 },
        { header: 'Doses Given', key: 'given', width: 15 },
        { header: 'On Time', key: 'onTime', width: 15 },
        { header: 'Late', key: 'late', width: 15 },
        { header: 'Missed', key: 'missed', width: 15 }
    ];

    students.forEach(student => {
        const comp = getCompliance(student.id);
        summarySheet.addRow({
            name: student.name,
            room: student.assignedClass || 'N/A',
            ...comp
        });
    });

    const categories: any[] = ['eating', 'potty_training', 'bed_wetting', 'medication', 'incident', 'appointment', 'behavior', 'discipline'];

    for (const cat of categories) {
      const sheet = workbook.addWorksheet(cat.charAt(0).toUpperCase() + cat.slice(1).replace('_', ' '));
      sheet.columns = [
        { header: 'Date', key: 'date', width: 20 },
        { header: 'Student Name', key: 'student', width: 25 },
        { header: 'Room', key: 'room', width: 15 },
        { header: 'Matron', key: 'matron', width: 20 },
        { header: 'Details', key: 'details', width: 50 }
      ];

      for (const student of students) {
        const logs = (studentLogs[student.id] || []).filter(l => l.category === cat);
        logs.forEach(log => {
          sheet.addRow({
            date: new Date(log.logged_at?.toDate ? log.logged_at.toDate() : log.logged_at).toLocaleString(),
            student: student.name,
            room: student.assignedClass || 'N/A',
            matron: matrons.find(m => m.id === log.matron_id)?.name || 'Unknown',
            details: Object.entries(log.log_data).map(([k, v]) => `${k}: ${v}`).join(', ')
          });
        });
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `matron_records_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (loading) return <Loader />;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold">Matron Records</h1>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateRange.start}
              onChange={e => setDateRange(prev => ({...prev, start: e.target.value}))}
              className="border border-gray-300 rounded px-2 py-1 text-sm"
            />
            <span className="text-gray-400">to</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={e => setDateRange(prev => ({...prev, end: e.target.value}))}
              className="border border-gray-300 rounded px-2 py-1 text-sm"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={downloadPDF} variant="outline" className="flex items-center gap-2">
            <Download size={16} /> PDF
          </Button>
          <Button onClick={downloadExcel} variant="outline" className="flex items-center gap-2">
            <Download size={16} /> Excel
          </Button>
          <Button onClick={() => window.print()} variant="outline" className="flex items-center gap-2">
            <Printer size={16} /> Print
          </Button>
        </div>
      </div>

      {/* Alert Panel */}
      <div className="mb-8">
        {alerts.length > 0 ? (
          <div className="space-y-2">
            {alerts.map((alert, i) => (
              <div key={i} className={`p-4 rounded-lg flex items-center gap-3 ${alert.type === 'MISSED' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                <AlertTriangle size={20} />
                <span className="font-bold">
                  {alert.type} MEDICATION — {alert.studentName} — {alert.medicineName} —
                  {alert.type === 'MISSED' ? ` was due ${alert.dueTime}` : ` given at ${alert.timeGiven}, was due between ${alert.dueTime}, ${alert.minutesLate} minutes late`}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 bg-green-100 text-green-800 rounded-lg flex items-center gap-3">
            <CheckCircle size={20} />
            <span className="font-bold">All medications administered on time today</span>
          </div>
        )}
      </div>

      {/* Student List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="p-4 font-bold text-sm uppercase text-gray-500">Student Name</th>
              <th className="p-4 font-bold text-sm uppercase text-gray-500">Room/Dorm</th>
              <th className="p-4 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {students.map(student => (
              <React.Fragment key={student.id}>
                <tr
                  className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => toggleStudent(student.id)}
                >
                  <td className="p-4 font-medium">{student.name}</td>
                  <td className="p-4 text-gray-600">{student.assignedClass || 'N/A'}</td>
                  <td className="p-4">
                    {expandedStudentId === student.id ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                  </td>
                </tr>
                {expandedStudentId === student.id && (
                  <tr>
                    <td colSpan={3} className="bg-gray-50 p-6">
                      <div className="space-y-4">
                        <h4 className="font-bold flex items-center gap-2">
                          <FileText size={18} /> Activity Logs
                        </h4>
                        {studentLogs[student.id]?.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {studentLogs[student.id].map(log => (
                              <div key={log.id} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                                <div className="flex justify-between items-start mb-2">
                                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-coha-100 text-coha-700">
                                    {log.category.replace('_', ' ')}
                                  </span>
                                  <span className="text-[10px] text-gray-400 font-medium">
                                    {new Date(log.logged_at?.toDate ? log.logged_at.toDate() : log.logged_at).toLocaleString()}
                                  </span>
                                </div>
                                <div className="text-sm text-gray-700 space-y-1">
                                  {Object.entries(log.log_data).map(([key, value]: [string, any]) => (
                                    <div key={key} className="flex gap-2">
                                      <span className="font-bold capitalize">{key.replace('_', ' ')}:</span>
                                      <span>{typeof value === 'boolean' ? (value ? 'Yes' : 'No') : Array.isArray(value) ? value.join(', ') : value}</span>
                                    </div>
                                  ))}
                                </div>
                                <div className="mt-3 pt-2 border-t border-gray-100 flex items-center gap-2">
                                  <User size={12} className="text-gray-400" />
                                  <span className="text-[10px] text-gray-500 font-bold uppercase">
                                    Logged by {matrons.find(m => m.id === log.matron_id)?.name || 'Unknown'}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 italic">No logs found for this student.</p>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
