import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { ApplyPage } from './pages/ApplyPage';
import { VtcApplyPage } from './pages/VtcApplyPage';
import { SchoolTour } from './pages/SchoolTour';
import { AdminDashboard } from './pages/admin/Dashboard';
import { TeachersPage } from './pages/admin/Teachers';
import { StudentsPage } from './pages/admin/Students';
import { StudentDetailsPage } from './pages/admin/StudentDetails';
import { ApplicationsPage } from './pages/admin/Applications';
import { ApplicationDetailsPage } from './pages/admin/ApplicationDetails';
import { VtcApplicationsPage } from './pages/admin/VtcApplications';
import { VtcApplicationDetails } from './pages/admin/VtcApplicationDetails';
import { SettingsPage } from './pages/admin/Settings';
import { ParentDashboard } from './pages/parent/Dashboard';
import { ParentAssessmentForm } from './pages/parent/AssessmentForm';
import { ParentAssessmentProgress } from './pages/parent/AssessmentProgress';
import { TeacherDashboard } from './pages/teacher/Dashboard';
import { AssessmentPage } from './pages/teacher/AssessmentPage';
import { VtcDashboard } from './pages/vtc/Dashboard';
import { UserRole } from './types';
import { seedAdminUser, getAdminProfile } from './services/dataService';
import { Toast } from './components/ui/Toast';

// Layout Component to wrap protected routes
const AppLayout: React.FC<{ 
  children: React.ReactNode; 
  role: UserRole; 
  user: any; 
  onLogout: () => void 
}> = ({ children, role, user, onLogout }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="h-screen bg-gray-50 flex font-sans overflow-hidden">
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        role={role}
        onLogout={onLogout}
      />
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        <Header 
          onMenuClick={() => setSidebarOpen(!sidebarOpen)} 
          role={role}
          userName={user?.name}
          onLogout={onLogout}
        />
        <main className="flex-1 p-5 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
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
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  
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
  };

  const handleLogout = () => {
    setUser(null);
    setRole(null);
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
          <Route path="/apply" element={<ApplyPage />} />
          <Route path="/vtc-apply" element={<VtcApplyPage />} />
          <Route path="/tour" element={<SchoolTour />} />
          <Route path="/login" element={<LoginPage onLogin={handleLogin} showToast={showToast} />} />

          {/* Admin Routes */}
          <Route path="/admin/*" element={
            <ProtectedRoute isAuthenticated={!!user} userRole={role} allowedRoles={[UserRole.ADMIN]}>
              <AppLayout role={UserRole.ADMIN} user={user} onLogout={handleLogout}>
                <Routes>
                  <Route path="dashboard" element={<AdminDashboard />} />
                  <Route path="applications" element={<ApplicationsPage />} />
                  <Route path="applications/:id" element={<ApplicationDetailsPage />} />
                  <Route path="vtc-applications" element={<VtcApplicationsPage />} />
                  <Route path="vtc-applications/:id" element={<VtcApplicationDetails />} />
                  <Route path="teachers" element={<TeachersPage />} />
                  <Route path="students" element={<StudentsPage />} />
                  <Route path="students/:id" element={<StudentDetailsPage />} />
                  <Route path="assessment/:id" element={<AssessmentPage userRole={UserRole.ADMIN} user={user} />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="*" element={<Navigate to="dashboard" />} />
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
                    <Route path="classes" element={<TeacherDashboard user={user} />} />
                    <Route path="assessment/:id" element={<AssessmentPage userRole={UserRole.TEACHER} user={user} />} />
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
                      <Route path="dashboard" element={<ParentDashboard user={user} />} />
                      <Route path="assessment-form" element={<ParentAssessmentForm user={user} />} />
                      <Route path="assessment" element={<ParentAssessmentProgress user={user} />} />
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