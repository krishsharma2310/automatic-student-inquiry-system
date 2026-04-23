import React, { Suspense, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabase';
import { User, UserRole } from './types';
import ErrorBoundary from './components/ErrorBoundary';

// Pages — lazy loaded for code splitting
const StudentPortal = React.lazy(() => import('./pages/StudentPortal'));
const Login = React.lazy(() => import('./pages/Login'));
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard'));
const TeamLeadDashboard = React.lazy(() => import('./pages/TeamLeadDashboard'));
const CounsellorDashboard = React.lazy(() => import('./pages/CounsellorDashboard'));
const TransportPortal = React.lazy(() => import('./pages/TransportPortal'));

import { ThemeProvider } from './contexts/ThemeContext';
import { RefreshProvider } from './contexts/RefreshContext';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);

  useEffect(() => {
    // Re-read config (in case of define replacement)
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_URL : undefined);
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_ANON_KEY : undefined);

    if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('your-project-id') || supabaseUrl.includes('placeholder')) {
      setConfigError('Supabase configuration is missing or invalid. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the Secrets panel.');
      setLoading(false);
      return;
    }

    if (supabaseUrl.startsWith('postgresql://')) {
      setConfigError('VITE_SUPABASE_URL is set to a PostgreSQL connection string. It must be the Project URL (e.g. https://xyz.supabase.co).');
      setLoading(false);
      return;
    }

    if (!supabaseUrl.startsWith('http')) {
      setConfigError('VITE_SUPABASE_URL is missing "https://". Please ensure it starts with https://');
      setLoading(false);
      return;
    }

    if (!supabaseUrl.includes('supabase.co') && !supabaseUrl.includes('supabase.in') && !supabaseUrl.includes('localhost')) {
      setConfigError('VITE_SUPABASE_URL does not look like a standard Supabase URL. It should end with .supabase.co');
      setLoading(false);
      return;
    }

    // Check active sessions
    const checkUser = async () => {
      try {
        // Check localStorage for custom session
        const savedUser = localStorage.getItem('crm_user');
        if (savedUser) {
          const parsedUser = JSON.parse(savedUser);
          // Verify user still exists and get fresh data
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', parsedUser.id)
            .single();
          
          if (data) {
            setUser({
              id: data.id,
              userId: data.user_id,
              name: data.name,
              email: data.email,
              role: data.role,
              teamLeadId: data.team_lead_id,
              assignedCourses: data.assigned_courses,
              mobileNo: data.mobile_no,
              photoURL: data.photo_url,
              lastSeen: data.last_seen,
              createdAt: data.created_at
            } as User);
          } else {
            localStorage.removeItem('crm_user');
            setUser(null);
          }
          setLoading(false);
          return;
        }

        // Force a network check to verify connection in the background
        // We don't await this so the UI can render immediately
        supabase.from('users').select('count', { count: 'exact', head: true }).then(({ error: pingError }) => {
          if (pingError && pingError.message === 'Failed to fetch') {
            setConfigError('Failed to connect to Supabase. This usually means your VITE_SUPABASE_URL is incorrect, the project is paused, or there is a network block.');
          }
        });

        setLoading(false);
      } catch (err: any) {
        console.error('Check user error:', err);
        setLoading(false);
      }
    };

    checkUser();
  }, []);

  const handleLogin = (userData: User) => {
    localStorage.setItem('crm_user', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('crm_user');
    setUser(null);
  };

  useEffect(() => {
    if (!user) return;

    const updateLastSeen = async () => {
      try {
        await supabase
          .from('users')
          .update({ last_seen: new Date().toISOString() })
          .eq('id', user.id);
      } catch (err) {
        console.error('Error updating last seen:', err);
      }
    };

    updateLastSeen();
    const interval = setInterval(updateLastSeen, 60000);

    return () => clearInterval(interval);
  }, [user?.id]);

  if (configError) {
    const currentUrl = import.meta.env.VITE_SUPABASE_URL || (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_URL : 'Not Set');
    const currentKey = import.meta.env.VITE_SUPABASE_ANON_KEY || (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_ANON_KEY : undefined);
    
    const maskedUrl = currentUrl && currentUrl !== 'Not Set' 
      ? `${currentUrl.substring(0, 15)}...` 
      : 'Not Set';

    const isKeyJwt = !!currentKey && currentKey.split('.').length === 3;

    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-red-100">
          <div className="text-center mb-6">
            <div className="bg-red-100 p-4 rounded-full inline-block text-red-600 mb-4">
              <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Connection Failed</h1>
            <p className="text-gray-600 leading-relaxed">
              {configError}
            </p>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Diagnostics</h3>
            <div className="space-y-2 text-sm font-mono">
              <div className="flex justify-between">
                <span className="text-gray-500">URL:</span>
                <span className="text-gray-900 font-medium">{maskedUrl}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Key Format:</span>
                <span className="text-gray-900 font-medium">
                  {isKeyJwt ? '✅ Valid JWT' : '❌ Invalid Format'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Key Status:</span>
                <span className="text-gray-900 font-medium">
                  {currentKey ? '✅ Loaded' : '❌ Missing'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-800 mb-8">
            <p className="font-bold mb-2 flex items-center">
              <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Common Fixes:
            </p>
            <ul className="list-disc list-inside space-y-1 opacity-90">
              <li>Ensure URL starts with <strong>https://</strong></li>
              <li>Remove any <strong>trailing slash</strong> (e.g. /)</li>
              <li>Check for <strong>extra spaces</strong> in your keys</li>
              <li>Ensure project is not <strong>paused</strong> in Supabase</li>
            </ul>
          </div>

          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-red-600 text-white font-bold py-3 rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-100"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: UserRole[] }) => {
    if (!user) return <Navigate to="/login" replace />;
    if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/" replace />;
    return <>{children}</>;
  };

  const DashboardRedirect = () => {
    if (!user) return <Navigate to="/login" replace />;
    switch (user.role) {
      case 'admin': return <Navigate to="/admin" replace />;
      case 'front_office': return <Navigate to="/admin" replace />;
      case 'team_lead': return <Navigate to="/team-lead" replace />;
      case 'counsellor': return <Navigate to="/counsellor" replace />;
      default: return <Navigate to="/login" replace />;
    }
  };

  return (
    <RefreshProvider>
      <ThemeProvider>
        <ErrorBoundary>
        <Router>
          <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          }>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<StudentPortal />} />
              <Route path="/transport" element={<TransportPortal />} />
              <Route path="/login" element={user ? <DashboardRedirect /> : <Login onLogin={handleLogin} />} />

              {/* Protected Dashboard Routes */}
              <Route path="/admin" element={
                <ProtectedRoute allowedRoles={['admin', 'front_office']}>
                  <AdminDashboard user={user!} />
                </ProtectedRoute>
              } />
              <Route path="/team-lead" element={
                <ProtectedRoute allowedRoles={['team_lead']}>
                  <TeamLeadDashboard user={user!} />
                </ProtectedRoute>
              } />
              <Route path="/counsellor" element={
                <ProtectedRoute allowedRoles={['counsellor']}>
                  <CounsellorDashboard user={user!} />
                </ProtectedRoute>
              } />

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </Router>
      </ErrorBoundary>
    </ThemeProvider>
    </RefreshProvider>
  );
};

export default App;

