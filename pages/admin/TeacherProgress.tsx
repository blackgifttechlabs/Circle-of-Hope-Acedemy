import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Teacher, Student, SystemSettings, TermAssessmentRecord, StudentDailyRegister, PRE_PRIMARY_AREAS } from '../../types';
import { getTeacherById, getStudentsForTeacher, getSystemSettings, getAssessmentRecord, getStudentDailyRegister } from '../../services/dataService';
import { Loader } from '../../components/ui/Loader';
import { Button } from '../../components/ui/Button';
import { ArrowLeft, Printer, Download, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getAssessmentRecordKey } from '../../utils/assessmentWorkflow';

interface TermPerformance {
  performance: number;
  recordsCount: number;
  recordNames: string[];
}

interface StudentProgressData {
  student: Student;
  termPerformances: Record<string, TermPerformance>;
  daysPresent: number;
  daysAbsent: number;
}

export const TeacherProgressPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [progressData, setProgressData] = useState<StudentProgressData[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [termId, setTermId] = useState<string>('');
  const [isCached, setIsCached] = useState(false);

  useEffect(() => {
    const fetchTeacherAndData = async () => {
      if (!id) return;
      
      // Check cache first
      const cacheKey = `teacher_progress_${id}`;
      const cachedStr = sessionStorage.getItem(cacheKey);
      if (cachedStr) {
        try {
          const parsed = JSON.parse(cachedStr);
          // If cache is less than 5 minutes old, use it immediately
          if (parsed.timestamp && (Date.now() - parsed.timestamp < 5 * 60 * 1000)) {
            setTeacher(parsed.teacher);
            setProgressData(parsed.progressData);
            setSettings(parsed.settings);
            setTermId(parsed.termId);
            setIsCached(true);
            setLoading(false);
            
            // We can optionally fetch in background to update cache, 
            // but the user specifically asked to cache data so it doesn't keep loading all data every time.
            // We'll fetch in background to get "new data since last load" 
            // and update the UI silently if there are changes.
          }
        } catch (e) {
          console.error("Failed to parse cache", e);
        }
      }

      if (!isCached) {
        setLoading(true);
      }

      try {
        const t = await getTeacherById(id);
        if (!t) {
          setLoading(false);
          return;
        }
        setTeacher(t);

        const setts = await getSystemSettings();
        setSettings(setts);
        
        const activeTerm = t.activeTermId || setts?.activeTermId || 'term-1';
        setTermId(activeTerm);

        if (t) {
          const students = await getStudentsForTeacher(t.id);
          const enrolledStudents = students.filter(s => s.studentStatus === 'ENROLLED');
          
          const data: StudentProgressData[] = [];
          const terms = ['term-1', 'term-2', 'term-3'];
          
          for (const student of enrolledStudents) {
            const termPerformances: Record<string, TermPerformance> = {};
            
            for (const term of terms) {
              // Fetch assessment records for each term
              const record = await getAssessmentRecord(getAssessmentRecordKey(student), student.id, term);
              
              let performance = 0;
              let recordsCount = 0;
              let recordNames: string[] = [];
              
              if (record && record.ratings) {
                const ratings = Object.values(record.ratings);
                recordsCount = ratings.length;
                
                // Calculate performance (FM=100, M=75, AM=50, NM=25)
                const scoreMap: Record<string, number> = { 'FM': 100, 'M': 75, 'AM': 50, 'NM': 25 };
                let totalScore = 0;
                ratings.forEach(r => {
                  totalScore += scoreMap[r] || 0;
                });
                performance = recordsCount > 0 ? Math.round(totalScore / recordsCount) : 0;
                
                // Get names of assessed components
                Object.keys(record.ratings).forEach(compId => {
                  PRE_PRIMARY_AREAS.forEach(area => {
                    const comp = area.components.find(c => c.id === compId);
                    if (comp) recordNames.push(comp.name);
                  });
                });
              }
              
              termPerformances[term] = { performance, recordsCount, recordNames };
            }
            
            // Fetch attendance
            const register = await getStudentDailyRegister(getAssessmentRecordKey(student), student.id);
            let daysPresent = 0;
            let daysAbsent = 0;
            if (register && register.attendance) {
              const days = Object.values(register.attendance);
              daysPresent = days.filter(d => d.status === 'present').length;
              daysAbsent = days.filter(d => d.status === 'absent').length;
            }
            
            data.push({
              student,
              termPerformances,
              daysPresent,
              daysAbsent
            });
          }
          
          setProgressData(data);
          
          // Save to cache
          sessionStorage.setItem(cacheKey, JSON.stringify({
            timestamp: Date.now(),
            teacher: t,
            progressData: data,
            settings: setts,
            termId: activeTerm
          }));
        }
      } catch (error) {
        console.error("Error fetching teacher progress:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTeacherAndData();
  }, [id]);

  const handlePrint = () => {
    if (!teacher) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <html>
        <head>
          <title>Teacher Progress Report - ${teacher.name}</title>
          <style>
            body { font-family: sans-serif; padding: 20px; color: #333; }
            h1 { color: #1a365d; text-align: center; text-transform: uppercase; }
            h2 { color: #2d3748; border-bottom: 2px solid #e2e8f0; padding-bottom: 5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #cbd5e0; padding: 10px; text-align: left; }
            th { background-color: #f7fafc; font-weight: bold; text-transform: uppercase; font-size: 12px; }
            .performance { font-weight: bold; }
            .good { color: #38a169; }
            .average { color: #d69e2e; }
            .poor { color: #e53e3e; }
            .header-info { display: flex; justify-content: space-between; margin-bottom: 20px; }
            .info-box { background: #f7fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; }
          </style>
        </head>
        <body>
          <h1>Teacher Progress Report</h1>
          
          <div class="header-info">
            <div class="info-box">
              <p><strong>Teacher Name:</strong> ${teacher.name}</p>
              <p><strong>Subject/Role:</strong> ${teacher.subject || 'N/A'}</p>
              <p><strong>Assigned Classes:</strong> ${(teacher.assignedClasses || [teacher.assignedClass || '']).filter(Boolean).join(', ') || 'Unassigned'}</p>
            </div>
            <div class="info-box">
              <p><strong>Total Students:</strong> ${progressData.length}</p>
              <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
            </div>
          </div>

          <h2>Student Performance Overview</h2>
          <table>
            <thead>
              <tr>
                <th>Student Name</th>
                <th>Term 1</th>
                <th>Term 2</th>
                <th>Term 3</th>
                <th>Days Present</th>
                <th>Days Absent</th>
              </tr>
            </thead>
            <tbody>
              ${progressData.map(data => `
                <tr>
                  <td>${data.student.name}</td>
                  <td class="performance ${data.termPerformances['term-1']?.performance >= 75 ? 'good' : data.termPerformances['term-1']?.performance >= 50 ? 'average' : 'poor'}">${data.termPerformances['term-1']?.performance || 0}%</td>
                  <td class="performance ${data.termPerformances['term-2']?.performance >= 75 ? 'good' : data.termPerformances['term-2']?.performance >= 50 ? 'average' : 'poor'}">${data.termPerformances['term-2']?.performance || 0}%</td>
                  <td class="performance ${data.termPerformances['term-3']?.performance >= 75 ? 'good' : data.termPerformances['term-3']?.performance >= 50 ? 'average' : 'poor'}">${data.termPerformances['term-3']?.performance || 0}%</td>
                  <td>${data.daysPresent}</td>
                  <td>${data.daysAbsent}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div style="margin-top: 40px; text-align: center; font-size: 12px; color: #718096;">
            Generated by COHA System on ${new Date().toLocaleString()}
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  const handleDownloadCSV = () => {
    if (!teacher) return;
    const headers = ['Student Name', 'Term 1 (%)', 'Term 2 (%)', 'Term 3 (%)', 'Days Present', 'Days Absent'];
    const csvContent = [
      headers.join(','),
      ...progressData.map(data => [
        `"${data.student.name}"`,
        data.termPerformances['term-1']?.performance || 0,
        data.termPerformances['term-2']?.performance || 0,
        data.termPerformances['term-3']?.performance || 0,
        data.daysPresent,
        data.daysAbsent
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Teacher_Progress_${teacher.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadPDF = () => {
    if (!teacher) return;
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(18);
    doc.setTextColor(26, 54, 93); // coha-900
    doc.text('Teacher Progress Report', 14, 22);
    
    // Add teacher info
    doc.setFontSize(11);
    doc.setTextColor(50, 50, 50);
    doc.text(`Teacher: ${teacher.name}`, 14, 32);
    doc.text(`Classes: ${(teacher.assignedClasses || [teacher.assignedClass || '']).filter(Boolean).join(', ') || 'Unassigned'}`, 14, 38);
    doc.text(`Subject: ${teacher.subject || 'N/A'}`, 14, 44);
    
    // Add meta info
    doc.text(`Total Students: ${progressData.length}`, 140, 32);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 140, 38);
    
    // Prepare table data
    const tableColumn = ["Student Name", "Term 1", "Term 2", "Term 3", "Days Present", "Days Absent"];
    const tableRows = progressData.map(data => [
      data.student.name,
      `${data.termPerformances['term-1']?.performance || 0}%`,
      `${data.termPerformances['term-2']?.performance || 0}%`,
      `${data.termPerformances['term-3']?.performance || 0}%`,
      data.daysPresent.toString(),
      data.daysAbsent.toString()
    ]);

    // Add table
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 55,
      theme: 'grid',
      headStyles: { fillColor: [247, 250, 252], textColor: [50, 50, 50], fontStyle: 'bold' },
      styles: { fontSize: 10, cellPadding: 3 },
      alternateRowStyles: { fillColor: [250, 250, 250] }
    });
    
    // Add footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Generated by COHA System on ${new Date().toLocaleString()}`, 14, doc.internal.pageSize.height - 10);
      doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 30, doc.internal.pageSize.height - 10);
    }

    // Save PDF
    doc.save(`Teacher_Progress_${teacher.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  if (loading && !teacher) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader />
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 font-bold uppercase tracking-widest">Teacher not found.</p>
        <Button onClick={() => navigate('/admin/teachers')} className="mt-4">
          <ArrowLeft size={18} className="mr-2" /> Back to Teachers
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/admin/teachers')}
            className="p-2 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tight text-coha-900">{teacher.name}'s Progress</h2>
            <p className="text-sm text-gray-500 font-bold uppercase tracking-widest">{(teacher.assignedClasses || [teacher.assignedClass || '']).filter(Boolean).join(', ') || 'Unassigned'} | {termId}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button onClick={handleDownloadCSV} className="!bg-emerald-600 hover:!bg-emerald-700 !text-white !border-none !rounded-lg shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center gap-2 px-5 py-2.5 font-medium">
            <Download size={18} /> Download CSV
          </Button>
          <Button onClick={handleDownloadPDF} className="!bg-rose-600 hover:!bg-rose-700 !text-white !border-none !rounded-lg shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center gap-2 px-5 py-2.5 font-medium">
            <FileText size={18} /> Download PDF
          </Button>
          <Button onClick={handlePrint} className="!bg-slate-800 hover:!bg-slate-900 !text-white !border-none !rounded-lg shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center gap-2 px-5 py-2.5 font-medium">
            <Printer size={18} /> Print Report
          </Button>
        </div>
      </div>
      
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading && progressData.length === 0 ? (
          <div className="flex justify-center items-center h-64">
            <Loader />
          </div>
        ) : progressData.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 font-bold uppercase tracking-widest">No students found for this class.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-gray-600 uppercase text-xs font-bold">
                <tr>
                  <th className="px-6 py-4">Student Name</th>
                  <th className="px-6 py-4">Term 1 Progress</th>
                  <th className="px-6 py-4">Term 2 Progress</th>
                  <th className="px-6 py-4">Term 3 Progress</th>
                  <th className="px-6 py-4 text-center">Days Present</th>
                  <th className="px-6 py-4 text-center">Days Absent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {progressData.map((data, index) => (
                  <motion.tr 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    key={data.student.id} 
                    className="hover:bg-gray-50"
                  >
                    <td className="px-6 py-4">
                      <div className="font-bold text-coha-900">{data.student.name}</div>
                      <div className="text-xs text-gray-500">ID: {data.student.id}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div 
                            className={`h-2 rounded-full ${data.termPerformances['term-1']?.performance >= 75 ? 'bg-green-500' : data.termPerformances['term-1']?.performance >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${data.termPerformances['term-1']?.performance || 0}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-bold">{data.termPerformances['term-1']?.performance || 0}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div 
                            className={`h-2 rounded-full ${data.termPerformances['term-2']?.performance >= 75 ? 'bg-green-500' : data.termPerformances['term-2']?.performance >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${data.termPerformances['term-2']?.performance || 0}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-bold">{data.termPerformances['term-2']?.performance || 0}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div 
                            className={`h-2 rounded-full ${data.termPerformances['term-3']?.performance >= 75 ? 'bg-green-500' : data.termPerformances['term-3']?.performance >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${data.termPerformances['term-3']?.performance || 0}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-bold">{data.termPerformances['term-3']?.performance || 0}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-green-600">{data.daysPresent}</td>
                    <td className="px-6 py-4 text-center font-bold text-red-600">{data.daysAbsent}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
