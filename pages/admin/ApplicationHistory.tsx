import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BadgeCheck, CalendarDays, GraduationCap, Hash, MousePointerClick, Phone, Search, User } from 'lucide-react';
import { getApplications, getInternshipApplications, getStudents, getVtcApplications } from '../../services/dataService';
import { Application, InternshipApplication, Student, VtcApplication } from '../../types';
import { ApplicationWorkspace } from '../../components/admin/ApplicationWorkspace';
import { TableHeaderCell, TableSkeletonRows } from '../../components/ui/TablePrimitives';

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

  const typeCounts = rows.reduce<Record<HistoryTab, number>>((acc, row) => {
    acc[row.type] = (acc[row.type] || 0) + 1;
    return acc;
  }, { STUDENT: 0, VTC: 0, INTERNSHIP: 0 });

  return (
    <ApplicationWorkspace activeTab="history">
      <div className="apps-toolbar" style={{ paddingTop: '76px' }}>
          <div className="apps-search-wrap" style={{ marginRight: 'auto' }}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              className="apps-search-input"
              placeholder="Search previous applications..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
          <div className="apps-tabs" style={{ marginLeft: 'auto', justifyContent: 'flex-end' }}>
            {(['STUDENT', 'VTC', 'INTERNSHIP'] as HistoryTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`apps-tab ${activeTab === tab ? 'active' : ''}`}
              >
                {tab === 'STUDENT' ? 'Student History' : tab === 'VTC' ? 'VTC History' : 'Internship History'}
                <span className={`pill ${typeCounts[tab] === 0 ? 'zero' : ''}`}>{typeCounts[tab]}</span>
              </button>
            ))}
          </div>
      </div>

        <div className="overflow-x-auto">
          <table className="apps-table">
            <thead>
              <tr>
                <TableHeaderCell icon={Hash}>ID</TableHeaderCell>
                <TableHeaderCell icon={User}>Applicant</TableHeaderCell>
                <TableHeaderCell icon={GraduationCap}>Class / Programme</TableHeaderCell>
                <TableHeaderCell icon={Phone}>Contact</TableHeaderCell>
                <TableHeaderCell icon={CalendarDays}>Submitted</TableHeaderCell>
                <TableHeaderCell icon={BadgeCheck}>Status</TableHeaderCell>
                <TableHeaderCell icon={MousePointerClick}>Action</TableHeaderCell>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeletonRows rows={10} columns={7} />
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-sm text-gray-500">No applications found.</td>
                </tr>
              ) : filteredRows.map((row) => (
                <tr key={`${row.type}-${row.id}`}>
                  <td className="apps-id">{row.id}</td>
                  <td className="apps-name">{row.name}</td>
                  <td className="font-bold text-gray-800">{row.classOrProgram}</td>
                  <td className="text-xs font-semibold text-gray-600">{row.contact}</td>
                  <td className="text-xs text-gray-500">{fmtDate(row.submittedAt)}</td>
                  <td>
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${row.statusTone}`}>
                      {row.statusLabel}
                    </span>
                  </td>
                  <td>
                    <button onClick={() => navigate(row.detailsPath)} className="apps-open-btn">
                      Open
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
    </ApplicationWorkspace>
  );
};
