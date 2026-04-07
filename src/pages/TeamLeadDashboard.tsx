import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import Layout from '../components/Layout';
import { User, Enquiry, TimeLog } from '../types';
import { Users, Search, BarChart3, Clock, CheckCircle2, AlertCircle, ChevronRight, Play, Square, MessageSquare, User as UserIcon, Calendar, MapPin, Phone, Mail, BookOpen, Bus, Home, CreditCard, ExternalLink, Coffee, Download } from 'lucide-react';
import { downloadCSV } from '../utils/csvExport';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '../contexts/ThemeContext';

interface TeamLeadDashboardProps {
  user: User;
}

const TeamLeadDashboard: React.FC<TeamLeadDashboardProps> = ({ user }) => {
  const { theme } = useTheme();
  const [counsellors, setCounsellors] = useState<User[]>([]);
  const [teamEnquiries, setTeamEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'counsellors' | 'enquiries' | 'my-enquiries'>('overview');
  
  // Counsellor functionality for TL
  const [myEnquiries, setMyEnquiries] = useState<Enquiry[]>([]);
  const [activeEnquiry, setActiveEnquiry] = useState<Enquiry | null>(null);
  const [activeLog, setActiveLog] = useState<TimeLog | null>(null);
  const [notes, setNotes] = useState('');
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    const fetchTeamData = async () => {
      setLoading(true);
      try {
        // Fetch counsellors under this team lead
        const { data: counsellorsData, error: counsellorsError } = await supabase
          .from('users')
          .select('*')
          .eq('team_lead_id', user.id);
        
        if (counsellorsError) throw counsellorsError;
        setCounsellors(counsellorsData.map(u => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          teamLeadId: u.team_lead_id,
          assignedCourses: u.assigned_courses,
          mobileNo: u.mobile_no,
          photoURL: u.photo_url,
          onBreak: u.on_break,
          breakStartTime: u.break_start_time,
          breakDurationMins: u.break_duration_mins,
          createdAt: u.created_at
        } as User)));

        // Fetch all enquiries assigned to this team lead's team
        const { data: enquiriesData, error: enquiriesError } = await supabase
          .from('enquiries')
          .select('*')
          .eq('team_lead_id', user.id)
          .order('created_at', { ascending: false });
        
        if (enquiriesError) throw enquiriesError;
        setTeamEnquiries(enquiriesData.map(e => ({
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

        // Fetch personal enquiries for TL
        const { data: myEnquiriesData, error: myEnquiriesError } = await supabase
          .from('enquiries')
          .select('*')
          .eq('counsellor_id', user.id)
          .order('created_at', { ascending: false });
        
        if (myEnquiriesError) throw myEnquiriesError;
        setMyEnquiries(myEnquiriesData.map(e => ({
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
      } catch (err: any) {
        console.error('Error fetching team data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTeamData();

    // Subscribe to personal enquiries changes
    const enquiriesChannel = supabase
      .channel('tl_personal_enquiries')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'enquiries',
        filter: `counsellor_id=eq.${user.id}`
      }, () => {
        fetchTeamData();
      })
      .subscribe();

    // Subscribe to team enquiries changes
    const teamEnquiriesChannel = supabase
      .channel('tl_team_enquiries')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'enquiries',
        filter: `team_lead_id=eq.${user.id}`
      }, () => {
        fetchTeamData();
      })
      .subscribe();

    // Subscribe to users table for real-time break status of team members
    const usersChannel = supabase
      .channel('tl_team_users')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'users',
        filter: `team_lead_id=eq.${user.id}`
      }, () => {
        fetchTeamData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(enquiriesChannel);
      supabase.removeChannel(teamEnquiriesChannel);
      supabase.removeChannel(usersChannel);
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

      if (enquiry.status === 'Pending') {
        // Optimistic update
        setTeamEnquiries(prev => prev.map(e => e.id === enquiry.id ? { ...e, status: 'In Progress' } : e));
        setMyEnquiries(prev => prev.map(e => e.id === enquiry.id ? { ...e, status: 'In Progress' } : e));
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
      setTeamEnquiries(prev => prev.map(e => e.id === enquiryId ? { ...e, status } : e));
      setMyEnquiries(prev => prev.map(e => e.id === enquiryId ? { ...e, status } : e));
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
    }
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleUpdateBreakDuration = async (counsellorId: string, duration: number) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ break_duration_mins: duration })
        .eq('id', counsellorId);
      
      if (error) throw error;
      
      setCounsellors(prev => prev.map(c => 
        c.id === counsellorId ? { ...c, breakDurationMins: duration } : c
      ));
    } catch (err) {
      console.error('Error updating break duration:', err);
    }
  };

  const getCounsellorStats = (counsellorId: string) => {
    const enquiries = teamEnquiries.filter(e => e.counsellorId === counsellorId);
    return {
      total: enquiries.length,
      completed: enquiries.filter(e => e.status === 'Completed').length,
      pending: enquiries.filter(e => e.status === 'Pending').length,
      inProgress: enquiries.filter(e => e.status === 'In Progress').length,
    };
  };

  return (
    <Layout userRole={user.role} userName={user.name} userId={user.userId}>
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <div className="w-full md:w-64 flex-shrink-0 space-y-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all font-bold ${
              activeTab === 'overview' 
                ? 'bg-[#1976D2] text-white shadow-lg shadow-blue-200' 
                : theme === 'dark' 
                  ? 'bg-white/5 text-slate-400 hover:bg-white/10' 
                  : 'bg-white text-slate-600 hover:bg-blue-50 hover:text-blue-600 border border-slate-200 shadow-sm'
            }`}
          >
            <BarChart3 className={`h-5 w-5 ${activeTab === 'overview' ? 'text-white' : 'text-[#1976D2]'}`} />
            <span>Team Overview</span>
          </button>
          <button
            onClick={() => setActiveTab('counsellors')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all font-bold ${
              activeTab === 'counsellors' 
                ? 'bg-[#1976D2] text-white shadow-lg shadow-blue-200' 
                : theme === 'dark' 
                  ? 'bg-white/5 text-slate-400 hover:bg-white/10' 
                  : 'bg-white text-slate-600 hover:bg-blue-50 hover:text-blue-600 border border-slate-200 shadow-sm'
            }`}
          >
            <Users className={`h-5 w-5 ${activeTab === 'counsellors' ? 'text-white' : 'text-[#1976D2]'}`} />
            <span>My Counsellors</span>
          </button>
          <button
            onClick={() => setActiveTab('enquiries')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all font-bold ${
              activeTab === 'enquiries' 
                ? 'bg-[#1976D2] text-white shadow-lg shadow-blue-200' 
                : theme === 'dark' 
                  ? 'bg-white/5 text-slate-400 hover:bg-white/10' 
                  : 'bg-white text-slate-600 hover:bg-blue-50 hover:text-blue-600 border border-slate-200 shadow-sm'
            }`}
          >
            <Search className={`h-5 w-5 ${activeTab === 'enquiries' ? 'text-white' : 'text-[#1976D2]'}`} />
            <span>Team Enquiries</span>
          </button>
          <button
            onClick={() => setActiveTab('my-enquiries')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all font-bold ${
              activeTab === 'my-enquiries' 
                ? 'bg-[#1976D2] text-white shadow-lg shadow-blue-200' 
                : theme === 'dark' 
                  ? 'bg-white/5 text-slate-400 hover:bg-white/10' 
                  : 'bg-white text-slate-600 hover:bg-blue-50 hover:text-blue-600 border border-slate-200 shadow-sm'
            }`}
          >
            <UserIcon className={`h-5 w-5 ${activeTab === 'my-enquiries' ? 'text-white' : 'text-[#1976D2]'}`} />
            <span>My Enquiries</span>
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-grow">
          <div className={`${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-white border-gray-100'} rounded-2xl shadow-xl p-8 border min-h-[600px]`}>
            {activeTab === 'overview' && (
              <div className="space-y-8">
                <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>Team Performance</h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className={`${theme === 'dark' ? 'bg-blue-500/10 border-blue-500/20' : 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-sm'} p-6 rounded-2xl border`}>
                    <p className={`text-xs font-bold ${theme === 'dark' ? 'text-blue-400' : 'text-blue-700'} uppercase tracking-widest mb-1`}>Total Enquiries</p>
                    <p className={`text-4xl font-bold ${theme === 'dark' ? 'text-white' : 'text-blue-900'}`}>{teamEnquiries.length}</p>
                  </div>
                  <div className={`${theme === 'dark' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200 shadow-sm'} p-6 rounded-2xl border`}>
                    <p className={`text-xs font-bold ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-700'} uppercase tracking-widest mb-1`}>Completed</p>
                    <p className={`text-4xl font-bold ${theme === 'dark' ? 'text-white' : 'text-emerald-900'}`}>{teamEnquiries.filter(e => e.status === 'Completed').length}</p>
                  </div>
                  <div className={`${theme === 'dark' ? 'bg-amber-500/10 border-amber-500/20' : 'bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200 shadow-sm'} p-6 rounded-2xl border`}>
                    <p className={`text-xs font-bold ${theme === 'dark' ? 'text-amber-400' : 'text-amber-700'} uppercase tracking-widest mb-1`}>In Progress</p>
                    <p className={`text-4xl font-bold ${theme === 'dark' ? 'text-white' : 'text-amber-900'}`}>{teamEnquiries.filter(e => e.status === 'In Progress').length}</p>
                  </div>
                  <div className={`${theme === 'dark' ? 'bg-red-500/10 border-red-500/20' : 'bg-gradient-to-br from-red-50 to-red-100 border-red-200 shadow-sm'} p-6 rounded-2xl border`}>
                    <p className={`text-xs font-bold ${theme === 'dark' ? 'text-red-400' : 'text-red-700'} uppercase tracking-widest mb-1`}>Pending</p>
                    <p className={`text-4xl font-bold ${theme === 'dark' ? 'text-white' : 'text-red-900'}`}>{teamEnquiries.filter(e => e.status === 'Pending').length}</p>
                  </div>
                </div>

                <div className="mt-12">
                  <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-slate-200' : 'text-gray-700'} mb-6`}>Counsellor Workload Distribution</h3>
                  <div className="space-y-4">
                    {counsellors.map(c => {
                      const stats = getCounsellorStats(c.id);
                      const percentage = teamEnquiries.length ? Math.round((stats.total / teamEnquiries.length) * 100) : 0;
                      return (
                        <div key={c.id} className={`${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-100'} p-4 rounded-xl border`}>
                          <div className="flex justify-between items-center mb-2">
                            <span className={`font-bold ${theme === 'dark' ? 'text-slate-200' : 'text-gray-700'}`}>{c.name}</span>
                            <span className="text-xs font-bold text-gray-500">{stats.total} Enquiries ({percentage}%)</span>
                          </div>
                          <div className={`w-full ${theme === 'dark' ? 'bg-white/10' : 'bg-gray-200'} rounded-full h-2 overflow-hidden flex`}>
                            <div className="bg-green-500 h-full" style={{ width: `${stats.total ? (stats.completed / stats.total) * 100 : 0}%` }}></div>
                            <div className="bg-yellow-500 h-full" style={{ width: `${stats.total ? (stats.inProgress / stats.total) * 100 : 0}%` }}></div>
                            <div className="bg-blue-500 h-full" style={{ width: `${stats.total ? (stats.pending / stats.total) * 100 : 0}%` }}></div>
                          </div>
                          <div className="flex space-x-4 mt-2">
                            <div className="flex items-center space-x-1">
                              <div className="w-2 h-2 rounded-full bg-green-500"></div>
                              <span className="text-[10px] text-gray-500 uppercase font-bold">Done: {stats.completed}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                              <span className="text-[10px] text-gray-500 uppercase font-bold">Active: {stats.inProgress}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                              <span className="text-[10px] text-gray-500 uppercase font-bold">New: {stats.pending}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Quick Portals */}
                <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <motion.div 
                    whileHover={{ scale: 1.02 }}
                    className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-8 text-white shadow-xl shadow-blue-100 relative overflow-hidden group cursor-pointer"
                  >
                    <div className="absolute top-0 right-0 -mt-4 -mr-4 bg-white/10 w-32 h-32 rounded-full blur-2xl group-hover:bg-white/20 transition-all"></div>
                    <div className="relative z-10">
                      <div className="bg-white/20 p-3 rounded-xl inline-block mb-4">
                        <Bus className="h-8 w-8" />
                      </div>
                      <h3 className="text-2xl font-bold mb-2">Transport Portal</h3>
                      <p className="text-blue-100 mb-6 max-w-[240px]">Manage university bus routes, schedules, and student transport registrations.</p>
                      <a 
                        href="https://krmangalam.edu.in/transport" 
                        target="_blank" 
                        className="bg-white text-blue-600 px-6 py-2 rounded-xl font-bold inline-flex items-center space-x-2 hover:bg-blue-50 transition-colors"
                      >
                        <span>Access Portal</span>
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </motion.div>

                  <motion.div 
                    whileHover={{ scale: 1.02 }}
                    className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl p-8 text-white shadow-xl shadow-emerald-100 relative overflow-hidden group cursor-pointer"
                  >
                    <div className="absolute top-0 right-0 -mt-4 -mr-4 bg-white/10 w-32 h-32 rounded-full blur-2xl group-hover:bg-white/20 transition-all"></div>
                    <div className="relative z-10">
                      <div className="bg-white/20 p-3 rounded-xl inline-block mb-4">
                        <Home className="h-8 w-8" />
                      </div>
                      <h3 className="text-2xl font-bold mb-2">Hostel Portal</h3>
                      <p className="text-emerald-100 mb-6 max-w-[240px]">Oversee room allocations, mess management, and hostel facility requests.</p>
                      <a 
                        href="https://krmangalam.edu.in/hostel" 
                        target="_blank" 
                        className="bg-white text-emerald-600 px-6 py-2 rounded-xl font-bold inline-flex items-center space-x-2 hover:bg-emerald-50 transition-colors"
                      >
                        <span>Access Portal</span>
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </motion.div>

                  <motion.div 
                    whileHover={{ scale: 1.02 }}
                    className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl p-8 text-white shadow-xl shadow-purple-100 relative overflow-hidden group cursor-pointer"
                  >
                    <div className="absolute top-0 right-0 -mt-4 -mr-4 bg-white/10 w-32 h-32 rounded-full blur-2xl group-hover:bg-white/20 transition-all"></div>
                    <div className="relative z-10">
                      <div className="bg-white/20 p-3 rounded-xl inline-block mb-4">
                        <CreditCard className="h-8 w-8" />
                      </div>
                      <h3 className="text-2xl font-bold mb-2">Payment Portal</h3>
                      <p className="text-purple-100 mb-6 max-w-[240px]">Access student fee records, online payments, and financial aid information.</p>
                      <a 
                        href="https://payment.collexo.com/user/login/?dest=/kr-mangalam-university-sohna-haryana-43490/applicant/" 
                        target="_blank" 
                        className="bg-white text-purple-600 px-6 py-2 rounded-xl font-bold inline-flex items-center space-x-2 hover:bg-purple-50 transition-colors"
                      >
                        <span>Access Portal</span>
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </motion.div>
                </div>
              </div>
            )}

            {activeTab === 'counsellors' && (
              <div>
                <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'} mb-8`}>My Team Members</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {counsellors.map(c => {
                    const stats = getCounsellorStats(c.id);
                    return (
                      <div key={c.id} className={`${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-white border-gray-100 shadow-sm'} p-6 rounded-2xl border hover:shadow-md transition-all`}>
                        <div className="flex items-center space-x-3 mb-4">
                          <div className={`${theme === 'dark' ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'} p-2 rounded-lg`}>
                            <Users className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>{c.name}</h3>
                            <p className="text-xs text-gray-500">{c.email}</p>
                          </div>
                          {c.onBreak && (
                            <div className="ml-auto flex items-center space-x-1 px-2 py-1 bg-orange-100 text-orange-700 rounded-lg text-[10px] font-bold uppercase animate-pulse">
                              <Coffee className="h-3 w-3" />
                              <span>On Break</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="space-y-4 mb-4">
                          <div className="space-y-2">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Assigned Courses</p>
                            <div className="flex flex-wrap gap-1">
                              {c.assignedCourses?.map(course => (
                                <span key={course} className={`${theme === 'dark' ? 'bg-white/10 text-slate-300' : 'bg-gray-100 text-gray-600'} px-2 py-0.5 rounded text-[10px] font-bold`}>{course}</span>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Lunch Break Duration (Mins)</p>
                            <div className="flex items-center space-x-2">
                              <input 
                                type="number"
                                value={c.breakDurationMins || 30}
                                onChange={(e) => handleUpdateBreakDuration(c.id, parseInt(e.target.value))}
                                className={`w-20 px-2 py-1 ${theme === 'dark' ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'} border rounded text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none`}
                              />
                              <span className="text-xs text-gray-400">Default: 30m</span>
                            </div>
                          </div>
                        </div>
                        <div className={`pt-4 border-t ${theme === 'dark' ? 'border-white/5' : 'border-gray-50'} flex justify-between`}>
                          <div className="text-center">
                            <p className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>{stats.total}</p>
                            <p className="text-[10px] text-gray-400 uppercase font-bold">Total</p>
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-bold text-green-600">{stats.completed}</p>
                            <p className="text-[10px] text-gray-400 uppercase font-bold">Done</p>
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-bold text-blue-600">{stats.pending}</p>
                            <p className="text-[10px] text-gray-400 uppercase font-bold">New</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'enquiries' && (
              <div>
                <div className="flex justify-between items-center mb-8">
                  <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>Team Enquiries</h2>
                  <button
                    onClick={() => downloadCSV(teamEnquiries, 'team_enquiries')}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-bold transition-all ${
                      theme === 'dark' 
                        ? 'bg-white/5 text-white border border-white/10 hover:bg-white/10' 
                        : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 shadow-sm'
                    }`}
                  >
                    <Download className="h-4 w-4" />
                    <span>Download CSV</span>
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className={`text-left border-b ${theme === 'dark' ? 'border-white/10' : 'border-gray-100 bg-gray-50/50'}`}>
                        <th className={`px-4 py-4 font-bold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} uppercase text-[10px] tracking-widest`}>Token</th>
                        <th className={`px-4 py-4 font-bold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} uppercase text-[10px] tracking-widest`}>Student</th>
                        <th className={`px-4 py-4 font-bold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} uppercase text-[10px] tracking-widest`}>Counsellor</th>
                        <th className={`px-4 py-4 font-bold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} uppercase text-[10px] tracking-widest`}>Status</th>
                        <th className={`px-4 py-4 font-bold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} uppercase text-[10px] tracking-widest`}>Date</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${theme === 'dark' ? 'divide-white/5' : 'divide-gray-50'}`}>
                      {teamEnquiries.map(e => (
                        <tr key={e.id} className={`${theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-gray-50/80'} transition-colors`}>
                          <td className="px-4 py-4 font-mono font-bold text-blue-600 text-sm">{e.tokenId}</td>
                          <td className={`px-4 py-4 font-bold ${theme === 'dark' ? 'text-slate-200' : 'text-gray-900'}`}>{e.studentName}</td>
                          <td className={`px-4 py-4 text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'} font-medium`}>
                            {e.counsellorId === user.id ? 'Me (TL)' : (counsellors.find(c => c.id === e.counsellorId)?.name || 'Unknown')}
                          </td>
                          <td className="px-4 py-4">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              e.status === 'Completed' 
                                ? theme === 'dark' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
                                : e.status === 'In Progress' 
                                  ? theme === 'dark' ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'
                                  : theme === 'dark' ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {e.status}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-xs font-bold text-gray-400">
                            {new Date(e.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'my-enquiries' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Enquiries List */}
                <div className="lg:col-span-1 space-y-4">
                  <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'} flex items-center space-x-2`}>
                    <UserIcon className="h-5 w-5 text-[#1976D2]" />
                    <span>My Students</span>
                  </h2>
                  
                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                    {myEnquiries.map(e => (
                      <motion.div
                        key={e.id}
                        layoutId={e.id}
                        onClick={() => !activeLog && setActiveEnquiry(e)}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all relative overflow-hidden group ${
                          activeEnquiry?.id === e.id 
                            ? theme === 'dark'
                              ? 'border-[#1976D2] bg-blue-500/10 shadow-lg shadow-blue-500/20' 
                              : 'border-[#1976D2] bg-blue-600 text-white shadow-lg shadow-blue-200'
                            : theme === 'dark' 
                              ? 'border-white/5 bg-white/5 hover:border-white/10' 
                              : 'border-slate-200 bg-white hover:bg-blue-50 hover:border-blue-200'
                        } ${activeLog && activeLog.enquiryId !== e.id ? 'opacity-50 pointer-events-none' : ''}`}
                      >
                        <div className="flex justify-between items-start mb-2 relative z-10">
                          <span className={`font-bold ${activeEnquiry?.id === e.id && theme === 'light' ? 'text-white' : theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{e.studentName}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            e.status === 'Completed' ? (activeEnquiry?.id === e.id && theme === 'light' ? 'bg-white/20 text-white' : 'bg-green-100 text-green-700') :
                            e.status === 'In Progress' ? (activeEnquiry?.id === e.id && theme === 'light' ? 'bg-white/20 text-white' : 'bg-yellow-100 text-yellow-700') :
                            (activeEnquiry?.id === e.id && theme === 'light' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700')
                          }`}>
                            {e.status}
                          </span>
                        </div>
                        <div className={`flex items-center space-x-2 text-xs ${activeEnquiry?.id === e.id && theme === 'light' ? 'text-blue-100' : 'text-gray-500'} mb-1 relative z-10`}>
                          <BookOpen className="h-3 w-3" />
                          <span>{e.course}</span>
                        </div>
                        <div className={`flex items-center space-x-2 text-xs ${activeEnquiry?.id === e.id && theme === 'light' ? 'text-blue-100' : 'text-gray-500'} relative z-10`}>
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(e.createdAt).toLocaleDateString()}</span>
                        </div>
                      </motion.div>
                    ))}
                    {myEnquiries.length === 0 && !loading && (
                      <div className={`text-center py-12 ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'} rounded-2xl border border-dashed`}>
                        <p className="text-gray-400">No enquiries assigned to you yet.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Active Enquiry / Details Area */}
                <div className="lg:col-span-2">
                  <AnimatePresence mode="wait">
                    {activeEnquiry ? (
                      <motion.div
                        key={activeEnquiry.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className={`${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-white border-gray-100 shadow-lg'} rounded-2xl border overflow-hidden`}
                      >
                        {/* Timer Header */}
                        <div className={`p-6 flex items-center justify-between transition-colors ${activeLog ? 'bg-red-500/10 text-red-400' : theme === 'dark' ? 'bg-white/5 text-slate-200' : 'bg-gray-50 text-gray-700'}`}>
                          <div className="flex items-center space-x-4">
                            <div className={`p-3 rounded-full ${activeLog ? 'bg-red-500/20 animate-pulse' : theme === 'dark' ? 'bg-white/10' : 'bg-gray-200'}`}>
                              <Clock className="h-6 w-6" />
                            </div>
                            <div>
                              <p className="text-xs font-bold uppercase tracking-widest opacity-70">Session Timer</p>
                              <p className="text-2xl font-mono font-bold">{formatTime(timer)}</p>
                            </div>
                          </div>
                          
                          {activeLog ? (
                            <button
                              onClick={handleStopTimer}
                              className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold flex items-center space-x-2 hover:bg-red-700 transition-all shadow-lg shadow-red-500/20"
                            >
                              <Square className="h-5 w-5 fill-current" />
                              <span>Stop Session</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleStartTimer(activeEnquiry)}
                              className="bg-[#1976D2] text-white px-6 py-3 rounded-xl font-bold flex items-center space-x-2 hover:bg-[#1565C0] transition-all shadow-lg shadow-blue-500/20"
                            >
                              <Play className="h-5 w-5 fill-current" />
                              <span>Start Session</span>
                            </button>
                          )}
                        </div>

                        <div className="p-8">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                            <div className="space-y-4">
                              <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white border-white/10' : 'text-slate-800 border-slate-200'} border-b pb-2`}>Student Details</h3>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className={`p-3 rounded-xl ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-blue-50/50 border-blue-100/50 border'}`}>
                                  <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Full Name</p>
                                  <p className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'} font-bold`}>{activeEnquiry.studentName}</p>
                                </div>
                                <div className={`p-3 rounded-xl ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-emerald-50/50 border-emerald-100/50 border'}`}>
                                  <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Contact Number</p>
                                  <p className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'} font-bold`}>{activeEnquiry.studentPhone}</p>
                                </div>
                                <div className={`p-3 rounded-xl ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-purple-50/50 border-purple-100/50 border'}`}>
                                  <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Email Address</p>
                                  <p className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'} font-bold truncate`}>{activeEnquiry.studentEmail}</p>
                                </div>
                                <div className={`p-3 rounded-xl ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-amber-50/50 border-amber-100/50 border'}`}>
                                  <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Father's Name</p>
                                  <p className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'} font-bold`}>{activeEnquiry.fatherName || 'N/A'}</p>
                                </div>
                                <div className={`p-3 rounded-xl ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-slate-50/50 border-slate-100/50 border'}`}>
                                  <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Last Institution</p>
                                  <p className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'} font-bold`}>{activeEnquiry.lastInstitution || 'N/A'}</p>
                                </div>
                                <div className={`p-3 rounded-xl ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-indigo-50/50 border-indigo-100/50 border'}`}>
                                  <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Category</p>
                                  <p className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'} font-bold`}>{activeEnquiry.category || 'General'}</p>
                                </div>
                                <div className={`p-3 rounded-xl ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-rose-50/50 border-rose-100/50 border'}`}>
                                  <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">12th Marks (%)</p>
                                  <p className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'} font-bold`}>{activeEnquiry.marks12th || 'N/A'}</p>
                                </div>
                                <div className={`p-3 rounded-xl ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-cyan-50/50 border-cyan-100/50 border'}`}>
                                  <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Graduation Marks (%)</p>
                                  <p className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'} font-bold`}>{activeEnquiry.marksGrad || 'N/A'}</p>
                                </div>
                                <div className={`p-3 rounded-xl ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-slate-50/50 border-slate-100/50 border'} col-span-1 sm:col-span-2`}>
                                  <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Full Address</p>
                                  <p className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'} font-bold`}>
                                    {activeEnquiry.address}, {activeEnquiry.city}, {activeEnquiry.state} - {activeEnquiry.pincode}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-4">
                              <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white border-white/10' : 'text-gray-800 border-gray-100'} border-b pb-2`}>Enquiry Info</h3>
                              <div className="space-y-3">
                                <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}><strong>Token ID:</strong> <span className="font-mono font-bold text-blue-600">{activeEnquiry.tokenId}</span></p>
                                <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}><strong>Course:</strong> {activeEnquiry.course}</p>
                                <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}><strong>Message:</strong> {activeEnquiry.message || 'No message provided.'}</p>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'} flex items-center space-x-2`}>
                                <MessageSquare className="h-5 w-5 text-gray-400" />
                                <span>Counsellor Notes</span>
                              </h3>
                              <div className="flex items-center space-x-2">
                                <span className="text-xs font-bold text-gray-400 uppercase">Status:</span>
                                <select
                                  value={activeEnquiry.status}
                                  onChange={(e) => handleUpdateStatus(activeEnquiry.id, e.target.value as Enquiry['status'])}
                                  className={`text-sm font-bold ${theme === 'dark' ? 'bg-white/5 text-white' : 'bg-gray-50 text-gray-900'} border-none rounded-lg focus:ring-2 focus:ring-blue-500`}
                                >
                                  <option value="Pending" className={theme === 'dark' ? 'bg-slate-900' : ''}>Pending</option>
                                  <option value="In Progress" className={theme === 'dark' ? 'bg-slate-900' : ''}>In Progress</option>
                                  <option value="Completed" className={theme === 'dark' ? 'bg-slate-900' : ''}>Completed</option>
                                </select>
                              </div>
                            </div>
                            <textarea
                              rows={6}
                              value={notes}
                              onChange={(e) => setNotes(e.target.value)}
                              disabled={!activeLog}
                              className={`w-full p-4 rounded-xl border ${theme === 'dark' ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-gray-200 text-gray-900'} focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:opacity-50`}
                              placeholder={activeLog ? "Type your session notes here..." : "Start a session to edit notes"}
                            />
                          </div>
                        </div>
                      </motion.div>
                    ) : (
                      <div className={`h-full flex flex-col items-center justify-center text-center p-12 ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'} rounded-2xl border-2 border-dashed`}>
                        <div className={`${theme === 'dark' ? 'bg-white/10' : 'bg-gray-100'} p-6 rounded-full mb-6`}>
                          <UserIcon className="h-12 w-12 text-gray-400" />
                        </div>
                        <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'} mb-2`}>Select a Student</h3>
                        <p className="text-gray-500 max-w-xs">Choose a student from the list on the left to view details and start a counselling session.</p>
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default TeamLeadDashboard;
