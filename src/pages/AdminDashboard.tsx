import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import Layout from '../components/Layout';
import { User, Course, Enquiry, TransportRoute, TransportStop } from '../types';
import { downloadCSV } from '../utils/csvExport';
import { Users, BookOpen, BarChart3, Plus, Trash2, Edit2, UserPlus, Shield, UserCheck, Search, Filter, ChevronRight, AlertCircle, CheckCircle2, Copy, Database, LayoutDashboard, Bus, Home, ExternalLink, CreditCard, Coffee, MapPin, Phone, Clock, FileText, RefreshCw, Download, Mail, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import BusRoster from '../components/BusRoster';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { useTheme } from '../contexts/ThemeContext';
import { useRefresh } from '../contexts/RefreshContext';

interface AdminDashboardProps {
  user: User;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user }) => {
  const { theme } = useTheme();
  const { refreshKey } = useRefresh();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'courses' | 'enquiries' | 'reports' | 'transport'>('dashboard');
  const [users, setUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [transportRoutes, setTransportRoutes] = useState<TransportRoute[]>([]);
  const [transportStops, setTransportStops] = useState<TransportStop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Enquiry Processing State
  const [processingEnquiry, setProcessingEnquiry] = useState<Enquiry | null>(null);
  const [processingNotes, setProcessingNotes] = useState('');
  const [processingStatus, setProcessingStatus] = useState<Enquiry['status']>('Pending');
  const [showProcessForm, setShowProcessForm] = useState(false);

  // Form States
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [courseSearchFilter, setCourseSearchFilter] = useState('');
  const [userFormData, setUserFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'counsellor' as User['role'],
    teamLeadId: '',
    assignedCourses: [] as string[],
    mobileNo: '',
    photoURL: '',
    userId: ''
  });

  const [showCourseForm, setShowCourseForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [courseName, setCourseName] = useState('');
  const [courseDescription, setCourseDescription] = useState('');

  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'route' | 'stop', id: string } | null>(null);

  // Transport Form States
  const [showRouteForm, setShowRouteForm] = useState(false);
  const [editingRoute, setEditingRoute] = useState<TransportRoute | null>(null);
  const [routeStopSearchFilter, setRouteStopSearchFilter] = useState('');
  const [routeFormData, setRouteFormData] = useState({
    routeName: '',
    busNumber: '',
    busRegNo: '',
    driverName: '',
    driverPhone: '',
    helperName: '',
    morningTime: '',
    eveningTime: '',
    isActive: true,
    stops: [] as { stopName: string; pickupTime: string; dropTime: string }[]
  });

  const [showStopForm, setShowStopForm] = useState(false);
  const [selectedRosterRoute, setSelectedRosterRoute] = useState<TransportRoute | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<{ table_name: string; enabled: boolean }[]>([]);
  const [checkingRealtime, setCheckingRealtime] = useState(false);
  const [editingStop, setEditingStop] = useState<TransportStop | null>(null);
  const [stopFormData, setStopFormData] = useState({
    stopName: '',
    routeId: '',
    pickupTime: '',
    dropTime: ''
  });

  useEffect(() => {
    fetchData();
    checkRealtime(); // Fetch initial real-time status

    // Subscribe to users table for real-time break status
    const usersChannel = supabase
      .channel('admin_users_realtime')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'users' 
      }, () => {
        fetchData();
      })
      .subscribe();

    // Subscribe to enquiries table
    const enquiriesChannel = supabase
      .channel('admin_enquiries_realtime')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'enquiries' 
      }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(usersChannel);
      supabase.removeChannel(enquiriesChannel);
    };
  }, [refreshKey]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      // Fetch Users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('name');
      
      if (usersError) {
        console.error('Error fetching users:', usersError);
        throw new Error(`Users: ${usersError.message}`);
      }
      setUsers(usersData.map(u => ({
        id: u.id,
        userId: u.user_id,
        name: u.name,
        email: u.email,
        role: u.role,
        teamLeadId: u.team_lead_id,
        assignedCourses: u.assigned_courses,
        mobileNo: u.mobile_no,
        photoURL: u.photo_url,
        onBreak: u.on_break,
        lastSeen: u.last_seen,
        createdAt: u.created_at
      } as User)));

      // Fetch Courses
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('*')
        .order('name');
      
      if (coursesError) {
        console.error('Error fetching courses:', coursesError);
        throw new Error(`Courses: ${coursesError.message}`);
      }
      setCourses(coursesData.map(c => ({
        id: c.id,
        name: c.name,
        description: c.description,
        isActive: c.is_active !== false
      } as Course)));

      // Fetch Enquiries
      const { data: enquiriesData, error: enquiriesError } = await supabase
        .from('enquiries')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (enquiriesError) {
        console.error('Error fetching enquiries:', enquiriesError);
        throw new Error(`Enquiries: ${enquiriesError.message}`);
      }
      setEnquiries(enquiriesData.map(e => ({
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

      // Fetch Transport Stops
      const { data: stopsData, error: stopsError } = await supabase
        .from('transport_stops')
        .select('*')
        .order('stop_name');
      
      const mappedStops = stopsError ? [] : stopsData.map(s => ({
        id: s.id,
        stopName: s.stop_name,
        routeId: s.route_id,
        pickupTime: s.pickup_time,
        dropTime: s.drop_time,
        createdAt: s.created_at
      } as TransportStop));
      setTransportStops(mappedStops);

      // Fetch Transport Routes
      const { data: routesData, error: routesError } = await supabase
        .from('transport_routes')
        .select('*')
        .order('route_name');
      
      if (routesError) {
        console.error('Error fetching transport routes:', routesError);
      } else {
        setTransportRoutes(routesData.map(r => ({
          id: r.id,
          routeName: r.route_name,
          busNumber: r.bus_number,
          busRegNo: r.bus_reg_no || '',
          driverName: r.driver_name,
          driverPhone: r.driver_phone,
          helperName: r.helper_name || '',
          morningTime: r.morning_time,
          eveningTime: r.evening_time,
          isActive: r.is_active !== false,
          createdAt: r.created_at,
          stops: mappedStops.filter(s => s.routeId === r.id).map(s => s.stopName)
        } as TransportRoute)));
      }

    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(`Failed to fetch data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (!editingUser && userFormData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    try {
      const endpoint = editingUser ? '/api/users/update' : '/api/users/create';
      const body = editingUser 
        ? { ...userFormData, uid: editingUser.id, adminId: user.id }
        : { ...userFormData, adminId: user.id };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const result = await response.json();
      if (result.success) {
        setSuccess(editingUser ? 'User updated successfully!' : 'User created successfully!');
        setShowUserForm(false);
        setEditingUser(null);
        setCourseSearchFilter('');
        setUserFormData({ name: '', email: '', password: '', role: 'counsellor', teamLeadId: '', assignedCourses: [], mobileNo: '', photoURL: '', userId: '' });
        fetchData();
      } else {
        setError(result.error || 'Failed to save user');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (u: User) => {
    setEditingUser(u);
    setUserFormData({
      name: u.name,
      email: u.email,
      password: '', // Don't show password
      role: u.role,
      teamLeadId: u.teamLeadId || '',
      assignedCourses: u.assignedCourses || [],
      mobileNo: u.mobileNo || '',
      photoURL: u.photoURL || '',
      userId: u.userId || ''
    });
    setShowUserForm(true);
  };

  const handleClearData = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const response = await fetch('/api/admin/clear-data', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-id': user.id
        },
        body: JSON.stringify({ adminId: user.id })
      });
      const result = await response.json();
      if (result.success) {
        setSuccess('System data cleared successfully!');
        setShowClearConfirm(false);
        fetchData();
      } else {
        setError(result.error || 'Failed to clear data');
      }
    } catch (err) {
      console.error('Clear data error:', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-id': user.id
        },
        body: JSON.stringify({ adminId: user.id })
      });
      const result = await response.json();
      if (result.success) {
        setSuccess('User deleted successfully!');
        fetchData();
      } else {
        setError(result.error || 'Failed to delete user');
      }
    } catch (err) {
      setError('Error deleting user');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseName.trim()) return;
    setLoading(true);
    try {
      if (editingCourse) {
        const { error: courseError } = await supabase
          .from('courses')
          .update({ 
            name: courseName.trim(),
            description: courseDescription.trim()
          })
          .eq('id', editingCourse.id);
        
        if (courseError) throw courseError;
        setSuccess('Course updated successfully!');
      } else {
        const { error: courseError } = await supabase
          .from('courses')
          .insert([{ 
            name: courseName.trim(),
            description: courseDescription.trim()
          }]);
        
        if (courseError) throw courseError;
        setSuccess('Course added successfully!');
      }

      setCourseName('');
      setCourseDescription('');
      setEditingCourse(null);
      setShowCourseForm(false);
      fetchData();
    } catch (err: any) {
      console.error('Error saving course:', err);
      setError('Failed to save course');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCourseStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error: courseError } = await supabase
        .from('courses')
        .update({ is_active: !currentStatus })
        .eq('id', id);
      
      if (courseError) throw courseError;
      fetchData();
    } catch (err: any) {
      console.error('Error toggling course status:', err);
      setError('Failed to update course status');
    }
  };

  const [newStop, setNewStop] = useState({ stopName: '', pickupTime: '', dropTime: '' });

  const addStopToRoute = () => {
    if (!newStop.stopName || !newStop.pickupTime || !newStop.dropTime) return;
    setRouteFormData({
      ...routeFormData,
      stops: [...routeFormData.stops, newStop]
    });
    setNewStop({ stopName: '', pickupTime: '', dropTime: '' });
  };

  const removeStopFromRoute = (index: number) => {
    setRouteFormData({
      ...routeFormData,
      stops: routeFormData.stops.filter((_, i) => i !== index)
    });
  };

  const handleAddTransportRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let routeId = '';
      if (editingRoute) {
        const { error } = await supabase
          .from('transport_routes')
          .update({
            route_name: routeFormData.routeName,
            bus_number: routeFormData.busNumber,
            bus_reg_no: routeFormData.busRegNo,
            driver_name: routeFormData.driverName,
            driver_phone: routeFormData.driverPhone,
            helper_name: routeFormData.helperName,
            morning_time: routeFormData.morningTime,
            evening_time: routeFormData.eveningTime,
            is_active: routeFormData.isActive
          })
          .eq('id', editingRoute.id);
        if (error) throw error;
        routeId = editingRoute.id;
        setSuccess('Route updated successfully!');
      } else {
        const { data, error } = await supabase
          .from('transport_routes')
          .insert([{
            route_name: routeFormData.routeName,
            bus_number: routeFormData.busNumber,
            bus_reg_no: routeFormData.busRegNo,
            driver_name: routeFormData.driverName,
            driver_phone: routeFormData.driverPhone,
            helper_name: routeFormData.helperName,
            morning_time: routeFormData.morningTime,
            evening_time: routeFormData.eveningTime,
            is_active: routeFormData.isActive
          }])
          .select();
        if (error) throw error;
        if (data && data.length > 0) {
          routeId = data[0].id;
        }
        setSuccess('Route added successfully!');
      }

      // Handle stops
      if (routeId) {
        // If editing, clear existing stops first to sync
        if (editingRoute) {
          await supabase
            .from('transport_stops')
            .delete()
            .eq('route_id', routeId);
        }
        
        if (routeFormData.stops.length > 0) {
          const stopsToInsert = routeFormData.stops.map(stop => ({
            stop_name: stop.stopName,
            route_id: routeId,
            pickup_time: stop.pickupTime,
            drop_time: stop.dropTime
          }));

          const { error: stopsError } = await supabase
            .from('transport_stops')
            .insert(stopsToInsert);
          
          if (stopsError) throw stopsError;
        }

        // Sync stops array to transport_routes for the portal
        await supabase
          .from('transport_routes')
          .update({
            stops: routeFormData.stops.map(s => s.stopName)
          })
          .eq('id', routeId);
      }

      setShowRouteForm(false);
      setEditingRoute(null);
      setRouteFormData({ 
        routeName: '', 
        busNumber: '', 
        busRegNo: '',
        driverName: '', 
        driverPhone: '', 
        helperName: '',
        morningTime: '', 
        eveningTime: '', 
        isActive: true,
        stops: []
      });
      fetchData();
    } catch (err: any) {
      setError(`Failed to save route: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRoute = async (id: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.from('transport_routes').delete().eq('id', id);
      if (error) throw error;
      setSuccess('Route deleted successfully!');
      setDeleteConfirm(null);
      fetchData();
    } catch (err: any) {
      setError(`Failed to delete route: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTransportStop = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingStop) {
        const { error } = await supabase
          .from('transport_stops')
          .update({
            stop_name: stopFormData.stopName,
            route_id: stopFormData.routeId,
            pickup_time: stopFormData.pickupTime,
            drop_time: stopFormData.dropTime
          })
          .eq('id', editingStop.id);
        if (error) throw error;
        setSuccess('Stop updated successfully!');
      } else {
        const { error } = await supabase
          .from('transport_stops')
          .insert([{
            stop_name: stopFormData.stopName,
            route_id: stopFormData.routeId,
            pickup_time: stopFormData.pickupTime,
            drop_time: stopFormData.dropTime
          }]);
        if (error) throw error;
        setSuccess('Stop added successfully!');
      }
      setShowStopForm(false);
      setEditingStop(null);
      setStopFormData({ stopName: '', routeId: '', pickupTime: '', dropTime: '' });
      fetchData();
    } catch (err: any) {
      setError(`Failed to save stop: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStop = async (id: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.from('transport_stops').delete().eq('id', id);
      if (error) throw error;
      setSuccess('Stop deleted successfully!');
      setDeleteConfirm(null);
      fetchData();
    } catch (err: any) {
      setError(`Failed to delete stop: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessEnquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!processingEnquiry) return;
    
    setLoading(true);
    try {
      const { error: enquiryError } = await supabase
        .from('enquiries')
        .update({ 
          status: processingStatus, 
          notes: processingNotes,
          last_updated: new Date().toISOString()
        })
        .eq('id', processingEnquiry.id);
      
      if (enquiryError) throw enquiryError;
      
      // Optimistic update
      setEnquiries(prev => prev.map(e => e.id === processingEnquiry.id ? { ...e, status: processingStatus, notes: processingNotes } : e));
      
      setSuccess('Enquiry updated successfully!');
      setShowProcessForm(false);
      setProcessingEnquiry(null);
      fetchData();
    } catch (err: any) {
      console.error('Error processing enquiry:', err);
      setError('Failed to update enquiry');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCourse = async (id: string) => {
    try {
      const { error: courseError } = await supabase
        .from('courses')
        .delete()
        .eq('id', id);
      
      if (courseError) throw courseError;
      fetchData();
    } catch (err: any) {
      console.error('Error deleting course:', err);
      setError('Failed to delete course');
    }
  };

  // Report Data
  const statusData = [
    { name: 'Pending', value: enquiries.filter(e => e.status === 'Pending').length },
    { name: 'In Progress', value: enquiries.filter(e => e.status === 'In Progress').length },
    { name: 'Completed', value: enquiries.filter(e => e.status === 'Completed').length },
  ];

  const courseData = courses.map(c => ({
    name: c.name,
    count: enquiries.filter(e => e.course === c.name).length
  })).sort((a, b) => b.count - a.count).slice(0, 5);

  const [showRpcSql, setShowRpcSql] = useState(false);

  const checkRealtime = async () => {
    setCheckingRealtime(true);
    setShowRpcSql(false);
    try {
      const { data, error } = await supabase.rpc('check_realtime_status');
      if (error) throw error;
      setRealtimeStatus(data);
      setError(null);
    } catch (err: any) {
      console.error('Real-time check failed:', err);
      const errorMessage = err.message || 'Unknown error';
      const errorCode = err.code || 'No code';
      
      if (errorCode === 'PGRST202' || errorMessage.includes('function') && errorMessage.includes('does not exist')) {
        setError(`RPC 'check_realtime_status' is missing. Please run the SQL command below in your Supabase SQL Editor.`);
      } else {
        setError(`Real-time check failed [${errorCode}]: ${errorMessage}`);
      }
      setShowRpcSql(true);
    } finally {
      setCheckingRealtime(false);
    }
  };

  const COLORS = ['#D32F2F', '#1976D2', '#4CAF50', '#FFC107', '#9C27B0'];

  if (loading && users.length === 0 && enquiries.length === 0 && !error) {
    return (
      <Layout userRole={user.role} userName={user.name} userId={user.userId}>
        <div className="flex items-center justify-center min-h-[600px] w-full">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D32F2F]"></div>
            <p className={`${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'} font-medium`}>Loading dashboard data...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout userRole={user.role} userName={user.name} userId={user.userId}>
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Navigation */}
        <div className="w-full md:w-64 flex-shrink-0 space-y-2">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all font-bold ${
              activeTab === 'dashboard' 
                ? 'bg-[#D32F2F] text-white shadow-lg shadow-red-200' 
                : theme === 'dark' 
                  ? 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white' 
                  : 'bg-white text-slate-600 hover:bg-red-50 hover:text-red-600 border border-slate-200 shadow-sm'
            }`}
          >
            <LayoutDashboard className={`h-5 w-5 ${activeTab === 'dashboard' ? 'text-white' : 'text-[#D32F2F]'}`} />
            <span>Overview</span>
          </button>
          
          {(user.role === 'admin' || user.role === 'front_office') && (
            <>
              {user.role === 'admin' && (
                <>
                  <button
                    onClick={() => setActiveTab('users')}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all font-bold ${
                      activeTab === 'users' 
                        ? 'bg-[#D32F2F] text-white shadow-lg shadow-red-200' 
                        : theme === 'dark' 
                          ? 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white' 
                          : 'bg-white text-slate-600 hover:bg-red-50 hover:text-red-600 border border-slate-200 shadow-sm'
                    }`}
                  >
                    <Users className={`h-5 w-5 ${activeTab === 'users' ? 'text-white' : 'text-[#D32F2F]'}`} />
                    <span>User Management</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('courses')}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all font-bold ${
                      activeTab === 'courses' 
                        ? 'bg-[#D32F2F] text-white shadow-lg shadow-red-200' 
                        : theme === 'dark' 
                          ? 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white' 
                          : 'bg-white text-slate-600 hover:bg-red-50 hover:text-red-600 border border-slate-200 shadow-sm'
                    }`}
                  >
                    <BookOpen className={`h-5 w-5 ${activeTab === 'courses' ? 'text-white' : 'text-[#D32F2F]'}`} />
                    <span>Course Catalog</span>
                  </button>
                </>
              )}
              <button
                onClick={() => setActiveTab('transport')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all font-bold ${
                  activeTab === 'transport' 
                    ? 'bg-[#D32F2F] text-white shadow-lg shadow-red-200' 
                    : theme === 'dark' 
                      ? 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white' 
                      : 'bg-white text-slate-600 hover:bg-red-50 hover:text-red-600 border border-slate-200 shadow-sm'
                }`}
              >
                <Bus className={`h-5 w-5 ${activeTab === 'transport' ? 'text-white' : 'text-[#D32F2F]'}`} />
                <span>Transport Management</span>
              </button>
            </>
          )}

          <button
            onClick={() => setActiveTab('enquiries')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all font-bold ${
              activeTab === 'enquiries' 
                ? 'bg-[#D32F2F] text-white shadow-lg shadow-red-200' 
                : theme === 'dark' 
                  ? 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white' 
                  : 'bg-white text-slate-600 hover:bg-red-50 hover:text-red-600 border border-slate-200 shadow-sm'
            }`}
          >
            <Search className={`h-5 w-5 ${activeTab === 'enquiries' ? 'text-white' : 'text-[#D32F2F]'}`} />
            <span>All Enquiries</span>
          </button>

          {user.role === 'admin' && (
            <button
              onClick={() => setActiveTab('reports')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all font-bold ${
                activeTab === 'reports' 
                  ? 'bg-[#D32F2F] text-white shadow-lg shadow-red-200' 
                  : theme === 'dark' 
                    ? 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white' 
                    : 'bg-white text-slate-600 hover:bg-red-50 hover:text-red-600 border border-slate-200 shadow-sm'
              }`}
            >
              <BarChart3 className={`h-5 w-5 ${activeTab === 'reports' ? 'text-white' : 'text-[#D32F2F]'}`} />
              <span>System Reports</span>
            </button>
          )}
        </div>

        {/* Main Content Area */}
        <div className="flex-grow">
          {/* Notifications */}
          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`${theme === 'dark' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-red-50 text-red-600 border-red-100'} p-4 rounded-xl mb-6 flex items-center space-x-3 border`}>
                <AlertCircle className="h-5 w-5" />
                <p className="font-medium">{error}</p>
              </motion.div>
            )}
            {success && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`${theme === 'dark' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-green-50 text-green-600 border-green-100'} p-4 rounded-xl mb-6 flex items-center space-x-3 border`}>
                <CheckCircle2 className="h-5 w-5" />
                <p className="font-medium">{success}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tab Content */}
          <div className={`${theme === 'dark' ? 'bg-white/5 border-white/10 shadow-2xl shadow-black/20' : 'bg-white border-slate-200 shadow-xl shadow-slate-200/50'} rounded-2xl p-8 border min-h-[600px] transition-colors duration-300`}>
            {activeTab === 'dashboard' && (
              <div className="space-y-8">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>System Overview</h2>
                    <p className={`${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'} mt-1`}>Welcome back, {user.name}</p>
                  </div>
                  <div className={`flex items-center space-x-2 text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-gray-400'} font-medium`}>
                    <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></span>
                    <span>System Live</span>
                  </div>
                </div>

                {/* Quick Portals */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <motion.div 
                    whileHover={{ scale: 1.02 }}
                    className={`rounded-2xl p-8 text-white shadow-xl relative overflow-hidden group cursor-pointer bg-gradient-to-br from-blue-600 to-blue-700 ${theme === 'dark' ? 'shadow-blue-900/20' : 'shadow-blue-100'}`}
                  >
                    <div className="absolute top-0 right-0 -mt-4 -mr-4 bg-white/10 w-32 h-32 rounded-full blur-2xl group-hover:bg-white/20 transition-all"></div>
                    <div className="relative z-10">
                      <div className="bg-white/20 p-3 rounded-xl inline-block mb-4">
                        <Bus className="h-8 w-8" />
                      </div>
                      <h3 className="text-2xl font-bold mb-2">Transport Portal</h3>
                      <p className="text-blue-100 mb-6 max-w-[240px]">Manage university bus routes, schedules, and student transport registrations.</p>
                      <button 
                        onClick={() => setActiveTab('transport')}
                        className="bg-white text-blue-600 px-6 py-2 rounded-xl font-bold inline-flex items-center space-x-2 hover:bg-blue-50 transition-colors"
                      >
                        <span>Manage Transport</span>
                        <Bus className="h-4 w-4" />
                      </button>
                    </div>
                  </motion.div>

                  <motion.div 
                    whileHover={{ scale: 1.02 }}
                    className={`rounded-2xl p-8 text-white shadow-xl relative overflow-hidden group cursor-pointer bg-gradient-to-br from-emerald-600 to-emerald-700 ${theme === 'dark' ? 'shadow-emerald-900/20' : 'shadow-emerald-100'}`}
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
                    className={`rounded-2xl p-8 text-white shadow-xl relative overflow-hidden group cursor-pointer bg-gradient-to-br from-purple-600 to-purple-700 ${theme === 'dark' ? 'shadow-purple-900/20' : 'shadow-purple-100'}`}
                  >
                    <div className="absolute top-0 right-0 -mt-4 -mr-4 bg-white/10 w-32 h-32 rounded-full blur-2xl group-hover:bg-white/20 transition-all"></div>
                    <div className="relative z-10">
                      <div className="bg-white/20 p-3 rounded-xl inline-block mb-4">
                        <CreditCard className="h-8 w-8" />
                      </div>
                      <h3 className="text-2xl font-bold mb-2">Payment Portal</h3>
                      <p className="text-purple-100 mb-6 max-w-[240px]">Process tuition fees, exam charges, and other university financial transactions.</p>
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

                {/* Statistics Summary */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className={`${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-sm'} p-6 rounded-2xl border`}>
                    <p className={`${theme === 'dark' ? 'text-slate-500' : 'text-blue-700'} text-[10px] font-black uppercase tracking-widest mb-2`}>Total Users</p>
                    <h4 className={`text-3xl font-black ${theme === 'dark' ? 'text-white' : 'text-blue-900'}`}>{users.length}</h4>
                    <div className="mt-3 flex items-center text-[10px] text-green-600 font-black uppercase tracking-wider">
                      <span className="h-1.5 w-1.5 bg-green-500 rounded-full mr-2"></span>
                      <span>Active System</span>
                    </div>
                  </div>
                  <div className={`${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200 shadow-sm'} p-6 rounded-2xl border`}>
                    <p className={`${theme === 'dark' ? 'text-slate-500' : 'text-emerald-700'} text-[10px] font-black uppercase tracking-widest mb-2`}>Total Enquiries</p>
                    <h4 className={`text-3xl font-black ${theme === 'dark' ? 'text-white' : 'text-emerald-900'}`}>{enquiries.length}</h4>
                    <div className="mt-3 flex items-center text-[10px] text-blue-600 font-black uppercase tracking-wider">
                      <span className="h-1.5 w-1.5 bg-blue-500 rounded-full mr-2"></span>
                      <span>Live Tracking</span>
                    </div>
                  </div>
                  <div className={`${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 shadow-sm'} p-6 rounded-2xl border`}>
                    <p className={`${theme === 'dark' ? 'text-slate-500' : 'text-purple-700'} text-[10px] font-black uppercase tracking-widest mb-2`}>Courses</p>
                    <h4 className={`text-3xl font-black ${theme === 'dark' ? 'text-white' : 'text-purple-900'}`}>{courses.length}</h4>
                    <div className="mt-3 flex items-center text-[10px] text-purple-600 font-black uppercase tracking-wider">
                      <span className="h-1.5 w-1.5 bg-purple-500 rounded-full mr-2"></span>
                      <span>Available Catalog</span>
                    </div>
                  </div>
                  <div className={`${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-gradient-to-br from-red-50 to-red-100 border-red-200 shadow-sm'} p-6 rounded-2xl border`}>
                    <p className={`${theme === 'dark' ? 'text-slate-500' : 'text-red-700'} text-[10px] font-black uppercase tracking-widest mb-2`}>Pending Actions</p>
                    <h4 className={`text-3xl font-black ${theme === 'dark' ? 'text-white' : 'text-red-900'}`}>{enquiries.filter(e => e.status === 'Pending').length}</h4>
                    <div className="mt-3 flex items-center text-[10px] text-red-600 font-black uppercase tracking-wider">
                      <span className="h-1.5 w-1.5 bg-red-500 rounded-full mr-2 animate-pulse"></span>
                      <span>Requires Attention</span>
                    </div>
                  </div>
                  {user.role === 'admin' && (
                    <div className={`${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 shadow-sm'} p-6 rounded-2xl border`}>
                    <div className="flex justify-between items-start mb-2">
                      <p className={`${theme === 'dark' ? 'text-slate-500' : 'text-orange-700'} text-[10px] font-black uppercase tracking-widest`}>System Health</p>
                      <button 
                        onClick={checkRealtime}
                        disabled={checkingRealtime}
                        className={`p-1.5 rounded-lg transition-all ${theme === 'dark' ? 'bg-white/10 hover:bg-white/20' : 'bg-white hover:bg-orange-50 shadow-sm'}`}
                        title="Check Real-time Sync"
                      >
                        <RefreshCw className={`h-3 w-3 ${checkingRealtime ? 'animate-spin' : ''} ${theme === 'dark' ? 'text-orange-400' : 'text-orange-600'}`} />
                      </button>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Database className={`h-5 w-5 ${theme === 'dark' ? 'text-orange-400' : 'text-orange-600'}`} />
                      <h4 className={`text-xl font-black ${theme === 'dark' ? 'text-white' : 'text-orange-900'}`}>Real-time Sync</h4>
                    </div>
                    
                    {realtimeStatus.length > 0 ? (
                      <div className="mt-4 space-y-2">
                        {realtimeStatus.map(status => (
                          <div key={status.table_name} className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-tight text-slate-500">{status.table_name}</span>
                            {status.enabled ? (
                              <span className="flex items-center text-[9px] font-black text-green-600 uppercase tracking-widest">
                                <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
                                Enabled
                              </span>
                            ) : (
                              <span className="flex items-center text-[9px] font-black text-red-600 uppercase tracking-widest">
                                <AlertCircle className="h-2.5 w-2.5 mr-1" />
                                Disabled
                              </span>
                            )}
                          </div>
                        ))}
                        {!realtimeStatus.every(s => s.enabled) && (
                          <div className="mt-3 p-2 bg-red-500/10 rounded-lg border border-red-500/20">
                            <p className="text-[9px] font-bold text-red-500 leading-tight">
                              Some tables are NOT in the realtime publication. Run this SQL:
                              <br />
                              <code className="block mt-1 p-1 bg-black/20 rounded text-[8px] font-mono">
                                ALTER PUBLICATION supabase_realtime ADD TABLE {realtimeStatus.filter(s => !s.enabled).map(s => s.table_name).join(', ')};
                              </code>
                            </p>
                          </div>
                        )}
                      </div>
                    ) : showRpcSql ? (
                      <div className="mt-3 p-3 bg-red-500/10 rounded-xl border border-red-500/20">
                        <div className="flex justify-between items-center mb-2">
                          <p className="text-[10px] font-bold text-red-600">RPC Missing. Run this SQL in Supabase Editor:</p>
                          <button
                            onClick={() => {
                              const sql = `-- Ensure the publication exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.check_realtime_status()
RETURNS TABLE (table_name TEXT, enabled BOOLEAN) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.name::TEXT as table_name,
    EXISTS (
      SELECT 1 
      FROM pg_publication_tables p
      WHERE p.pubname = 'supabase_realtime' 
      AND p.schemaname = 'public' 
      AND p.tablename = t.name
    ) as enabled
  FROM (
    VALUES ('enquiries'), ('users'), ('courses'), ('time_logs'), ('transport_routes'), ('transport_stops')
  ) AS t(name);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.check_realtime_status() TO anon, authenticated, service_role;`;
                              navigator.clipboard.writeText(sql);
                              alert('SQL copied to clipboard!');
                            }}
                            className="text-[9px] font-black text-red-600 uppercase tracking-widest hover:underline"
                          >
                            Copy SQL
                          </button>
                        </div>
                        <pre className="p-2 bg-black/20 rounded text-[8px] font-mono overflow-x-auto whitespace-pre-wrap text-red-400">
{`-- Ensure the publication exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.check_realtime_status()
RETURNS TABLE (table_name TEXT, enabled BOOLEAN) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.name::TEXT as table_name,
    EXISTS (
      SELECT 1 
      FROM pg_publication_tables p
      WHERE p.pubname = 'supabase_realtime' 
      AND p.schemaname = 'public' 
      AND p.tablename = t.name
    ) as enabled
  FROM (
    VALUES ('enquiries'), ('users'), ('courses'), ('time_logs'), ('transport_routes'), ('transport_stops')
  ) AS t(name);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.check_realtime_status() TO anon, authenticated, service_role;`}
                        </pre>
                      </div>
                    ) : (
                      <div className="mt-3 flex items-center text-[10px] text-orange-600 font-black uppercase tracking-wider">
                        <span className="h-1.5 w-1.5 bg-orange-500 rounded-full mr-2"></span>
                        <span>Click refresh to check status</span>
                      </div>
                    )}
                  </div>
                )}
                </div>

                {/* Recent Activity Chart */}
                <div className={`${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-white border-gray-100 shadow-sm'} p-8 rounded-2xl border`}>
                  <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'} mb-6`}>Enquiry Trends</h3>
                  <div className="w-full" style={{ height: '300px' }}>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={enquiries.slice(0, 10).reverse()}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#1e293b' : '#F1F5F9'} />
                        <XAxis dataKey="createdAt" hide />
                        <YAxis hide />
                        <Tooltip 
                          contentStyle={{ 
                            borderRadius: '16px', 
                            border: 'none', 
                            boxShadow: theme === 'dark' ? '0 20px 25px -5px rgb(0 0 0 / 0.3)' : '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                            backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
                            color: theme === 'dark' ? '#f1f5f9' : '#1e293b',
                            padding: '12px'
                          }}
                          itemStyle={{ color: theme === 'dark' ? '#f1f5f9' : '#1e293b', fontWeight: 'bold' }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="status" 
                          stroke="#D32F2F" 
                          strokeWidth={3} 
                          dot={{ r: 4, fill: '#D32F2F', strokeWidth: 2, stroke: theme === 'dark' ? '#0A1133' : '#ffffff' }}
                          activeDot={{ r: 6, strokeWidth: 0 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'users' && user.role === 'admin' && (
              <div>
                <div className="flex justify-between items-center mb-8">
                  <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>User Management</h2>
                  <div className="flex space-x-4">
                    <button
                      onClick={() => setShowClearConfirm(true)}
                      className={`${theme === 'dark' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-red-50 text-red-600 border-red-100'} px-4 py-2 rounded-lg flex items-center space-x-2 hover:opacity-80 transition-colors border`}
                      disabled={loading}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Clear All Data</span>
                    </button>
                    <button
                      onClick={() => {
                        setEditingUser(null);
                        setUserFormData({ name: '', email: '', password: '', role: 'counsellor', teamLeadId: '', assignedCourses: [], mobileNo: '', photoURL: '', userId: '' });
                        setShowUserForm(true);
                      }}
                      className="bg-[#1976D2] text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-[#1565C0] transition-colors"
                    >
                      <UserPlus className="h-4 w-4" />
                      <span>Add New User</span>
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className={`text-left border-b ${theme === 'dark' ? 'border-white/10' : 'border-slate-100'}`}>
                        <th className={`pb-4 font-black ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'} uppercase text-[10px] tracking-[0.2em]`}>ID</th>
                        <th className={`pb-4 font-black ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'} uppercase text-[10px] tracking-[0.2em]`}>User</th>
                        <th className={`pb-4 font-black ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'} uppercase text-[10px] tracking-[0.2em]`}>Role</th>
                        <th className={`pb-4 font-black ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'} uppercase text-[10px] tracking-[0.2em]`}>Contact</th>
                        <th className={`pb-4 font-black ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'} uppercase text-[10px] tracking-[0.2em]`}>Courses</th>
                        <th className={`pb-4 font-black ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'} uppercase text-[10px] tracking-[0.2em]`}>Actions</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${theme === 'dark' ? 'divide-white/5' : 'divide-slate-50'}`}>
                      {users.map(u => (
                        <tr key={u.id} className={`group hover:${theme === 'dark' ? 'bg-white/5' : 'bg-slate-50/50'} transition-all duration-300`}>
                          <td className="py-5">
                            <span className={`font-mono font-black ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'} text-[10px] uppercase tracking-tighter`}>{u.userId || 'N/A'}</span>
                          </td>
                          <td className="py-5">
                            <div className="flex items-center space-x-4">
                              <div className={`h-10 w-10 rounded-full ${theme === 'dark' ? 'bg-white/5' : 'bg-slate-100'} overflow-hidden border-2 ${theme === 'dark' ? 'border-white/10' : 'border-white'} shadow-lg relative`}>
                                {u.photoURL ? (
                                  <img src={u.photoURL} alt={u.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  <div className={`h-full w-full flex items-center justify-center ${theme === 'dark' ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600'} font-black text-sm`}>
                                    {u.name.charAt(0)}
                                  </div>
                                )}
                                {u.onBreak && (
                                  <div className="absolute inset-0 bg-orange-500/20 backdrop-blur-[1px] flex items-center justify-center">
                                    <Coffee className="h-4 w-4 text-orange-600 animate-bounce" />
                                  </div>
                                )}
                              </div>
                              <div>
                                <div className={`font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'} tracking-tight flex items-center space-x-2`}>
                                  {(() => {
                                    let statusColor = 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]';
                                    let statusLabel = 'Active';
                                    
                                    if (u.onBreak) {
                                      statusColor = 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.4)]';
                                      statusLabel = 'On Break';
                                    } else if (!u.lastSeen) {
                                      statusColor = 'bg-slate-400 shadow-none';
                                      statusLabel = 'Inactive';
                                    } else {
                                      const lastSeenDate = new Date(u.lastSeen);
                                      const now = new Date();
                                      const diffMinutes = (now.getTime() - lastSeenDate.getTime()) / (1000 * 60);
                                      if (diffMinutes > 5) {
                                        statusColor = 'bg-slate-400 shadow-none';
                                        statusLabel = 'Inactive';
                                      }
                                    }

                                    return (
                                      <div 
                                        className={`h-2 w-2 rounded-full ${statusColor}`}
                                        title={statusLabel}
                                      ></div>
                                    );
                                  })()}
                                  <span>{u.name}</span>
                                  {u.onBreak && (
                                    <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded text-[8px] font-black uppercase tracking-tighter animate-pulse">On Break</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-5">
                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                              u.role === 'admin' ? (theme === 'dark' ? 'bg-purple-500/10 text-purple-400' : 'bg-purple-50 text-purple-600') :
                              u.role === 'team_lead' ? (theme === 'dark' ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600') :
                              u.role === 'front_office' ? (theme === 'dark' ? 'bg-orange-500/10 text-orange-400' : 'bg-orange-50 text-orange-600') :
                              (theme === 'dark' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600')
                            }`}>
                              {u.role.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-5">
                            <div className={`text-xs font-bold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>{u.email}</div>
                            <div className={`text-[10px] font-bold ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'} mt-1`}>{u.mobileNo || 'No mobile'}</div>
                          </td>
                          <td className="py-5">
                            <div className="flex flex-wrap gap-1.5">
                              {u.role === 'counsellor' && u.assignedCourses && u.assignedCourses.length > 0 ? (
                                u.assignedCourses.map(course => (
                                  <span key={course} className={`px-2 py-0.5 ${theme === 'dark' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-blue-50 text-blue-700 border-blue-100'} rounded text-[9px] font-black uppercase tracking-wider border`}>
                                    {course}
                                  </span>
                                ))
                              ) : u.role === 'counsellor' ? (
                                <span className={`text-[10px] font-bold ${theme === 'dark' ? 'text-slate-600' : 'text-slate-400'} italic uppercase tracking-wider`}>None assigned</span>
                              ) : (
                                <span className={`text-[10px] font-bold ${theme === 'dark' ? 'text-slate-600' : 'text-slate-400'}`}>-</span>
                              )}
                            </div>
                          </td>
                          <td className="py-5">
                            <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                              <button
                                onClick={() => openEditModal(u)}
                                className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-white/5 text-blue-400 hover:bg-blue-500/20' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'} transition-all`}
                                title="Edit User"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteUser(u.id)}
                                className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-white/5 text-red-400 hover:bg-red-500/20' : 'bg-red-50 text-red-600 hover:bg-red-100'} transition-all`}
                                title="Delete User"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* User Form Modal */}
{showUserForm && (
                  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <motion.div 
                      initial={{ scale: 0.85, opacity: 0, y: 20 }} 
                      animate={{ scale: 1, opacity: 1, y: 0 }} 
                      exit={{ scale: 0.85, opacity: 0, y: 20 }}
                      className={`relative w-full max-w-sm my-8 max-h-[90vh] flex flex-col ${theme === 'dark' ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 backdrop-blur-xl shadow-2xl shadow-purple-900/30 border border-slate-700/50' : 'bg-gradient-to-br from-white via-slate-50 to-blue-50 backdrop-blur-xl shadow-2xl shadow-blue-200/50 border border-blue-100/50'} rounded-2xl p-5 sm:p-6 overflow-hidden`}
                    >
                      {/* Decorative gradient corners */}
                      <div className={`absolute top-0 right-0 w-40 h-40 ${theme === 'dark' ? 'bg-gradient-to-br from-purple-600/10 to-transparent' : 'bg-gradient-to-br from-blue-400/10 to-transparent'} rounded-full -mr-20 -mt-20 blur-2xl`} />
                      
                      <div className="relative z-10 overflow-y-auto flex-1 pr-2">
                        <div className="flex items-center space-x-2 mb-3">
                          <div className={`p-2 rounded-lg flex-shrink-0 ${theme === 'dark' ? 'bg-gradient-to-br from-purple-600 to-indigo-600' : 'bg-gradient-to-br from-blue-500 to-cyan-500'}`}>
                            <Users className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <h3 className={`text-base sm:text-lg font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                              {editingUser ? 'Edit Staff' : 'Create New Staff'}
                            </h3>
                            <p className={`text-[10px] font-semibold uppercase tracking-[0.15em] mt-0 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                              {editingUser ? 'Update profile' : 'Complete details'}
                            </p>
                          </div>
                        </div>

                        <form id="userForm" onSubmit={handleCreateUser} className="space-y-3">
                          {/* Photo Upload with Preview */}
                          <div className="space-y-1.5">
                            <label className={`block text-[9px] font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} ml-0.5`}>Photo</label>
                            <div className={`relative group ${theme === 'dark' ? 'bg-slate-700/30 border-slate-600/50 hover:border-indigo-500/30' : 'bg-blue-50 border-blue-200 hover:border-blue-300/50'} border-2 border-dashed rounded-lg p-3 text-center hover:shadow-md transition-all cursor-pointer w-full h-28 flex items-center justify-center`}>
                              <input 
                                type="file" 
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      setUserFormData({...userFormData, photoURL: reader.result as string});
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer rounded-2xl"
                              />
                              {userFormData.photoURL ? (
                                <div className="relative">
                                  <img src={userFormData.photoURL} alt="Preview" className="w-14 h-14 rounded-lg object-cover shadow-lg" />
                                  <button 
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setUserFormData({...userFormData, photoURL: ''}); }}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white p-0.5 rounded-full shadow-md hover:bg-red-600 transition-all"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <div className={`flex flex-col items-center ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                                    <Users className="h-6 w-6 mb-1 opacity-50" />
                                    <p className="text-[9px] font-bold uppercase">Upload Photo</p>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-slate-500">Full Name</label>
                              <div className="relative">
                                <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                  required
                                  type="text"
                                  value={userFormData.name}
                                  onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                                  className={`w-full pl-10 pr-4 py-3 rounded-lg text-sm font-semibold ${theme === 'dark' ? 'bg-white/5 border-white/10 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 shadow-inner'} border-2 focus:ring-2 focus:ring-[#1976D2]/20 focus:border-[#1976D2] outline-none transition-all hover:border-slate-300`}
                                  placeholder="Full name"
                                />
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-slate-500">User ID</label>
                              <div className="relative">
                                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                  type="text"
                                  maxLength={4}
                                  pattern="[0-9]*"
                                  value={userFormData.userId}
                                  onChange={(e) => setUserFormData({ ...userFormData, userId: e.target.value })}
                                  className={`w-full pl-10 pr-4 py-3 rounded-lg text-sm font-semibold ${theme === 'dark' ? 'bg-white/5 border-white/10 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 shadow-inner'} border-2 focus:ring-2 focus:ring-[#1976D2]/20 focus:border-[#1976D2] outline-none transition-all hover:border-slate-300`}
                                  placeholder="Auto"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-slate-500">Mobile</label>
                              <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                  required
                                  type="tel"
                                  value={userFormData.mobileNo}
                                  onChange={(e) => setUserFormData({ ...userFormData, mobileNo: e.target.value })}
                                  className={`w-full pl-10 pr-4 py-3 rounded-lg text-sm font-semibold ${theme === 'dark' ? 'bg-white/5 border-white/10 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 shadow-inner'} border-2 focus:ring-2 focus:ring-[#1976D2]/20 focus:border-[#1976D2] outline-none transition-all hover:border-slate-300`}
                                  placeholder="9876543210"
                                />
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-slate-500">Email</label>
                              <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                  required
                                  type="email"
                                  value={userFormData.email}
                                  onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                                  className={`w-full pl-10 pr-4 py-3 rounded-lg text-sm font-semibold ${theme === 'dark' ? 'bg-white/5 border-white/10 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 shadow-inner'} border-2 focus:ring-2 focus:ring-[#1976D2]/20 focus:border-[#1976D2] outline-none transition-all hover:border-slate-300`}
                                  placeholder="staff@krmu.edu.in"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-slate-500">
                              Password {editingUser && '(optional)'}
                            </label>
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                              <input
                                type="password"
                                value={userFormData.password}
                                onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                                className={`w-full pl-10 pr-4 py-3 rounded-lg text-sm font-semibold ${theme === 'dark' ? 'bg-white/5 border-white/10 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 shadow-inner'} border-2 focus:ring-2 focus:ring-[#D32F2F]/20 focus:border-[#D32F2F] outline-none transition-all hover:border-slate-300`}
                                placeholder="Min 6 chars"
                              />
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-slate-500">Role</label>
                            <div className="relative">
                              <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                              <select 
                                value={userFormData.role} 
                                onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value as User['role'] })}
                                className={`w-full pl-10 pr-4 py-3 rounded-lg text-sm font-semibold appearance-none bg-no-repeat bg-right bg-[url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0xIDFMNiA2TDExIDEiIGZpbGw9IiM5Q0QyRkYiIHN0cm9rZT0iIzlDRDJGRiIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9zdmc+Cg==")] ${theme === 'dark' ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-inner'} border-2 focus:ring-2 focus:ring-[#1976D2]/20 focus:border-[#1976D2] outline-none transition-all hover:border-slate-300`}
                              >
                                <option value="counsellor">Counsellor</option>
                                <option value="team_lead">Team Lead</option>
                                <option value="front_office">Front Office</option>
                                <option value="admin">Admin</option>
                              </select>
                            </div>
                          </div>

                          {(userFormData.role === 'counsellor' || userFormData.role === 'team_lead') && (
                            <>
                              {userFormData.role === 'counsellor' && (
                                <div className="space-y-2">
                                  <label className="text-[11px] font-black uppercase tracking-widest ml-1 text-slate-500">Assign Team Lead</label>
                                  <div className="relative">
                                    <Users className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                    <select 
                                      value={userFormData.teamLeadId} 
                                      onChange={(e) => setUserFormData({ ...userFormData, teamLeadId: e.target.value })}
                                      className={`w-full pl-12 pr-6 py-5 rounded-2xl font-bold appearance-none bg-no-repeat bg-right bg-[url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0xIDFMNiA2TDExIDEiIGZpbGw9IiM5Q0QyRkYiIHN0cm9rZT0iIzlDRDJGRiIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9zdmc+Cg==")] ${theme === 'dark' ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-inner'} border-2 focus:ring-4 focus:ring-[#1976D2]/20 focus:border-[#1976D2] outline-none transition-all hover:border-slate-300`}
                                    >
                                      <option value="">No Team Lead</option>
                                      {users.filter(u => u.role === 'team_lead' && u.id !== editingUser?.id).map(tl => (
                                        <option key={tl.id} value={tl.id}>{tl.name}</option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                              )}

                              <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-slate-500">Assigned Courses</label>
                                <div className="relative">
                                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                  <input
                                    type="text"
                                    placeholder="Search courses..."
                                    value={courseSearchFilter}
                                    onChange={(e) => setCourseSearchFilter(e.target.value)}
                                    className={`w-full pl-10 pr-4 py-2.5 rounded-lg text-sm font-semibold ${theme === 'dark' ? 'bg-white/5 border-white/10 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 shadow-inner'} border-2 focus:ring-2 focus:ring-[#1976D2]/20 focus:border-[#1976D2] outline-none transition-all hover:border-slate-300`}
                                  />
                                </div>
                                <div className={`max-h-40 overflow-y-auto p-3 rounded-lg border-2 ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} custom-scrollbar`}>
                                  <div className="grid grid-cols-1 gap-2">
                                    {courses.filter(c => c.isActive && (c.name.toLowerCase().includes(courseSearchFilter.toLowerCase()) || c.description?.toLowerCase().includes(courseSearchFilter.toLowerCase()))).map(c => (
                                      <motion.label 
                                        key={c.id} 
                                        whileHover={{ scale: 1.01 }}
                                        className={`flex items-center space-x-2.5 p-2.5 rounded-lg cursor-pointer transition-all group ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-blue-50'} border border-transparent hover:border-blue-200/50`}
                                      >
                                        <input
                                          type="checkbox"
                                          className="h-4 w-4 rounded accent-[#1976D2] border-2 border-slate-300 text-[#1976D2] focus:ring-[#1976D2] focus:ring-2 transition-all shadow-sm"
                                          checked={userFormData.assignedCourses.includes(c.name)}
                                          onChange={(e) => {
                                            const newCourses = e.target.checked 
                                              ? [...userFormData.assignedCourses, c.name]
                                              : userFormData.assignedCourses.filter(cn => cn !== c.name);
                                            setUserFormData({...userFormData, assignedCourses: newCourses});
                                          }}
                                        />
                                        <div>
                                          <div className={`text-xs font-bold ${theme === 'dark' ? 'text-slate-200 group-hover:text-[#1976D2]' : 'text-slate-900 group-hover:text-[#1976D2]'}`}>
                                            {c.name}
                                          </div>
                                          {c.description && (
                                            <div className={`text-[10px] ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>
                                              {c.description}
                                            </div>
                                          )}
                                        </div>
                                      </motion.label>
                                    ))}
                                    {courses.filter(c => c.isActive && (c.name.toLowerCase().includes(courseSearchFilter.toLowerCase()) || c.description?.toLowerCase().includes(courseSearchFilter.toLowerCase()))).length === 0 && (
                                      <div className={`text-xs text-center py-3 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                                        No courses found
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </>
                          )}

                          {error && (
                            <motion.div 
                              initial={{ opacity: 0, height: 0 }} 
                              animate={{ opacity: 1, height: 'auto' }}
                              className={`${theme === 'dark' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-red-50 text-red-600 border-red-100'} p-4 rounded-2xl border flex items-center space-x-3`}
                            >
                              <AlertCircle className="h-5 w-5 flex-shrink-0" />
                              <span>{error}</span>
                            </motion.div>
                          )}
                        </form>
                      </div>
                      
                      {/* Fixed button area at bottom */}
                      <div className={`relative z-10 border-t ${theme === 'dark' ? 'border-slate-700/50' : 'border-blue-100/50'} mt-3 sm:mt-4 pt-3 sm:pt-4 flex flex-col sm:flex-row gap-2.5 sm:gap-3 flex-shrink-0`}>
                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => { 
                            setShowUserForm(false); 
                            setEditingUser(null);
                            setCourseSearchFilter('');
                            setUserFormData({ name: '', email: '', password: '', role: 'counsellor', teamLeadId: '', assignedCourses: [], mobileNo: '', photoURL: '', userId: '' });
                          }}
                          className={`flex-1 py-2.5 px-4 rounded-lg border font-semibold text-sm transition-all ${theme === 'dark' ? 'border-slate-600 text-slate-300 hover:bg-slate-700/50 hover:border-slate-500' : 'border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300'}`}
                        >
                          Cancel
                        </motion.button>
                        <motion.button
                          type="submit"
                          form="userForm"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className={`flex-1 py-2.5 px-4 rounded-lg text-white font-semibold text-sm transition-all ${theme === 'dark' ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-lg shadow-purple-600/30' : 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 shadow-lg shadow-blue-400/30'}`}
                        >
                          {loading ? (
                            <div className="flex items-center justify-center">
                              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                              Saving...
                            </div>
                          ) : editingUser ? (
                            'Update Staff'
                          ) : (
                            'Create Staff'
                          )}
                        </motion.button>
                      </div>
                    </motion.div>
                  </div>
                )}

                {/* Clear Data Confirmation Modal */}
                {showClearConfirm && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={`${theme === 'dark' ? 'bg-[#0A1133] border-white/10' : 'bg-white border-gray-100'} rounded-2xl p-8 max-w-md w-full shadow-2xl border`}>
                      <div className={`${theme === 'dark' ? 'bg-red-500/10' : 'bg-red-50'} w-16 h-16 rounded-full flex items-center justify-center text-red-600 mx-auto mb-6`}>
                        <AlertCircle className="h-8 w-8" />
                      </div>
                      <h3 className={`text-xl font-bold text-center mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Clear All System Data?</h3>
                      <p className={`text-center mb-8 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                        This will permanently delete all enquiries, courses, and non-admin users. This action cannot be undone.
                      </p>
                      <div className="flex space-x-3">
                        <button 
                          onClick={() => setShowClearConfirm(false)} 
                          className={`flex-grow py-3 rounded-xl border ${theme === 'dark' ? 'border-white/10 text-slate-400 hover:bg-white/5' : 'border-gray-200 text-gray-500 hover:bg-gray-50'} font-bold transition-colors`}
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={handleClearData} 
                          disabled={loading}
                          className="flex-grow py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-colors disabled:opacity-50"
                        >
                          {loading ? 'Clearing...' : 'Yes, Clear All'}
                        </button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'courses' && user.role === 'admin' && (
              <div>
                <div className="flex justify-between items-center mb-8">
                  <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>Course Catalog</h2>
                  <button
                    onClick={() => setShowCourseForm(true)}
                    className="bg-[#1976D2] text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-[#1565C0] transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Course</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className={`text-left border-b ${theme === 'dark' ? 'border-white/5' : 'border-slate-100'}`}>
                        <th className={`pb-4 font-black ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'} uppercase text-[10px] tracking-[0.2em]`}>Course Name</th>
                        <th className={`pb-4 font-black ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'} uppercase text-[10px] tracking-[0.2em]`}>Department</th>
                        <th className={`pb-4 font-black ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'} uppercase text-[10px] tracking-[0.2em]`}>Status</th>
                        <th className={`pb-4 font-black ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'} uppercase text-[10px] tracking-[0.2em]`}>Actions</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${theme === 'dark' ? 'divide-white/5' : 'divide-slate-50'}`}>
                      {courses.map(c => (
                        <tr key={c.id} className={`group hover:${theme === 'dark' ? 'bg-white/5' : 'bg-slate-50/50'} transition-all duration-300`}>
                          <td className={`py-5 font-black ${theme === 'dark' ? 'text-slate-200' : 'text-slate-900'} tracking-tight`}>{c.name}</td>
                          <td className={`py-5 text-[10px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{c.description || 'N/A'}</td>
                          <td className="py-5">
                            <button 
                              onClick={() => handleToggleCourseStatus(c.id, c.isActive)}
                              className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${
                                c.isActive 
                                  ? (theme === 'dark' ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20' : 'bg-green-50 text-green-600 hover:bg-green-100') 
                                  : (theme === 'dark' ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-red-50 text-red-600 hover:bg-red-100')
                              }`}
                            >
                              {c.isActive ? 'Active' : 'Inactive'}
                            </button>
                          </td>
                          <td className="py-5">
                            <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                              <button 
                                onClick={() => {
                                  setEditingCourse(c);
                                  setCourseName(c.name);
                                  setCourseDescription(c.description || '');
                                  setShowCourseForm(true);
                                }} 
                                className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-white/5 text-blue-400 hover:bg-blue-500/20' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'} transition-all`}
                                title="Edit Course"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button 
                                onClick={() => handleDeleteCourse(c.id)} 
                                className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-white/5 text-red-400 hover:bg-red-500/20' : 'bg-red-50 text-red-600 hover:bg-red-100'} transition-all`}
                                title="Delete Course"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {showCourseForm && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={`${theme === 'dark' ? 'bg-[#0A1133] border-white/10' : 'bg-white border-gray-100'} rounded-2xl p-8 max-w-md w-full shadow-2xl border`}>
                      <h3 className={`text-xl font-bold mb-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{editingCourse ? 'Edit Course' : 'Add New Course'}</h3>
                      <form onSubmit={handleAddCourse} className="space-y-4">
                        <div>
                          <label className={`block text-xs font-bold ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'} uppercase mb-1`}>Course Name</label>
                          <input required type="text" value={courseName} onChange={e => setCourseName(e.target.value)} className={`w-full px-4 py-2 rounded-lg border ${theme === 'dark' ? 'bg-white/5 border-white/10 text-white focus:ring-blue-500/50' : 'bg-white border-gray-200 text-gray-900 focus:ring-blue-500'} outline-none focus:ring-2 transition-all`} placeholder="e.g. B.Tech CSE" />
                        </div>
                        <div>
                          <label className={`block text-xs font-bold ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'} uppercase mb-1`}>Department / School</label>
                          <input type="text" value={courseDescription} onChange={e => setCourseDescription(e.target.value)} className={`w-full px-4 py-2 rounded-lg border ${theme === 'dark' ? 'bg-white/5 border-white/10 text-white focus:ring-blue-500/50' : 'bg-white border-gray-200 text-gray-900 focus:ring-blue-500'} outline-none focus:ring-2 transition-all`} placeholder="e.g. School of Engineering" />
                        </div>
                        <div className="flex space-x-3 pt-4">
                          <button 
                            type="button" 
                            onClick={() => {
                              setShowCourseForm(false);
                              setEditingCourse(null);
                              setCourseName('');
                              setCourseDescription('');
                            }} 
                            className={`flex-grow py-2 rounded-lg border ${theme === 'dark' ? 'border-white/10 text-slate-400 hover:bg-white/5' : 'border-gray-200 text-gray-500 hover:bg-gray-50'} font-bold transition-colors`}
                          >
                            Cancel
                          </button>
                          <button type="submit" disabled={loading} className="flex-grow py-2 rounded-lg bg-[#1976D2] text-white font-bold hover:bg-[#1565C0] transition-colors disabled:opacity-50">
                            {loading ? (editingCourse ? 'Updating...' : 'Adding...') : (editingCourse ? 'Update Course' : 'Add Course')}
                          </button>
                        </div>
                      </form>
                    </motion.div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'enquiries' && (
              <div>
                <div className="flex justify-between items-center mb-8">
                  <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>All System Enquiries</h2>
                  <button
                    onClick={() => downloadCSV(enquiries, 'all_enquiries')}
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
                      <tr className={`text-left border-b ${theme === 'dark' ? 'border-white/5' : 'border-slate-100'}`}>
                        <th className={`pb-4 font-black ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'} uppercase text-[10px] tracking-[0.2em]`}>Token</th>
                        <th className={`pb-4 font-black ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'} uppercase text-[10px] tracking-[0.2em]`}>Student</th>
                        <th className={`pb-4 font-black ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'} uppercase text-[10px] tracking-[0.2em]`}>Course</th>
                        <th className={`pb-4 font-black ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'} uppercase text-[10px] tracking-[0.2em]`}>Status</th>
                        <th className={`pb-4 font-black ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'} uppercase text-[10px] tracking-[0.2em]`}>Counsellor</th>
                        <th className={`pb-4 font-black ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'} uppercase text-[10px] tracking-[0.2em]`}>Actions</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${theme === 'dark' ? 'divide-white/5' : 'divide-slate-50'}`}>
                      {enquiries.map(e => (
                        <tr key={e.id} className={`group hover:${theme === 'dark' ? 'bg-white/5' : 'bg-slate-50/50'} transition-all duration-300`}>
                          <td className={`py-5 font-mono font-black ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>{e.tokenId}</td>
                          <td className={`py-5 font-black ${theme === 'dark' ? 'text-slate-200' : 'text-slate-900'} tracking-tight`}>{e.studentName}</td>
                          <td className={`py-5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'} font-bold text-xs uppercase tracking-wider`}>{e.course}</td>
                          <td className="py-5">
                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                              e.status === 'Completed' 
                                ? (theme === 'dark' ? 'bg-green-500/10 text-green-400' : 'bg-green-50 text-green-600') :
                              e.status === 'In Progress' 
                                ? (theme === 'dark' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-yellow-50 text-yellow-600') :
                                (theme === 'dark' ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600')
                            }`}>
                              {e.status}
                            </span>
                          </td>
                          <td className={`py-5 text-[10px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                            {users.find(u => u.id === e.counsellorId)?.name || 'Unassigned'}
                          </td>
                          <td className="py-5">
                            <button 
                              onClick={() => {
                                setProcessingEnquiry(e);
                                setProcessingNotes(e.notes || '');
                                setProcessingStatus(e.status);
                                setShowProcessForm(true);
                              }}
                              className={`px-4 py-2 rounded-lg ${theme === 'dark' ? 'bg-white/5 text-blue-400 hover:bg-blue-500/20' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'} font-black text-[10px] uppercase tracking-[0.2em] flex items-center space-x-2 transition-all`}
                            >
                              <Edit2 className="h-3 w-3" />
                              <span>Process</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Enquiry Processing Modal */}
                {showProcessForm && processingEnquiry && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={`${theme === 'dark' ? 'bg-[#0A1133] border-white/10' : 'bg-white border-gray-100'} rounded-2xl p-8 max-w-lg w-full shadow-2xl border`}>
                      <div className="flex justify-between items-center mb-6">
                        <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Process Enquiry: {processingEnquiry.tokenId}</h3>
                        <button onClick={() => setShowProcessForm(false)} className={`${theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-gray-400 hover:text-gray-600'}`}>
                          <Plus className="h-6 w-6 rotate-45" />
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                        <div className={`${theme === 'dark' ? 'bg-white/5' : 'bg-gray-50'} p-3 rounded-lg`}>
                          <p className={`text-[10px] font-bold ${theme === 'dark' ? 'text-slate-500' : 'text-gray-400'} uppercase mb-1`}>Student</p>
                          <p className={`text-sm font-bold ${theme === 'dark' ? 'text-slate-200' : 'text-gray-800'}`}>{processingEnquiry.studentName}</p>
                        </div>
                        <div className={`${theme === 'dark' ? 'bg-white/5' : 'bg-gray-50'} p-3 rounded-lg`}>
                          <p className={`text-[10px] font-bold ${theme === 'dark' ? 'text-slate-500' : 'text-gray-400'} uppercase mb-1`}>Course</p>
                          <p className={`text-sm font-bold ${theme === 'dark' ? 'text-slate-200' : 'text-gray-800'}`}>{processingEnquiry.course}</p>
                        </div>
                        <div className={`${theme === 'dark' ? 'bg-white/5' : 'bg-gray-50'} p-3 rounded-lg`}>
                          <p className={`text-[10px] font-bold ${theme === 'dark' ? 'text-slate-500' : 'text-gray-400'} uppercase mb-1`}>Father's Name</p>
                          <p className={`text-sm font-bold ${theme === 'dark' ? 'text-slate-200' : 'text-gray-800'}`}>{processingEnquiry.fatherName || 'N/A'}</p>
                        </div>
                        <div className={`${theme === 'dark' ? 'bg-white/5' : 'bg-gray-50'} p-3 rounded-lg`}>
                          <p className={`text-[10px] font-bold ${theme === 'dark' ? 'text-slate-500' : 'text-gray-400'} uppercase mb-1`}>Contact</p>
                          <p className={`text-sm font-bold ${theme === 'dark' ? 'text-slate-200' : 'text-gray-800'}`}>{processingEnquiry.studentPhone}</p>
                        </div>
                        <div className={`${theme === 'dark' ? 'bg-white/5' : 'bg-gray-50'} p-3 rounded-lg`}>
                          <p className={`text-[10px] font-bold ${theme === 'dark' ? 'text-slate-500' : 'text-gray-400'} uppercase mb-1`}>Category</p>
                          <p className={`text-sm font-bold ${theme === 'dark' ? 'text-slate-200' : 'text-gray-800'}`}>{processingEnquiry.category || 'General'}</p>
                        </div>
                        <div className={`${theme === 'dark' ? 'bg-white/5' : 'bg-gray-50'} p-3 rounded-lg`}>
                          <p className={`text-[10px] font-bold ${theme === 'dark' ? 'text-slate-500' : 'text-gray-400'} uppercase mb-1`}>Last Institution</p>
                          <p className={`text-sm font-bold ${theme === 'dark' ? 'text-slate-200' : 'text-gray-800'}`}>{processingEnquiry.lastInstitution || 'N/A'}</p>
                        </div>
                        <div className={`${theme === 'dark' ? 'bg-white/5' : 'bg-gray-50'} p-3 rounded-lg`}>
                          <p className={`text-[10px] font-bold ${theme === 'dark' ? 'text-slate-500' : 'text-gray-400'} uppercase mb-1`}>12th Marks</p>
                          <p className={`text-sm font-bold ${theme === 'dark' ? 'text-slate-200' : 'text-gray-800'}`}>{processingEnquiry.marks12th || 'N/A'}%</p>
                        </div>
                        <div className={`${theme === 'dark' ? 'bg-white/5' : 'bg-gray-50'} p-3 rounded-lg`}>
                          <p className={`text-[10px] font-bold ${theme === 'dark' ? 'text-slate-500' : 'text-gray-400'} uppercase mb-1`}>Graduation</p>
                          <p className={`text-sm font-bold ${theme === 'dark' ? 'text-slate-200' : 'text-gray-800'}`}>{processingEnquiry.marksGrad || 'N/A'}%</p>
                        </div>
                        <div className={`${theme === 'dark' ? 'bg-white/5' : 'bg-gray-50'} p-3 rounded-lg col-span-2`}>
                          <p className={`text-[10px] font-bold ${theme === 'dark' ? 'text-slate-500' : 'text-gray-400'} uppercase mb-1`}>Address</p>
                          <p className={`text-sm font-bold ${theme === 'dark' ? 'text-slate-200' : 'text-gray-800'}`}>
                            {processingEnquiry.address}, {processingEnquiry.city}, {processingEnquiry.state} - {processingEnquiry.pincode}
                          </p>
                        </div>
                        <div className={`${theme === 'dark' ? 'bg-white/5' : 'bg-gray-50'} p-3 rounded-lg col-span-2`}>
                          <p className={`text-[10px] font-bold ${theme === 'dark' ? 'text-slate-500' : 'text-gray-400'} uppercase mb-1`}>Assigned Counsellor</p>
                          <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-[10px] text-white font-bold">
                              {users.find(u => u.id === processingEnquiry.counsellorId)?.name.charAt(0) || 'U'}
                            </div>
                            <p className={`text-sm font-bold ${theme === 'dark' ? 'text-slate-200' : 'text-gray-800'}`}>
                              {users.find(u => u.id === processingEnquiry.counsellorId)?.name || 'Unassigned'}
                            </p>
                          </div>
                        </div>
                      </div>

                      <form onSubmit={handleProcessEnquiry} className="space-y-4">
                        <div>
                          <label className={`block text-xs font-bold ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'} uppercase mb-1`}>Update Status</label>
                          <select 
                            value={processingStatus} 
                            onChange={e => setProcessingStatus(e.target.value as Enquiry['status'])} 
                            className={`w-full px-4 py-2 rounded-lg border ${theme === 'dark' ? 'bg-white/5 border-white/10 text-white focus:ring-blue-500/50' : 'bg-white border-gray-200 text-gray-900 focus:ring-blue-500'} outline-none focus:ring-2 transition-all font-bold`}
                          >
                            <option value="Pending">Pending</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Completed">Completed</option>
                          </select>
                        </div>
                        <div>
                          <label className={`block text-xs font-bold ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'} uppercase mb-1`}>Processing Notes</label>
                          <textarea 
                            rows={4} 
                            value={processingNotes} 
                            onChange={e => setProcessingNotes(e.target.value)} 
                            className={`w-full px-4 py-2 rounded-lg border ${theme === 'dark' ? 'bg-white/5 border-white/10 text-white focus:ring-blue-500/50' : 'bg-white border-gray-200 text-gray-900 focus:ring-blue-500'} outline-none focus:ring-2 transition-all`} 
                            placeholder="Enter processing notes, follow-up details, etc."
                          />
                        </div>
                        <div className="flex space-x-3 pt-4">
                          <button 
                            type="button" 
                            onClick={() => setShowProcessForm(false)} 
                            className={`flex-grow py-3 rounded-xl border ${theme === 'dark' ? 'border-white/10 text-slate-400 hover:bg-white/5' : 'border-gray-200 text-gray-500 hover:bg-gray-50'} font-bold transition-colors`}
                          >
                            Cancel
                          </button>
                          <button 
                            type="submit" 
                            disabled={loading} 
                            className="flex-grow py-3 rounded-xl bg-[#1976D2] text-white font-bold hover:bg-[#1565C0] transition-all disabled:opacity-50"
                          >
                            {loading ? 'Updating...' : 'Update Enquiry'}
                          </button>
                        </div>
                      </form>
                    </motion.div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'transport' && (
              <div className="space-y-8">
                <div className="flex justify-between items-center">
                  <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>Transport Management</h2>
                  <div className="flex space-x-4">
                    <button 
                      onClick={() => {
                        setEditingRoute(null);
                        setRouteFormData({ 
                          routeName: '', 
                          busNumber: '', 
                          busRegNo: '',
                          driverName: '', 
                          driverPhone: '', 
                          helperName: '',
                          morningTime: '', 
                          eveningTime: '', 
                          isActive: true, 
                          stops: [] 
                        });
                        setShowRouteForm(true);
                      }}
                      className="bg-[#1976D2] text-white px-6 py-2 rounded-xl font-bold flex items-center space-x-2 hover:bg-[#1565C0] transition-all shadow-lg shadow-blue-200"
                    >
                      <Plus className="h-5 w-5" />
                      <span>Add Route</span>
                    </button>
                    <button 
                      onClick={() => {
                        setEditingStop(null);
                        setStopFormData({ stopName: '', routeId: '', pickupTime: '', dropTime: '' });
                        setShowStopForm(true);
                      }}
                      className="bg-[#4CAF50] text-white px-6 py-2 rounded-xl font-bold flex items-center space-x-2 hover:bg-[#43A047] transition-all shadow-lg shadow-green-200"
                    >
                      <Plus className="h-5 w-5" />
                      <span>Add Stop</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Routes List */}
                  <div className={`${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-white border-gray-100'} p-6 rounded-2xl border shadow-sm`}>
                    <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-slate-200' : 'text-gray-700'} mb-6 flex items-center space-x-2`}>
                      <Bus className="h-5 w-5 text-blue-500" />
                      <span>Bus Routes</span>
                    </h3>
                    <div className="space-y-4">
                      {transportRoutes.map(route => (
                        <div key={route.id} className={`p-5 rounded-2xl border ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200 shadow-sm'} group hover:border-blue-500/50 transition-all duration-300`}>
                          <div className="flex justify-between items-start">
                            <div className="flex-grow">
                              <div className="flex items-center space-x-3 mb-4">
                                <div className={`p-2.5 rounded-xl ${theme === 'dark' ? 'bg-blue-500/20' : 'bg-blue-50'}`}>
                                  <Bus className="h-5 w-5 text-blue-500" />
                                </div>
                                <div>
                                  <h4 className={`text-lg font-black tracking-tight ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{route.routeName}</h4>
                                  <div className="flex items-center space-x-2">
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${route.isActive ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                                      {route.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                    <span className={`text-[10px] font-bold ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'} uppercase tracking-widest`}>• {route.busNumber}</span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className={`p-3 rounded-xl ${theme === 'dark' ? 'bg-white/5' : 'bg-slate-50'} border ${theme === 'dark' ? 'border-white/5' : 'border-slate-100'}`}>
                                  <div className="flex items-center space-x-3 mb-2">
                                    <Users className="h-4 w-4 text-purple-500" />
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Driver Details</span>
                                  </div>
                                  <p className={`text-sm font-bold ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>{route.driverName}</p>
                                  <div className="flex items-center space-x-2 mt-1">
                                    <Phone className="h-3 w-3 text-emerald-500" />
                                    <span className={`text-xs font-bold ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>{route.driverPhone}</span>
                                  </div>
                                </div>

                                <div className={`p-3 rounded-xl ${theme === 'dark' ? 'bg-white/5' : 'bg-slate-50'} border ${theme === 'dark' ? 'border-white/5' : 'border-slate-100'}`}>
                                  <div className="flex items-center space-x-3 mb-2">
                                    <Clock className="h-4 w-4 text-orange-500" />
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Operational Times</span>
                                  </div>
                                  <div className="flex flex-col space-y-1">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] font-bold text-blue-500 uppercase">Morning</span>
                                      <span className={`text-xs font-black ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>{route.morningTime}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] font-bold text-purple-500 uppercase">Evening</span>
                                      <span className={`text-xs font-black ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>{route.eveningTime}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {route.stops && route.stops.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-dashed border-slate-200 dark:border-white/10">
                                  <div className="flex items-center justify-between mb-3">
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Route Stops ({route.stops.length})</span>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {route.stops.map((stopName, idx) => (
                                      <span key={idx} className={`text-[9px] px-2.5 py-1 rounded-lg font-bold ${theme === 'dark' ? 'bg-white/5 text-slate-400 border border-white/5' : 'bg-slate-50 text-slate-600 border border-slate-200'}`}>
                                        {stopName}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col space-y-2 opacity-0 group-hover:opacity-100 transition-all ml-4">
                              <button 
                                onClick={() => setSelectedRosterRoute(route)}
                                className={`p-2.5 rounded-xl ${theme === 'dark' ? 'bg-white/10 text-yellow-400 hover:bg-yellow-500/20' : 'bg-white text-yellow-600 border border-yellow-100 hover:bg-yellow-50'} shadow-sm transition-all`}
                                title="View Roster"
                              >
                                <FileText className="h-5 w-5" />
                              </button>
                              <button 
                                onClick={() => {
                                  setEditingRoute(route);
                                  const existingStops = transportStops
                                    .filter(s => s.routeId === route.id)
                                    .map(s => ({
                                      stopName: s.stopName,
                                      pickupTime: s.pickupTime,
                                      dropTime: s.dropTime
                                    }));
                                  setRouteFormData({
                                    routeName: route.routeName,
                                    busNumber: route.busNumber,
                                    busRegNo: route.busRegNo || '',
                                    driverName: route.driverName,
                                    driverPhone: route.driverPhone,
                                    helperName: route.helperName || '',
                                    morningTime: route.morningTime,
                                    eveningTime: route.eveningTime,
                                    isActive: route.isActive,
                                    stops: existingStops
                                  });
                                  setShowRouteForm(true);
                                }}
                                className={`p-2.5 rounded-xl ${theme === 'dark' ? 'bg-white/10 text-blue-400 hover:bg-blue-500/20' : 'bg-white text-blue-600 border border-blue-100 hover:bg-blue-50'} shadow-sm transition-all`}
                                title="Edit Route"
                              >
                                <Edit2 className="h-5 w-5" />
                              </button>
                              <button 
                                onClick={() => setDeleteConfirm({ type: 'route', id: route.id })}
                                className={`p-2.5 rounded-xl ${theme === 'dark' ? 'bg-white/10 text-red-400 hover:bg-red-500/20' : 'bg-white text-red-600 border border-red-100 hover:bg-red-50'} shadow-sm transition-all`}
                                title="Delete Route"
                              >
                                <Trash2 className="h-5 w-5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Stops List */}
                  <div className={`${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-white border-gray-100'} p-6 rounded-2xl border shadow-sm`}>
                    <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-slate-200' : 'text-gray-700'} mb-6 flex items-center space-x-2`}>
                      <MapPin className="h-5 w-5 text-green-500" />
                      <span>Bus Stops</span>
                    </h3>
                    <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                      {transportStops.map(stop => {
                        const route = transportRoutes.find(r => r.id === stop.routeId);
                        return (
                          <div key={stop.id} className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'} group hover:border-green-500/50 transition-all`}>
                            <div className="flex justify-between items-start">
                              <div className="flex-grow">
                                <h4 className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{stop.stopName}</h4>
                                <div className="flex items-center space-x-2 mt-2">
                                  <Bus className="h-3 w-3 text-blue-500" />
                                  <span className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>Route: {route?.routeName || 'Unknown'}</span>
                                </div>
                                <div className="flex space-x-4 mt-3">
                                  <div className="flex items-center space-x-2">
                                    <div className={`p-1 rounded-md ${theme === 'dark' ? 'bg-green-500/10' : 'bg-green-50'}`}>
                                      <Clock className="h-3 w-3 text-green-600" />
                                    </div>
                                    <span className="text-[10px] font-bold text-green-600 uppercase">Pickup: {stop.pickupTime}</span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <div className={`p-1 rounded-md ${theme === 'dark' ? 'bg-orange-500/10' : 'bg-orange-50'}`}>
                                      <Clock className="h-3 w-3 text-orange-600" />
                                    </div>
                                    <span className="text-[10px] font-bold text-orange-600 uppercase">Drop: {stop.dropTime}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-all ml-4">
                                <button 
                                  onClick={() => {
                                    setEditingStop(stop);
                                    setStopFormData({
                                      stopName: stop.stopName,
                                      routeId: stop.routeId,
                                      pickupTime: stop.pickupTime,
                                      dropTime: stop.dropTime
                                    });
                                    setShowStopForm(true);
                                  }}
                                  className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-white/10 text-blue-400' : 'bg-white text-blue-600 border border-blue-100'}`}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                                <button 
                                  onClick={() => setDeleteConfirm({ type: 'stop', id: stop.id })}
                                  className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-white/10 text-red-400' : 'bg-white text-red-600 border border-red-100'}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Roster Modal */}
                {selectedRosterRoute && (
                  <BusRoster 
                    route={selectedRosterRoute}
                    stops={transportStops.filter(s => s.routeId === selectedRosterRoute.id)}
                    onClose={() => setSelectedRosterRoute(null)}
                  />
                )}

                {/* Route Form Modal */}
                {showRouteForm && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm overflow-y-auto">
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={`relative w-full max-w-sm my-8 max-h-[90vh] flex flex-col ${theme === 'dark' ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 shadow-2xl shadow-purple-900/30 border-slate-700/50' : 'bg-gradient-to-br from-white via-slate-50 to-blue-50 shadow-2xl shadow-blue-200/50 border-blue-100/50'} rounded-2xl p-4 sm:p-5 border overflow-hidden`}>
                      <div className={`absolute top-0 right-0 w-40 h-40 ${theme === 'dark' ? 'bg-gradient-to-br from-purple-600/10 to-transparent' : 'bg-gradient-to-br from-blue-400/10 to-transparent'} rounded-full -mr-20 -mt-20 blur-2xl`} />
                      
                      <h3 className={`relative z-10 text-base sm:text-lg font-bold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{editingRoute ? 'Edit Route' : 'Add New Route'}</h3>
                      
                      <div className="relative z-10 overflow-y-auto flex-1 pr-2">
                        <form id="routeForm" onSubmit={handleAddTransportRoute} className="space-y-3">
                          <div className="grid grid-cols-2 gap-2.5">
                            <div>
                              <label className={`block text-[9px] font-bold ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'} uppercase mb-0.5`}>Route</label>
                              <input required type="text" value={routeFormData.routeName} onChange={e => setRouteFormData({...routeFormData, routeName: e.target.value})} className={`w-full px-3 py-1.5 rounded-lg text-xs border ${theme === 'dark' ? 'bg-slate-700/30 border-slate-600/50 text-white' : 'bg-white border-gray-200 text-gray-900'} outline-none focus:ring-1.5 focus:ring-blue-500/50 transition-all`} placeholder="W-1" />
                            </div>
                            <div>
                              <label className={`block text-[9px] font-bold ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'} uppercase mb-0.5`}>Bus #</label>
                              <input required type="text" value={routeFormData.busNumber} onChange={e => setRouteFormData({...routeFormData, busNumber: e.target.value})} className={`w-full px-3 py-1.5 rounded-lg text-xs border ${theme === 'dark' ? 'bg-slate-700/30 border-slate-600/50 text-white' : 'bg-white border-gray-200 text-gray-900'} outline-none focus:ring-1.5 focus:ring-blue-500/50 transition-all`} placeholder="Route 1" />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2.5">
                            <div>
                              <label className={`block text-[9px] font-bold ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'} uppercase mb-0.5`}>Reg. No</label>
                              <input required type="text" value={routeFormData.busRegNo} onChange={e => setRouteFormData({...routeFormData, busRegNo: e.target.value})} className={`w-full px-3 py-1.5 rounded-lg text-xs border ${theme === 'dark' ? 'bg-slate-700/30 border-slate-600/50 text-white' : 'bg-white border-gray-200 text-gray-900'} outline-none focus:ring-1.5 focus:ring-blue-500/50 transition-all`} placeholder="HR55AN8591" />
                            </div>
                            <div>
                              <label className={`block text-[9px] font-bold ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'} uppercase mb-0.5`}>Helper</label>
                              <input required type="text" value={routeFormData.helperName} onChange={e => setRouteFormData({...routeFormData, helperName: e.target.value})} className={`w-full px-3 py-1.5 rounded-lg text-xs border ${theme === 'dark' ? 'bg-slate-700/30 border-slate-600/50 text-white' : 'bg-white border-gray-200 text-gray-900'} outline-none focus:ring-1.5 focus:ring-blue-500/50 transition-all`} placeholder="Name" />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2.5">
                            <div>
                              <label className={`block text-[9px] font-bold ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'} uppercase mb-0.5`}>Driver</label>
                              <input required type="text" value={routeFormData.driverName} onChange={e => setRouteFormData({...routeFormData, driverName: e.target.value})} className={`w-full px-3 py-1.5 rounded-lg text-xs border ${theme === 'dark' ? 'bg-slate-700/30 border-slate-600/50 text-white' : 'bg-white border-gray-200 text-gray-900'} outline-none focus:ring-1.5 focus:ring-blue-500/50 transition-all`} placeholder="Name" />
                            </div>
                            <div>
                              <label className={`block text-[9px] font-bold ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'} uppercase mb-0.5`}>Phone</label>
                              <input required type="text" value={routeFormData.driverPhone} onChange={e => setRouteFormData({...routeFormData, driverPhone: e.target.value})} className={`w-full px-3 py-1.5 rounded-lg text-xs border ${theme === 'dark' ? 'bg-slate-700/30 border-slate-600/50 text-white' : 'bg-white border-gray-200 text-gray-900'} outline-none focus:ring-1.5 focus:ring-blue-500/50 transition-all`} placeholder="9876543210" />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2.5">
                            <div>
                              <label className={`block text-[9px] font-bold ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'} uppercase mb-0.5`}>Morning</label>
                              <input required type="text" value={routeFormData.morningTime} onChange={e => setRouteFormData({...routeFormData, morningTime: e.target.value})} className={`w-full px-3 py-1.5 rounded-lg text-xs border ${theme === 'dark' ? 'bg-slate-700/30 border-slate-600/50 text-white' : 'bg-white border-gray-200 text-gray-900'} outline-none focus:ring-1.5 focus:ring-blue-500/50 transition-all`} placeholder="7:00 AM" />
                            </div>
                            <div>
                              <label className={`block text-[9px] font-bold ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'} uppercase mb-0.5`}>Evening</label>
                              <input required type="text" value={routeFormData.eveningTime} onChange={e => setRouteFormData({...routeFormData, eveningTime: e.target.value})} className={`w-full px-3 py-1.5 rounded-lg text-xs border ${theme === 'dark' ? 'bg-slate-700/30 border-slate-600/50 text-white' : 'bg-white border-gray-200 text-gray-900'} outline-none focus:ring-1.5 focus:ring-blue-500/50 transition-all`} placeholder="4:30 PM" />
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 pt-1">
                            <input type="checkbox" id="routeActive" checked={routeFormData.isActive} onChange={e => setRouteFormData({...routeFormData, isActive: e.target.checked})} className="rounded" />
                            <label htmlFor="routeActive" className={`text-xs font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>Active</label>
                          </div>

                          {/* Stops Section */}
                          <div className={`mt-3 p-3 rounded-lg border ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-slate-100 border-slate-200'}`}>
                            <div className="flex items-center justify-between mb-2">
                              <h4 className={`text-[10px] font-bold uppercase ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Stops</h4>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${theme === 'dark' ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                                {routeFormData.stops.length}
                              </span>
                            </div>
                            
                            <div className="space-y-2 mb-2">
                              <input 
                                type="text" 
                                placeholder="Stop name" 
                                value={newStop.stopName}
                                onChange={e => setNewStop({...newStop, stopName: e.target.value})}
                                className={`w-full px-2.5 py-1.5 rounded text-xs border ${theme === 'dark' ? 'bg-slate-700/30 border-slate-600/50 text-white' : 'bg-white border-gray-200 text-gray-900'} outline-none focus:ring-1.5 focus:ring-blue-500/50`}
                              />
                              <div className="grid grid-cols-2 gap-2">
                                <input 
                                  type="text" 
                                  placeholder="7:15 AM" 
                                  value={newStop.pickupTime}
                                  onChange={e => setNewStop({...newStop, pickupTime: e.target.value})}
                                  className={`w-full px-2.5 py-1.5 rounded text-xs border ${theme === 'dark' ? 'bg-slate-700/30 border-slate-600/50 text-white' : 'bg-white border-gray-200 text-gray-900'} outline-none focus:ring-1.5 focus:ring-blue-500/50`}
                                />
                                <input 
                                  type="text" 
                                  placeholder="5:00 PM" 
                                  value={newStop.dropTime}
                                  onChange={e => setNewStop({...newStop, dropTime: e.target.value})}
                                  className={`w-full px-2.5 py-1.5 rounded text-xs border ${theme === 'dark' ? 'bg-slate-700/30 border-slate-600/50 text-white' : 'bg-white border-gray-200 text-gray-900'} outline-none focus:ring-1.5 focus:ring-blue-500/50`}
                                />
                              </div>
                            </div>
                            <button 
                              type="button" 
                              onClick={addStopToRoute}
                              className={`w-full py-1.5 rounded text-xs font-bold text-white ${theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} transition-all flex items-center justify-center space-x-1`}
                            >
                              <Plus className="h-3 w-3" />
                              <span>Add Stop</span>
                            </button>

                            {routeFormData.stops.length > 0 && (
                              <div className="space-y-1 max-h-32 overflow-y-auto mt-2">
                                {routeFormData.stops.map((stop, idx) => (
                                  <div key={idx} className={`flex justify-between items-center p-2 rounded text-xs ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-white'} border ${theme === 'dark' ? 'border-slate-600/30' : 'border-slate-200'} group`}>
                                    <div className="flex items-center space-x-2 flex-1">
                                      <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold ${theme === 'dark' ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600'}`}>
                                        {idx + 1}
                                      </div>
                                      <div className="min-w-0">
                                        <p className={`text-[9px] font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} truncate`}>{stop.stopName}</p>
                                        <div className="flex items-center space-x-1 mt-0.5">
                                          <span className="text-[8px] font-bold text-emerald-500">↑ {stop.pickupTime}</span>
                                          <span className="text-[7px] text-slate-400">|</span>
                                          <span className="text-[8px] font-bold text-orange-500">↓ {stop.dropTime}</span>
                                        </div>
                                      </div>
                                    </div>
                                    <button 
                                      type="button" 
                                      onClick={() => removeStopFromRoute(idx)}
                                      className="p-1 text-red-500 hover:bg-red-500/10 rounded opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 ml-1"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </form>
                      </div>

                      <div className={`relative z-10 border-t ${theme === 'dark' ? 'border-slate-700/50' : 'border-blue-100/50'} mt-3 pt-3 flex flex-col sm:flex-row gap-2 flex-shrink-0`}>
                        <button type="button" onClick={() => setShowRouteForm(false)} className={`flex-1 py-2 rounded-lg border text-xs font-semibold transition-all ${theme === 'dark' ? 'border-slate-600 text-slate-300 hover:bg-slate-700/50' : 'border-slate-200 text-slate-600 hover:bg-slate-100'}`}>Cancel</button>
                        <button type="submit" form="routeForm" disabled={loading} className={`flex-1 py-2 rounded-lg text-white text-xs font-semibold transition-all ${theme === 'dark' ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500' : 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600'} disabled:opacity-50`}>
                          {loading ? 'Saving...' : (editingRoute ? 'Update Route' : 'Add Route')}
                        </button>
                      </div>
                    </motion.div>
                  </div>
                )}

                {/* Stop Form Modal */}
                {showStopForm && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={`${theme === 'dark' ? 'bg-[#0A1133] border-white/10' : 'bg-white border-gray-100'} rounded-2xl p-8 max-w-md w-full shadow-2xl border`}>
                      <h3 className={`text-xl font-bold mb-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{editingStop ? 'Edit Stop' : 'Add New Stop'}</h3>
                      <form onSubmit={handleAddTransportStop} className="space-y-4">
                        <div>
                          <label className={`block text-xs font-bold ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'} uppercase mb-1`}>Stop Name</label>
                          <input required type="text" value={stopFormData.stopName} onChange={e => setStopFormData({...stopFormData, stopName: e.target.value})} className={`w-full px-4 py-2 rounded-lg border ${theme === 'dark' ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-gray-200 text-gray-900'} outline-none focus:ring-2 transition-all`} placeholder="e.g. Huda City Centre" />
                        </div>
                        <div>
                          <label className={`block text-xs font-bold ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'} uppercase mb-1`}>Select Route</label>
                          <select required value={stopFormData.routeId} onChange={e => setStopFormData({...stopFormData, routeId: e.target.value})} className={`w-full px-4 py-2 rounded-lg border ${theme === 'dark' ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-gray-200 text-gray-900'} outline-none focus:ring-2 transition-all font-bold`}>
                            <option value="">Select a route</option>
                            {transportRoutes.map(r => (
                              <option key={r.id} value={r.id}>{r.routeName}</option>
                            ))}
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className={`block text-xs font-bold ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'} uppercase mb-1`}>Pickup Time</label>
                            <input required type="text" value={stopFormData.pickupTime} onChange={e => setStopFormData({...stopFormData, pickupTime: e.target.value})} className={`w-full px-4 py-2 rounded-lg border ${theme === 'dark' ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-gray-200 text-gray-900'} outline-none focus:ring-2 transition-all`} placeholder="e.g. 7:15 AM" />
                          </div>
                          <div>
                            <label className={`block text-xs font-bold ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'} uppercase mb-1`}>Drop Time</label>
                            <input required type="text" value={stopFormData.dropTime} onChange={e => setStopFormData({...stopFormData, dropTime: e.target.value})} className={`w-full px-4 py-2 rounded-lg border ${theme === 'dark' ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-gray-200 text-gray-900'} outline-none focus:ring-2 transition-all`} placeholder="e.g. 5:00 PM" />
                          </div>
                        </div>
                        <div className="flex space-x-3 pt-4">
                          <button type="button" onClick={() => setShowStopForm(false)} className={`flex-grow py-2 rounded-lg border ${theme === 'dark' ? 'border-white/10 text-slate-400 hover:bg-white/5' : 'border-gray-200 text-gray-500 hover:bg-gray-50'} font-bold transition-colors`}>Cancel</button>
                          <button type="submit" disabled={loading} className="flex-grow py-2 rounded-lg bg-[#4CAF50] text-white font-bold hover:bg-[#43A047] transition-colors disabled:opacity-50">
                            {loading ? 'Saving...' : (editingStop ? 'Update Stop' : 'Add Stop')}
                          </button>
                        </div>
                      </form>
                    </motion.div>
                  </div>
                )}

                {/* Delete Confirmation Modal */}
                {deleteConfirm && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={`${theme === 'dark' ? 'bg-[#0A1133] border-white/10' : 'bg-white border-gray-100'} rounded-2xl p-8 max-w-sm w-full shadow-2xl border text-center`}>
                      <div className="bg-red-500/10 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                        <Trash2 className="h-8 w-8 text-red-500" />
                      </div>
                      <h3 className={`text-xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Confirm Delete</h3>
                      <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'} mb-8`}>
                        Are you sure you want to delete this {deleteConfirm.type}? {deleteConfirm.type === 'route' && 'All associated stops will also be deleted.'} This action cannot be undone.
                      </p>
                      <div className="flex space-x-3">
                        <button onClick={() => setDeleteConfirm(null)} className={`flex-grow py-3 rounded-xl border ${theme === 'dark' ? 'border-white/10 text-slate-400 hover:bg-white/5' : 'border-gray-200 text-gray-500 hover:bg-gray-50'} font-bold transition-colors`}>Cancel</button>
                        <button 
                          onClick={() => deleteConfirm.type === 'route' ? handleDeleteRoute(deleteConfirm.id) : handleDeleteStop(deleteConfirm.id)} 
                          className="flex-grow py-3 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
                        >
                          Delete
                        </button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'reports' && user.role === 'admin' && (
              <div className="space-y-12">
                <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'} mb-8`}>System Analytics</h2>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Status Distribution */}
                  <div className={`${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-100'} p-6 rounded-2xl border`}>
                    <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-slate-200' : 'text-gray-700'} mb-6`}>Enquiry Status Distribution</h3>
                    <div className="w-full" style={{ height: '256px' }}>
                      <ResponsiveContainer width="100%" height={256}>
                        <PieChart>
                          <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                            {statusData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ 
                              borderRadius: '12px', 
                              border: 'none', 
                              boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                              backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff',
                              color: theme === 'dark' ? '#f1f5f9' : '#1e293b'
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex justify-center space-x-6 mt-4">
                      {statusData.map((s, i) => (
                        <div key={s.name} className="flex items-center space-x-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }}></div>
                          <span className={`text-xs font-bold ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>{s.name}: {s.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Top Courses */}
                  <div className={`${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-100'} p-6 rounded-2xl border`}>
                    <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-slate-200' : 'text-gray-700'} mb-6`}>Top 5 Courses by Interest</h3>
                    <div className="w-full" style={{ height: '256px' }}>
                      <ResponsiveContainer width="100%" height={256}>
                        <BarChart data={courseData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#1e293b' : '#eee'} />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: theme === 'dark' ? '#64748b' : '#94a3b8' }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: theme === 'dark' ? '#64748b' : '#94a3b8' }} />
                          <Tooltip 
                            cursor={{ fill: theme === 'dark' ? '#1e293b' : '#f0f0f0' }} 
                            contentStyle={{ 
                              borderRadius: '12px', 
                              border: 'none', 
                              boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                              backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff',
                              color: theme === 'dark' ? '#f1f5f9' : '#1e293b'
                            }}
                          />
                          <Bar dataKey="count" fill="#1976D2" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className={`${theme === 'dark' ? 'bg-white/5 border-red-500/20' : 'bg-white border-red-50'} p-6 rounded-2xl border-2 shadow-sm text-center`}>
                    <p className="text-xs font-bold text-red-400 uppercase tracking-widest mb-1">Total Enquiries</p>
                    <p className={`text-4xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>{enquiries.length}</p>
                  </div>
                  <div className={`${theme === 'dark' ? 'bg-white/5 border-blue-500/20' : 'bg-white border-blue-50'} p-6 rounded-2xl border-2 shadow-sm text-center`}>
                    <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-1">Active Counsellors</p>
                    <p className={`text-4xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>{users.filter(u => u.role === 'counsellor').length}</p>
                  </div>
                  <div className={`${theme === 'dark' ? 'bg-white/5 border-green-500/20' : 'bg-white border-green-50'} p-6 rounded-2xl border-2 shadow-sm text-center`}>
                    <p className="text-xs font-bold text-green-400 uppercase tracking-widest mb-1">Completion Rate</p>
                    <p className={`text-4xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                      {enquiries.length ? Math.round((enquiries.filter(e => e.status === 'Completed').length / enquiries.length) * 100) : 0}%
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AdminDashboard;
