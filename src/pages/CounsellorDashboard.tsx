import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import Layout from '../components/Layout';
import { User, Enquiry, TimeLog } from '../types';
import { Clock, Play, Square, CheckCircle2, AlertCircle, MessageSquare, User as UserIcon, Calendar, MapPin, Phone, Mail, BookOpen, Bus, Home, CreditCard, ExternalLink, Coffee, Timer, Download } from 'lucide-react';
import { downloadCSV } from '../utils/csvExport';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '../contexts/ThemeContext';
import '../styles/pages/CounsellorDashboard.css';

interface CounsellorDashboardProps {
  user: User;
}

const CounsellorDashboard: React.FC<CounsellorDashboardProps> = ({ user }) => {
  const { theme } = useTheme();
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [activeEnquiry, setActiveEnquiry] = useState<Enquiry | null>(null);
  const [activeLog, setActiveLog] = useState<TimeLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [timer, setTimer] = useState(0);
  const [onBreak, setOnBreak] = useState(user.onBreak || false);
  const [breakTimer, setBreakTimer] = useState(0);
  const [breakDuration, setBreakDuration] = useState(user.breakDurationMins || 30);
  const [isUpdatingDuration, setIsUpdatingDuration] = useState(false);

  const stats = {
    total: enquiries.length,
    pending: enquiries.filter(e => e.status === 'Pending').length,
    inProgress: enquiries.filter(e => e.status === 'In Progress').length,
    completed: enquiries.filter(e => e.status === 'Completed').length,
  };

  useEffect(() => {
    const fetchEnquiries = async () => {
      const { data, error } = await supabase
        .from('enquiries')
        .select('*')
        .eq('counsellor_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching enquiries:', error);
      } else {
        setEnquiries(data.map(e => ({
          id: e.id,
          tokenId: e.token_id,
          studentName: e.student_name,
          fatherName: e.father_name || '',
          lastInstitution: e.last_institution || '',
          address: e.address || '',
          state: e.state || '',
          pincode: e.pincode || '',
          studentEmail: e.student_email,
          studentPhone: e.student_phone,
          course: e.course,
          category: e.category || '',
          marks12th: e.marks_12th,
          marksGrad: e.marks_grad,
          city: e.city || '',
          message: e.message || '',
          status: e.status,
          createdAt: e.created_at,
          counsellorId: e.counsellor_id,
          teamLeadId: e.team_lead_id,
          lastUpdated: e.last_updated,
          notes: e.notes
        } as Enquiry)));
      }
      setLoading(false);
    };

    fetchEnquiries();

    // Fetch user break status
    const fetchUserStatus = async () => {
      const { data, error } = await supabase
        .from('users')
        .select('on_break, break_start_time, break_duration_mins')
        .eq('id', user.id)
        .single();
      
      if (data) {
        setOnBreak(data.on_break);
        setBreakDuration(data.break_duration_mins || 30);
        if (data.on_break && data.break_start_time) {
          const start = new Date(data.break_start_time).getTime();
          const now = new Date().getTime();
          const durationMs = (data.break_duration_mins || 30) * 60 * 1000;
          const elapsed = now - start;
          const remaining = Math.max(0, Math.floor((durationMs - elapsed) / 1000));
          setBreakTimer(remaining);
        }
      }
    };
    fetchUserStatus();

    // Subscribe to enquiries changes
    const enquiriesChannel = supabase
      .channel('enquiries_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'enquiries',
        filter: `counsellor_id=eq.${user.id}`
      }, () => {
        fetchEnquiries();
      })
      .subscribe();

    // Subscribe to own user record for real-time break status sync
    const userChannel = supabase
      .channel('user_status_changes')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'users',
        filter: `id=eq.${user.id}`
      }, (payload) => {
        const data = payload.new as any;
        setOnBreak(data.on_break);
        setBreakDuration(data.break_duration_mins || 30);
        if (data.on_break && data.break_start_time) {
          const start = new Date(data.break_start_time).getTime();
          const now = new Date().getTime();
          const durationMs = (data.break_duration_mins || 30) * 60 * 1000;
          const elapsed = now - start;
          const remaining = Math.max(0, Math.floor((durationMs - elapsed) / 1000));
          setBreakTimer(remaining);
        } else {
          setBreakTimer(0);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(enquiriesChannel);
      supabase.removeChannel(userChannel);
    };
  }, [user.id]);

  useEffect(() => {
    let interval: any;
    if (activeLog) {
      interval = setInterval(() => {
        const start = new Date(activeLog.startTime).getTime();
        const now = new Date().getTime();
        setTimer(Math.floor((now - start) / 1000));
      }, 1000);
    } else {
      setTimer(0);
    }
    return () => clearInterval(interval);
  }, [activeLog]);

  useEffect(() => {
    let interval: any;
    if (onBreak && breakTimer > 0) {
      interval = setInterval(() => {
        setBreakTimer(prev => Math.max(0, prev - 1));
      }, 1000);
    } else if (onBreak && breakTimer === 0) {
      // Auto-end break if needed or just stay at 0
    }
    return () => clearInterval(interval);
  }, [onBreak, breakTimer]);

  const handleStartTimer = async (enquiry: Enquiry) => {
    try {
      const startTime = new Date().toISOString();
      const logData = {
        enquiry_id: enquiry.id,
        counsellor_id: user.id,
        start_time: startTime,
      };
      
      const { data, error } = await supabase
        .from('time_logs')
        .insert([logData])
        .select()
        .single();

      if (error) throw error;
      
      setActiveLog({ 
        id: data.id, 
        enquiryId: data.enquiry_id,
        counsellorId: data.counsellor_id,
        startTime: data.start_time
      } as TimeLog);
      setActiveEnquiry(enquiry);
      setNotes(enquiry.notes || '');

      // Update enquiry status to In Progress if it was Pending
      if (enquiry.status === 'Pending') {
        // Optimistic update
        setEnquiries(prev => prev.map(e => e.id === enquiry.id ? { ...e, status: 'In Progress' } : e));
        if (activeEnquiry?.id === enquiry.id) {
          setActiveEnquiry(prev => prev ? { ...prev, status: 'In Progress' } : null);
        }

        await supabase
          .from('enquiries')
          .update({
            status: 'In Progress',
            last_updated: new Date().toISOString()
          })
          .eq('id', enquiry.id);
      }
    } catch (err: any) {
      console.error('Error starting timer:', err);
    }
  };

  const handleStopTimer = async () => {
    if (!activeLog || !activeEnquiry) return;

    try {
      const endTime = new Date().toISOString();
      const startTime = new Date(activeLog.startTime).getTime();
      const totalTime = new Date(endTime).getTime() - startTime;

      await supabase
        .from('time_logs')
        .update({
          end_time: endTime,
          total_time: totalTime
        })
        .eq('id', activeLog.id);

      await supabase
        .from('enquiries')
        .update({
          notes,
          last_updated: new Date().toISOString()
        })
        .eq('id', activeEnquiry.id);

      setActiveLog(null);
      setActiveEnquiry(null);
      setNotes('');
    } catch (err: any) {
      console.error('Error stopping timer:', err);
    }
  };

  const handleUpdateStatus = async (enquiryId: string, status: Enquiry['status']) => {
    try {
      // Optimistic update
      setEnquiries(prev => prev.map(e => e.id === enquiryId ? { ...e, status } : e));
      if (activeEnquiry?.id === enquiryId) {
        setActiveEnquiry(prev => prev ? { ...prev, status } : null);
      }

      const { error } = await supabase
        .from('enquiries')
        .update({
          status,
          last_updated: new Date().toISOString()
        })
        .eq('id', enquiryId);

      if (error) throw error;
    } catch (err: any) {
      console.error('Error updating status:', err);
      // Revert on error if needed, but fetchEnquiries from subscription will eventually fix it
    }
  };

  const handleToggleBreak = async () => {
    if (activeLog) {
      alert("Please stop your current session before taking a break.");
      return;
    }

    try {
      const newBreakStatus = !onBreak;
      const startTime = newBreakStatus ? new Date().toISOString() : null;
      
      const response = await fetch('/api/users/toggle-break', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          onBreak: newBreakStatus,
          startTime: startTime
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        const error: any = new Error(errorData.error || 'Failed to update break status');
        if (errorData.sql) error.sql = errorData.sql;
        throw error;
      }

      setOnBreak(newBreakStatus);
      if (newBreakStatus) {
        setBreakTimer(breakDuration * 60);
      } else {
        setBreakTimer(0);
      }
      
      // Update local storage to keep state in sync if needed, 
      // though fetchUserStatus handles it on mount.
      const storedUser = localStorage.getItem('crm_user');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        parsedUser.onBreak = newBreakStatus;
        localStorage.setItem('crm_user', JSON.stringify(parsedUser));
      }
    } catch (err: any) {
      console.error('Error toggling break:', err);
      const errorMessage = typeof err === 'object' ? (err.message || JSON.stringify(err)) : String(err);
      const sqlMessage = err.sql ? `\n\nSQL to run:\n${err.sql}` : '';
      alert(`Failed to update break status: ${errorMessage}${sqlMessage}`);
    }
  };

  const handleUpdateBreakDuration = async (newDuration: number) => {
    if (newDuration < 5 || newDuration > 120) return;
    
    setIsUpdatingDuration(true);
    try {
      const response = await fetch('/api/users/update-break-duration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          duration: newDuration
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        const error: any = new Error(errorData.error || 'Failed to update break duration');
        if (errorData.sql) error.sql = errorData.sql;
        throw error;
      }

      setBreakDuration(newDuration);
    } catch (err: any) {
      console.error('Error updating break duration:', err);
      const errorMessage = typeof err === 'object' ? (err.message || JSON.stringify(err)) : String(err);
      const sqlMessage = err.sql ? `\n\nSQL to run:\n${err.sql}` : '';
      alert(`Failed to update break duration: ${errorMessage}${sqlMessage}`);
    } finally {
      setIsUpdatingDuration(false);
    }
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <Layout userRole={user.role} userName={user.name} userId={user.userId}>
      {/* Header with Break Status */}
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className={`text-4xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} tracking-tight mb-2`}>Counsellor Portal</h1>
          <p className={`${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'} text-lg`}>Welcome back, <span className="text-blue-400 font-semibold">{user.name}</span>. Here's your workload for today.</p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Break Duration Setting */}
          <div className={`${theme === 'dark' ? 'bg-white/5 border-white/10 hover:border-white/20' : 'bg-white border-gray-200 hover:border-gray-300'} flex items-center space-x-2 border rounded-2xl px-4 py-2.5 shadow-sm group transition-all`}>
            <Clock className="h-4 w-4 text-slate-500" />
            <div className="flex items-center space-x-1">
              <input 
                type="number" 
                min="5"
                max="120"
                value={breakDuration}
                onChange={(e) => handleUpdateBreakDuration(parseInt(e.target.value) || 0)}
                disabled={onBreak || isUpdatingDuration}
                className={`w-10 bg-transparent ${theme === 'dark' ? 'text-white' : 'text-gray-900'} font-bold text-center outline-none disabled:opacity-50`}
              />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">min</span>
            </div>
          </div>

          {onBreak && (
            <div className="flex items-center space-x-3 px-5 py-2.5 bg-orange-500/10 text-orange-400 rounded-2xl border border-orange-500/20 shadow-lg shadow-orange-500/10 animate-pulse">
              <Timer className="h-5 w-5" />
              <span className="text-lg font-bold font-mono tracking-tighter">{formatTime(breakTimer)}</span>
            </div>
          )}
          
          <button
            onClick={handleToggleBreak}
            className={`flex items-center space-x-2 px-8 py-3.5 rounded-2xl font-bold transition-all shadow-xl hover:scale-[1.02] active:scale-[0.98] ${
              onBreak 
                ? 'bg-orange-500 text-white shadow-orange-500/20' 
                : theme === 'dark' 
                  ? 'bg-white/5 text-white border border-white/10 shadow-black/20 hover:bg-white/10' 
                  : 'bg-white text-gray-700 border border-gray-200 shadow-sm hover:bg-gray-50'
            }`}
          >
            <Coffee className={`h-5 w-5 ${onBreak ? 'fill-current' : ''}`} />
            <span>{onBreak ? 'End Break' : 'Lunch Break'}</span>
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
        {[
          { label: 'Total Enquiries', value: stats.total, color: 'blue', icon: BookOpen },
          { label: 'Pending', value: stats.pending, color: 'amber', icon: AlertCircle },
          { label: 'In Progress', value: stats.inProgress, color: 'indigo', icon: Clock },
          { label: 'Completed', value: stats.completed, color: 'emerald', icon: CheckCircle2 },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`p-6 rounded-3xl border shadow-xl transition-all group relative overflow-hidden ${
              theme === 'dark' 
                ? `border-white/10 bg-gradient-to-br ${
                    stat.color === 'blue' ? 'from-blue-600/20 to-blue-900/40 border-blue-500/20' : 
                    stat.color === 'amber' ? 'from-amber-600/20 to-amber-900/40 border-amber-500/20' : 
                    stat.color === 'indigo' ? 'from-indigo-600/20 to-indigo-900/40 border-indigo-500/20' : 
                    'from-emerald-600/20 to-emerald-900/40 border-emerald-500/20'
                  }`
                : `border-transparent bg-gradient-to-br shadow-lg ${
                    stat.color === 'blue' ? 'from-blue-50 to-blue-100/50 text-blue-900' : 
                    stat.color === 'amber' ? 'from-amber-50 to-amber-100/50 text-amber-900' : 
                    stat.color === 'indigo' ? 'from-indigo-50 to-indigo-100/50 text-indigo-900' : 
                    'from-emerald-50 to-emerald-100/50 text-emerald-900'
                  }`
            }`}
          >
            <div className={`p-3 rounded-2xl ${
              theme === 'dark'
                ? `bg-${stat.color === 'blue' ? 'blue-500/20' : stat.color === 'amber' ? 'amber-500/20' : stat.color === 'indigo' ? 'indigo-500/20' : 'emerald-500/20'} text-${stat.color === 'blue' ? 'blue-400' : stat.color === 'amber' ? 'amber-400' : stat.color === 'indigo' ? 'indigo-400' : 'emerald-400'}`
                : `bg-white shadow-sm text-${stat.color === 'blue' ? 'blue-600' : stat.color === 'amber' ? 'amber-600' : stat.color === 'indigo' ? 'indigo-600' : 'emerald-600'}`
            } inline-block mb-4 group-hover:scale-110 transition-transform`}>
              <stat.icon className="h-6 w-6" />
            </div>
            <p className={`text-sm font-bold ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-widest mb-1`}>{stat.label}</p>
            <p className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{stat.value}</p>
            <div className={`absolute -right-4 -bottom-4 w-24 h-24 rounded-full blur-3xl opacity-20 ${
              theme === 'dark'
                ? `bg-${stat.color === 'blue' ? 'blue-400' : stat.color === 'amber' ? 'amber-400' : stat.color === 'indigo' ? 'indigo-400' : 'emerald-400'}`
                : `bg-${stat.color === 'blue' ? 'blue-200' : stat.color === 'amber' ? 'amber-200' : stat.color === 'indigo' ? 'indigo-200' : 'emerald-200'}`
            }`}></div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Enquiries List */}
        <div className="lg:col-span-4 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} flex items-center space-x-3`}>
              <div className="w-2 h-8 bg-blue-600 rounded-full"></div>
              <span>Active Queue</span>
            </h2>
            <button
              onClick={() => downloadCSV(enquiries, `enquiries_${user.name.replace(/\s+/g, '_').toLowerCase()}`)}
              className={`p-2 rounded-lg transition-all ${
                theme === 'dark' 
                  ? 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 shadow-sm'
              }`}
              title="Download Enquiries"
            >
              <Download className="h-4 w-4" />
            </button>
          </div>
          
          <div className="space-y-4 max-h-[800px] overflow-y-auto pr-4 scrollbar-hide">
            {enquiries.map((e, i) => (
              <motion.div
                key={e.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                layoutId={e.id}
                onClick={() => !activeLog && setActiveEnquiry(e)}
                className={`p-5 rounded-[2rem] border-2 cursor-pointer transition-all relative overflow-hidden group ${
                  activeEnquiry?.id === e.id 
                    ? theme === 'dark'
                      ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20' 
                      : 'border-blue-500 bg-blue-600 text-white shadow-lg shadow-blue-200'
                    : theme === 'dark'
                      ? 'border-white/5 bg-white/5 hover:bg-white/10 shadow-sm hover:shadow-md hover:border-white/20'
                      : 'border-slate-200 bg-white hover:bg-slate-50 shadow-sm hover:shadow-md hover:border-blue-200'
                } ${activeLog && activeLog.enquiryId !== e.id ? 'opacity-40 grayscale pointer-events-none' : ''}`}
              >
                {activeEnquiry?.id === e.id && (
                  <div className={`absolute top-0 right-0 w-24 h-24 ${theme === 'dark' ? 'bg-blue-500/10' : 'bg-white/20'} rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-150`}></div>
                )}
                
                <div className="flex justify-between items-start mb-3 relative z-10">
                  <div className="space-y-1">
                    <span className={`block font-bold ${activeEnquiry?.id === e.id && theme === 'light' ? 'text-white' : theme === 'dark' ? 'text-white' : 'text-slate-900'} text-lg leading-tight`}>{e.studentName}</span>
                    <span className={`block text-xs font-mono ${activeEnquiry?.id === e.id && theme === 'light' ? 'text-blue-100' : theme === 'dark' ? 'text-blue-400' : 'text-blue-600'} font-bold uppercase tracking-tighter`}>{e.tokenId}</span>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    e.status === 'Completed' 
                      ? theme === 'dark' ? 'bg-emerald-500/20 text-emerald-400' : activeEnquiry?.id === e.id ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'
                      : e.status === 'In Progress' 
                        ? theme === 'dark' ? 'bg-amber-500/20 text-amber-400' : activeEnquiry?.id === e.id ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'
                        : theme === 'dark' ? 'bg-blue-500/20 text-blue-400' : activeEnquiry?.id === e.id ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {e.status}
                  </span>
                </div>
                
                <div className="flex flex-wrap gap-3 relative z-10">
                  <div className={`flex items-center space-x-1.5 text-xs ${activeEnquiry?.id === e.id && theme === 'light' ? 'text-white bg-white/10' : theme === 'dark' ? 'text-slate-300 bg-white/5' : 'text-slate-600 bg-slate-100'} font-medium px-2 py-1 rounded-lg`}>
                    <BookOpen className={`h-3.5 w-3.5 ${activeEnquiry?.id === e.id && theme === 'light' ? 'text-white' : theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
                    <span className="truncate max-w-[150px]">{e.course}</span>
                  </div>
                  <div className={`flex items-center space-x-1.5 text-xs ${activeEnquiry?.id === e.id && theme === 'light' ? 'text-blue-100' : theme === 'dark' ? 'text-slate-500' : 'text-slate-400'} font-medium`}>
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{new Date(e.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </motion.div>
            ))}
            {enquiries.length === 0 && !loading && (
              <div className={`text-center py-20 ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'} rounded-[3rem] border-2 border-dashed`}>
                <div className={`${theme === 'dark' ? 'bg-white/10' : 'bg-gray-100'} p-4 rounded-full inline-block mb-4 shadow-sm`}>
                  <UserIcon className={`h-8 w-8 ${theme === 'dark' ? 'text-slate-600' : 'text-gray-400'}`} />
                </div>
                <p className="text-slate-500 font-medium">No enquiries assigned yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* Active Enquiry / Details Area */}
        <div className="lg:col-span-8">
          <AnimatePresence mode="wait">
            {activeEnquiry ? (
              <motion.div
                key={activeEnquiry.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className={`${theme === 'dark' ? 'bg-white/5 backdrop-blur-2xl border-white/10' : 'bg-white border-gray-100 shadow-xl'} rounded-[3rem] shadow-2xl border overflow-hidden flex flex-col h-full`}
              >
                {/* Timer Header */}
                <div className={`p-8 flex items-center justify-between transition-all ${
                  activeLog 
                    ? 'bg-red-600 text-white' 
                    : theme === 'dark' 
                      ? 'bg-white/5 text-white border-b border-white/10' 
                      : 'bg-white text-gray-900 border-b border-gray-100'
                }`}>
                  <div className="flex items-center space-x-6">
                    <div className={`p-4 rounded-2xl ${
                      activeLog 
                        ? 'bg-white/20 animate-pulse' 
                        : theme === 'dark' 
                          ? 'bg-white/10' 
                          : 'bg-blue-50 text-blue-600'
                    }`}>
                      <Clock className="h-8 w-8" />
                    </div>
                    <div>
                      <p className={`text-xs font-black uppercase tracking-[0.2em] mb-1 ${activeLog ? 'opacity-60' : theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>Session Duration</p>
                      <p className="text-4xl font-mono font-bold tracking-tighter">{formatTime(timer)}</p>
                    </div>
                  </div>
                  
                  {activeLog ? (
                    <button
                      onClick={handleStopTimer}
                      className="bg-white text-red-600 px-10 py-5 rounded-[2rem] font-black uppercase tracking-widest flex items-center space-x-3 hover:bg-gray-100 transition-all shadow-2xl shadow-black/20 group"
                    >
                      <Square className="h-6 w-6 fill-current group-hover:scale-110 transition-transform" />
                      <span>End Session</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleStartTimer(activeEnquiry)}
                      className="bg-blue-600 text-white px-10 py-5 rounded-[2rem] font-black uppercase tracking-widest flex items-center space-x-3 hover:bg-blue-700 transition-all shadow-2xl shadow-blue-900/20 group"
                    >
                      <Play className="h-6 w-6 fill-current group-hover:scale-110 transition-transform" />
                      <span>Start Session</span>
                    </button>
                  )}
                </div>

                <div className="p-10 flex-grow overflow-y-auto">
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-12 mb-12">
                    <div className="space-y-8">
                      <div>
                        <h3 className={`text-xs font-black ${theme === 'dark' ? 'text-slate-500' : 'text-gray-400'} uppercase tracking-[0.3em] mb-6 flex items-center`}>
                          <span className={`w-8 h-px ${theme === 'dark' ? 'bg-white/10' : 'bg-gray-200'} mr-4`}></span>
                          Student Profile
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          <div className={`p-4 rounded-2xl ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-blue-50/50 border-blue-100/50 border'}`}>
                            <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Full Name</p>
                            <p className={`${theme === 'dark' ? 'text-white' : 'text-slate-900'} font-bold`}>{activeEnquiry.studentName}</p>
                          </div>
                          <div className={`p-4 rounded-2xl ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-emerald-50/50 border-emerald-100/50 border'}`}>
                            <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Contact Number</p>
                            <p className={`${theme === 'dark' ? 'text-white' : 'text-slate-900'} font-bold`}>{activeEnquiry.studentPhone}</p>
                          </div>
                          <div className={`p-4 rounded-2xl ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-purple-50/50 border-purple-100/50 border'}`}>
                            <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Email Address</p>
                            <p className={`${theme === 'dark' ? 'text-white' : 'text-slate-900'} font-bold truncate`}>{activeEnquiry.studentEmail}</p>
                          </div>
                          <div className={`p-4 rounded-2xl ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-amber-50/50 border-amber-100/50 border'}`}>
                            <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Father's Name</p>
                            <p className={`${theme === 'dark' ? 'text-white' : 'text-slate-900'} font-bold`}>{activeEnquiry.fatherName || 'N/A'}</p>
                          </div>
                          <div className={`p-4 rounded-2xl ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-slate-50/50 border-slate-100/50 border'}`}>
                            <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Last Institution</p>
                            <p className={`${theme === 'dark' ? 'text-white' : 'text-slate-900'} font-bold`}>{activeEnquiry.lastInstitution || 'N/A'}</p>
                          </div>
                          <div className={`p-4 rounded-2xl ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-indigo-50/50 border-indigo-100/50 border'}`}>
                            <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Category</p>
                            <p className={`${theme === 'dark' ? 'text-white' : 'text-slate-900'} font-bold`}>{activeEnquiry.category || 'General'}</p>
                          </div>
                          <div className={`p-4 rounded-2xl ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-rose-50/50 border-rose-100/50 border'}`}>
                            <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">12th Marks (%)</p>
                            <p className={`${theme === 'dark' ? 'text-white' : 'text-slate-900'} font-bold`}>{activeEnquiry.marks12th || 'N/A'}</p>
                          </div>
                          <div className={`p-4 rounded-2xl ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-cyan-50/50 border-cyan-100/50 border'}`}>
                            <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Graduation Marks (%)</p>
                            <p className={`${theme === 'dark' ? 'text-white' : 'text-slate-900'} font-bold`}>{activeEnquiry.marksGrad || 'N/A'}</p>
                          </div>
                          <div className={`p-4 rounded-2xl ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-slate-50/50 border-slate-100/50 border'} col-span-1 sm:col-span-2`}>
                            <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Full Address</p>
                            <p className={`${theme === 'dark' ? 'text-white' : 'text-slate-900'} font-bold`}>
                              {activeEnquiry.address}, {activeEnquiry.city}, {activeEnquiry.state} - {activeEnquiry.pincode}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className={`text-xs font-black ${theme === 'dark' ? 'text-slate-500' : 'text-gray-400'} uppercase tracking-[0.3em] mb-6 flex items-center`}>
                          <span className={`w-8 h-px ${theme === 'dark' ? 'bg-white/10' : 'bg-gray-200'} mr-4`}></span>
                          Academic Interest
                        </h3>
                        <div className="p-6 rounded-[2rem] bg-gradient-to-br from-blue-600 to-blue-800 text-white shadow-xl shadow-blue-900/20">
                          <div className="flex items-center space-x-4 mb-4">
                            <div className="p-3 bg-white/20 rounded-2xl">
                              <BookOpen className="h-6 w-6" />
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-blue-100 uppercase">Target Course</p>
                              <p className="text-xl font-bold leading-tight">{activeEnquiry.course}</p>
                            </div>
                          </div>
                          <div className="h-px bg-white/20 my-4"></div>
                          <p className="text-sm text-blue-50/80 leading-relaxed italic">
                            "{activeEnquiry.message || 'No specific message or requirements provided by the student.'}"
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-8">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className={`text-xs font-black ${theme === 'dark' ? 'text-slate-500' : 'text-gray-400'} uppercase tracking-[0.3em] flex items-center`}>
                          <span className={`w-8 h-px ${theme === 'dark' ? 'bg-white/10' : 'bg-gray-200'} mr-4`}></span>
                          Session Records
                        </h3>
                        <div className="flex items-center space-x-3">
                          <span className="text-[10px] font-black text-slate-500 uppercase">Status</span>
                          <select
                            value={activeEnquiry.status}
                            onChange={(e) => handleUpdateStatus(activeEnquiry.id, e.target.value as Enquiry['status'])}
                            className={`text-xs font-black uppercase ${theme === 'dark' ? 'bg-white/10 text-white' : 'bg-gray-100 text-gray-900'} border-none rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 cursor-pointer hover:bg-white/20 transition-colors`}
                          >
                            <option value="Pending" className={theme === 'dark' ? 'bg-slate-900' : ''}>Pending</option>
                            <option value="In Progress" className={theme === 'dark' ? 'bg-slate-900' : ''}>In Progress</option>
                            <option value="Completed" className={theme === 'dark' ? 'bg-slate-900' : ''}>Completed</option>
                          </select>
                        </div>
                      </div>
                      
                      <div className="relative">
                        <div className={`absolute top-4 left-4 ${theme === 'dark' ? 'text-slate-600' : 'text-gray-400'}`}>
                          <MessageSquare className="h-6 w-6" />
                        </div>
                        <textarea
                          rows={12}
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          disabled={!activeLog}
                          className={`w-full p-8 pl-14 rounded-[2.5rem] border-2 ${theme === 'dark' ? 'border-white/5 bg-white/5 text-white' : 'border-gray-100 bg-white text-gray-900'} focus:border-blue-500 focus:ring-0 outline-none transition-all disabled:opacity-50 font-medium leading-relaxed shadow-inner`}
                          placeholder={activeLog ? "Document your interaction with the student here..." : "Activate session to begin documentation"}
                        />
                        {!activeLog && (
                          <div className={`absolute inset-0 flex items-center justify-center ${theme === 'dark' ? 'bg-black/20' : 'bg-gray-50/50'} backdrop-blur-[1px] rounded-[2.5rem]`}>
                            <div className={`${theme === 'dark' ? 'bg-slate-800 border-white/10' : 'bg-white border-gray-200'} px-6 py-3 rounded-2xl shadow-xl border flex items-center space-x-3`}>
                              <AlertCircle className="h-5 w-5 text-amber-500" />
                              <span className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-700'}`}>Start session to edit notes</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className={`h-full flex flex-col items-center justify-center text-center p-20 ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'} backdrop-blur-2xl rounded-[4rem] border-4 border-dashed`}>
                <motion.div 
                  animate={{ 
                    y: [0, -10, 0],
                    rotate: [0, 5, -5, 0]
                  }}
                  transition={{ 
                    duration: 4, 
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className={`${theme === 'dark' ? 'bg-white/10' : 'bg-gray-100'} p-10 rounded-[3rem] mb-8 shadow-inner`}
                >
                  <UserIcon className={`h-20 w-20 ${theme === 'dark' ? 'text-white/10' : 'text-gray-200'}`} />
                </motion.div>
                <h3 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4 tracking-tight`}>Ready for the next student?</h3>
                <p className={`${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'} max-w-sm text-lg leading-relaxed`}>Select a student from your queue to view their profile and begin a professional counselling session.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Quick Portals - Bento Grid Style */}
      <div className="mt-20">
        <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-8 flex items-center space-x-3`}>
          <div className="w-2 h-8 bg-indigo-600 rounded-full"></div>
          <span>University Resources</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { 
              title: 'Transport', 
              desc: 'Bus routes & schedules', 
              icon: Bus, 
              color: 'blue', 
              url: 'https://krmangalam.edu.in/transport' 
            },
            { 
              title: 'Hostel', 
              desc: 'Room & mess management', 
              icon: Home, 
              color: 'emerald', 
              url: 'https://krmangalam.edu.in/hostel' 
            },
            { 
              title: 'Payments', 
              desc: 'Fee & financial records', 
              icon: CreditCard, 
              color: 'purple', 
              url: 'https://payment.collexo.com/user/login/?dest=/kr-mangalam-university-sohna-haryana-43490/applicant/' 
            },
          ].map((portal) => (
            <motion.a
              key={portal.title}
              href={portal.url}
              target="_blank"
              whileHover={{ y: -8, scale: 1.02 }}
              className={`p-8 rounded-[2.5rem] border transition-all group relative overflow-hidden ${
                theme === 'dark' 
                  ? `border-white/10 bg-gradient-to-br ${
                      portal.color === 'blue' ? 'from-blue-600/20 to-blue-900/40' : 
                      portal.color === 'emerald' ? 'from-emerald-600/20 to-emerald-900/40' : 
                      'from-purple-600/20 to-purple-900/40'
                    }`
                  : `bg-white border-gray-100 shadow-xl shadow-gray-200/50 hover:shadow-2xl hover:shadow-gray-300/50`
              }`}
            >
              <div className={`absolute top-0 right-0 w-32 h-32 ${
                theme === 'dark'
                  ? `bg-${portal.color === 'blue' ? 'blue-400' : portal.color === 'emerald' ? 'emerald-400' : 'purple-400'}`
                  : `bg-${portal.color === 'blue' ? 'blue-100' : portal.color === 'emerald' ? 'emerald-100' : 'purple-100'}`
              } rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500 opacity-10`}></div>
              <div className="relative z-10">
                <div className={`p-4 rounded-2xl ${
                  theme === 'dark'
                    ? `bg-${portal.color === 'blue' ? 'blue-500/20' : portal.color === 'emerald' ? 'emerald-500/20' : 'purple-500/20'} text-${portal.color === 'blue' ? 'blue-400' : portal.color === 'emerald' ? 'emerald-400' : 'purple-400'}`
                    : `bg-${portal.color === 'blue' ? 'blue-50' : portal.color === 'emerald' ? 'emerald-50' : 'purple-50'} text-${portal.color === 'blue' ? 'blue-600' : portal.color === 'emerald' ? 'emerald-600' : 'purple-600'}`
                } inline-block mb-6`}>
                  <portal.icon className="h-8 w-8" />
                </div>
                <h3 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-2`}>{portal.title} Portal</h3>
                <p className={`${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'} mb-8 font-medium`}>{portal.desc}</p>
                <div className={`flex items-center text-sm font-black uppercase tracking-widest ${theme === 'dark' ? 'text-white' : 'text-gray-900'} group-hover:text-blue-600 transition-colors`}>
                  <span>Open Portal</span>
                  <ExternalLink className="h-4 w-4 ml-2 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </div>
              </div>
            </motion.a>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default CounsellorDashboard;
