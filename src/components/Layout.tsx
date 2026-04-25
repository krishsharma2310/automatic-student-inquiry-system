import React, { ReactNode, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import {
  LogOut,
  LogIn,
  MapPin,
  Phone,
  Mail,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  ExternalLink,
  Send,
  ChevronUp,
  Sun,
  Moon,
  RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '../contexts/ThemeContext';
import { useRefresh } from '../contexts/RefreshContext';
import '../styles/components/Layout.css';

interface LayoutProps {
  children: ReactNode;
  userRole?: string;
  userName?: string;
  userId?: string;
}

const Layout: React.FC<LayoutProps> = ({ children, userRole, userName, userId }) => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { refresh, isRefreshing } = useRefresh();
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 400);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = async () => {
    try {
      localStorage.removeItem('crm_user');
      supabase.auth.signOut().catch((err) => console.error('Sign out error:', err));
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
      window.location.href = '/';
    }
  };

  return (
    <div className="layout-container">
      {/* Floating Action Button */}
      <motion.button
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() =>
          document.getElementById('enquire-section')?.scrollIntoView({ behavior: 'smooth' })
        }
        className="fab"
        aria-label="Enquire"
      >
        <Send className="h-6 w-6" />
      </motion.button>

      {/* Header */}
      <header className="layout-header">
        {/* University Highlights Bar */}
        <div className="header-highlights">
          <div className="header-highlights-inner">
            <div className="flex items-center gap-6">
              <div className="highlight-item">
                <span className="highlight-dot highlight-dot--red" />
                <span>NAAC A Grade University</span>
              </div>
              <div className="highlight-item">
                <span className="highlight-dot highlight-dot--blue" />
                <span>100% Placement Assistance</span>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="highlight-item">
                <MapPin className="h-3 w-3 text-red-500" />
                <span>Gurugram, Delhi-NCR</span>
              </div>
              <div className="highlight-item">
                <Phone className="h-3 w-3 text-blue-500" />
                <span>+91 11 4888 4888</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Header */}
        <div className="header-main">
          <Link to="/" className="header-logo">
            <div className="header-logo-img-wrap">
              <img
                src="https://www.krmangalam.edu.in/_next/image?url=%2FKRMU-Logo-NAAC.webp&w=750&q=75"
                alt="KRMU Logo"
                className="h-10 w-auto object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
          </Link>

          <div className="flex items-center gap-8">
            <nav className="header-nav">
              <Link to="/" className="nav-link nav-link--active">
                Home
              </Link>
              <button
                onClick={() =>
                  document.getElementById('enquire-section')?.scrollIntoView({ behavior: 'smooth' })
                }
                className="nav-link"
              >
                Enquire
              </button>
              <button
                onClick={() => {
                  if (window.location.pathname !== '/') {
                    navigate('/#track-section');
                  } else {
                    document.getElementById('track-section')?.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                className="nav-link"
              >
                Track
              </button>
            </nav>

            <div className="header-actions">
              {/* Refresh */}
              <button
                onClick={refresh}
                className={`header-btn ${isRefreshing ? 'header-btn--refreshing' : ''}`}
                aria-label="Refresh data"
                title="Refresh data"
              >
                <RefreshCw className="h-4 w-4" />
              </button>

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="header-btn"
                title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              >
                {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              </button>

              {userName ? (
                <div className="header-user">
                  <div className="header-user-info">
                    <span className="header-user-name">{userName}</span>
                    <div className="header-user-meta">
                      {userId && (
                        <div className="relative">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(userId);
                              const el = document.getElementById(`copy-msg-${userId}`);
                              if (el) {
                                el.style.opacity = '1';
                                setTimeout(() => {
                                  el.style.opacity = '0';
                                }, 2000);
                              }
                            }}
                            className="header-user-id"
                            title="Click to copy ID"
                          >
                            ID: {userId.slice(0, 8)}...
                          </button>
                          <span
                            id={`copy-msg-${userId}`}
                            className="absolute -top-6 right-0 bg-white text-black text-[8px] font-bold px-1.5 py-0.5 rounded opacity-0 transition-opacity pointer-events-none whitespace-nowrap"
                          >
                            COPIED!
                          </span>
                        </div>
                      )}
                      <span className="header-user-role">{userRole?.replace('_', ' ')}</span>
                    </div>
                  </div>
                  <button onClick={handleLogout} className="header-btn" aria-label="Logout">
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button onClick={() => navigate('/login')} className="header-login-btn">
                  <LogIn className="h-4 w-4" />
                  <span>Staff Access</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="layout-main">{children}</main>

      {/* Back to Top */}
      <AnimatePresence>
        {showBackToTop && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="back-to-top"
            aria-label="Back to top"
          >
            <ChevronUp className="h-6 w-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="layout-footer">
        <div className="footer-gradient-top" />
        <div className="footer-blur-red" />
        <div className="footer-blur-blue" />

        <div className="footer-inner">
          <div className="footer-grid">
            {/* About */}
            <div className="footer-about">
              <div className="footer-logo-wrap">
                <img
                  src="https://www.krmangalam.edu.in/_next/image?url=%2FKRMU-Logo-NAAC.webp&w=750&q=75"
                  alt="KRMU Logo"
                  className="h-12 w-auto object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <p className="footer-about-text">
                K.R. Mangalam University is a premier institution of higher education in India,
                renowned for its academic excellence and holistic development.
              </p>
              <div className="footer-quote">
                "Empowering minds, transforming lives, and building a brighter future through
                innovation and industry-aligned education."
              </div>
              <div className="footer-socials">
                <a href="#" className="footer-social-link" aria-label="Facebook">
                  <Facebook className="h-5 w-5" />
                </a>
                <a href="#" className="footer-social-link" aria-label="Twitter">
                  <Twitter className="h-5 w-5" />
                </a>
                <a href="#" className="footer-social-link" aria-label="Instagram">
                  <Instagram className="h-5 w-5" />
                </a>
                <a href="#" className="footer-social-link" aria-label="LinkedIn">
                  <Linkedin className="h-5 w-5" />
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div className="footer-section">
              <h4 className="footer-section-title">Quick Links</h4>
              <ul className="footer-links">
                <li>
                  <Link to="/" className="footer-link">
                    <span className="footer-link-indicator" />
                    <span>Student Portal</span>
                  </Link>
                </li>
                <li>
                  <a
                    href="https://krmangalam.edu.in/admissions"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="footer-link"
                  >
                    <span className="footer-link-indicator" />
                    <span>Admissions</span>
                    <ExternalLink className="h-3 w-3 opacity-50" />
                  </a>
                </li>
                <li>
                  <a
                    href="https://krmangalam.edu.in/transport"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="footer-link"
                  >
                    <span className="footer-link-indicator" />
                    <span>Transport Portal</span>
                    <ExternalLink className="h-3 w-3 opacity-50" />
                  </a>
                </li>
                <li>
                  <a
                    href="https://krmangalam.edu.in/hostel"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="footer-link"
                  >
                    <span className="footer-link-indicator" />
                    <span>Hostel Portal</span>
                    <ExternalLink className="h-3 w-3 opacity-50" />
                  </a>
                </li>
                <li>
                  <a
                    href="https://payment.collexo.com/user/login/?dest=/kr-mangalam-university-sohna-haryana-43490/applicant/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="footer-link"
                  >
                    <span className="footer-link-indicator" />
                    <span>Payment Portal</span>
                    <ExternalLink className="h-3 w-3 opacity-50" />
                  </a>
                </li>
              </ul>
            </div>

            {/* Contact */}
            <div className="footer-section">
              <h4 className="footer-section-title">Contact Us</h4>
              <ul className="footer-contact-list">
                <li className="footer-contact-item">
                  <div className="footer-contact-icon">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <span className="footer-contact-text">
                    Sohna Road, Gurugram, Delhi-NCR, India
                  </span>
                </li>
                <li className="footer-contact-item">
                  <div className="footer-contact-icon">
                    <Phone className="h-5 w-5" />
                  </div>
                  <span className="footer-contact-text">+91 11 4888 4888</span>
                </li>
                <li className="footer-contact-item">
                  <div className="footer-contact-icon">
                    <Mail className="h-5 w-5" />
                  </div>
                  <span className="footer-contact-text">admissions@krmangalam.edu.in</span>
                </li>
              </ul>
            </div>

            {/* Newsletter */}
            <div className="footer-section">
              <h4 className="footer-section-title">Newsletter</h4>
              <div className="space-y-6">
                <p className="footer-newsletter-text">
                  Stay updated with the latest news and events at KRMU.
                </p>
                <div className="footer-newsletter-form">
                  <input
                    type="email"
                    placeholder="Email address"
                    className="footer-newsletter-input"
                  />
                  <button className="footer-newsletter-btn" aria-label="Subscribe">
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="footer-bottom">
            <p>© {new Date().getFullYear()} K.R. Mangalam University. All rights reserved.</p>
            <div className="footer-bottom-links">
              <a href="#" className="footer-bottom-link">
                Privacy Policy
              </a>
              <a href="#" className="footer-bottom-link">
                Terms of Service
              </a>
              <a href="#" className="footer-bottom-link">
                Cookie Policy
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

const ChevronRight = ({ className }: { className?: string }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m9 18 6-6-6-6" />
  </svg>
);

export default Layout;

