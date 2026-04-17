import React, { useEffect, useState } from 'react';
import {
  getMatronAlerts, getStudents, getMatrons, getSystemSettings,
  getAllMatronLogs, getAllStudentMedications, getMedicationAdministrations,
  getAllHomeworkSubmissions, getHomeworkAssignmentsForClass, dismissMatronAlert
} from '../../services/dataService';
import { Student, MatronLog, Matron, SystemSettings, StudentMedication, MedicationAdministration, HomeworkSubmission, HomeworkAssignment } from '../../types';
import { Loader } from '../../components/ui/Loader';
import {
  AlertTriangle, CheckCircle, ChevronDown, ChevronRight, Download,
  FileText, Printer, User, Calendar, Filter, Clock, BookOpen, HeartPulse, Search, Activity, X as XIcon
} from 'lucide-react';
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
  const [showHistoryStudentId, setShowHistoryStudentId] = useState<string | null>(null);
  const [studentLogs, setStudentLogs] = useState<Record<string, MatronLog[]>>({});
  const [historyLogs, setHistoryLogs] = useState<MatronLog[]>([]);
  const [allMedications, setAllMedications] = useState<StudentMedication[]>([]);
  const [allAdministrations, setAllAdministrations] = useState<MedicationAdministration[]>([]);
  const [homeworkSubmissions, setHomeworkSubmissions] = useState<HomeworkSubmission[]>([]);
  const [homeworkAssignments, setHomeworkAssignments] = useState<Record<string, HomeworkAssignment[]>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({ class: 'ALL', dorm: 'ALL' });
  const [dateRange, setDateRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const fetchData = async () => {
    setLoading(true);
    const start = new Date(dateRange.start);
    start.setHours(0,0,0,0);
    const end = new Date(dateRange.end);
    end.setHours(23,59,59,999);

    const [alertsData, studentsData, matronsData, settingsData, allLogs, allMeds, allAdmins, allSubs] = await Promise.all([
      getMatronAlerts(),
      getStudents(),
      getMatrons(),
      getSystemSettings(),
      getAllMatronLogs(start, end),
      getAllStudentMedications(),
      getMedicationAdministrations(start, end),
      getAllHomeworkSubmissions()
    ]);

    setAlerts(alertsData);
    setStudents(studentsData);
    setMatrons(matronsData);
    setSettings(settingsData);
    setAllMedications(allMeds);
    setAllAdministrations(allAdmins);
    setHomeworkSubmissions(allSubs);

    const logsMap: Record<string, MatronLog[]> = {};
    allLogs.forEach(log => {
      if (!logsMap[log.student_id]) logsMap[log.student_id] = [];
      logsMap[log.student_id].push(log);
    });
    setStudentLogs(logsMap);

    // Fetch assignments for relevant classes
    const classes = Array.from(new Set(studentsData.map(s => s.assignedClass).filter(Boolean))) as string[];
    const assignmentsMap: Record<string, HomeworkAssignment[]> = {};
    for (const cls of classes) {
      assignmentsMap[cls] = await getHomeworkAssignmentsForClass(cls);
    }
    setHomeworkAssignments(assignmentsMap);

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const handleDismissAlert = async (alertId: string) => {
    const success = await dismissMatronAlert(alertId);
    if (success) {
      setAlerts(prev => prev.filter(a => a.id !== alertId));
    }
  };

  const setPresetRange = (type: 'today' | 'yesterday') => {
    const today = new Date().toISOString().split('T')[0];
    if (type === 'today') {
      setDateRange({ start: today, end: today });
    } else {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      setDateRange({ start: yesterdayStr, end: yesterdayStr });
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

  const filteredStudents = students.filter(s => {
    const matchesHostel = s.needsHostel && s.dorm;
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = filters.class === 'ALL' || s.assignedClass === filters.class;
    const matchesDorm = filters.dorm === 'ALL' || s.dorm === filters.dorm;
    return matchesHostel && matchesSearch && matchesClass && matchesDorm;
  });

  const handleViewAll = async (studentId: string) => {
    setLoading(true);
    const logs = await getAllMatronLogs(undefined, undefined, studentId);
    setHistoryLogs(logs.sort((a, b) => {
      const da = a.logged_at?.toDate ? a.logged_at.toDate() : new Date(a.logged_at);
      const db = b.logged_at?.toDate ? b.logged_at.toDate() : new Date(b.logged_at);
      return db.getTime() - da.getTime();
    }));
    setShowHistoryStudentId(studentId);
    setLoading(false);
  };

  const downloadStudentReport = async (student: Student, logs: MatronLog[], rangeLabel: string) => {
    const doc = new jsPDF() as any;
    const schoolName = settings?.schoolName || 'Circle of Hope Academy';
    const compliance = getCompliance(student.id);

    // Header
    doc.setFontSize(22);
    doc.setTextColor(43, 43, 94);
    doc.text('Student Care Summary Report', 105, 25, { align: 'center' });

    doc.setFontSize(14);
    doc.setTextColor(100);
    doc.text(student.name, 105, 35, { align: 'center' });

    doc.setFontSize(10);
    doc.text(`Period: ${rangeLabel} | Generated: ${new Date().toLocaleDateString()}`, 105, 45, { align: 'center' });

    doc.autoTable({
      startY: 60,
      head: [['Medication Compliance', 'Doses Due', 'Given', 'On Time', 'Late', 'Missed']],
      body: [['Summary', compliance.due, compliance.given, compliance.onTime, compliance.late, compliance.missed]],
      theme: 'striped',
      headStyles: { fillColor: [43, 43, 94] },
    });

    const logsByDate: Record<string, any[][]> = {};
    logs.forEach(log => {
        const date = log.logged_at?.toDate ? log.logged_at.toDate() : new Date(log.logged_at);
        const dateStr = date.toLocaleDateString();
        if (!logsByDate[dateStr]) logsByDate[dateStr] = [];
        logsByDate[dateStr].push([
            date.toLocaleTimeString(),
            log.category.replace('_', ' ').toUpperCase(),
            matrons.find(m => m.id === log.matron_id)?.name || 'Unknown',
            Object.entries(log.log_data).map(([k, v]) => `${k}: ${v}`).join(', ')
        ]);
    });

    let currentY = (doc as any).lastAutoTable.finalY + 15;

    Object.entries(logsByDate).forEach(([date, data]) => {
        if (currentY > 250) { doc.addPage(); currentY = 20; }
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text(`Records for ${date}`, 14, currentY);
        doc.autoTable({
            startY: currentY + 5,
            head: [['Time', 'Category', 'Matron', 'Details']],
            body: data,
            theme: 'grid',
            styles: { fontSize: 8 },
            headStyles: { fillColor: [100, 100, 100] }
        });
        currentY = (doc as any).lastAutoTable.finalY + 15;
    });

    doc.save(`report_${student.name.replace(/\s+/g, '_')}.pdf`);
  };

  const downloadPDF = async () => {
    const doc = new jsPDF() as any;
    const schoolName = settings?.schoolName || 'Circle of Hope Academy';

    // Header
    doc.setFontSize(22);
    doc.setTextColor(43, 43, 94);
    doc.text('Hostel Student Care Summary Report', 105, 25, { align: 'center' });

    doc.setFontSize(14);
    doc.setTextColor(100);
    doc.text(schoolName, 105, 35, { align: 'center' });

    doc.setFontSize(10);
    doc.text(`Covered Period: ${dateRange.start} to ${dateRange.end}`, 105, 45, { align: 'center' });

    let y = 60;
    for (const student of filteredStudents) {
      const compliance = getCompliance(student.id);
      const logs = studentLogs[student.id] || [];

      if (y > 230) { doc.addPage(); y = 20; }

      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(43, 43, 94);
      doc.text(`${student.name} (${student.assignedClass || 'N/A'})`, 14, y);

      doc.autoTable({
        startY: y + 5,
        head: [['Medication Compliance', 'Doses Due', 'Given', 'On Time', 'Late', 'Missed']],
        body: [['Summary', compliance.due, compliance.given, compliance.onTime, compliance.late, compliance.missed]],
        theme: 'striped',
        headStyles: { fillColor: [43, 43, 94] },
        styles: { fontSize: 9 }
      });

      const tableData = logs.map(log => [
        new Date(log.logged_at?.toDate ? log.logged_at.toDate() : log.logged_at).toLocaleString(),
        log.category.replace('_', ' ').toUpperCase(),
        matrons.find(m => m.id === log.matron_id)?.name || 'Unknown',
        Object.entries(log.log_data).map(([k, v]) => `${k}: ${v}`).join(', ')
      ]);

      doc.autoTable({
        startY: (doc as any).lastAutoTable.finalY + 2,
        head: [['Date/Time', 'Category', 'Matron', 'Details']],
        body: tableData.length > 0 ? tableData : [['-', 'No logs recorded', '-', '-']],
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [100, 100, 100] }
      });

      y = (doc as any).lastAutoTable.finalY + 15;
    }

    doc.save(`matron_records_${dateRange.start}_to_${dateRange.end}.pdf`);
  };

  const downloadExcel = async () => {
    const workbook = new ExcelJS.Workbook();

    // Summary Sheet
    const summarySheet = workbook.addWorksheet('Compliance Summary');
    summarySheet.columns = [
      { header: 'Student Name', key: 'name', width: 25 },
      { header: 'Class/Room', key: 'class', width: 15 },
      { header: 'Dorm', key: 'dorm', width: 15 },
      { header: 'Doses Due', key: 'due', width: 12 },
      { header: 'Doses Given', key: 'given', width: 12 },
      { header: 'On Time', key: 'onTime', width: 12 },
      { header: 'Late', key: 'late', width: 12 },
      { header: 'Missed', key: 'missed', width: 12 },
    ];

    filteredStudents.forEach(student => {
      const compliance = getCompliance(student.id);
      summarySheet.addRow({
        name: student.name,
        class: student.assignedClass || 'N/A',
        dorm: student.dorm || 'N/A',
        due: compliance.due,
        given: compliance.given,
        onTime: compliance.onTime,
        late: compliance.late,
        missed: compliance.missed
      });
    });

    // Formatting Summary Sheet
    summarySheet.getRow(1).font = { bold: true };
    summarySheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

    // Individual Category Sheets
    const categories: { key: string, label: string }[] = [
      { key: 'eating', label: 'Eating' },
      { key: 'potty_training', label: 'Potty Training' },
      { key: 'bed_wetting', label: 'Bed Wetting' },
      { key: 'medication', label: 'Medication' },
      { key: 'incident', label: 'Incidents' },
      { key: 'appointment', label: 'Appointments' },
      { key: 'behavior', label: 'Behaviour' },
      { key: 'discipline', label: 'Discipline' }
    ];

    categories.forEach(cat => {
      const sheet = workbook.addWorksheet(cat.label);

      // Collect all logs for this category
      const logs: any[] = [];
      filteredStudents.forEach(student => {
        const studentLogsList = studentLogs[student.id] || [];
        studentLogsList.filter(l => l.category === cat.key).forEach(log => {
          logs.push({
            date: new Date(log.logged_at?.toDate ? log.logged_at.toDate() : log.logged_at),
            studentName: student.name,
            room: student.assignedClass || 'N/A',
            matron: matrons.find(m => m.id === log.matron_id)?.name || 'Unknown',
            ...log.log_data
          });
        });
      });

      if (logs.length > 0) {
        // Dynamic columns based on keys in log_data
        const dataKeys = Array.from(new Set(logs.flatMap(l => Object.keys(l))));
        sheet.columns = dataKeys.map(k => ({
          header: k.charAt(0).toUpperCase() + k.slice(1).replace('_', ' '),
          key: k,
          width: 20
        }));

        logs.sort((a, b) => b.date.getTime() - a.date.getTime()).forEach(log => {
          sheet.addRow(log);
        });

        sheet.getRow(1).font = { bold: true };
        sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
      } else {
        sheet.addRow(['No records found for this period.']);
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `matron_report_${dateRange.start}_to_${dateRange.end}.xlsx`);
  };

  const printPDF = async () => {
    const doc = new jsPDF() as any;
    const schoolName = settings?.schoolName || 'Circle of Hope Academy';

    doc.setFontSize(22);
    doc.setTextColor(43, 43, 94);
    doc.text('Hostel Student Care Summary Report', 105, 25, { align: 'center' });

    doc.setFontSize(14);
    doc.setTextColor(100);
    doc.text(schoolName, 105, 35, { align: 'center' });

    doc.setFontSize(10);
    doc.text(`Covered Period: ${dateRange.start} to ${dateRange.end}`, 105, 45, { align: 'center' });

    let y = 60;
    for (const student of filteredStudents) {
      const compliance = getCompliance(student.id);
      const logs = studentLogs[student.id] || [];

      if (y > 230) { doc.addPage(); y = 20; }

      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(43, 43, 94);
      doc.text(`${student.name} (${student.assignedClass || 'N/A'})`, 14, y);

      doc.autoTable({
        startY: y + 5,
        head: [['Medication Compliance', 'Doses Due', 'Given', 'On Time', 'Late', 'Missed']],
        body: [['Summary', compliance.due, compliance.given, compliance.onTime, compliance.late, compliance.missed]],
        theme: 'striped',
        headStyles: { fillColor: [43, 43, 94] },
        styles: { fontSize: 9 }
      });

      const tableData = logs.map(log => [
        new Date(log.logged_at?.toDate ? log.logged_at.toDate() : log.logged_at).toLocaleString(),
        log.category.replace('_', ' ').toUpperCase(),
        matrons.find(m => m.id === log.matron_id)?.name || 'Unknown',
        Object.entries(log.log_data).map(([k, v]) => `${k}: ${v}`).join(', ')
      ]);

      doc.autoTable({
        startY: (doc as any).lastAutoTable.finalY + 2,
        head: [['Date/Time', 'Category', 'Matron', 'Details']],
        body: tableData.length > 0 ? tableData : [['-', 'No logs recorded', '-', '-']],
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [100, 100, 100] }
      });

      y = (doc as any).lastAutoTable.finalY + 15;
    }

    const pdfBlob = doc.output('blob');
    const url = URL.createObjectURL(pdfBlob);
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = url;
    document.body.appendChild(iframe);
    iframe.onload = () => {
      iframe.contentWindow?.print();
    };
  };

  if (loading) return <Loader />;

  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans">
      <style>{`
        .flicker-red { animation: flicker 1s infinite; background: #ef4444; }
        .flicker-green { animation: flicker 1.5s infinite; background: #22c55e; }
        .flicker-orange { animation: flicker 1.2s infinite; background: #f59e0b; }
        @keyframes flicker { 0% { opacity: 1; } 50% { opacity: 0.3; } 100% { opacity: 1; } }
      `}</style>

      <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-1">Matron Records</h1>
          <p className="text-sm font-bold text-slate-500">Comprehensive oversight of hostel care activities</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={downloadPDF} variant="outline" className="!rounded-xl !py-2 !text-xs font-black uppercase tracking-widest shadow-sm">
            <Download size={16} /> PDF
          </Button>
          <Button onClick={downloadExcel} variant="outline" className="!rounded-xl !py-2 !text-xs font-black uppercase tracking-widest shadow-sm">
            <Download size={16} /> Excel
          </Button>
          <Button onClick={printPDF} variant="outline" className="!rounded-xl !py-2 !text-xs font-black uppercase tracking-widest shadow-sm">
            <Printer size={16} /> Print
          </Button>
        </div>
      </div>

      {/* FILTERS PANEL */}
      <div className="bg-white p-6 rounded-[24px] shadow-sm border border-slate-200 mb-8">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 space-y-4">
            <div className="flex gap-2">
              <button onClick={() => setPresetRange('today')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${dateRange.start === new Date().toISOString().split('T')[0] ? 'bg-coha-900 text-white shadow-lg' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>Today</button>
              <button onClick={() => setPresetRange('yesterday')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${dateRange.start !== new Date().toISOString().split('T')[0] ? 'bg-coha-900 text-white shadow-lg' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>Yesterday</button>
              <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-200">
                <input type="date" value={dateRange.start} onChange={e => setDateRange(prev => ({...prev, start: e.target.value}))} className="bg-transparent text-[10px] font-black uppercase outline-none px-2" />
                <span className="text-slate-300">-</span>
                <input type="date" value={dateRange.end} onChange={e => setDateRange(prev => ({...prev, end: e.target.value}))} className="bg-transparent text-[10px] font-black uppercase outline-none px-2" />
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search student name..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-3 text-sm font-bold focus:bg-white transition-all outline-none"
              />
            </div>
          </div>
          <div className="flex gap-4 items-end">
             <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Filter Class</label>
                <select value={filters.class} onChange={e => setFilters(p => ({...p, class: e.target.value}))} className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-widest outline-none">
                  <option value="ALL">All Classes</option>
                  {Array.from(new Set(students.map(s => s.assignedClass).filter(Boolean))).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
             </div>
             <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Filter Dorm</label>
                <select value={filters.dorm} onChange={e => setFilters(p => ({...p, dorm: e.target.value}))} className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-widest outline-none">
                  <option value="ALL">All Dorms</option>
                  {Array.from(new Set(students.map(s => s.dorm).filter(Boolean))).map(d => <option key={d} value={d}>{d}</option>)}
                </select>
             </div>
          </div>
        </div>
      </div>

      {/* STATS STRIP */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'All Records', val: Object.values(studentLogs).flat().length, icon: <FileText />, color: 'blue' },
          { label: 'Records Today', val: Object.values(studentLogs).flat().filter(l => new Date(l.logged_at?.toDate ? l.logged_at.toDate() : l.logged_at).toISOString().split('T')[0] === new Date().toISOString().split('T')[0]).length, icon: <Clock />, color: 'green', dot: true },
          { label: 'Pending Meds', val: alerts.filter(a => a.type === 'MISSED').length, icon: <HeartPulse />, color: 'red' },
          { label: 'Total Students', val: filteredStudents.length, icon: <User />, color: 'indigo' },
        ].map((s, i) => (
          <div key={i} className="bg-white p-4 rounded-[20px] shadow-sm border border-slate-200 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-${s.color}-50 text-${s.color}-600`}>{s.icon}</div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{s.label}</p>
              <div className="flex items-center gap-2">
                <p className="text-xl font-black text-slate-800">{s.val}</p>
                {s.dot && s.val > 0 && <div className="w-2 h-2 rounded-full flicker-green" />}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ALERTS PANEL */}
      {alerts.length > 0 && (
        <div className="mb-8 space-y-2">
          {alerts.map((alert, i) => (
            <div key={i} className={`p-4 rounded-2xl flex items-center justify-between border-l-4 shadow-sm ${alert.type === 'MISSED' ? 'bg-red-50 border-red-500 text-red-800' : 'bg-amber-50 border-amber-500 text-amber-800'}`}>
              <div className="flex items-center gap-4">
                <AlertTriangle className={alert.type === 'MISSED' ? 'text-red-500' : 'text-amber-500'} size={20} />
                <span className="text-xs font-black uppercase tracking-wider">
                  {alert.type} MEDICATION — {alert.studentName} — {alert.medicineName} —
                  {alert.type === 'MISSED' ? ` was due ${alert.dueTime}` : ` given at ${alert.timeGiven}, was due ${alert.dueTime}, ${alert.minutesLate}m late`}
                </span>
              </div>
              <button onClick={() => handleDismissAlert(alert.id)} className="p-1 hover:bg-black/5 rounded-full transition-colors text-current opacity-40 hover:opacity-100">
                <XIcon size={18} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* MAIN TABLE */}
      <div className="bg-white rounded-[32px] shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Student & Room</th>
              <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Medication</th>
              <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Homework</th>
              <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Recent Log</th>
              <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Activity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredStudents.map(student => {
              const compliance = getCompliance(student.id);
              const logs = studentLogs[student.id] || [];
              const lastLog = logs[0];
              const hasMedication = allMedications.some(m => m.student_id === student.id);
              const assignments = homeworkAssignments[student.assignedClass || ''] || [];
              const submission = homeworkSubmissions.find(s => s.studentId === student.id && assignments.some(a => a.id === s.assignmentId));

              return (
                <React.Fragment key={student.id}>
                  <tr
                    className="hover:bg-slate-50/50 cursor-pointer transition-colors group"
                    onClick={() => setExpandedStudentId(expandedStudentId === student.id ? null : student.id)}
                  >
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-400">
                          {student.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-black text-slate-900 leading-none mb-1">{student.name}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">RM: {student.assignedClass || 'N/A'} · {student.dorm || 'No Dorm'}</p>
                        </div>
                      </div>
                    </td>
                    <td className={`px-6 py-5 ${hasMedication ? 'bg-blue-50/30' : ''}`}>
                      {hasMedication ? (
                        <div className="flex items-center gap-2">
                          {compliance.missed > 0 ? (
                            <div className="w-2.5 h-2.5 rounded-full flicker-red" title="Missed Doses" />
                          ) : compliance.given > 0 ? (
                            <CheckCircle size={16} className="text-green-500" />
                          ) : (
                            <Clock size={16} className="text-blue-300" />
                          )}
                          <span className="text-[10px] font-black text-slate-600 uppercase tracking-tighter">
                            {compliance.given}/{compliance.due} Doses
                          </span>
                        </div>
                      ) : <span className="text-[10px] font-bold text-slate-300 uppercase">None</span>}
                    </td>
                    <td className="px-6 py-5">
                      {assignments.length > 0 ? (
                        <div className="flex items-center gap-2">
                           {submission ? (
                             <CheckCircle size={16} className="text-green-500" />
                           ) : (
                             <div className="w-2.5 h-2.5 rounded-full flicker-orange" title="Pending Homework" />
                           )}
                           <span className="text-[10px] font-black text-slate-600 uppercase">
                             {submission ? 'Submitted' : 'Pending'}
                           </span>
                        </div>
                      ) : <span className="text-[10px] font-bold text-slate-300 uppercase">No Work</span>}
                    </td>
                    <td className="px-6 py-5">
                      {lastLog ? (
                        <div>
                          <p className="text-[10px] font-black text-slate-800 uppercase tracking-tighter mb-0.5">{lastLog.category.replace('_', ' ')}</p>
                          <p className="text-[9px] font-bold text-slate-400">{new Date(lastLog.logged_at?.toDate ? lastLog.logged_at.toDate() : lastLog.logged_at).toLocaleTimeString()}</p>
                        </div>
                      ) : <span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest font-black">No Records Today</span>}
                    </td>
                    <td className="px-6 py-5 text-right">
                       <button className="p-2 bg-slate-50 text-slate-400 rounded-xl group-hover:bg-coha-900 group-hover:text-white transition-all">
                         {expandedStudentId === student.id ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                       </button>
                    </td>
                  </tr>

                  {expandedStudentId === student.id && (
                    <tr>
                      <td colSpan={5} className="bg-slate-50/50 p-8 border-y border-slate-100">
                         <div className="flex justify-between items-start mb-6">
                            <div>
                               <h3 className="text-xl font-black text-slate-900">{student.name}</h3>
                               <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Today's Detailed Activity</p>
                            </div>
                            <div className="flex gap-2">
                               <Button
                                onClick={(e) => { e.stopPropagation(); handleViewAll(student.id); }}
                                variant="outline"
                                className="!py-1.5 !px-3 !text-[10px]"
                               >
                                 View All Records
                               </Button>
                               <Button
                                onClick={(e) => { e.stopPropagation(); downloadStudentReport(student, logs, 'Today'); }}
                                variant="secondary"
                                className="!py-1.5 !px-3 !text-[10px]"
                               >
                                 <Download size={14} /> Report
                               </Button>
                            </div>
                         </div>

                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                               <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                                 <Activity size={14} /> Today's Activity Timeline
                               </h4>
                               {logs.length > 0 ? (
                                 <div className="space-y-3">
                                   {logs.map(log => (
                                     <div key={log.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 relative">
                                        <div className="flex justify-between items-start mb-2">
                                          <span className="text-[10px] font-black uppercase tracking-widest text-coha-600 bg-coha-50 px-2 py-0.5 rounded">
                                            {log.category.replace('_', ' ')}
                                          </span>
                                          <span className="text-[9px] font-bold text-slate-300">
                                            {new Date(log.logged_at?.toDate ? log.logged_at.toDate() : log.logged_at).toLocaleString()}
                                          </span>
                                        </div>
                                        <div className="space-y-1">
                                          {Object.entries(log.log_data).map(([k, v]: [string, any]) => (
                                            <div key={k} className="flex gap-2 text-xs">
                                              <span className="font-bold text-slate-400 uppercase tracking-tighter">{k.replace('_', ' ')}:</span>
                                              <span className="font-bold text-slate-700">{typeof v === 'boolean' ? (v ? 'Yes' : 'No') : Array.isArray(v) ? v.join(', ') : v}</span>
                                            </div>
                                          ))}
                                        </div>
                                        <div className="mt-3 pt-2 border-t border-slate-50 flex items-center gap-2">
                                          <User size={10} className="text-slate-300" />
                                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Logged by {matrons.find(m => m.id === log.matron_id)?.name || 'Unknown'}</span>
                                        </div>
                                     </div>
                                   ))}
                                 </div>
                               ) : <p className="text-sm font-bold text-slate-400 italic">No activity logs for selected period.</p>}
                            </div>

                            <div className="space-y-6">
                               <div className="space-y-4">
                                 <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                                   <HeartPulse size={14} /> Medication History
                                 </h4>
                                 {allAdministrations.filter(a => a.student_id === student.id).length > 0 ? (
                                   <div className="space-y-2">
                                      {allAdministrations.filter(a => a.student_id === student.id).map(admin => (
                                        <div key={admin.id} className="bg-white p-3 rounded-xl border border-slate-100 flex items-center justify-between">
                                           <div>
                                              <p className="text-xs font-black text-slate-800">{allMedications.find(m => m.id === admin.student_medication_id)?.medicine_name}</p>
                                              <p className="text-[9px] font-bold text-slate-400 uppercase">Given at {new Date(admin.time_given?.toDate ? admin.time_given.toDate() : admin.time_given).toLocaleTimeString()}</p>
                                           </div>
                                           <div className={`px-2 py-1 rounded text-[8px] font-black uppercase ${admin.was_on_time ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                              {admin.was_on_time ? 'On Time' : `${admin.minutes_late}m Late`}
                                           </div>
                                        </div>
                                      ))}
                                   </div>
                                 ) : <p className="text-sm font-bold text-slate-400 italic">No medications recorded today.</p>}
                               </div>

                               <div className="space-y-4">
                                 <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                                   <BookOpen size={14} /> Homework Submissions
                                 </h4>
                                 {homeworkSubmissions.filter(s => s.studentId === student.id).length > 0 ? (
                                   <div className="space-y-2">
                                      {homeworkSubmissions.filter(s => s.studentId === student.id).map(sub => (
                                        <div key={sub.id} className="bg-white p-3 rounded-xl border border-slate-100 flex items-center justify-between">
                                           <div className="flex items-center gap-3">
                                              <img src={sub.imageBase64} className="w-10 h-10 rounded-lg object-cover" />
                                              <div>
                                                 <p className="text-xs font-black text-slate-800">Assignment ID: {sub.assignmentId?.slice(-4)}</p>
                                                 <p className="text-[9px] font-bold text-slate-400 uppercase">By {sub.matronName || 'Parent'} at {new Date(sub.submittedAt?.toDate ? sub.submittedAt.toDate() : sub.submittedAt).toLocaleTimeString()}</p>
                                              </div>
                                           </div>
                                           <CheckCircle size={14} className="text-green-500" />
                                        </div>
                                      ))}
                                   </div>
                                 ) : <p className="text-sm font-bold text-slate-400 italic">No submissions recorded.</p>}
                               </div>
                            </div>
                         </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {showHistoryStudentId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-white w-full max-w-4xl rounded-[40px] overflow-hidden shadow-2xl animate-fade-in flex flex-col max-h-[90vh]">
              <div className="p-8 bg-coha-900 text-white flex justify-between items-center shrink-0">
                 <div>
                    <h3 className="text-2xl font-black uppercase tracking-tight">Full History</h3>
                    <p className="text-xs text-white/60 font-bold uppercase mt-1 tracking-widest">{students.find(s => s.id === showHistoryStudentId)?.name}</p>
                 </div>
                 <div className="flex gap-3">
                    <Button
                        onClick={() => {
                            const s = students.find(st => st.id === showHistoryStudentId);
                            if (s) downloadStudentReport(s, historyLogs, 'All Time');
                        }}
                        className="bg-white/10 hover:bg-white/20 border border-white/20 !py-2"
                    >
                        <Download size={18} /> Download All
                    </Button>
                    <button onClick={() => setShowHistoryStudentId(null)} className="p-2 hover:bg-white/10 rounded-2xl transition-colors">
                        <XIcon size={24} />
                    </button>
                 </div>
              </div>
              <div className="p-8 overflow-y-auto flex-1 custom-scrollbar bg-slate-50">
                 <div className="space-y-8">
                    {historyLogs.length === 0 && <p className="text-center py-20 text-slate-400 font-bold italic">No records found.</p>}
                    {Object.entries(historyLogs.reduce((acc, log) => {
                        const date = log.logged_at?.toDate ? log.logged_at.toDate() : new Date(log.logged_at);
                        const ds = date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                        if (!acc[ds]) acc[ds] = [];
                        acc[ds].push(log);
                        return acc;
                    }, {} as Record<string, MatronLog[]>)).map(([date, logs]) => (
                        <div key={date}>
                           <div className="flex items-center gap-4 mb-4">
                              <div className="h-px flex-1 bg-slate-200" />
                              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{date}</span>
                              <div className="h-px flex-1 bg-slate-200" />
                           </div>
                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {logs.map(log => (
                                 <div key={log.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                                    <div className="flex justify-between items-start mb-3">
                                       <span className="text-[10px] font-black uppercase tracking-widest text-coha-600 bg-coha-50 px-2 py-0.5 rounded">
                                          {log.category.replace('_', ' ')}
                                       </span>
                                       <span className="text-[9px] font-bold text-slate-300">
                                          {new Date(log.logged_at?.toDate ? log.logged_at.toDate() : log.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                       </span>
                                    </div>
                                    <div className="space-y-1">
                                       {Object.entries(log.log_data).map(([k, v]: [string, any]) => (
                                          <div key={k} className="flex gap-2 text-xs">
                                             <span className="font-bold text-slate-400 uppercase tracking-tighter">{k.replace('_', ' ')}:</span>
                                             <span className="font-bold text-slate-700">{typeof v === 'boolean' ? (v ? 'Yes' : 'No') : Array.isArray(v) ? v.join(', ') : v}</span>
                                          </div>
                                       ))}
                                    </div>
                                 </div>
                              ))}
                           </div>
                        </div>
                    ))}
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
