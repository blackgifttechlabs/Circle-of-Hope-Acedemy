import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Briefcase, GraduationCap, Search, Wrench } from 'lucide-react';
import { getApplications, getInternshipApplications, getStudents, getVtcApplications } from '../../services/dataService';
import { Application, InternshipApplication, Student, VtcApplication } from '../../types';

type HistoryTab = 'STUDENT' | 'VTC' | 'INTERNSHIP';

type HistoryRow = {
  id: string;
  type: HistoryTab;
  name: string;
  classOrProgram: string;
  contact: string;
  submittedAt: any;
  statusLabel: string;
  statusTone: string;
  rawStatus: string;
  detailsPath: string;
};

const fmtDate = (value: any) => {
  if (!value) return '-';
  if (typeof value?.toDate === 'function') return value.toDate().toLocaleDateString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString();
};

const studentStatusLabel = (application: Application, student?: Student) => {
  if (application.status === 'REJECTED') return 'Rejected';
  if (application.status === 'PENDING') return 'Pending Review';

  if (!student) return 'Approved';
  if (student.studentStatus === 'WAITING_PAYMENT') return 'Pending Payment';
  if (student.studentStatus === 'PAYMENT_VERIFICATION') return 'Payment Verification';
  if (student.studentStatus === 'ASSESSMENT') return 'Assessment';
  if (student.studentStatus === 'ENROLLED') return 'Complete';
  return student.studentStatus || 'Approved';
};

const statusTone = (label: string) => {
  const normalized = label.toLowerCase();
  if (normalized.includes('complete') || normalized.includes('verified') || normalized === 'approved') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (normalized.includes('pending') || normalized.includes('payment') || normalized.includes('assessment')) return 'bg-amber-50 text-amber-700 border-amber-200';
  if (normalized.includes('reject')) return 'bg-red-50 text-red-700 border-red-200';
  return 'bg-blue-50 text-blue-700 border-blue-200';
};

const vtcStatusLabel = (status: VtcApplication['status']) => {
  const labels: Record<VtcApplication['status'], string> = {
    PENDING: 'Pending Review',
    PAYMENT_REQUIRED: 'Pending Payment',
    VERIFYING: 'Payment Verification',
    APPROVED: 'Approved',
    VERIFIED: 'Complete',
    REJECTED: 'Rejected',
  };
  return labels[status] || status;
};

const internshipStatusLabel = (status: InternshipApplication['status']) => {
  const labels: Record<InternshipApplication['status'], string> = {
    PENDING: 'Pending Review',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
  };
  return labels[status] || status;
};

