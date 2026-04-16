import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { LandingPage } from './pages/LandingPage';
import { AboutUsPage } from './pages/AboutUsPage';
import { LoginPage } from './pages/LoginPage';
import { ApplyPage } from './pages/ApplyPage';
import { VtcApplyPage } from './pages/VtcApplyPage';
import { SchoolTour } from './pages/SchoolTour';
import { AdminDashboard } from './pages/admin/Dashboard';
import { TeachersPage } from './pages/admin/Teachers';
import { TeacherProgressPage } from './pages/admin/TeacherProgress';
import { StudentsPage } from './pages/admin/Students';
import { StudentDetailsPage } from './pages/admin/StudentDetails';
import { ApplicationsPage } from './pages/admin/Applications';
import { ApplicationDetailsPage } from './pages/admin/ApplicationDetails';
import { VtcApplicationsPage } from './pages/admin/VtcApplications';
import { VtcApplicationDetails } from './pages/admin/VtcApplicationDetails';
import { SettingsPage } from './pages/admin/Settings';
import { ViewLessonPlans } from './pages/admin/ViewLessonPlans';
import { ViewAssessmentProgress } from './pages/admin/ViewAssessmentProgress';
import { AdminAssessmentSheetViewer } from './pages/admin/AdminAssessmentSheetViewer';
import { PaymentsPage } from './pages/admin/Payments';
import { ActivitiesPage } from './pages/admin/Activities';
import { AdminHomeworksPage } from './pages/admin/Homeworks';
import { ParentDashboard } from './pages/parent/Dashboard';
import { ParentAssessmentForm } from './pages/parent/AssessmentForm';
import { ParentAssessmentProgress } from './pages/parent/AssessmentProgress';
import { ParentDailyRegister } from './pages/parent/DailyRegister';
import { TeacherDashboard } from './pages/teacher/Dashboard';
import { TeacherHomeworkPage } from './pages/teacher/Homework';
import { AssessmentPage } from './pages/teacher/AssessmentPage';
import { TermAssessmentPage } from './pages/teacher/TermAssessmentPage';
import { TermAssessmentComponentPage } from './pages/teacher/TermAssessmentComponentPage';
import { SummaryFormPage } from './pages/teacher/SummaryFormPage';
import { SummaryFormGrade1To7 } from './pages/teacher/SummaryFormGrade1To7';
import { DailyRegister } from './pages/teacher/DailyRegister';
import LessonPlanPage from './pages/teacher/LessonPlan';
import LessonPlanGradePage from './pages/teacher/LessonPlanGrade';
import SubjectSelection from './pages/teacher/assessment/SubjectSelection';
import TopicSelection from './pages/teacher/assessment/TopicSelection';
import TopicAssessment from './pages/teacher/assessment/TopicAssessment';
import StudentAssessment from './pages/teacher/assessment/StudentAssessment';
import TermReview from './pages/teacher/assessment/TermReview';
import AssessmentSheet from './pages/teacher/assessment/AssessmentSheet';
import { VtcDashboard } from './pages/vtc/Dashboard';
import { MatronDashboard } from './pages/matron/Dashboard';
import { MatronStudentList } from './pages/matron/StudentList';
import { MatronStudentProfile } from './pages/matron/StudentProfile';
import { MatronSettings } from './pages/matron/Settings';
import { MatronHomeworks } from './pages/matron/Homeworks';
import { MatronRecords } from './pages/admin/MatronRecords';
import { UserRole } from './types';
import { seedAdminUser, getAdminProfile } from './services/dataService';
import { Toast } from './components/ui/Toast';
import { isGrade1To7Class } from './utils/assessmentWorkflow';
import { getSelectedTeachingClass } from './utils/teacherClassSelection';

