import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Activity, Calendar, MessageSquare, BookOpen, Settings, Eye, LogOut, 
  Users, CheckCircle2, TrendingUp, Cpu, Sparkles, Copy, Check 
} from 'lucide-react';
import API from '../utils/api';
import KBManager from '../components/KBManager';
import SettingsManager from '../components/SettingsManager';
import ChatInterface from '../components/ChatInterface';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('analytics');
  const [analytics, setAnalytics] = useState(null);
  const [profile, setProfile] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionDetails, setSessionDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('clinicToken');
    localStorage.removeItem('clinicId');
    localStorage.removeItem('mock_user');
    localStorage.removeItem('nephro_user');
    sessionStorage.clear();
    navigate('/login');
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch profile settings
      const profileRes = await API.get('/clinic/profile');
      if (profileRes.data.success) {
        setProfile(profileRes.data.clinic);
        // Apply theme color
        document.documentElement.style.setProperty('--theme-color', profileRes.data.clinic.themeColor);
      }

      // 2. Fetch analytics
      const analyticsRes = await API.get('/clinic/analytics');
      if (analyticsRes.data.success) {
        setAnalytics(analyticsRes.data.analytics);
      }

      // 3. Fetch appointments
      const appRes = await API.get('/appointments');
      if (appRes.data.success) {
        setAppointments(appRes.data.appointments);
      }

      // 4. Fetch conversations
      const convRes = await API.get('/chat/conversations');
      if (convRes.data.success) {
        setConversations(convRes.data.conversations);
      }

    } catch (error) {
      console.error('Error loading dashboard metrics:', error);
      if (error.response?.status === 401) {
        handleLogout();
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleStatusChange = async (appId, newStatus) => {
    try {
      const response = await API.put(`/appointments/${appId}`, { status: newStatus });
      if (response.data.success) {
        setAppointments(prev => prev.map(a => a._id === appId ? { ...a, status: newStatus } : a));
        // Refresh analytics totals
        const analyticsRes = await API.get('/clinic/analytics');
        if (analyticsRes.data.success) setAnalytics(analyticsRes.data.analytics);
      }
    } catch (err) {
      console.error('Update status error:', err);
    }
  };

  const handlePaymentStatusChange = async (appId, newPayStatus) => {
    try {
      const response = await API.put(`/appointments/${appId}`, { paymentStatus: newPayStatus });
      if (response.data.success) {
        setAppointments(prev => prev.map(a => a._id === appId ? { ...a, paymentStatus: newPayStatus } : a));
      }
    } catch (err) {
      console.error('Update payment error:', err);
    }
  };

  const loadConversationDetails = async (conv) => {
    setSelectedSession(conv.sessionId);
    try {
      const response = await API.get(`/chat/conversations/${conv._id}`);
      if (response.data.success) {
        setSessionDetails(response.data.conversation);
      }
    } catch (err) {
      console.error('Load session details error:', err);
    }
  };

  const getBackendUrl = () => {
    if (import.meta.env.VITE_BACKEND_URL) {
      return import.meta.env.VITE_BACKEND_URL;
    }
    // If running local Vite dev server on port 5173, point to backend dev server on port 5001
    if (window.location.port === '5173') {
      return 'http://localhost:5001';
    }
    return window.location.origin;
  };

  const getFrontendUrl = () => {
    return window.location.origin;
  };

  const copyWidgetScript = () => {
    const scriptTag = `<script src="${getBackendUrl()}/widget.js" data-clinic-id="${profile?.clinicId}"></script>`;
    navigator.clipboard.writeText(scriptTag);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b0f19] text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Loading your clinic workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[#060913] text-white overflow-hidden">
      
      {/* Sidebar navigation */}
      <aside className="w-64 border-r border-white/5 bg-[#0a0d1b]/80 backdrop-blur-md flex flex-col justify-between flex-shrink-0 z-30">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-base leading-tight truncate w-36">{profile?.name}</h1>
              <span className="text-[10px] uppercase font-bold text-indigo-400 px-2 py-0.5 rounded bg-indigo-500/10 mt-1 inline-block">
                {profile?.subscriptionPlan}
              </span>
            </div>
          </div>

          {/* Nav buttons */}
          <nav className="space-y-1.5">
            {[
              { id: 'analytics', label: 'Analytics Hub', icon: TrendingUp },
              { id: 'appointments', label: 'Appointments', icon: Calendar },
              { id: 'conversations', label: 'Patient Chats', icon: MessageSquare },
              { id: 'kb', label: 'Knowledge Base', icon: BookOpen },
              { id: 'settings', label: 'Admin Settings', icon: Settings },
              { id: 'preview', label: 'Widget Integration', icon: Eye },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setSelectedSession(null);
                    setSessionDetails(null);
                  }}
                  className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                    isActive 
                      ? 'bg-gradient-to-r from-indigo-600/30 to-purple-600/20 text-white border-l-4 border-indigo-500 pl-3.5 shadow-md shadow-indigo-600/10' 
                      : 'text-gray-400 hover:text-white hover:bg-white/3'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-400' : ''}`} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer actions */}
        <div className="p-6 border-t border-white/5 space-y-3.5">
          <div className="p-3 rounded-xl bg-white/3 border border-white/5 text-xs text-gray-400 space-y-1">
            <div>Doctor: <b>{profile?.doctorName}</b></div>
            <div>Status: <span className="text-green-400 font-bold">Active</span></div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 hover:bg-red-500/10 hover:border-red-500/20 text-gray-400 hover:text-red-400 font-bold transition-all text-xs"
          >
            <LogOut className="w-4 h-4" /> Logout Workspace
          </button>
        </div>
      </aside>

      {/* Main dashboard panel content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* Header */}
        <header className="px-8 py-5 border-b border-white/5 bg-[#0a0d1b]/40 backdrop-blur-md flex justify-between items-center z-10">
          <div>
            <h2 className="text-lg font-bold text-white">Dashboard Workspace</h2>
            <p className="text-xs text-gray-400">Managing Clinic Workspace: {profile?.clinicId}</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-400">Active Session: <b>{new Date().toDateString()}</b></span>
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
          </div>
        </header>

        {/* Content body wrapper */}
        <div className="p-8 flex-1">

          {activeTab === 'analytics' && (
            <div className="space-y-8">
              
              {/* Statistic Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                {[
                  { label: 'Conversations', value: analytics?.totalConversations || 0, sub: 'Total visitor contacts', icon: MessageSquare, color: 'text-indigo-400' },
                  { label: 'Total Bookings', value: analytics?.totalAppointments || 0, sub: 'Total requests schedule', icon: Calendar, color: 'text-purple-400' },
                  { label: "Today's Schedule", value: analytics?.todayAppointments || 0, sub: 'Confirmed consultations', icon: Users, color: 'text-emerald-400' },
                  { label: 'Estimated AI Usage', value: `${((analytics?.estimatedTokens || 0) / 1000).toFixed(1)}k`, sub: 'API Token approximations', icon: Cpu, color: 'text-amber-400' }
                ].map((stat, idx) => {
                  const Icon = stat.icon;
                  return (
                    <div key={idx} className="p-6 rounded-2xl glass-card border border-white/8 hover:scale-[1.02] transition-transform">
                      <div className="flex justify-between items-start mb-4">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{stat.label}</span>
                        <div className={`p-2 rounded-xl bg-white/3 ${stat.color}`}><Icon className="w-5 h-5" /></div>
                      </div>
                      <div className="text-3xl font-extrabold text-white">{stat.value}</div>
                      <p className="text-[11px] text-gray-500 mt-1">{stat.sub}</p>
                    </div>
                  );
                })}
              </div>

              {/* Analytics visual charts */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Glowing neon SVG charts */}
                <div className="p-6 rounded-2xl glass-card md:col-span-2 space-y-4">
                  <h4 className="text-sm font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2"><TrendingUp className="w-4 h-4 text-indigo-400"/> AI Conversations & Booking Volume</h4>
                  
                  {/* Custom vector neon chart for stats */}
                  <div className="h-56 w-full flex items-end justify-between relative pt-6 border-b border-l border-white/10 px-2 pb-1">
                    {/* SVG Line path background grid */}
                    <svg className="absolute inset-0 h-full w-full opacity-20" preserveAspectRatio="none">
                      <line x1="0" y1="25%" x2="100%" y2="25%" stroke="#ffffff" strokeDasharray="3,3" />
                      <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#ffffff" strokeDasharray="3,3" />
                      <line x1="0" y1="75%" x2="100%" y2="75%" stroke="#ffffff" strokeDasharray="3,3" />
                    </svg>
                    
                    {/* SVG Neon Line Chart */}
                    <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
                      <path 
                        d="M 50 160 Q 150 70 250 110 T 450 40 T 650 90" 
                        fill="none" 
                        stroke="#6366f1" 
                        strokeWidth="4" 
                        className="drop-shadow-[0_0_10px_rgba(99,102,241,0.8)]"
                      />
                      <path 
                        d="M 50 160 Q 150 70 250 110 T 450 40 T 650 90 L 650 200 L 50 200 Z" 
                        fill="url(#chartGrad)" 
                        opacity="0.1"
                      />
                      <defs>
                        <linearGradient id="chartGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#6366f1" />
                          <stop offset="100%" stopColor="transparent" />
                        </linearGradient>
                      </defs>
                    </svg>

                    <div className="text-[10px] text-gray-500 absolute left-2 top-2">Bookings Index</div>
                    
                    {/* Simulated dynamic bars */}
                    {[12, 18, 22, 14, 25, 30, 20].map((val, idx) => (
                      <div key={idx} className="flex flex-col items-center gap-1.5 z-10 w-8">
                        <div 
                          className="w-4 rounded-t bg-gradient-to-t from-indigo-600 to-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.4)]"
                          style={{ height: `${val * 5}px` }}
                        />
                        <span className="text-[9px] font-bold text-gray-500">M{idx+1}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Subscriptions Tier Details */}
                <div className="p-6 rounded-2xl glass-card space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5"><Sparkles className="w-4.5 h-4.5 text-indigo-400"/> SaaS Subscription</h4>
                    <p className="text-xs text-gray-400">Clinic billing status details.</p>
                  </div>
                  
                  <div className="py-6 text-center rounded-2xl bg-white/3 border border-white/5 space-y-2">
                    <div className="text-2xl font-black text-white">{profile?.subscriptionPlan} Tier</div>
                    <div className="text-xs text-indigo-400 font-bold flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Plan is Active
                    </div>
                  </div>

                  <div className="text-[10px] text-gray-500 leading-relaxed text-center">
                    Starter plans support basic AI replies and 1 PDF attachment. Upgrade to Professional for Voice components.
                  </div>
                </div>

              </div>

              {/* Recent appointments table summary */}
              <div className="p-6 rounded-2xl glass-card space-y-4">
                <h4 className="text-sm font-bold text-gray-300 uppercase tracking-wider">Recent Consultations Schedule</h4>
                {appointments.length === 0 ? (
                  <div className="text-center py-6 text-gray-500 text-sm">No scheduled consultations yet.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead>
                        <tr className="border-b border-white/10 text-gray-400 text-xs">
                          <th className="py-3 px-4">Patient</th>
                          <th className="py-3 px-4">Type</th>
                          <th className="py-3 px-4">Date/Time</th>
                          <th className="py-3 px-4">Contact</th>
                          <th className="py-3 px-4">Payment</th>
                          <th className="py-3 px-4">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {appointments.slice(0, 5).map((app, idx) => (
                          <tr key={idx} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                            <td className="py-3 px-4 font-semibold">{app.patientName}</td>
                            <td className="py-3 px-4 text-xs text-gray-300">{app.consultationType}</td>
                            <td className="py-3 px-4 text-xs">
                              <span className="block">{app.date}</span>
                              <span className="text-gray-400">{app.time}</span>
                            </td>
                            <td className="py-3 px-4 text-xs">
                              <span className="block">{app.patientEmail}</span>
                              <span className="text-gray-400">{app.patientPhone}</span>
                            </td>
                            <td className="py-3 px-4 text-xs">
                              <span className={`px-2 py-0.5 rounded font-bold ${
                                app.paymentStatus === 'Paid' ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'
                              }`}>
                                {app.paymentStatus}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 text-xs font-bold">
                                {app.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          )}

          {activeTab === 'appointments' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-xl font-bold text-gradient">Consultations & Appointments</h3>
                  <p className="text-xs text-gray-400">Manage patient bookings, update consultation statuses, and launch video calls.</p>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Total Bookings</span>
                  <span className="text-2xl font-extrabold text-white">{appointments.length}</span>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Confirmed</span>
                  <span className="text-2xl font-extrabold text-emerald-400">{appointments.filter(a => a.status === 'Confirmed').length}</span>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Paid Consultations</span>
                  <span className="text-2xl font-extrabold text-indigo-400">{appointments.filter(a => a.paymentStatus === 'Paid').length}</span>
                </div>
              </div>

              {/* Appointments List */}
              {appointments.length === 0 ? (
                <div className="p-12 rounded-2xl bg-white/5 border border-white/10 text-center text-gray-400 text-sm space-y-2">
                  <Calendar className="w-8 h-8 text-gray-500 mx-auto" />
                  <p className="font-semibold text-gray-300">No appointments booked yet.</p>
                  <p className="text-xs text-gray-500">Bookings made via the AI Doctor widget will automatically appear here in real time.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {appointments.map((app) => (
                    <div 
                      key={app._id} 
                      className="p-5 rounded-2xl bg-white/5 border border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-white/8 transition-colors"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2.5">
                          <span className="font-bold text-white text-base">{app.patientName}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-gray-300 font-semibold">{app.country || 'IN'}</span>
                          <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-extrabold uppercase tracking-wider ${
                            app.status === 'Confirmed' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 
                            app.status === 'Cancelled' ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 
                            'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}>
                            {app.status || 'Confirmed'}
                          </span>
                          <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-extrabold uppercase tracking-wider ${
                            app.paymentStatus === 'Paid' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 
                            'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                          }`}>
                            {app.paymentStatus || 'Paid'}
                          </span>
                        </div>
                        <div className="text-xs text-indigo-300 font-semibold">🩺 {app.consultationType}</div>
                        <div className="text-xs text-gray-300 flex flex-wrap items-center gap-3">
                          <span>📅 Date: <b>{app.date}</b></span>
                          <span>⏰ Time: <b>{app.time}</b></span>
                        </div>
                        <div className="text-xs text-gray-400">
                          📧 {app.patientEmail} • 📞 {app.patientPhone}
                        </div>
                        {app.notes && (
                          <p className="text-xs text-gray-400 italic mt-1 bg-white/3 p-2 rounded-lg max-w-md border border-white/5">
                            Notes: "{app.notes}"
                          </p>
                        )}
                      </div>

                      {/* Doctor Actions & Dropdowns */}
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => window.open('https://meet.google.com', '_blank')}
                          className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                        >
                          📹 Join Call
                        </button>

                        {/* Status update */}
                        <select
                          value={app.status}
                          onChange={(e) => handleStatusChange(app._id, e.target.value)}
                          className="bg-slate-900 border border-white/15 text-xs rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:border-indigo-500"
                        >
                          <option value="Confirmed">Confirmed</option>
                          <option value="Pending">Pending</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>

                        {/* Payment toggle */}
                        <select
                          value={app.paymentStatus}
                          onChange={(e) => handlePaymentStatusChange(app._id, e.target.value)}
                          className="bg-slate-900 border border-white/15 text-xs rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:border-indigo-500"
                        >
                          <option value="Unpaid">Unpaid</option>
                          <option value="Paid">Paid</option>
                        </select>
                      </div>

                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'conversations' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[72vh] overflow-hidden min-h-0">
              
              {/* Left Column: List of conversations */}
              <div className="md:col-span-1 border border-white/8 rounded-2xl bg-[#0a0d1b]/40 overflow-y-auto p-4 space-y-2">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Recent Chats</h4>
                {conversations.length === 0 ? (
                  <div className="text-center py-6 text-gray-500 text-sm">No recorded chats yet.</div>
                ) : (
                  conversations.map((conv) => {
                    const isSelected = selectedSession === conv.sessionId;
                    return (
                      <button
                        key={conv.sessionId}
                        onClick={() => loadConversationDetails(conv)}
                        className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                          isSelected 
                            ? 'bg-indigo-600/20 border-indigo-500/50 text-white' 
                            : 'bg-white/3 border-white/5 hover:bg-white/5 text-gray-400 hover:text-white'
                        }`}
                      >
                        <div className="font-semibold text-sm truncate text-white">Session: {conv.sessionId}</div>
                        <div className="text-[10px] text-gray-500 mt-1 flex justify-between">
                          <span>{conv.messages.length} exchanges</span>
                          <span>{new Date(conv.updatedAt).toLocaleDateString()}</span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Right Column: Split view of transcript and clinical summary */}
              <div className="md:col-span-2 flex flex-col overflow-hidden min-h-0">
                {selectedSession && sessionDetails ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full min-h-0">
                    
                    {/* Transcript bubbles */}
                    <div className="border border-white/8 rounded-2xl bg-[#0a0d1b]/60 flex flex-col overflow-hidden min-h-0">
                      <div className="p-3 border-b border-white/8 bg-white/3 flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-300">Transcript Log</span>
                        <span className="text-[10px] text-gray-400">Session: {selectedSession}</span>
                      </div>
                      <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {sessionDetails.messages?.map((msg, index) => {
                          const isUser = msg.role === 'user';
                          return (
                            <div key={index} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                              <div className={`p-2.5 rounded-xl text-xs max-w-[85%] ${
                                isUser ? 'bg-slate-800 text-white border border-slate-700' : 'bg-white/5 text-gray-300 border border-white/10'
                              }`}>
                                {msg.content}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* AI Summary report */}
                    <div className="border border-white/8 rounded-2xl bg-[#0a0d1b]/60 flex flex-col overflow-hidden min-h-0">
                      <div className="p-3 border-b border-white/8 bg-white/3 flex items-center justify-between">
                        <span className="text-xs font-bold text-purple-300 flex items-center gap-1"><Sparkles className="w-3.5 h-3.5"/> Patient Summary</span>
                        <span className="text-[9px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded font-bold">Staff Review</span>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs text-gray-300 leading-relaxed">
                        
                        {/* Summary Block */}
                        <div>
                          <h5 className="font-bold text-white text-xs mb-1">Clinical Overview</h5>
                          <p className="bg-white/2 p-3 rounded-xl border border-white/5 text-gray-400">
                            {sessionDetails.summary?.textSummary || 'AI Summary not generated yet. Summaries trigger automatically when appointments are booked.'}
                          </p>
                        </div>

                        {/* Symptoms Discussed */}
                        <div>
                          <h5 className="font-bold text-white text-xs mb-1.5">Symptoms Mentioned</h5>
                          <div className="flex flex-wrap gap-1.5">
                            {sessionDetails.summary?.symptomsDiscussed?.length > 0 ? (
                              sessionDetails.summary.symptomsDiscussed.map((sym, i) => (
                                <span key={i} className="px-2.5 py-1 rounded bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 font-medium">
                                  {sym}
                                </span>
                              ))
                            ) : (
                              <span className="text-gray-500">None detected.</span>
                            )}
                          </div>
                        </div>

                        {/* Patient Concerns */}
                        <div>
                          <h5 className="font-bold text-white text-xs mb-1.5">Concerns / Context</h5>
                          <div className="flex flex-wrap gap-1.5">
                            {sessionDetails.summary?.patientConcerns?.length > 0 ? (
                              sessionDetails.summary.patientConcerns.map((con, i) => (
                                <span key={i} className="px-2.5 py-1 rounded bg-purple-500/10 border border-purple-500/25 text-purple-300 font-medium">
                                  {con}
                                </span>
                              ))
                            ) : (
                              <span className="text-gray-500">None detected.</span>
                            )}
                          </div>
                        </div>

                        {/* Questions Asked */}
                        <div>
                          <h5 className="font-bold text-white text-xs mb-1.5">Questions Answered</h5>
                          <ul className="list-disc pl-4 space-y-1 text-gray-400">
                            {sessionDetails.summary?.questionsAsked?.length > 0 ? (
                              sessionDetails.summary.questionsAsked.map((q, i) => (
                                <li key={i}>{q}</li>
                              ))
                            ) : (
                              <span className="text-gray-500">No specific questions logged.</span>
                            )}
                          </ul>
                        </div>

                        <div className="pt-2 border-t border-white/5 flex justify-between text-[11px] text-gray-500">
                          <span>Summary Generated: AI Service</span>
                          <span>Appointment Suggested: <b>{sessionDetails.summary?.suggestedAppointment ? 'Yes' : 'No'}</b></span>
                        </div>

                      </div>
                    </div>

                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center border border-dashed border-white/10 rounded-2xl text-gray-500 text-sm">
                    Select a conversation from the sidebar to review transcripts and summaries.
                  </div>
                )}
              </div>

            </div>
          )}

          {activeTab === 'kb' && <KBManager />}

          {activeTab === 'settings' && (
            <SettingsManager 
              initialProfile={profile} 
              onProfileUpdate={(updated) => setProfile(updated)} 
            />
          )}

          {activeTab === 'preview' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-gradient">Widget Integration</h3>
                <p className="text-sm text-gray-400">
                  Easily integrate this customized health assistant onto any external clinic website.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                
                {/* Embed codes panel */}
                <div className="p-6 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between space-y-5">
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-gray-300 uppercase tracking-wider">Script Injection (Primary Option)</h4>
                    <p className="text-xs text-gray-400">
                      Copy and paste this script snippet before the closing <code>&lt;/body&gt;</code> tag on the client site. This renders the assistant in a floating overlay bubble.
                    </p>
                    
                    <div className="relative flex items-center rounded-xl bg-slate-950 p-4 border border-white/5 font-mono text-xs text-indigo-300">
                      <pre className="overflow-x-auto whitespace-pre-wrap select-all pr-10">
                        {`<script src="${getBackendUrl()}/widget.js" data-clinic-id="${profile?.clinicId}"></script>`}
                      </pre>
                      <button
                        onClick={copyWidgetScript}
                        className="absolute right-3 top-3 p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                        title="Copy Script Tag"
                      >
                        {copied ? <Check className="w-4.5 h-4.5 text-green-400" /> : <Copy className="w-4.5 h-4.5" />}
                      </button>
                    </div>

                    <h4 className="text-sm font-bold text-gray-300 uppercase tracking-wider pt-2">iframe Source (Alternative Option)</h4>
                    <p className="text-xs text-gray-400">
                      For embedding directly in a column section inside your website pages:
                    </p>
                    <div className="rounded-xl bg-slate-950 p-4 border border-white/5 font-mono text-xs text-purple-300 overflow-x-auto">
                      {`${getFrontendUrl()}/assistant-embed?clinicId=${profile?.clinicId}`}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300">
                    Changes made in the <b>Admin Settings</b> (branding, welcome notes, business hours) populate instantly on active website widgets without requiring script re-injection.
                  </div>
                </div>

                {/* Live Sandbox Preview inside dashboard */}
                <div className="border border-white/10 rounded-2xl overflow-hidden flex flex-col h-[60vh] bg-slate-950/20">
                  <div className="p-3 border-b border-white/10 bg-white/3 flex justify-between items-center text-xs font-bold">
                    <span className="text-indigo-400 flex items-center gap-1.5"><Sparkles className="w-4 h-4"/> Sandbox Assistant Preview</span>
                    <span className="text-gray-500 uppercase tracking-widest text-[9px]">Live Chat</span>
                  </div>
                  <div className="flex-1 min-h-0">
                    {profile && <ChatInterface clinicSettings={profile} isEmbedded={true} />}
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>
      </main>

    </div>
  );
}