export const ApplicationHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<HistoryTab>('STUDENT');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [studentApplications, setStudentApplications] = useState<Application[]>([]);
  const [vtcApplications, setVtcApplications] = useState<VtcApplication[]>([]);
  const [internshipApplications, setInternshipApplications] = useState<InternshipApplication[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const [apps, vtcApps, internshipApps, studentRecords] = await Promise.all([
        getApplications(),
        getVtcApplications(),
        getInternshipApplications(),
        getStudents(),
      ]);
      setStudentApplications(apps);
      setVtcApplications(vtcApps);
      setInternshipApplications(internshipApps);
      setStudents(studentRecords);
      setLoading(false);
    };
    loadData();
  }, []);

  const rows = useMemo<HistoryRow[]>(() => {
    const studentsByApplication = new Map<string, Student>();
    students.forEach((student) => {
      const sourceApplicationId = (student as any).sourceApplicationId || student.approvedStudentId;
      if (sourceApplicationId) studentsByApplication.set(sourceApplicationId, student);
    });

    const studentRows = studentApplications.map((application) => {
      const linkedStudent = application.id ? studentsByApplication.get(application.id) : undefined;
      const label = studentStatusLabel(application, linkedStudent);
      return {
        id: application.id || '',
        type: 'STUDENT' as const,
        name: `${application.firstName || ''} ${application.surname || ''}`.trim() || '-',
        classOrProgram: application.grade || application.level || '-',
        contact: application.fatherName || application.motherName || application.fatherPhone || application.motherPhone || '-',
        submittedAt: application.submissionDate,
        statusLabel: label,
        statusTone: statusTone(label),
        rawStatus: linkedStudent?.studentStatus || application.status,
        detailsPath: `/admin/applications/${application.id}`,
      };
    });

    const vtcRows = vtcApplications.map((application) => {
      const label = vtcStatusLabel(application.status);
      return {
        id: application.id || '',
        type: 'VTC' as const,
        name: `${application.firstName || ''} ${application.surname || ''}`.trim() || '-',
        classOrProgram: application.highestGradePassed || 'VTC',
        contact: application.emailAddress || application.cellNo || '-',
        submittedAt: application.submissionDate,
        statusLabel: label,
        statusTone: statusTone(label),
        rawStatus: application.status,
        detailsPath: `/admin/vtc-applications/${application.id}`,
      };
    });

    const internshipRows = internshipApplications.map((application) => {
      const label = internshipStatusLabel(application.status);
      return {
        id: application.id || '',
        type: 'INTERNSHIP' as const,
        name: `${application.firstName || ''} ${application.surname || ''}`.trim() || '-',
        classOrProgram: application.opportunityType || '-',
        contact: application.emailAddress || application.phoneNumber || '-',
        submittedAt: application.submissionDate,
        statusLabel: label,
        statusTone: statusTone(label),
        rawStatus: application.status,
        detailsPath: `/admin/internships/${application.id}`,
      };
    });

    return [...studentRows, ...vtcRows, ...internshipRows];
  }, [internshipApplications, studentApplications, students, vtcApplications]);

  const filteredRows = rows.filter((row) => {
    const needle = searchTerm.toLowerCase();
    const matchesTab = row.type === activeTab;
    const matchesSearch = `${row.id} ${row.name} ${row.classOrProgram} ${row.contact} ${row.statusLabel} ${row.rawStatus}`.toLowerCase().includes(needle);
    return matchesTab && matchesSearch;
  });

  const counts = {
    STUDENT: rows.filter((row) => row.type === 'STUDENT').length,
    VTC: rows.filter((row) => row.type === 'VTC').length,
    INTERNSHIP: rows.filter((row) => row.type === 'INTERNSHIP').length,
  };

  const tabs = [
    { id: 'STUDENT' as const, label: 'Student Applications', icon: GraduationCap, count: counts.STUDENT },
    { id: 'VTC' as const, label: 'VTC Applications', icon: Wrench, count: counts.VTC },
    { id: 'INTERNSHIP' as const, label: 'Internships', icon: Briefcase, count: counts.INTERNSHIP },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
        <div>
          <button onClick={() => navigate('/admin/applications')} className="mb-3 inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900">
            <ArrowLeft size={16} /> Back to Applications
          </button>
          <h2 className="text-2xl font-bold text-coha-900">Previous Applications</h2>
          <p className="text-gray-600">Complete application history with the current review, payment, and completion status.</p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 border px-4 py-2 text-sm font-black uppercase transition-colors ${activeTab === tab.id ? 'border-coha-900 bg-coha-900 text-white' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              <Icon size={16} /> {tab.label}
              <span className={`rounded-full px-2 py-0.5 text-[10px] ${activeTab === tab.id ? 'bg-white text-coha-900' : 'bg-gray-100 text-gray-500'}`}>{tab.count}</span>
            </button>
          );
        })}
      </div>

      <div className="bg-white border border-gray-200 shadow-sm">
        <div className="border-b border-gray-200 p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input
              className="w-full border border-gray-300 py-2 pl-10 pr-4 outline-none"
              placeholder="Search previous applications..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-400">
              <tr>
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Applicant</th>
                <th className="px-6 py-4">Class / Programme</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4">Submitted</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-sm text-gray-500">Loading application history...</td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-sm text-gray-500">No applications found.</td>
                </tr>
              ) : filteredRows.map((row) => (
                <tr key={`${row.type}-${row.id}`} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-mono text-xs text-gray-400">{row.id}</td>
                  <td className="px-6 py-4 font-bold text-coha-900">{row.name}</td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-800">{row.classOrProgram}</td>
                  <td className="px-6 py-4 text-xs font-semibold text-gray-600">{row.contact}</td>
                  <td className="px-6 py-4 text-xs text-gray-500">{fmtDate(row.submittedAt)}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${row.statusTone}`}>
                      {row.statusLabel}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button onClick={() => navigate(row.detailsPath)} className="text-coha-500 font-bold hover:underline uppercase text-[10px] tracking-widest">
                      Open
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
