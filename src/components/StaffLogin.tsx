import React, { useEffect, useState } from 'react';
import { LogIn, Shield, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useTheme } from '../contexts/ThemeContext';
import '../styles/components/StaffLogin.css';

interface StaffLoginProps {
  onLogin: (user: any) => void;
}

const StaffLogin: React.FC<StaffLoginProps> = ({ onLogin }) => {
  const { theme } = useTheme();

  const [userId, setUserId] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tableMissing, setTableMissing] = useState(false);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch('/api/supabase-health');
        const result = await res.json();
        if (
          result.status === 'error' &&
          result.message?.includes('relation "public.users" does not exist')
        ) {
          setTableMissing(true);
        }
      } catch (err) {
        console.error('Supabase health check failed:', err);
      }
    };
    checkHealth();
  }, []);

  const handleBootstrap = async () => {
    setIsBootstrapping(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/admin/bootstrap', { method: 'POST' });
      const result = await res.json();
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
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, name }),
      });
      const result = await res.json();
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
          createdAt: result.user.created_at,
        });
      } else {
        setError(result.error || 'Invalid User ID or Name');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="staff-login-container">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="staff-login-card"
      >
        <div className="staff-login-header">
          <div className="staff-login-icon-wrap">
            <LogIn className="h-8 w-8 text-[#D32F2F]" />
          </div>
          <h2 className="staff-login-title">Staff Access</h2>
          <p className="staff-login-subtitle">Internal portal for KRMU staff</p>
        </div>

        {error && (
          <div className="staff-login-alert staff-login-alert--error">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {success && (
          <div className="staff-login-alert staff-login-alert--success">
            <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
            <p>{success}</p>
          </div>
        )}

        {tableMissing && (
          <div className="staff-login-alert staff-login-alert--warning">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <div>
              <p className="text-xs font-bold">Database Tables Missing</p>
              <p className="text-[10px]">Please run the SQL script in Supabase SQL Editor.</p>
            </div>
          </div>
        )}

        <form onSubmit={handleLogin} className="staff-login-form">
          <div className="staff-login-field">
            <label className="staff-login-label">User ID (4 Digits)</label>
            <div className="staff-login-input-wrap">
              <Shield className="h-5 w-5" />
              <input
                required
                type="text"
                maxLength={4}
                pattern="\d{4}"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="e.g. 1001"
                className="staff-login-input"
              />
            </div>
          </div>

          <div className="staff-login-field">
            <label className="staff-login-label">Full Name</label>
            <div className="staff-login-input-wrap">
              <LogIn className="h-5 w-5" />
              <input
                required
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="staff-login-input"
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="staff-login-btn">
            {loading ? (
              <>
                <span className="staff-login-spinner" />
                <span>Signing In...</span>
              </>
            ) : (
              <>
                <span>Sign In to Dashboard</span>
                <LogIn className="h-5 w-5" />
              </>
            )}
          </button>
        </form>

        {userId === '1001' && (
          <div className="staff-login-bootstrap">
            <button
              type="button"
              onClick={handleBootstrap}
              disabled={isBootstrapping}
              className="staff-login-bootstrap-btn"
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

