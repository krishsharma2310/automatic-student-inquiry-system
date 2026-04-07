import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import Layout from '../components/Layout';
import { LogIn, Mail, Lock, AlertCircle, Shield, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useTheme } from '../contexts/ThemeContext';

interface LoginProps {
  onLogin: (user: any) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const { theme } = useTheme();
  const [userId, setUserId] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const [isBootstrapping, setIsBootstrapping] = useState(false);

  const [success, setSuccess] = useState('');
  const [tableMissing, setTableMissing] = useState(false);

  React.useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch('/api/supabase-health');
        const result = await response.json();
        if (result.status === 'error') {
          if (result.message.includes('relation "public.users" does not exist')) {
            setTableMissing(true);
          } else {
            setError(`Database connection issue: ${result.message}`);
          }
        }
      } catch (err) {
        console.error('Health check failed:', err);
        setError('Could not connect to the backend server. Please ensure the dev server is running.');
      }
    };
    checkHealth();
  }, []);

  const handleBootstrap = async () => {
    setIsBootstrapping(true);
    setError('');
    setSuccess('');
    try {
      const response = await fetch('/api/admin/bootstrap', { method: 'POST' });
      const result = await response.json();
      if (result.success) {
        setSuccess('Admin account created successfully! You can now log in.');
      } else {
        setError(result.error || 'Bootstrap failed');
        if (result.details) {
          console.error('Bootstrap details:', result.details);
        }
      }
    } catch (err) {
      console.error('Bootstrap error:', err);
      setError('Network error during bootstrap. Please check the console.');
    } finally {
      setIsBootstrapping(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, name }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      const result = await response.json();
      
      if (result.success) {
        onLogin({
          id: result.user.id,
          userId: result.user.user_id,
          name: result.user.name,
          email: result.user.email,
          role: result.user.role,
          teamLeadId: result.user.team_lead_id,
          assignedCourses: result.user.assigned_courses,
          mobileNo: result.user.mobile_no,
          photoURL: result.user.photo_url,
          createdAt: result.user.created_at
        });
      } else {
        setError(result.error || 'Invalid User ID or Name');
        if (result.code === 'TABLE_MISSING') {
          setTableMissing(true);
        }
      }
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.name === 'AbortError') {
        setError('Login request timed out. The database might be slow or unreachable.');
      } else {
        setError('Network error. Please ensure the server is running and the database is connected.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-md mx-auto mt-12 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`${theme === 'dark' ? 'bg-[#0A1133] border-white/10' : 'bg-white border-gray-100 shadow-2xl shadow-gray-200/50'} rounded-3xl p-10 border`}
        >
          <div className="text-center mb-10">
            <div className={`p-4 rounded-3xl inline-block mb-6 shadow-xl ${theme === 'dark' ? 'bg-white/5 shadow-red-900/20' : 'bg-white shadow-red-100'}`}>
              <img 
                src="https://www.krmangalam.edu.in/_next/image?url=%2FKRMU-Logo-NAAC.webp&w=750&q=75" 
                alt="KRMU Logo" 
                className="h-12 w-auto object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <h1 className={`text-4xl font-black ${theme === 'dark' ? 'text-white' : 'text-gray-900'} tracking-tight`}>Internal Login</h1>
            <p className={`${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'} mt-3 font-medium`}>Access your dashboard to manage enquiries</p>
          </div>

          {error && (
            <div className={`${theme === 'dark' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-red-50 text-red-600 border-red-100'} p-4 rounded-xl flex items-center space-x-3 mb-6 border`}>
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {success && (
            <div className={`${theme === 'dark' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-green-50 text-green-600 border-green-100'} p-4 rounded-xl flex items-center space-x-3 mb-6 border`}>
              <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
              <p className="text-sm font-medium">{success}</p>
            </div>
          )}

          {tableMissing && (
            <div className={`${theme === 'dark' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-amber-50 text-amber-700 border-amber-100'} p-4 rounded-xl flex items-start space-x-3 mb-6 border`}>
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold">Database Tables Missing</p>
                <p className="text-xs mt-1">Please run the SQL Script in your Supabase SQL Editor to create the "users" table. Without this, you cannot log in.</p>
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className={`block text-sm font-bold ${theme === 'dark' ? 'text-slate-400' : 'text-gray-700'} mb-2 uppercase tracking-wider`}>User ID (4 Digits)</label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  required
                  type="text"
                  maxLength={4}
                  pattern="\d{4}"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className={`w-full pl-11 pr-4 py-3 rounded-xl border ${theme === 'dark' ? 'bg-white/5 border-white/10 text-white focus:ring-red-500/50' : 'bg-white border-gray-200 text-gray-900 focus:ring-[#D32F2F]'} outline-none transition-all`}
                  placeholder="e.g. 1001"
                />
              </div>
            </div>

            <div>
              <label className={`block text-sm font-bold ${theme === 'dark' ? 'text-slate-400' : 'text-gray-700'} mb-2 uppercase tracking-wider`}>Full Name</label>
              <div className="relative">
                <LogIn className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  required
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`w-full pl-11 pr-4 py-3 rounded-xl border ${theme === 'dark' ? 'bg-white/5 border-white/10 text-white focus:ring-red-500/50' : 'bg-white border-gray-200 text-gray-900 focus:ring-[#D32F2F]'} outline-none transition-all`}
                  placeholder="Enter your name"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full ${theme === 'dark' ? 'bg-red-600 hover:bg-red-700 shadow-red-900/20' : 'bg-[#D32F2F] hover:bg-[#B71C1C] shadow-red-100'} text-white font-bold py-4 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg disabled:opacity-50 flex items-center justify-center space-x-2`}
            >
              {loading ? (
                <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <LogIn className="h-5 w-5" />
                </>
              )}
            </button>
          </form>

          {userId === '1001' && (
            <div className={`mt-6 pt-6 border-t ${theme === 'dark' ? 'border-white/10' : 'border-gray-100'}`}>
              <button
                type="button"
                onClick={handleBootstrap}
                disabled={isBootstrapping}
                className={`w-full ${theme === 'dark' ? 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10' : 'bg-gray-50 text-gray-600 border-gray-100 hover:bg-gray-100'} font-bold py-3 rounded-xl transition-all text-sm flex items-center justify-center space-x-2 border`}
              >
                <Shield className="h-4 w-4" />
                <span>{isBootstrapping ? 'Setting up...' : 'First time? Setup Admin Account'}</span>
              </button>
            </div>
          )}

          <div className={`mt-8 pt-8 border-t ${theme === 'dark' ? 'border-white/10' : 'border-gray-100'}`}>
            <h3 className={`text-sm font-bold ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'} uppercase tracking-wider mb-4`}>Troubleshooting</h3>
            <div className={`space-y-3 text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
              <p className="flex items-start space-x-2">
                <span className={`rounded-full h-5 w-5 flex items-center justify-center flex-shrink-0 font-bold text-xs ${theme === 'dark' ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>1</span>
                <span>All staff must use their 4-digit User ID and Name to log in.</span>
              </p>
              <p className="flex items-start space-x-2">
                <span className={`rounded-full h-5 w-5 flex items-center justify-center flex-shrink-0 font-bold text-xs ${theme === 'dark' ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>2</span>
                <span>Staff accounts will only be active AFTER the admin seeds the initial data.</span>
              </p>
              <p className="flex items-start space-x-2">
                <span className={`rounded-full h-5 w-5 flex items-center justify-center flex-shrink-0 font-bold text-xs ${theme === 'dark' ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>3</span>
                <span>Default Admin ID is <strong>1001</strong>.</span>
              </p>
            </div>
          </div>

          <div className={`mt-8 pt-8 border-t ${theme === 'dark' ? 'border-white/10' : 'border-gray-100'} text-center`}>
            <p className={`text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'}`}>
              Forgot your password? Please contact the Head Administrator.
            </p>
          </div>
        </motion.div>
      </div>
    </Layout>
  );
};

export default Login;
