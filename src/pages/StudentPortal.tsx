import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabase';
import Layout from '../components/Layout';
import { GraduationCap, Search, Send, CheckCircle, ExternalLink, MapPin, Phone, Mail, Zap, Trees, LogIn, Bus, Home, CreditCard, ChevronRight, Download } from 'lucide-react';
import { downloadCSV } from '../utils/csvExport';
import { motion } from 'motion/react';
import { Enquiry, Course, User } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { useRefresh } from '../contexts/RefreshContext';

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

const CATEGORIES = ["General", "OBC", "SC/ST", "Other"];

import { useNavigate } from 'react-router-dom';
import '../styles/pages/StudentPortal.css';

const StudentPortal: React.FC = () => {
  const { theme } = useTheme();
  const { refreshKey } = useRefresh();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    fatherName: '',
    lastInstitution: '',
    address: '',
    state: '',
    pincode: '',
    email: '',
    phone: '',
    course: '',
    category: '',
    marks12th: '',
    marksGrad: '',
    city: '',
    message: ''
  });
  const [submittedEnquiry, setSubmittedEnquiry] = useState<Enquiry | null>(null);
  const [trackingId, setTrackingId] = useState('');
  const [trackedEnquiry, setTrackedEnquiry] = useState<Enquiry | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const { data, error } = await supabase
          .from('courses')
          .select('*')
          .order('name');
        
        if (error) throw error;
        
        // Filter active courses (including those that might have NULL for is_active from previous schema)
        const activeCourses = (data || [])
          .filter(c => c.is_active !== false)
          .map(c => ({
            id: c.id,
            name: c.name,
            description: c.description,
            isActive: c.is_active !== false
          } as Course));

        setCourses(activeCourses);
      } catch (err) {
        console.error('Error fetching courses:', err);
      }
    };
    fetchCourses();

    // Handle hash-based scrolling
    if (window.location.hash === '#track-section') {
      setTimeout(() => {
        document.getElementById('track-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 500);
    } else if (window.location.hash === '#enquire-section') {
      setTimeout(() => {
        document.getElementById('enquire-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 500);
    }
  }, [refreshKey]);

  const handleStaffLogin = (userData: User) => {
    localStorage.setItem('crm_user', JSON.stringify(userData));
    // Determine redirect based on role
    switch (userData.role) {
      case 'admin': navigate('/admin'); break;
      case 'front_office': navigate('/admin'); break;
      case 'team_lead': navigate('/team-lead'); break;
      case 'counsellor': navigate('/counsellor'); break;
      default: navigate('/');
    }
  };

  const generateTokenId = async () => {
    try {
      const { data, error } = await supabase
        .from('enquiries')
        .select('token_id')
        .order('token_id', { ascending: false })
        .limit(1);
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        return 'KRMU-0001';
      }
      const lastToken = data[0].token_id;
      const lastNum = parseInt(lastToken.split('-')[1]);
      return `KRMU-${(lastNum + 1).toString().padStart(4, '0')}`;
    } catch (err) {
      console.error('Error generating token:', err);
      return 'KRMU-0001';
    }
  };

  const assignCounsellor = async (courseName: string) => {
    try {
      // Get logged in user if any
      const savedUser = localStorage.getItem('crm_user');
      const currentUser = savedUser ? JSON.parse(savedUser) as User : null;
      const isLoggedInTL = currentUser?.role === 'team_lead';

      // 1. Fetch all active counsellors and team leads (TL is also a counsellor)
      const { data: allCounsellorsData, error: counsellorsErr } = await supabase
        .from('users')
        .select('*')
        .in('role', ['counsellor', 'team_lead']);
      
      if (counsellorsErr) throw counsellorsErr;
      console.log('Found counsellors:', allCounsellorsData?.length || 0);
      if (!allCounsellorsData || allCounsellorsData.length === 0) {
        console.warn('No counsellors found in database. Enquiry will be unassigned.');
        return { counsellorId: null, teamLeadId: null };
      }

      // Map snake_case to camelCase for the User interface
      const counsellors = allCounsellorsData.map(u => ({
        id: u.id,
        userId: u.user_id,
        name: u.name,
        email: u.email,
        role: u.role,
        teamLeadId: u.team_lead_id,
        assignedCourses: u.assigned_courses,
        mobileNo: u.mobile_no,
        photoURL: u.photo_url,
        createdAt: u.created_at
      } as User));

      // 2. Fetch current workloads (active enquiries) for all counsellors
      const { data: activeEnquiries, error: enquiriesErr } = await supabase
        .from('enquiries')
        .select('counsellor_id')
        .in('status', ['Pending', 'In Progress']);
      
      if (enquiriesErr) throw enquiriesErr;

      // Create a map of counsellorId -> count
      const workloadMap: Record<string, number> = {};
      counsellors.forEach(c => workloadMap[c.id] = 0);
      activeEnquiries?.forEach(e => {
        if (e.counsellor_id && workloadMap[e.counsellor_id] !== undefined) {
          workloadMap[e.counsellor_id]++;
        }
      });

      // 3. Filter counsellors who have the specific course assigned
      const matchingCounsellors = counsellors.filter(c => 
        c.assignedCourses && c.assignedCourses.includes(courseName)
      );

      // 4. Determine the pool to pick from (prioritize matches)
      let pool = matchingCounsellors.length > 0 ? matchingCounsellors : counsellors;

      // 5. Prioritize those directly managed by the logged-in team lead if the TL is logged in
      if (isLoggedInTL) {
        const tlManagedPool = pool.filter(c => 
          c.teamLeadId === currentUser.id || c.id === currentUser.id
        );
        
        // If we found suitable candidates managed by this TL, prioritize them
        if (tlManagedPool.length > 0) {
          pool = tlManagedPool;
        }
      }

      // 6. Find the least busy counsellor in the final pool
      if (pool.length === 0) {
        return { counsellorId: null, teamLeadId: null };
      }

      let bestCounsellor = pool[0];
      let minWorkload = workloadMap[pool[0].id] || 0;

      for (const counsellor of pool) {
        const workload = workloadMap[counsellor.id] || 0;
        if (workload < minWorkload) {
          minWorkload = workload;
          bestCounsellor = counsellor;
        }
      }

      return { counsellorId: bestCounsellor.id, teamLeadId: bestCounsellor.teamLeadId || null };
    } catch (err) {
      console.error('Error assigning counsellor:', err);
      return { counsellorId: null, teamLeadId: null };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const tokenId = await generateTokenId();
      const { counsellorId, teamLeadId } = await assignCounsellor(formData.course);

      const enquiryData = {
        student_name: formData.name,
        father_name: formData.fatherName,
        last_institution: formData.lastInstitution,
        address: formData.address,
        state: formData.state,
        pincode: formData.pincode,
        student_email: formData.email,
        student_phone: formData.phone,
        course: formData.course,
        category: formData.category,
        marks_12th: formData.marks12th || null,
        marks_grad: formData.marksGrad || null,
        city: formData.city,
        message: formData.message,
        token_id: tokenId,
        counsellor_id: counsellorId,
        team_lead_id: teamLeadId,
        status: 'Pending'
      };

      console.log('Inserting enquiry data:', enquiryData);

      const { data, error: insertError } = await supabase
        .from('enquiries')
        .insert([enquiryData])
        .select()
        .single();

      if (insertError) throw insertError;
      
      setSubmittedEnquiry({ 
        id: data.id, 
        tokenId: data.token_id,
        studentName: data.student_name,
        course: data.course,
        status: data.status,
        createdAt: data.created_at,
        lastUpdated: data.last_updated
      } as Enquiry);
    } catch (err: any) {
      console.error('Error submitting enquiry:', err);
      // Provide more specific error message if available from Supabase
      const errorMessage = err.message || 'Failed to submit enquiry. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setTrackedEnquiry(null);

    try {
      const { data, error } = await supabase
        .from('enquiries')
        .select('*')
        .eq('token_id', trackingId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          setError('No enquiry found with this Token ID.');
        } else {
          throw error;
        }
      } else {
        setTrackedEnquiry({ 
          id: data.id, 
          tokenId: data.token_id,
          studentName: data.student_name,
          course: data.course,
          status: data.status,
          createdAt: data.created_at,
          lastUpdated: data.last_updated
        } as Enquiry);
      }
    } catch (err: any) {
      console.error('Error tracking enquiry:', err);
      setError('Error tracking enquiry.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      {/* Hero Section */}
      <div className="relative min-h-[90vh] flex flex-col justify-center overflow-hidden">
        {/* Background Gradient */}
        <div className={`absolute inset-0 ${theme === 'dark' ? 'bg-[#050B2C]' : 'bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100'}`}>
          <motion.div 
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: theme === 'dark' ? [0.1, 0.15, 0.1] : [0.3, 0.4, 0.3]
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            className="absolute top-0 right-0 w-[800px] h-[800px] bg-[#D32F2F]/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4"
          ></motion.div>
          <motion.div 
            animate={{ 
              scale: [1, 1.1, 1],
              opacity: theme === 'dark' ? [0.05, 0.08, 0.05] : [0.2, 0.3, 0.2]
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear", delay: 1 }}
            className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/4"
          ></motion.div>
          <motion.div 
            animate={{ 
              scale: [1, 1.3, 1],
              opacity: theme === 'dark' ? [0.05, 0.1, 0.05] : [0.15, 0.25, 0.15]
            }}
            transition={{ duration: 12, repeat: Infinity, ease: "linear", delay: 2 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[100px]"
          ></motion.div>
          
          {/* Decorative Elements */}
          <div className={`absolute inset-0 ${theme === 'dark' ? 'opacity-20' : 'opacity-10'}`} style={{ backgroundImage: `radial-gradient(${theme === 'dark' ? '#ffffff' : '#1976D2'} 0.5px, transparent 0.5px)`, backgroundSize: '40px 40px' }}></div>
          
          {/* Bottom Blend */}
          <div className={`absolute bottom-0 left-0 w-full h-64 bg-gradient-to-t ${theme === 'dark' ? 'from-[#020617]' : 'from-slate-50'} to-transparent`}></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-4xl"
          >
            <span className="text-[#D32F2F] text-xs md:text-sm font-black uppercase tracking-[0.4em] mb-6 block">
              Welcome to your academic future
            </span>
            <h1 className={`text-6xl md:text-8xl font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'} mb-8 tracking-tighter leading-[0.9]`}>
              K.R. MANGALAM <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D32F2F] via-[#1976D2] to-[#D32F2F] bg-[length:200%_auto] animate-gradient">UNIVERSITY</span>
            </h1>
            
            <div className="flex items-start space-x-6 mb-12">
              <div className="w-1.5 h-24 bg-[#D32F2F] rounded-full mt-2"></div>
              <p className={`text-lg md:text-2xl ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'} font-bold leading-relaxed max-w-2xl`}>
                Visit our 28+ acres campus for on-ground consultation and academic walkthroughs.
              </p>
            </div>

            <div className="flex flex-wrap gap-6">
              <button 
                onClick={() => document.getElementById('enquire-section')?.scrollIntoView({ behavior: 'smooth' })}
                className="bg-[#D32F2F] text-white px-10 py-5 rounded-full text-sm font-black uppercase tracking-widest flex items-center space-x-3 hover:bg-[#B71C1C] transition-all shadow-xl shadow-red-500/20 hover:shadow-red-500/40 hover:-translate-y-1"
              >
                <Send className="h-5 w-5" />
                <span>Enquire Form</span>
              </button>
              <button 
                onClick={() => document.getElementById('track-section')?.scrollIntoView({ behavior: 'smooth' })}
                className={`${theme === 'dark' ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' : 'bg-slate-200 border-slate-300 text-slate-900 hover:bg-slate-300'} border px-10 py-5 rounded-full text-sm font-black uppercase tracking-widest transition-all hover:-translate-y-1`}
              >
                <span>Track My Admission</span>
              </button>
            </div>
          </motion.div>

          {/* Scroll Indicator */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 hidden md:flex flex-col items-center space-y-2"
          >
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Scroll</span>
            <div className="w-[1px] h-12 bg-gradient-to-b from-[#D32F2F] to-transparent"></div>
          </motion.div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-24">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className={`${theme === 'dark' ? 'glass' : 'bg-gradient-to-br from-white to-red-50 border border-red-100 shadow-xl shadow-red-100/50'} rounded-3xl p-8 group hover:bg-white/10 transition-all hover:-translate-y-2 glow-red`}
            >
              <div className="text-red-500 mb-6 group-hover:scale-110 transition-transform">
                <Trees className="h-8 w-8" />
              </div>
              <h3 className={`text-4xl font-black ${theme === 'dark' ? 'text-white' : 'text-red-900'} mb-2 tracking-tighter`}>28+</h3>
              <p className={`text-[10px] font-bold ${theme === 'dark' ? 'text-slate-400' : 'text-red-700'} uppercase tracking-widest`}>Acres Smart Green Campus</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className={`${theme === 'dark' ? 'glass' : 'bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-xl shadow-blue-100/50'} rounded-3xl p-8 group hover:bg-white/10 transition-all hover:-translate-y-2 glow-blue`}
            >
              <div className="mb-6 group-hover:scale-110 transition-transform">
                <img 
                  src="https://www.krmangalam.edu.in/_next/image?url=%2FKRMU-Logo-NAAC.webp&w=750&q=75" 
                  alt="KRMU Logo" 
                  className="h-8 w-auto object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <h3 className={`text-4xl font-black ${theme === 'dark' ? 'text-white' : 'text-blue-900'} mb-2 tracking-tighter`}>NAAC A</h3>
              <p className={`text-[10px] font-bold ${theme === 'dark' ? 'text-slate-400' : 'text-blue-700'} uppercase tracking-widest`}>Highest Quality Grading</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className={`${theme === 'dark' ? 'glass' : 'bg-gradient-to-br from-white to-emerald-50 border border-emerald-100 shadow-xl shadow-emerald-100/50'} rounded-3xl p-8 group hover:bg-white/10 transition-all hover:-translate-y-2 glow-blue`}
            >
              <div className="text-emerald-500 mb-6 group-hover:scale-110 transition-transform">
                <Zap className="h-8 w-8" />
              </div>
              <h3 className={`text-4xl font-black ${theme === 'dark' ? 'text-white' : 'text-emerald-900'} mb-2 tracking-tighter`}>100%</h3>
              <p className={`text-[10px] font-bold ${theme === 'dark' ? 'text-slate-400' : 'text-emerald-700'} uppercase tracking-widest`}>Placement Assistance</p>
            </motion.div>
          </div>

          {/* Quick Portals */}
          <div className="mt-24">
            <div className="flex items-center space-x-4 mb-12">
              <div className="h-[1px] w-12 bg-[#D32F2F]"></div>
              <h2 className={`${theme === 'dark' ? 'text-white' : 'text-slate-900'} font-black uppercase text-xs tracking-[0.4em]`}>Quick Portal Access</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Link to="/transport" className={`${theme === 'dark' ? 'glass hover:bg-blue-600/20 hover:border-blue-500/30' : 'bg-white border-slate-100 shadow-lg hover:shadow-blue-100 hover:border-blue-200'} rounded-3xl p-8 group transition-all hover:-translate-y-2 border`}>
                <div className="text-blue-500 mb-6 flex justify-between items-start">
                  <Bus className="h-8 w-8" />
                  <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <h3 className={`text-xl font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'} mb-2 tracking-tight`}>Transport Portal</h3>
                <p className={`text-xs font-bold ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} leading-relaxed`}>Bus routes, schedules, and transport registration.</p>
              </Link>

              <a href="https://krmangalam.edu.in/hostel" target="_blank" className={`${theme === 'dark' ? 'glass hover:bg-emerald-600/20 hover:border-emerald-500/30' : 'bg-white border-slate-100 shadow-lg hover:shadow-emerald-100 hover:border-emerald-200'} rounded-3xl p-8 group transition-all hover:-translate-y-2 border`}>
                <div className="text-emerald-500 mb-6 flex justify-between items-start">
                  <Home className="h-8 w-8" />
                  <ExternalLink className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <h3 className={`text-xl font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'} mb-2 tracking-tight`}>Hostel Portal</h3>
                <p className={`text-xs font-bold ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} leading-relaxed`}>Room allocations and hostel facility management.</p>
              </a>

              <a href="https://payment.collexo.com/user/login/?dest=/kr-mangalam-university-sohna-haryana-43490/applicant/" target="_blank" className={`${theme === 'dark' ? 'glass hover:bg-purple-600/20 hover:border-purple-500/30' : 'bg-white border-slate-100 shadow-lg hover:shadow-purple-100 hover:border-purple-200'} rounded-3xl p-8 group transition-all hover:-translate-y-2 border`}>
                <div className="text-purple-500 mb-6 flex justify-between items-start">
                  <CreditCard className="h-8 w-8" />
                  <ExternalLink className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <h3 className={`text-xl font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'} mb-2 tracking-tight`}>Payment Portal</h3>
                <p className={`text-xs font-bold ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} leading-relaxed`}>Tuition fees, exam charges, and financial transactions.</p>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Content Sections */}
      <div className={`${theme === 'dark' ? 'bg-[#020617]' : 'bg-slate-50'} py-32 relative overflow-hidden bg-mesh`}>
        {/* Decorative background elements for light mode */}
        {theme === 'light' && (
          <>
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-100/50 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-red-50/50 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/4 pointer-events-none"></div>
          </>
        )}
        
        {/* Top Blend Gradient - Smoother transition from hero */}
        <div className={`absolute top-0 left-0 w-full h-32 bg-gradient-to-b ${theme === 'dark' ? 'from-[#050B2C]' : 'from-slate-50'} to-transparent opacity-30 pointer-events-none`}></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className={`grid grid-cols-1 lg:grid-cols-2 gap-16`}>
            {/* Enquiry Form Section */}
            <div id="enquire-section" className="scroll-mt-32">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className={`${theme === 'dark' ? 'glass' : 'bg-white shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-100'} rounded-[2.5rem] p-8 md:p-12 glow-red relative overflow-hidden`}
              >
                {/* Decorative corner for light mode */}
                {theme === 'light' && (
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-red-50 to-transparent -mr-16 -mt-16 rounded-full"></div>
                )}

                <div className="flex items-center space-x-6 mb-12 relative z-10">
                  <div className="bg-gradient-to-br from-[#D32F2F] to-[#B71C1C] p-5 rounded-2xl text-white shadow-xl shadow-red-500/30 transform -rotate-3 group-hover:rotate-0 transition-transform">
                    <Send className="h-7 w-7" />
                  </div>
                  <div>
                    <h2 className={`text-4xl font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'} tracking-tight leading-none`}>Enquire Now</h2>
                    <p className="text-sm text-red-600 font-black uppercase tracking-[0.2em] mt-2">Start your journey today</p>
                  </div>
                </div>

                {submittedEnquiry ? (
                  <div className="text-center py-12">
                    <div className="bg-emerald-500/10 text-emerald-500 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-8 border border-emerald-500/20">
                      <CheckCircle className="h-12 w-12" />
                    </div>
                    <h3 className={`text-3xl font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'} mb-4`}>Submission Successful!</h3>
                    <p className={`${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'} mb-8 font-medium`}>Your enquiry has been received and assigned to a counsellor.</p>
                    <div className={`${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} rounded-2xl p-8 mb-10 border`}>
                      <p className="text-[10px] text-slate-500 uppercase tracking-[0.3em] font-black mb-2">Your Token ID</p>
                      <p className="text-4xl font-mono font-black text-[#1976D2]">{submittedEnquiry.tokenId}</p>
                    </div>
                    <button
                      onClick={() => setSubmittedEnquiry(null)}
                      className="w-full bg-[#D32F2F] text-white font-black py-5 rounded-2xl hover:bg-[#B71C1C] transition-all shadow-xl shadow-red-500/10"
                    >
                      Submit Another Enquiry
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Full Name</label>
                        <input
                          required
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className={`w-full px-6 py-4 rounded-2xl ${theme === 'dark' ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900 shadow-inner focus:bg-white'} border focus:ring-4 focus:ring-red-500/10 focus:border-[#D32F2F] outline-none transition-all font-bold placeholder:text-slate-400`}
                          placeholder="Enter your name"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Father's Name</label>
                        <input
                          required
                          type="text"
                          value={formData.fatherName}
                          onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                          className={`w-full px-6 py-4 rounded-2xl ${theme === 'dark' ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900 shadow-inner focus:bg-white'} border focus:ring-4 focus:ring-red-500/10 focus:border-[#D32F2F] outline-none transition-all font-bold placeholder:text-slate-400`}
                          placeholder="Enter father's name"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Last School / College Attended</label>
                      <input
                        required
                        type="text"
                        value={formData.lastInstitution}
                        onChange={(e) => setFormData({ ...formData, lastInstitution: e.target.value })}
                        className={`w-full px-6 py-4 rounded-2xl ${theme === 'dark' ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900 shadow-inner focus:bg-white'} border focus:ring-4 focus:ring-red-500/10 focus:border-[#D32F2F] outline-none transition-all font-bold placeholder:text-slate-400`}
                        placeholder="Name of last institution"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Address</label>
                      <textarea
                        required
                        rows={2}
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className={`w-full px-6 py-4 rounded-2xl ${theme === 'dark' ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900 shadow-inner focus:bg-white'} border focus:ring-4 focus:ring-red-500/10 focus:border-[#D32F2F] outline-none transition-all font-bold resize-none placeholder:text-slate-400`}
                        placeholder="Enter full address"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">State</label>
                        <select
                          required
                          value={formData.state}
                          onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                          className={`w-full px-6 py-4 rounded-2xl ${theme === 'dark' ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900 shadow-inner focus:bg-white'} border focus:ring-4 focus:ring-red-500/10 focus:border-[#D32F2F] outline-none transition-all font-bold appearance-none`}
                        >
                          <option value="" className={theme === 'dark' ? 'bg-slate-900' : 'bg-white'}>Select State</option>
                          {INDIAN_STATES.map(state => (
                            <option key={state} value={state} className={theme === 'dark' ? 'bg-slate-900' : 'bg-white'}>{state}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">City</label>
                        <input
                          required
                          type="text"
                          value={formData.city}
                          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                          className={`w-full px-6 py-4 rounded-2xl ${theme === 'dark' ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900 shadow-inner focus:bg-white'} border focus:ring-4 focus:ring-red-500/10 focus:border-[#D32F2F] outline-none transition-all font-bold placeholder:text-slate-400`}
                          placeholder="Your city"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Pincode</label>
                        <input
                          required
                          type="text"
                          value={formData.pincode}
                          onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                          className={`w-full px-6 py-4 rounded-2xl ${theme === 'dark' ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900 shadow-inner focus:bg-white'} border focus:ring-4 focus:ring-red-500/10 focus:border-[#D32F2F] outline-none transition-all font-bold placeholder:text-slate-400`}
                          placeholder="6-digit pincode"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Mobile Number</label>
                        <input
                          required
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className={`w-full px-6 py-4 rounded-2xl ${theme === 'dark' ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900 shadow-inner focus:bg-white'} border focus:ring-4 focus:ring-red-500/10 focus:border-[#D32F2F] outline-none transition-all font-bold placeholder:text-slate-400`}
                          placeholder="+91 00000 00000"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Email Address</label>
                        <input
                          required
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className={`w-full px-6 py-4 rounded-2xl ${theme === 'dark' ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900 shadow-inner focus:bg-white'} border focus:ring-4 focus:ring-red-500/10 focus:border-[#D32F2F] outline-none transition-all font-bold placeholder:text-slate-400`}
                          placeholder="email@example.com"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Program Interested</label>
                        <div className="relative">
                          <select
                            required
                            value={formData.course}
                            onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                            className={`w-full px-6 py-4 rounded-2xl ${theme === 'dark' ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900 shadow-inner focus:bg-white'} border focus:ring-4 focus:ring-red-500/10 focus:border-[#D32F2F] outline-none transition-all font-bold appearance-none`}
                          >
                            <option value="" className={theme === 'dark' ? 'bg-slate-900' : 'bg-white'}>Select a course</option>
                            {courses.map(course => (
                              <option key={course.id} value={course.name} className={theme === 'dark' ? 'bg-slate-900' : 'bg-white'}>{course.name}</option>
                            ))}
                          </select>
                          <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                            <Zap className="h-4 w-4 rotate-90" />
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Category</label>
                        <div className="relative">
                          <select
                            required
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            className={`w-full px-6 py-4 rounded-2xl ${theme === 'dark' ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900 shadow-inner focus:bg-white'} border focus:ring-4 focus:ring-red-500/10 focus:border-[#D32F2F] outline-none transition-all font-bold appearance-none`}
                          >
                            <option value="" className={theme === 'dark' ? 'bg-slate-900' : 'bg-white'}>Select Category</option>
                            {CATEGORIES.map(cat => (
                              <option key={cat} value={cat} className={theme === 'dark' ? 'bg-slate-900' : 'bg-white'}>{cat}</option>
                            ))}
                          </select>
                          <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                            <Zap className="h-4 w-4 rotate-90" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">12th Marks (Optional)</label>
                        <input
                          type="text"
                          value={formData.marks12th}
                          onChange={(e) => setFormData({ ...formData, marks12th: e.target.value })}
                          className={`w-full px-6 py-4 rounded-2xl ${theme === 'dark' ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900 shadow-inner focus:bg-white'} border focus:ring-4 focus:ring-red-500/10 focus:border-[#D32F2F] outline-none transition-all font-bold placeholder:text-slate-500`}
                          placeholder="e.g. 85%"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Graduation Marks (Optional)</label>
                        <input
                          type="text"
                          value={formData.marksGrad}
                          onChange={(e) => setFormData({ ...formData, marksGrad: e.target.value })}
                          className={`w-full px-6 py-4 rounded-2xl ${theme === 'dark' ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900 shadow-inner focus:bg-white'} border focus:ring-4 focus:ring-red-500/10 focus:border-[#D32F2F] outline-none transition-all font-bold placeholder:text-slate-500`}
                          placeholder="e.g. 7.5 CGPA"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Message (Optional)</label>
                      <textarea
                        rows={3}
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        className={`w-full px-6 py-4 rounded-2xl ${theme === 'dark' ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900 shadow-inner focus:bg-white'} border focus:ring-4 focus:ring-red-500/10 focus:border-[#D32F2F] outline-none transition-all font-bold resize-none placeholder:text-slate-500`}
                        placeholder="How can we help you?"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-[#D32F2F] text-white font-black py-5 rounded-2xl hover:bg-[#B71C1C] transition-all disabled:opacity-50 flex items-center justify-center space-x-3 shadow-xl shadow-red-500/10 hover:shadow-red-500/30"
                    >
                      {loading ? 'Submitting...' : (
                        <>
                          <span>Submit Enquiry</span>
                          <Send className="h-5 w-5" />
                        </>
                      )}
                    </button>
                  </form>
                )}
              </motion.div>
            </div>

            {/* Tracking Section */}
            <div id="track-section" className="scroll-mt-32 space-y-12">
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  className={`${theme === 'dark' ? 'bg-slate-900 border-white/5' : 'bg-white shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-100'} rounded-[2.5rem] p-8 md:p-12 border relative overflow-hidden`}
                >
                  {/* Decorative corner for tracking */}
                  {theme === 'light' && (
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-50 to-transparent -mr-16 -mt-16 rounded-full"></div>
                  )}

                  <div className="flex items-center space-x-6 mb-12 relative z-10">
                    <div className="bg-gradient-to-br from-[#1976D2] to-[#1565C0] p-5 rounded-2xl text-white shadow-xl shadow-blue-500/30 transform rotate-3 group-hover:rotate-0 transition-transform">
                      <Search className="h-7 w-7" />
                    </div>
                    <div>
                      <h2 className={`text-4xl font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'} tracking-tight leading-none`}>Track Admission</h2>
                      <p className="text-sm text-blue-600 font-black uppercase tracking-[0.2em] mt-2">Check your status</p>
                    </div>
                  </div>

                  <form onSubmit={handleTrack} className="flex flex-col sm:flex-row gap-4 mb-10 relative z-10">
                    <input
                      required
                      type="text"
                      value={trackingId}
                      onChange={(e) => setTrackingId(e.target.value.toUpperCase())}
                      className={`flex-grow px-8 py-5 rounded-2xl ${theme === 'dark' ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900 shadow-inner focus:bg-white'} border focus:ring-4 focus:ring-blue-500/10 focus:border-[#1976D2] outline-none transition-all font-mono font-black text-xl placeholder:text-slate-400`}
                      placeholder="ENTER TOKEN ID (e.g. KRMU-0001)"
                    />
                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-gradient-to-r from-[#1976D2] to-[#1565C0] text-white px-12 py-5 rounded-2xl font-black uppercase tracking-widest hover:shadow-xl hover:shadow-blue-500/20 transition-all disabled:opacity-50 active:scale-95"
                    >
                      Track
                    </button>
                  </form>

                  {error && <p className="text-red-400 text-sm font-bold mb-6 flex items-center space-x-2"><span className="w-1.5 h-1.5 rounded-full bg-red-400"></span><span>{error}</span></p>}

                  {trackedEnquiry && (
                    <div className={`${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} rounded-2xl p-8 border`}>
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-6 mb-8">
                        <div>
                          <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mb-2">Current Status</p>
                          <span className={`inline-block px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest ${
                            trackedEnquiry.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            trackedEnquiry.status === 'In Progress' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                            'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          }`}>
                            {trackedEnquiry.status}
                          </span>
                        </div>
                        <div className="sm:text-right flex flex-col items-end">
                          <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mb-2">Token ID</p>
                          <div className="flex items-center space-x-3">
                            <p className={`font-mono font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'} text-xl`}>{trackedEnquiry.tokenId}</p>
                            <button
                              onClick={() => downloadCSV([trackedEnquiry], `enquiry_${trackedEnquiry.tokenId}`)}
                              className={`p-2 rounded-lg transition-all ${
                                theme === 'dark' 
                                  ? 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10' 
                                  : 'bg-white text-slate-500 hover:bg-slate-100 shadow-sm border border-slate-200'
                              }`}
                              title="Download Details"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-6 border-t ${theme === 'dark' ? 'border-white/5' : 'border-slate-200'}`}>
                        <div>
                          <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mb-1">Student Name</p>
                          <p className={`${theme === 'dark' ? 'text-white' : 'text-slate-900'} font-bold`}>{trackedEnquiry.studentName}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mb-1">Applied Course</p>
                          <p className={`${theme === 'dark' ? 'text-white' : 'text-slate-900'} font-bold`}>{trackedEnquiry.course}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mb-1">Father's Name</p>
                          <p className={`${theme === 'dark' ? 'text-white' : 'text-slate-900'} font-bold`}>{trackedEnquiry.fatherName || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mb-1">Contact Number</p>
                          <p className={`${theme === 'dark' ? 'text-white' : 'text-slate-900'} font-bold`}>{trackedEnquiry.studentPhone}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mb-1">Email Address</p>
                          <p className={`${theme === 'dark' ? 'text-white' : 'text-slate-900'} font-bold truncate`}>{trackedEnquiry.studentEmail}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mb-1">Category</p>
                          <p className={`${theme === 'dark' ? 'text-white' : 'text-slate-900'} font-bold`}>{trackedEnquiry.category || 'General'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mb-1">Last Institution</p>
                          <p className={`${theme === 'dark' ? 'text-white' : 'text-slate-900'} font-bold`}>{trackedEnquiry.lastInstitution || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mb-1">12th Marks (%)</p>
                          <p className={`${theme === 'dark' ? 'text-white' : 'text-slate-900'} font-bold`}>{trackedEnquiry.marks12th || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mb-1">Graduation Marks (%)</p>
                          <p className={`${theme === 'dark' ? 'text-white' : 'text-slate-900'} font-bold`}>{trackedEnquiry.marksGrad || 'N/A'}</p>
                        </div>
                        <div className="sm:col-span-2 lg:col-span-3">
                          <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mb-1">Full Address</p>
                          <p className={`${theme === 'dark' ? 'text-white' : 'text-slate-900'} font-bold`}>
                            {trackedEnquiry.address}, {trackedEnquiry.city}, {trackedEnquiry.state} - {trackedEnquiry.pincode}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>

                {/* Quick Contact Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 relative z-10">
                  <div className={`${theme === 'dark' ? 'glass' : 'bg-gradient-to-br from-[#D32F2F] to-[#B71C1C] shadow-xl shadow-red-500/20'} p-8 rounded-[2.5rem] group hover:-translate-y-2 transition-all duration-500 relative overflow-hidden`}>
                    {theme === 'light' && (
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 -mr-16 -mt-16 rounded-full blur-2xl group-hover:bg-white/20 transition-all"></div>
                    )}
                    <div className={`${theme === 'dark' ? 'bg-red-500/10 text-[#D32F2F]' : 'bg-white/20 text-white'} w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform border ${theme === 'dark' ? 'border-red-500/20' : 'border-white/20'}`}>
                      <Phone className="h-7 w-7" />
                    </div>
                    <h4 className={`text-xl font-black ${theme === 'dark' ? 'text-white' : 'text-white'} mb-2`}>Call Admissions</h4>
                    <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-red-50'} font-bold`}>+91 11 4888 4888</p>
                  </div>
                  <div className={`${theme === 'dark' ? 'glass' : 'bg-gradient-to-br from-[#1976D2] to-[#1565C0] shadow-xl shadow-blue-500/20'} p-8 rounded-[2.5rem] group hover:-translate-y-2 transition-all duration-500 relative overflow-hidden`}>
                    {theme === 'light' && (
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 -mr-16 -mt-16 rounded-full blur-2xl group-hover:bg-white/20 transition-all"></div>
                    )}
                    <div className={`${theme === 'dark' ? 'bg-blue-500/10 text-[#1976D2]' : 'bg-white/20 text-white'} w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform border ${theme === 'dark' ? 'border-blue-500/20' : 'border-white/20'}`}>
                      <Mail className="h-7 w-7" />
                    </div>
                    <h4 className={`text-xl font-black ${theme === 'dark' ? 'text-white' : 'text-white'} mb-2`}>Email Support</h4>
                    <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-blue-50'} font-bold`}>admissions@krmu.edu.in</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  };

export default StudentPortal;
