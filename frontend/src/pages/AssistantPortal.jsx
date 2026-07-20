import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Volume2, VolumeX, Globe, Send, Mic, MicOff,
  Upload, FileText, CheckCircle, Loader2, Sparkles, Phone, ChevronRight, X
} from 'lucide-react';
import ChatInterface from '../components/ChatInterface';
import API from '../utils/api';

export default function AssistantPortal() {
  const [searchParams] = useSearchParams();
  const clinicId = searchParams.get('clinicId') || searchParams.get('clinic') || 'mercer-clinic';

  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Simulated Google Auth Session
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('mock_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [messages, setMessages] = useState([]);
  const [isMuted, setIsMuted] = useState(false);
  const [gender, setGender] = useState('male');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await API.get(`/clinic/settings?clinicId=${clinicId}`);
        if (res.data.success) {
          setSettings(res.data.settings);
          document.documentElement.style.setProperty('--theme-color', res.data.settings.themeColor);
          
          // Initial greeting prompt
          const welcome = user 
            ? `Welcome back, **${user.name}**! I see you are signed in via Google (${user.email}). How can I help you today? Ask me any questions or type "book appointment" to begin.`
            : res.data.settings.welcomeMessage + `\n\n*(Note: For full capabilities including scheduling and health reports, please sign in with Google at the top of the chat).*`;

          setMessages([{ role: 'model', content: welcome, timestamp: new Date() }]);
        }
      } catch (err) {
        setError('Clinic workspace not found.');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [clinicId, user]);

  const handleGoogleLogin = () => {
    const mockUser = {
      name: 'Rohit',
      email: 'rohit367673@gmail.com',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&h=80',
      token: 'mock_google_oauth_token_36767'
    };
    localStorage.setItem('mock_user', JSON.stringify(mockUser));
    localStorage.setItem('nephro_user', JSON.stringify(mockUser));
    setUser(mockUser);
  };

  const handleSignOut = () => {
    localStorage.removeItem('mock_user');
    localStorage.removeItem('nephro_user');
    localStorage.removeItem('clinicToken');
    localStorage.removeItem('clinicId');
    sessionStorage.clear();
    setUser(null);
  };

  if (loading) return (
    <div className="h-screen w-screen flex items-center justify-center" style={{ background: 'linear-gradient(180deg, #c4b5fd 0%, #818cf8 50%, #6366f1 100%)' }}>
      <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error || !settings) return (
    <div className="h-screen w-screen flex items-center justify-center" style={{ background: 'linear-gradient(180deg, #c4b5fd 0%, #818cf8 100%)' }}>
      <div className="bg-white/20 backdrop-blur-xl rounded-2xl p-6 text-center text-white border border-white/30">
        <h4 className="font-bold text-lg">Error</h4>
        <p className="text-sm mt-2 opacity-80">{error}</p>
      </div>
    </div>
  );

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [patientAppointments, setPatientAppointments] = useState([]);
  const [loadingAppts, setLoadingAppts] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  const fetchPatientAppointments = async (email) => {
    if (!email) return;
    setLoadingAppts(true);
    try {
      const res = await API.get(`/appointments/patient?email=${encodeURIComponent(email)}&clinicId=${clinicId}`);
      if (res.data.success) {
        setPatientAppointments(res.data.appointments || []);
      }
    } catch (err) {
      console.error('Fetch patient appointments error:', err);
    } finally {
      setLoadingAppts(false);
    }
  };

  const openProfile = () => {
    setShowProfileModal(true);
    if (user?.email) {
      fetchPatientAppointments(user.email);
    }
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center p-0 md:p-4 overflow-hidden" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #e0e7ff 50%, #f1f5f9 100%)' }}>
      
      {/* Immersive full-viewport or centered card layout */}
      <div className="w-full h-full md:max-w-5xl md:h-[92vh] md:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-indigo-100 relative"
           style={{ background: 'linear-gradient(160deg, #ffffff 0%, #f8fafc 35%, #f1f5f9 100%)' }}>
        
        {/* Header Bar */}
        <header className="flex items-center justify-between px-4 md:px-6 py-4 bg-white/80 backdrop-blur-xl border-b border-gray-200 z-10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center shadow-md" style={{ background: `linear-gradient(135deg, ${settings.themeColor}, #6366f1)` }}>
              <svg viewBox="0 0 24 24" className="w-4.5 h-4.5 text-white" fill="currentColor">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </div>
            <div>
              <h1 className="text-sm font-extrabold text-gray-800 leading-tight drop-shadow-sm">{settings.name || 'AI Doctor'}</h1>
              <p className="text-[10px] text-gray-500 font-medium">{settings.specialization || 'General Medicine'}</p>
            </div>
          </div>

          {/* Authentication & Setting Controls */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* My Consultations Button */}
            <button 
              onClick={openProfile}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200 text-xs font-bold transition-all shadow-sm active:scale-95"
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">My Consultations</span>
            </button>

            {/* Mute Voice Responses button */}
            <button onClick={() => setIsMuted(!isMuted)} className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors" title={isMuted ? 'Unmute' : 'Mute'}>
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Google Authentication Trigger */}
            {user ? (
              <div className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-full border border-gray-200 transition-all">
                <img src={user.avatar} className="w-5 h-5 rounded-full object-cover shadow-sm" alt="Profile" />
                <span className="hidden sm:inline text-xs font-bold text-gray-700 truncate max-w-[80px]">{user.name}</span>
                <button onClick={handleSignOut} className="text-[9px] text-red-500 font-bold hover:text-red-600 ml-1 uppercase">Sign Out</button>
              </div>
            ) : (
              <button onClick={handleGoogleLogin} className="flex items-center gap-2 bg-white text-gray-800 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg hover:bg-gray-100 active:scale-95 transition-all">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign in
              </button>
            )}
          </div>
        </header>

        {/* Dynamic Conversational View Area */}
        <div className="flex-1 overflow-hidden relative">
          <ChatInterface 
            clinicSettings={settings} 
            user={user}
            initialMessages={messages}
            isMuted={isMuted}
            gender={gender}
            setGender={setGender}
            onOpenProfile={openProfile}
          />
        </div>

      </div>

      {/* Patient Profile & Consultations Modal */}
      <AnimatePresence>
        {showProfileModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    {user?.name ? user.name[0] : 'P'}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 text-sm">{user ? user.name : 'Patient Profile'}</h3>
                    <p className="text-xs text-gray-500">{user ? user.email : 'Booked Consultations & Receipts'}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowProfileModal(false)}
                  className="p-1.5 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Email lookup form if user is not signed in */}
              {!user && (
                <div className="p-4 bg-indigo-50/50 border-b border-indigo-100 flex gap-2 items-center">
                  <input
                    type="email"
                    placeholder="Enter email used for booking..."
                    className="flex-1 px-3 py-2 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') fetchPatientAppointments(e.target.value);
                    }}
                  />
                  <button 
                    onClick={(e) => {
                      const input = e.target.previousElementSibling;
                      fetchPatientAppointments(input.value);
                    }}
                    className="px-3 py-2 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary/90 transition-all"
                  >
                    Search
                  </button>
                </div>
              )}

              {/* Modal Body — Appointments Cards List */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Your Scheduled Consultations</h4>

                {loadingAppts ? (
                  <div className="py-8 text-center flex justify-center items-center gap-2 text-gray-400 text-xs">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" /> Loading consultation records...
                  </div>
                ) : patientAppointments.length === 0 ? (
                  <div className="py-10 text-center border-2 border-dashed border-gray-200 rounded-xl space-y-2">
                    <CheckCircle className="w-8 h-8 text-gray-300 mx-auto" />
                    <p className="text-xs font-semibold text-gray-600">No consultations found.</p>
                    <p className="text-[11px] text-gray-400">Complete a booking in chat to see your consultation cards here.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {patientAppointments.map((apt) => (
                      <div 
                        key={apt._id}
                        className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-primary/50 transition-all space-y-3"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-xs font-extrabold text-gray-900 block">{apt.consultationType}</span>
                            <span className="text-[11px] text-gray-500 font-medium">Doctor: {settings?.doctorName || 'Dr. Ilango S. Prakasam'}</span>
                          </div>
                          <div className="flex gap-1.5">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              apt.status === 'Confirmed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                            }`}>
                              {apt.status || 'Confirmed'}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              apt.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {apt.paymentStatus || 'Paid'}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                          <div>📅 Date: <span className="font-bold text-gray-800">{apt.date}</span></div>
                          <div>⏰ Time: <span className="font-bold text-gray-800">{apt.time}</span></div>
                          <div>👤 Patient: <span className="font-medium text-gray-800">{apt.patientName}</span></div>
                          <div>🌍 Country: <span className="font-medium text-gray-800">{apt.country || 'IN'}</span></div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => window.open('https://meet.google.com', '_blank')}
                            className="flex-1 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
                          >
                            <ChevronRight className="w-3.5 h-3.5" /> Join Video Call
                          </button>
                          <button
                            onClick={() => setSelectedReceipt(apt)}
                            className="px-3 py-2 border border-gray-200 hover:border-gray-300 text-gray-700 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 bg-white hover:bg-gray-50"
                          >
                            <FileText className="w-3.5 h-3.5 text-gray-500" /> Receipt
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Printable Receipt Modal */}
      <AnimatePresence>
        {selectedReceipt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-gray-200"
            >
              <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <h4 className="font-extrabold text-gray-900 text-sm">Consultation Receipt</h4>
                </div>
                <button onClick={() => setSelectedReceipt(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 text-xs text-gray-600 bg-gray-50 p-4 rounded-xl border border-gray-100">
                <p className="flex justify-between"><span>Receipt ID:</span> <span className="font-mono font-bold text-gray-900">{selectedReceipt._id?.substring(0, 10) || 'REC-36767'}</span></p>
                <p className="flex justify-between"><span>Clinic:</span> <span className="font-semibold text-gray-900">{settings?.name || 'NephroConsult Clinic'}</span></p>
                <p className="flex justify-between"><span>Consultation:</span> <span className="font-semibold text-gray-900">{selectedReceipt.consultationType}</span></p>
                <p className="flex justify-between"><span>Patient Name:</span> <span className="font-semibold text-gray-900">{selectedReceipt.patientName}</span></p>
                <p className="flex justify-between"><span>Patient Email:</span> <span className="font-semibold text-gray-900">{selectedReceipt.patientEmail}</span></p>
                <p className="flex justify-between"><span>Date & Time:</span> <span className="font-semibold text-gray-900">{selectedReceipt.date} at {selectedReceipt.time}</span></p>
                <p className="flex justify-between"><span>Payment Provider:</span> <span className="font-semibold text-gray-900">{selectedReceipt.paymentProvider || 'UPI / Online'}</span></p>
                <p className="flex justify-between pt-2 border-t border-gray-200 text-sm font-extrabold text-gray-900">
                  <span>Status:</span> <span className="text-green-600">{selectedReceipt.paymentStatus || 'Paid'}</span>
                </p>
              </div>

              <button
                onClick={() => window.print()}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2"
              >
                Print / Save PDF Receipt
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
