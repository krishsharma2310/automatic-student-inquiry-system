import React, { useState } from 'react';
import { supabase } from '../supabase';
import { LogIn, Shield, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useTheme } from '../contexts/ThemeContext';

interface StaffLoginProps {
  onLogin: (user: any) => void;
}

const StaffLogin: React.FC<StaffLoginProps> = ({ onLogin }) => {
  const { theme } = useTheme();
  const [userId, setUserId] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [success, setSuccess] = useState('');
  const [tableMissing, setTableMissing] = useState(false);

  React.useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch('/api/supabase-health');
        const result = await response.json();
        if (result.status === 'error' && result.message.includes('relation "public.users" does not exist')) {
          setTableMissing(true);
        }
      } catch (err) {
        console.error('Health check failed:', err);
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
      }
    } catch (err) {
      console.error('Bootstrap error:', err);
      setError('Network error during bootstrap.');
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
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, name }),
      });
      
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
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className={`${theme === 'dark' ? 'bg-slate-900/50 border-white/10' : 'bg-white border-slate-200 shadow-xl shadow-slate-200/50'} rounded-[2.5rem] p-8 md:p-10 border relative overflow-hidden`}
      >
        <div className="text-center mb-8">
          <div className={`p-4 rounded-2xl inline-block mb-4 ${theme === 'dark' ? 'bg-white/5' : 'bg-slate-50'}`}>
            <LogIn className="h-8 w-8 text-[#D32F2F]" />
          </div>
          <h2 className={`text-3xl font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'} tracking-tight`}>Staff Access</h2>
          <p className={`${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} mt-2 text-sm font-medium`}>Internal portal for KRMU staff</p>
        </div>

        {error && (
          <div className={`${theme === 'dark' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-red-50 text-red-600 border-red-100'} p-4 rounded-xl flex items-center space-x-3 mb-6 border`}>
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p className="text-xs font-bold">{error}</p>
          </div>
        )}

        {success && (
          <div className={`${theme === 'dark' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-green-50 text-green-600 border-green-100'} p-4 rounded-xl flex items-center space-x-3 mb-6 border`}>
            <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
            <p className="text-xs font-bold">{success}</p>
          </div>
        )}

        {tableMissing && (
          <div className={`${theme === 'dark' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-amber-50 text-amber-700 border-amber-100'} p-4 rounded-xl flex items-start space-x-3 mb-6 border`}>
            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold">Database Tables Missing</p>
              <p className="text-[10px] mt-1">Please run the SQL Script in your Supabase SQL Editor.</p>
            </div>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-2">
            <label className={`text-[11px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>User ID (4 Digits)</label>
            <div className="relative">
              <Shield className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                required
                type="text"
                maxLength={4}
                pattern="\d{4}"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className={`w-full pl-12 pr-4 py-4 rounded-2xl border ${theme === 'dark' ? 'bg-white/5 border-white/10 text-white focus:border-red-500/50' : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-[#D32F2F]'} outline-none transition-all font-bold`}
                placeholder="e.g. 1001"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className={`text-[11px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Full Name</label>
            <div className="relative">
              <LogIn className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                required
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`w-full pl-12 pr-4 py-4 rounded-2xl border ${theme === 'dark' ? 'bg-white/5 border-white/10 text-white focus:border-red-500/50' : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-[#D32F2F]'} outline-none transition-all font-bold`}
                placeholder="Enter your name"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full bg-[#D32F2F] hover:bg-[#B71C1C] text-white font-black py-5 rounded-2xl transition-all shadow-xl shadow-red-500/20 disabled:opacity-50 flex items-center justify-center space-x-2`}
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
          <div className="mt-6 pt-6 border-t border-white/5">
            <button
              type="button"
              onClick={handleBootstrap}
              disabled={isBootstrapping}
              className={`w-full ${theme === 'dark' ? 'bg-white/5 text-slate-400 hover:bg-white/10' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'} font-bold py-3 rounded-xl transition-all text-xs flex items-center justify-center space-x-2 border border-transparent`}
            >
              <Shield className="h-4 w-4" />
              <span>{isBootstrapping ? 'Setting up...' : 'Setup Admin Account'}</span>
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default StaffLogin;
