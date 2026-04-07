import React, { ReactNode, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { LogOut, LogIn, GraduationCap, MapPin, Phone, Mail, Facebook, Twitter, Instagram, Linkedin, ExternalLink, Send, ChevronUp, Sun, Moon, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '../contexts/ThemeContext';
import { useRefresh } from '../contexts/RefreshContext';

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
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = async () => {
    try {
      localStorage.removeItem('crm_user');
      // Sign out from Supabase but don't block the redirect if it's slow
      supabase.auth.signOut().catch(err => console.error('Sign out error:', err));
      // Full redirect to home page to ensure all state is cleared
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
      window.location.href = '/';
    }
  };

  return (
    <div className={`min-h-screen flex flex-col ${theme === 'dark' ? 'bg-[#050B2C] text-slate-200' : 'bg-[#F8FAFC] text-slate-900'} font-sans bg-mesh relative transition-colors duration-300`}>
      {/* Floating Action Button */}
      <motion.button
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => document.getElementById('enquire-section')?.scrollIntoView({ behavior: 'smooth' })}
        className="fixed bottom-8 right-8 z-[100] bg-[#D32F2F] text-white p-4 rounded-full shadow-2xl shadow-red-500/40 flex items-center space-x-2 group md:hidden"
      >
        <Send className="h-6 w-6" />
      </motion.button>

      {/* Header */}
      <header className={`sticky top-0 z-50 ${theme === 'dark' ? 'bg-[#050B2C]/80' : 'bg-white/90'} backdrop-blur-xl border-b ${theme === 'dark' ? 'border-white/5' : 'border-slate-200/60 shadow-sm'}`}>
        <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#D32F2F]/50 to-transparent"></div>
        
        {/* University Highlights Bar */}
        <div className={`${theme === 'dark' ? 'bg-black/40 border-b border-white/5' : 'bg-slate-50/80 border-b border-slate-200/50'} py-2 overflow-hidden hidden md:block`}>
          <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center text-[10px] font-black uppercase tracking-[0.2em] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                <span>NAAC A Grade University</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                <span>100% Placement Assistance</span>
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <MapPin className="h-3 w-3 text-red-500" />
                <span>Gurugram, Delhi-NCR</span>
              </div>
              <div className="flex items-center space-x-2">
                <Phone className="h-3 w-3 text-blue-500" />
                <span>+91 11 4888 4888</span>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-4 group">
            <div className={`p-1 rounded-xl transition-all ${theme === 'dark' ? 'bg-white/5' : 'bg-white shadow-sm'}`}>
              <img 
                src="https://www.krmangalam.edu.in/_next/image?url=%2FKRMU-Logo-NAAC.webp&w=750&q=75" 
                alt="KRMU Logo" 
                className="h-10 w-auto object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
          </Link>

          <div className="flex items-center space-x-8">
            <nav className={`hidden md:flex items-center space-x-8 text-[11px] font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
              <Link to="/" className={`text-[#D32F2F] hover:${theme === 'dark' ? 'text-white' : 'text-slate-900'} transition-colors`}>Home</Link>
              <button onClick={() => document.getElementById('enquire-section')?.scrollIntoView({ behavior: 'smooth' })} className={`hover:${theme === 'dark' ? 'text-white' : 'text-slate-900'} transition-colors`}>Enquire</button>
              <button 
                onClick={() => {
                  if (window.location.pathname !== '/') {
                    navigate('/#track-section');
                  } else {
                    document.getElementById('track-section')?.scrollIntoView({ behavior: 'smooth' });
                  }
                }} 
                className={`hover:${theme === 'dark' ? 'text-white' : 'text-slate-900'} transition-colors`}
              >
                Track
              </button>
            </nav>

            <div className={`flex items-center space-x-4 ml-4 pl-4 border-l ${theme === 'dark' ? 'border-white/10' : 'border-slate-200'}`}>
              {/* Refresh Button */}
              <button
                onClick={refresh}
                className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10' : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'} transition-all flex items-center justify-center`}
                aria-label="Refresh data"
                title="Refresh data"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-[#D32F2F]' : ''}`} />
              </button>

              {/* Theme Toggle Button */}
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10' : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'} transition-all`}
                title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              >
                {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              </button>

              {userName ? (
                <div className="flex items-center space-x-4">
                  <div className="flex flex-col items-end">
                    <span className={`text-xs font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{userName}</span>
                    <div className="flex items-center space-x-2">
                      {userId && (
                        <div className="relative group/id">
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(userId);
                              const el = document.getElementById(`copy-msg-${userId}`);
                              if (el) {
                                el.style.opacity = '1';
                                setTimeout(() => { el.style.opacity = '0'; }, 2000);
                              }
                            }}
                            className="text-[8px] font-mono text-slate-500 uppercase tracking-tighter hover:text-white transition-colors"
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
                      <span className="text-[9px] font-bold text-[#D32F2F] uppercase tracking-widest">{userRole?.replace('_', ' ')}</span>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10' : 'bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200'} transition-all`}
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => navigate('/login')}
                  className={`flex items-center space-x-2 ${theme === 'dark' ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'} border px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all`}
                >
                  <LogIn className="h-4 w-4" />
                  <span>Staff Access</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow">
        {children}
      </main>

      {/* Back to Top Button */}
      <AnimatePresence>
        {showBackToTop && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-8 left-8 z-[100] bg-white/10 backdrop-blur-xl border border-white/10 text-white p-4 rounded-2xl shadow-2xl hover:bg-white/20 transition-all hidden md:block"
          >
            <ChevronUp className="h-6 w-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className={`relative ${theme === 'dark' ? 'bg-[#020617] text-slate-300' : 'bg-white text-slate-600 border-t border-slate-100'} pt-24 pb-12 overflow-hidden transition-colors duration-300`}>
        {/* Subtle Background Pattern/Gradient */}
        <div className={`absolute top-0 left-0 w-full h-32 ${theme === 'dark' ? 'bg-gradient-to-b from-[#020617] to-transparent' : 'bg-gradient-to-b from-slate-50 to-transparent'} opacity-50`}></div>
        <div className={`absolute -top-24 -right-24 w-96 h-96 ${theme === 'dark' ? 'bg-[#D32F2F]/5' : 'bg-[#D32F2F]/10'} rounded-full blur-3xl`}></div>
        <div className={`absolute -bottom-24 -left-24 w-96 h-96 ${theme === 'dark' ? 'bg-blue-500/5' : 'bg-blue-500/10'} rounded-full blur-3xl`}></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 mb-20">
            {/* About Column */}
            <div className="lg:col-span-1 space-y-10">
              <div className="flex items-center space-x-5">
                <div className={`${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'} p-4 rounded-2xl border shadow-xl`}>
                  <img 
                    src="https://www.krmangalam.edu.in/_next/image?url=%2FKRMU-Logo-NAAC.webp&w=750&q=75" 
                    alt="KRMU Logo" 
                    className="h-12 w-auto object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>
              <div className="space-y-6">
                <p className={`text-[15px] leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} font-medium`}>
                  K.R. Mangalam University is a premier institution of higher education in India, renowned for its academic excellence and holistic development. 
                </p>
                <div className={`${theme === 'dark' ? 'bg-white/5 border-white/5 text-slate-500' : 'bg-slate-50 border-slate-100 text-slate-400'} p-4 rounded-2xl border italic text-sm leading-relaxed`}>
                  "Empowering minds, transforming lives, and building a brighter future through innovation and industry-aligned education."
                </div>
              </div>
              <div className="flex space-x-4">
                <a href="#" className={`w-11 h-11 flex items-center justify-center ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} rounded-2xl hover:bg-[#D32F2F] hover:border-[#D32F2F] hover:text-white transition-all duration-500 group`}>
                  <Facebook className="h-5 w-5 group-hover:scale-110 transition-transform" />
                </a>
                <a href="#" className={`w-11 h-11 flex items-center justify-center ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} rounded-2xl hover:bg-[#D32F2F] hover:border-[#D32F2F] hover:text-white transition-all duration-500 group`}>
                  <Twitter className="h-5 w-5 group-hover:scale-110 transition-transform" />
                </a>
                <a href="#" className={`w-11 h-11 flex items-center justify-center ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} rounded-2xl hover:bg-[#D32F2F] hover:border-[#D32F2F] hover:text-white transition-all duration-500 group`}>
                  <Instagram className="h-5 w-5 group-hover:scale-110 transition-transform" />
                </a>
                <a href="#" className={`w-11 h-11 flex items-center justify-center ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} rounded-2xl hover:bg-[#D32F2F] hover:border-[#D32F2F] hover:text-white transition-all duration-500 group`}>
                  <Linkedin className="h-5 w-5 group-hover:scale-110 transition-transform" />
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div className="space-y-8">
              <h4 className={`${theme === 'dark' ? 'text-white' : 'text-slate-900'} font-black uppercase text-xs tracking-[0.3em] flex items-center space-x-3`}>
                <span className="w-8 h-[1px] bg-[#D32F2F]"></span>
                <span>Quick Links</span>
              </h4>
              <ul className={`space-y-5 text-[14px] font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                <li><Link to="/" className="hover:text-[#D32F2F] transition-all flex items-center space-x-2 group/link"><span className="w-0 group-hover/link:w-2 h-[1px] bg-[#D32F2F] transition-all"></span><span>Student Portal</span></Link></li>
                <li><a href="https://krmangalam.edu.in/admissions" target="_blank" className="hover:text-[#D32F2F] transition-all flex items-center space-x-2 group/link"><span className="w-0 group-hover/link:w-2 h-[1px] bg-[#D32F2F] transition-all"></span><span>Admissions</span><ExternalLink className="h-3 w-3 opacity-50" /></a></li>
                <li><a href="https://krmangalam.edu.in/transport" target="_blank" className="hover:text-[#D32F2F] transition-all flex items-center space-x-2 group/link"><span className="w-0 group-hover/link:w-2 h-[1px] bg-[#D32F2F] transition-all"></span><span>Transport Portal</span><ExternalLink className="h-3 w-3 opacity-50" /></a></li>
                <li><a href="https://krmangalam.edu.in/hostel" target="_blank" className="hover:text-[#D32F2F] transition-all flex items-center space-x-2 group/link"><span className="w-0 group-hover/link:w-2 h-[1px] bg-[#D32F2F] transition-all"></span><span>Hostel Portal</span><ExternalLink className="h-3 w-3 opacity-50" /></a></li>
                <li><a href="https://payment.collexo.com/user/login/?dest=/kr-mangalam-university-sohna-haryana-43490/applicant/" target="_blank" className="hover:text-[#D32F2F] transition-all flex items-center space-x-2 group/link"><span className="w-0 group-hover/link:w-2 h-[1px] bg-[#D32F2F] transition-all"></span><span>Payment Portal</span><ExternalLink className="h-3 w-3 opacity-50" /></a></li>
              </ul>
            </div>

            {/* Contact Info */}
            <div className="space-y-8">
              <h4 className={`${theme === 'dark' ? 'text-white' : 'text-slate-900'} font-black uppercase text-xs tracking-[0.3em] flex items-center space-x-3`}>
                <span className="w-8 h-[1px] bg-[#D32F2F]"></span>
                <span>Contact Us</span>
              </h4>
              <ul className={`space-y-6 text-[14px] font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                <li className="flex items-start space-x-4 group">
                  <div className={`w-10 h-10 flex items-center justify-center ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} rounded-xl group-hover:bg-[#D32F2F]/10 group-hover:border-[#D32F2F]/20 transition-all`}>
                    <MapPin className="h-5 w-5 text-[#D32F2F]" />
                  </div>
                  <span className="flex-1 pt-1 leading-relaxed">Sohna Road, Gurugram, Delhi-NCR, India</span>
                </li>
                <li className="flex items-center space-x-4 group">
                  <div className={`w-10 h-10 flex items-center justify-center ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} rounded-xl group-hover:bg-[#D32F2F]/10 group-hover:border-[#D32F2F]/20 transition-all`}>
                    <Phone className="h-5 w-5 text-[#D32F2F]" />
                  </div>
                  <span className="pt-1">+91 11 4888 4888</span>
                </li>
                <li className="flex items-center space-x-4 group">
                  <div className={`w-10 h-10 flex items-center justify-center ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} rounded-xl group-hover:bg-[#D32F2F]/10 group-hover:border-[#D32F2F]/20 transition-all`}>
                    <Mail className="h-5 w-5 text-[#D32F2F]" />
                  </div>
                  <span className="pt-1">admissions@krmangalam.edu.in</span>
                </li>
              </ul>
            </div>

            {/* Newsletter/CTA */}
            <div className="space-y-8">
              <h4 className={`${theme === 'dark' ? 'text-white' : 'text-slate-900'} font-black uppercase text-xs tracking-[0.3em] flex items-center space-x-3`}>
                <span className="w-8 h-[1px] bg-[#D32F2F]"></span>
                <span>Newsletter</span>
              </h4>
              <div className="space-y-6">
                <p className={`text-[14px] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} leading-relaxed font-medium`}>Stay updated with the latest news and events at KRMU.</p>
                <div className="relative group">
                  <input 
                    type="email" 
                    placeholder="Email address" 
                    className={`${theme === 'dark' ? 'bg-white/5 border-white/10 text-white focus:bg-white/10' : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white'} rounded-2xl px-6 py-4 text-sm w-full focus:ring-2 focus:ring-[#D32F2F]/50 outline-none transition-all placeholder:text-slate-400`} 
                  />
                  <button className="absolute right-2 top-2 bottom-2 bg-[#D32F2F] text-white px-4 rounded-xl hover:bg-[#B71C1C] transition-all shadow-lg shadow-red-900/20">
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className={`pt-12 border-t ${theme === 'dark' ? 'border-white/5' : 'border-slate-100'} flex flex-col md:flex-row justify-between items-center space-y-6 md:space-y-0 text-[12px] font-bold text-slate-500 uppercase tracking-widest`}>
            <p>© {new Date().getFullYear()} K.R. Mangalam University. All rights reserved.</p>
            <div className="flex space-x-8">
              <a href="#" className={`hover:${theme === 'dark' ? 'text-white' : 'text-slate-900'} transition-colors`}>Privacy Policy</a>
              <a href="#" className={`hover:${theme === 'dark' ? 'text-white' : 'text-slate-900'} transition-colors`}>Terms of Service</a>
              <a href="#" className={`hover:${theme === 'dark' ? 'text-white' : 'text-slate-900'} transition-colors`}>Cookie Policy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

const ChevronRight = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
);

export default Layout;