// Layout Component to wrap protected routes
const AppLayout: React.FC<{ 
  children: React.ReactNode; 
  role: UserRole; 
  user: any; 
  onLogout: () => void 
}> = ({ children, role, user, onLogout }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const hideSidebarOnMobile = role === UserRole.PARENT;

  return (
    <div className="h-screen bg-gray-50 flex font-sans overflow-hidden">
      <div className={hideSidebarOnMobile ? 'hidden lg:block' : ''}>
        <Sidebar 
          isOpen={sidebarOpen} 
          onClose={() => setSidebarOpen(false)} 
          role={role}
          user={user}
          onLogout={onLogout}
        />
      </div>
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        <main className="flex-1 p-5 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

import { TeacherSettings } from './pages/teacher/TeacherSettings';

import { MyClass } from './pages/teacher/MyClass';

const TeacherSummaryRoute: React.FC<{ user: any }> = ({ user }) => {
  const location = useLocation();
  const selectedClass = getSelectedTeachingClass(user, location.search);
  return isGrade1To7Class(selectedClass)
    ? <SummaryFormGrade1To7 user={user} />
    : <SummaryFormPage user={user} />;
};

const TeacherLessonPlanRoute: React.FC<{ user: any }> = ({ user }) => {
  const location = useLocation();
  const selectedClass = getSelectedTeachingClass(user, location.search);
  return isGrade1To7Class(selectedClass)
    ? <LessonPlanGradePage user={user} />
    : <LessonPlanPage user={user} />;
};

const ProtectedRoute: React.FC<{
  isAuthenticated: boolean;
  userRole: UserRole | null;
  allowedRoles: UserRole[];
  children: React.ReactNode;
}> = ({ isAuthenticated, userRole, allowedRoles, children }) => {
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (userRole && !allowedRoles.includes(userRole)) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const App: React.FC = () => {
  const [user, setUser] = useState<any>(() => {
    const savedUser = localStorage.getItem('coha_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [role, setRole] = useState<UserRole | null>(() => {
    const savedRole = localStorage.getItem('coha_role');
    return savedRole ? (savedRole as UserRole) : null;
  });
  
  // Toast State
  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);

  useEffect(() => {
    // Seed admin on app load
    seedAdminUser();
    
    // Check if admin is currently active to refresh profile name
    if (user && role === UserRole.ADMIN) {
        getAdminProfile().then(profile => {
            setUser((prev: any) => ({...prev, name: profile.name}));
        });
    }
  }, []);

  const handleLogin = (newRole: UserRole, newUser: any) => {
    setUser(newUser);
    setRole(newRole);
    localStorage.setItem('coha_user', JSON.stringify(newUser));
    localStorage.setItem('coha_role', newRole);
  };

  const handleLogout = () => {
    setUser(null);
    setRole(null);
    localStorage.removeItem('coha_user');
    localStorage.removeItem('coha_role');
    sessionStorage.clear(); // Clear cached data on logout
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setToastVisible(true);
  };

  return (
    <>
      <Toast 
        message={toastMessage} 
        isVisible={toastVisible} 
        onClose={() => setToastVisible(false)} 
      />
      <HashRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/about-us" element={<AboutUsPage />} />
          <Route path="/apply" element={<ApplyPage />} />
          <Route path="/vtc-apply" element={<VtcApplyPage />} />
          <Route path="/tour" element={<SchoolTour />} />
          <Route path="/login" element={<LoginPage onLogin={handleLogin} showToast={showToast} />} />

          {/* Admin Routes */}
          <Route path="/admin/*" element={
            <ProtectedRoute isAuthenticated={!!user} userRole={role} allowedRoles={[UserRole.ADMIN]}>
              <AppLayout role={UserRole.ADMIN} user={user} onLogout={handleLogout}>
                <Routes>
                  {user?.adminRole === 'sub_admin' ? (
                    <>
                      <Route path="applications" element={<ApplicationsPage />} />
                      <Route path="applications/:id" element={<ApplicationDetailsPage />} />
                      <Route path="vtc-applications" element={<VtcApplicationsPage />} />
                      <Route path="vtc-applications/:id" element={<VtcApplicationDetails />} />
                      <Route path="payments" element={<PaymentsPage user={user} />} />
                      <Route path="homeworks" element={<AdminHomeworksPage />} />
                      <Route path="students" element={<StudentsPage user={user} />} />
                      <Route path="students/:id" element={<StudentDetailsPage user={user} />} />
                      <Route path="matron-records" element={<MatronRecords />} />
                      <Route path="*" element={<Navigate to="applications" />} />
                    </>
                  ) : (
                    <>
                      <Route path="dashboard" element={<AdminDashboard />} />
                      <Route path="applications" element={<ApplicationsPage />} />
                      <Route path="applications/:id" element={<ApplicationDetailsPage />} />
                      <Route path="vtc-applications" element={<VtcApplicationsPage />} />
                      <Route path="vtc-applications/:id" element={<VtcApplicationDetails />} />
                      <Route path="teachers" element={<TeachersPage user={user} />} />
                      <Route path="teachers/:id/progress" element={<TeacherProgressPage />} />
                      <Route path="lesson-plans" element={<ViewLessonPlans />} />
                      <Route path="assessment-progress" element={<ViewAssessmentProgress />} />
                      <Route path="assessment-progress/view/:className/:subject" element={<AdminAssessmentSheetViewer />} />
                      <Route path="payments" element={<PaymentsPage user={user} />} />
                      <Route path="activities" element={<ActivitiesPage />} />
                      <Route path="homeworks" element={<AdminHomeworksPage />} />
                      <Route path="students" element={<StudentsPage user={user} />} />
                      <Route path="students/:id" element={<StudentDetailsPage user={user} />} />
                      <Route path="matron-records" element={<MatronRecords />} />
                      <Route path="assessment/:id" element={<AssessmentPage userRole={UserRole.ADMIN} user={user} />} />
                      <Route path="settings" element={<SettingsPage />} />
                      <Route path="*" element={<Navigate to="dashboard" />} />
                    </>
                  )}
                </Routes>
              </AppLayout>
            </ProtectedRoute>
          } />

          {/* Teacher Routes */}
          <Route path="/teacher/*" element={
            <ProtectedRoute isAuthenticated={!!user} userRole={role} allowedRoles={[UserRole.TEACHER]}>
              <AppLayout role={UserRole.TEACHER} user={user} onLogout={handleLogout}>
                <Routes>
                    <Route path="dashboard" element={<TeacherDashboard user={user} />} />
                    <Route path="classes" element={<MyClass user={user} />} />
                    <Route path="register" element={<DailyRegister user={user} />} />
                    <Route path="homework" element={<TeacherHomeworkPage user={user} />} />
                    <Route path="assessment/:id" element={<AssessmentPage userRole={UserRole.TEACHER} user={user} />} />
                    <Route path="term-assessment/:id" element={<TermAssessmentPage user={user} />} />
                    <Route path="term-assessment-component" element={<TermAssessmentComponentPage user={user} />} />
                    <Route path="summary-form" element={<TeacherSummaryRoute user={user} />} />
                    <Route path="assess" element={<SubjectSelection user={user} />} />
                    <Route path="assess/:subject" element={<TopicSelection user={user} />} />
                    <Route path="assess/:subject/:term/:topic" element={<TopicAssessment user={user} />} />
                    <Route path="assess/:subject/:term/review" element={<TermReview user={user} />} />
                    <Route path="assessment-sheet/:subject" element={<AssessmentSheet user={user} />} />
                    <Route path="assess/student/:id" element={<StudentAssessment user={user} />} />
                    <Route path="lesson-plan" element={<TeacherLessonPlanRoute user={user} />} />
                    <Route path="settings" element={<TeacherSettings user={user} />} />
                    <Route path="*" element={<Navigate to="dashboard" />} />
                </Routes>
              </AppLayout>
            </ProtectedRoute>
          } />

           {/* Parent Routes */}
           <Route path="/parent/*" element={
            <ProtectedRoute isAuthenticated={!!user} userRole={role} allowedRoles={[UserRole.PARENT]}>
               <AppLayout role={UserRole.PARENT} user={user} onLogout={handleLogout}>
                  <Routes>
                      <Route path="dashboard" element={<ParentDashboard user={user} onLogout={handleLogout} />} />
                      <Route path="assessment-form" element={<ParentAssessmentForm user={user} />} />
                      <Route path="assessment" element={<ParentAssessmentProgress user={user} />} />
                      <Route path="register" element={<ParentDailyRegister user={user} />} />
                      <Route path="*" element={<Navigate to="dashboard" />} />
                  </Routes>
              </AppLayout>
            </ProtectedRoute>
          } />

          {/* Matron Routes */}
          <Route path="/matron/*" element={
            <ProtectedRoute isAuthenticated={!!user} userRole={role} allowedRoles={[UserRole.MATRON]}>
               <AppLayout role={UserRole.MATRON} user={user} onLogout={handleLogout}>
                  <Routes>
                      <Route path="dashboard" element={<MatronDashboard user={user} />} />
                      <Route path="students" element={<MatronStudentList />} />
                      <Route path="students/:id" element={<MatronStudentProfile user={user} />} />
                      <Route path="homeworks" element={<MatronHomeworks user={user} />} />
                      <Route path="settings" element={<MatronSettings user={user} />} />
                      <Route path="*" element={<Navigate to="dashboard" />} />
                  </Routes>
              </AppLayout>
            </ProtectedRoute>
          } />

          {/* VTC Student Routes */}
          <Route path="/vtc/*" element={
            <ProtectedRoute isAuthenticated={!!user} userRole={role} allowedRoles={[UserRole.VTC_STUDENT]}>
               <AppLayout role={UserRole.VTC_STUDENT} user={user} onLogout={handleLogout}>
                  <Routes>
                      <Route path="dashboard" element={<VtcDashboard user={user} />} />
                      <Route path="*" element={<Navigate to="dashboard" />} />
                  </Routes>
              </AppLayout>
            </ProtectedRoute>
          } />

        </Routes>
      </HashRouter>
    </>
  );
};

export default App;
