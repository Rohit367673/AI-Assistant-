import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Mic, MicOff, Volume2, VolumeX, Calendar, RefreshCw, X, Shield,
  MessageSquare, AlertCircle, Upload, FileText, CheckCircle, CreditCard, Sparkles, Phone, Globe, ChevronRight, Loader2
} from 'lucide-react';
import API from '../utils/api';

// Format markdown to HTML
const formatMarkdown = (text) => {
  if (!text) return '';
  let formatted = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-white/10 text-pink-300 font-mono text-xs">$1</code>')
    .replace(/\n- (.*?)/g, '<br/>• $1')
    .replace(/\n/g, '<br/>');
  return <div dangerouslySetInnerHTML={{ __html: formatted }} />;
};

export default function ChatInterface({ clinicSettings, user, initialMessages, isMuted, gender, setGender, onOpenProfile }) {
  const [localGender, setLocalGender] = useState('male');
  const activeGender = gender || localGender;
  const activeSetGender = setGender || setLocalGender;

  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [recognition, setRecognition] = useState(null);
  
  // File upload & Cashfree modal state
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [cashfreeLoading, setCashfreeLoading] = useState(false);
  const [showCashfreeModal, setShowCashfreeModal] = useState(false);
  const [cashfreeMethod, setCashfreeMethod] = useState('upi');
  const [cashfreeProcessing, setCashfreeProcessing] = useState(false);

  // Patient info form state matching NephroConsult website flow
  const [patientForm, setPatientForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    age: '',
    gender: 'Male',
    medicalHistory: '',
    medications: ''
  });

  const messagesEndRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const utteranceRef = useRef(null);

  // Sync initial messages when loaded
  useEffect(() => {
    if (initialMessages && initialMessages.length > 0) {
      setMessages(initialMessages);
    }
  }, [initialMessages]);

  // Initialize Session & Web Speech API
  useEffect(() => {
    let sId = sessionStorage.getItem('clinic_session_id');
    if (!sId) {
      sId = 'sess_' + Math.random().toString(36).substring(2, 11);
      sessionStorage.setItem('clinic_session_id', sId);
    }
    setSessionId(sId);

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onstart = () => setIsListening(true);
      rec.onend = () => setIsListening(false);
      rec.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputValue(transcript);
        handleSendMessage(null, transcript);
      };

      setRecognition(rec);
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const speakText = (text) => {
    if (isMuted || !synthRef.current) return;
    synthRef.current.cancel();

    const cleanText = text.replace(/\*\*/g, '').replace(/\*/g, '').replace(/`/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utteranceRef.current = utterance;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    synthRef.current.speak(utterance);
  };

  const toggleListening = () => {
    if (!recognition) return alert('Speech recognition is not supported in this browser.');
    if (isListening) recognition.stop();
    else {
      if (synthRef.current) synthRef.current.cancel();
      setIsSpeaking(false);
      recognition.start();
    }
  };

  const handleSendMessage = async (e, directText = null) => {
    if (e) e.preventDefault();
    const text = directText || inputValue;
    if (!text.trim()) return;

    // Add user message locally
    setMessages(prev => [...prev, { role: 'user', content: text, timestamp: new Date() }]);
    setInputValue('');
    setIsTyping(true);

    if (synthRef.current) synthRef.current.cancel();
    setIsSpeaking(false);

    try {
      const headers = user?.token ? { Authorization: `Bearer ${user.token}` } : {};
      const response = await API.post('/chat', {
        clinicId: clinicSettings.clinicId,
        sessionId: sessionId,
        message: text
      }, { headers });

      setIsTyping(false);
      if (response.data.success) {
        const { reply, action } = response.data;
        setMessages(prev => [...prev, { 
          role: 'model', 
          content: reply, 
          action: action, 
          timestamp: new Date() 
        }]);
        speakText(reply);
      }
    } catch (error) {
      setIsTyping(false);
      setMessages(prev => [...prev, { 
        role: 'model', 
        content: "I'm having trouble connecting to my servers. Please check your network and try again.", 
        timestamp: new Date() 
      }]);
    }
  };

  // Stepper Interaction Actions
  const handleSelectPlan = (planName) => {
    handleSendMessage(null, `[Selected Plan: ${planName}]`);
  };

  const handleSelectDate = (dateString) => {
    handleSendMessage(null, `[Selected Date: ${dateString}]`);
  };

  const handleSelectSlot = (slotString) => {
    handleSendMessage(null, `[Selected Slot: ${slotString}]`);
  };

  const handleSubmitPatientInfo = () => {
    const { fullName, email, phone, age, gender, medicalHistory, medications } = patientForm;
    if (!fullName.trim()) return alert('Please enter your Full Name.');
    if (!email.trim()) return alert('Please enter your Email Address.');
    if (!phone.trim()) return alert('Please enter your Phone Number.');
    if (!age.trim()) return alert('Please enter your Age.');
    if (!medicalHistory.trim() || medicalHistory.trim().length < 10) {
      return alert('Please describe your Medical History & Current Symptoms (minimum 10 characters).');
    }
    const cleanHistory = medicalHistory.replace(/\|/g, ' ');
    const cleanMeds = (medications || '').replace(/\|/g, ' ');
    handleSendMessage(null, `[Patient Info: ${fullName}|${email}|${phone}|${age}|${gender}|${cleanHistory}|${cleanMeds}]`);
  };

  const handleConfirmPayment = () => {
    handleSendMessage(null, `[Confirm Payment / Transaction Verification]`);
  };

  const handleCashfreeCheckout = async (amount, currency) => {
    setShowCashfreeModal(true);
  };

  const handleExecuteCashfreePayment = async () => {
    setCashfreeProcessing(true);
    setTimeout(() => {
      setCashfreeProcessing(false);
      setShowCashfreeModal(false);
      handleConfirmPayment();
    }, 1200);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingDoc(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('clinicId', clinicSettings.clinicId);

    try {
      const res = await API.post('/chat/analyze-report', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success) {
        setMessages(prev => [
          ...prev,
          {
            role: 'model',
            content: `**Analyzed: ${file.name}**\n\n${res.data.analysis}`,
            timestamp: new Date()
          }
        ]);
        handleSendMessage(null, `[Uploaded Document: ${file.name}]`);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Report upload/analysis failed.');
    } finally {
      setUploadingDoc(false);
    }
  };

  // Generate next 7 days for picking
  const getNext7Days = () => {
    const days = [];
    const today = new Date();
    for (let i = 1; i <= 7; i++) {
      const d = new Date();
      d.setDate(today.getDate() + i);
      days.push({
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        dateStr: d.toISOString().split('T')[0],
        dayNum: d.getDate()
      });
    }
    return days;
  };

  const nextDays = getNext7Days();

  const fallbackPlans = clinicSettings.consultationTypes || [
    { name: 'General Consultation', fee: 50 },
    { name: 'Specialist Consultation', fee: 100 }
  ];

  // Retrieve last bot message for speech bubble — truncated caption only
  const lastBotMsg = [...messages].reverse().find(m => m.role === 'model')?.content || clinicSettings.welcomeMessage || '';
  
  // Extract first sentence or max 120 chars for the speech bubble caption
  const getBubbleCaption = (text) => {
    if (!text) return 'Hello! How can I help you today?';
    // Strip markdown formatting
    const clean = text.replace(/\*\*/g, '').replace(/\*/g, '').replace(/`/g, '').replace(/<[^>]*>/g, '');
    // Get first sentence
    const firstSentence = clean.split(/[.!?]\s/)[0];
    if (firstSentence && firstSentence.length <= 120) return firstSentence + (clean.length > firstSentence.length ? '.' : '');
    return clean.substring(0, 117) + '...';
  };
  const bubbleCaption = getBubbleCaption(lastBotMsg);

  const suggestedQuestions = [
    "I want to book an appointment",
    "Tell me about kidney care",
    "Specialist Consultation fee",
    "Precautions for diabetes"
  ];

  return (
    <div className="flex flex-col md:flex-row h-full overflow-hidden relative select-none">
      
      {/* ===== LEFT PANEL: IMMERSIVE 3D DOCTOR AREA ===== */}
      {/* On mobile, this covers the full screen initially (messages.length <= 1) and hides when the conversation starts */}
      <div className={`relative flex-shrink-0 flex flex-col items-center justify-between p-6 transition-all duration-500 z-10 bg-slate-100
        ${messages.length <= 1 
          ? 'w-full h-full flex md:w-[40%] md:h-full md:flex' 
          : 'hidden md:flex md:w-[40%] md:h-full'
        }`}
      >
        {/* Full-bleed Doctor Background with 3D float and talk-reactivity animation */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <img 
            src={clinicSettings.logo || (activeGender === 'female' ? '/assets/doctor-female.jpg' : '/assets/doctor-male.jpg')} 
            alt="AI Doctor"
            className={`w-full h-full object-cover object-top transition-all duration-700
              ${isSpeaking ? 'scale-105 brightness-105' : 'scale-100'} 
              animate-float`}
          />
          {/* Light-blue gradient overlay for blending the bottom */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#f8fafc] via-[#f8fafc]/10 to-black/10" />
        </div>

        {/* Top Header Tag */}
        <div className="w-full flex justify-between items-center z-10">
          <span className="bg-white/85 backdrop-blur-md px-3.5 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider text-slate-800 border border-white/30 shadow-sm">
            {clinicSettings.name || 'AI Doctor'}
          </span>
          <span className="text-[9px] font-bold text-white bg-green-500/85 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> Live
          </span>
        </div>

        {/* Center: Immersive Speech Bubble overlay */}
        <div className="flex-1 flex flex-col justify-center items-center w-full max-w-[280px] md:max-w-[310px] py-4 z-10">
          <div className="relative w-full max-w-[260px] md:max-w-[280px] mt-24">
            <div className="bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-xl text-gray-800 text-[13px] font-semibold text-center border border-white/40 relative caption-animate" key={bubbleCaption}>
              {/* Caret pointing down */}
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white/95 rotate-45 border-r border-b border-gray-200/50" />
              <span className="relative z-10 block leading-snug">{bubbleCaption}</span>
            </div>
          </div>
        </div>

        {/* Bottom Panel Actions & Sound waves */}
        <div className="w-full flex flex-col items-center gap-3 z-10">
          
          {/* Animated soundwaves */}
          {(isSpeaking || isListening) && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="flex items-center justify-center gap-[2.5px] h-5"
            >
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="w-[2.5px] rounded-full bg-primary"
                  style={{
                    animationName: 'soundwave',
                    animationDuration: `${0.6 + Math.random() * 0.8}s`,
                    animationTimingFunction: 'ease-in-out',
                    animationIterationCount: 'infinite',
                    animationDelay: `${i * 0.05}s`,
                    height: `${4 + Math.random() * 16}px`
                  }}
                />
              ))}
            </motion.div>
          )}

          <div className="flex items-center gap-4">
            {/* Audio repeat */}
            <button
              type="button"
              onClick={() => speakText(lastBotMsg)}
              className="w-10 h-10 rounded-full bg-white hover:bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-500 hover:text-primary transition-all shadow-sm active:scale-95"
              title="Repeat Speech"
            >
              <Volume2 className="w-4.5 h-4.5" />
            </button>

            {/* Immersive voice mic */}
            <button
              type="button"
              onClick={toggleListening}
              className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95 ${
                isListening
                  ? 'bg-red-500 ring-4 ring-red-100 text-white animate-pulse'
                  : 'bg-white text-primary hover:scale-105 ring-4 ring-white/10 border border-gray-100'
              }`}
            >
              <Mic className="w-6 h-6" />
            </button>

            {/* Gender switcher */}
            <button
              type="button"
              onClick={() => activeSetGender(g => g === 'male' ? 'female' : 'male')}
              className="w-10 h-10 rounded-full bg-white hover:bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-500 hover:text-primary transition-all shadow-sm active:scale-95"
              title="Switch Doctor Gender"
            >
              <Globe className="w-4.5 h-4.5" />
            </button>
          </div>

          {/* Suggested Questions (Mobile Welcome Screen only) */}
          {messages.length <= 1 && (
            <div className="flex flex-wrap justify-center gap-1.5 mt-2 max-w-sm md:hidden">
              {suggestedQuestions.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(null, q)}
                  className="px-3 py-1.5 rounded-xl bg-white text-primary text-[10px] font-bold shadow-sm border border-gray-100 hover:bg-gray-50 active:scale-95 transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Mobile Welcome Input Bar (Only visible on mobile when welcome screen is active) */}
          {messages.length <= 1 && (
            <div className="w-full mt-2 md:hidden">
              <form onSubmit={handleSendMessage} className="bg-white/95 backdrop-blur-md rounded-2xl p-2 border border-gray-200 shadow-lg flex items-center gap-2">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask medical questions or type 'book'..."
                  className="flex-1 bg-transparent px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none"
                  disabled={isListening}
                />
                <button
                  type="submit"
                  className="p-3 rounded-xl text-white font-bold transition-all shadow-md active:scale-95 flex items-center justify-center hover:brightness-110"
                  style={{ backgroundColor: clinicSettings.themeColor }}
                >
                  <Send className="w-4.5 h-4.5" />
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* ===== RIGHT PANEL: CHAT HISTORY FEED ===== */}
      <div className={`flex-grow flex flex-col h-full bg-white/90 backdrop-blur-md md:border-l md:border-gray-200/40 relative transition-all duration-500 z-10
        ${messages.length <= 1 
          ? 'hidden md:flex md:w-[60%]' 
          : 'flex w-full md:w-[60%]'
        }`}
      >
        {/* Mobile Header Bar (Only visible on mobile during active conversation) */}
        {messages.length > 1 && (
          <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-100 md:hidden bg-white/95 backdrop-blur-md z-20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-200 shadow-sm">
                <img 
                  src={clinicSettings.logo || (activeGender === 'female' ? '/assets/doctor-female.jpg' : '/assets/doctor-male.jpg')} 
                  alt="Doctor avatar"
                  className="w-full h-full object-cover object-top"
                />
              </div>
              <div>
                <h4 className="text-xs font-bold text-gray-800 leading-tight">{clinicSettings.doctorName || 'AI Doctor'}</h4>
                <p className="text-[9px] text-gray-500 font-medium">{clinicSettings.specialization || 'Nephrology Specialists'}</p>
              </div>
            </div>
            <button
              onClick={() => activeSetGender(g => g === 'male' ? 'female' : 'male')}
              className="p-2 rounded-full bg-gray-50 border border-gray-100 text-gray-500 hover:bg-gray-100"
              title="Switch Doctor"
            >
              <Globe className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Scrollable Conversation Feed */}
        <div className="flex-grow overflow-y-auto px-4 md:px-8 pb-4" style={{ scrollbarWidth: 'none' }}>
          
          {/* Welcome Screen Dashboard Layout (Shown inside the right pane on Desktop welcome state) */}
          {messages.length <= 1 && (
            <div className="hidden md:flex flex-col items-center justify-center h-full text-center p-6 space-y-6">
              <Sparkles className="w-10 h-10 text-primary animate-pulse" />
              <div className="space-y-2">
                <h2 className="text-xl font-extrabold text-gray-800 tracking-tight">Consult with {clinicSettings.doctorName || 'our AI Doctor'}</h2>
                <p className="text-xs text-gray-500 max-w-sm leading-relaxed">
                  Welcome to {clinicSettings.name || 'our virtual portal'}. How can I assist you today? 
                  Ask medical questions, analyze reports, or book consultations.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 max-w-md mt-4">
                {suggestedQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(null, q)}
                    className="px-4 py-2 rounded-xl bg-gray-50 hover:bg-primary/5 border border-gray-200 hover:border-primary text-gray-700 hover:text-primary text-xs font-semibold shadow-sm transition-all"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Actual Chat Messages Feed */}
          {messages.length > 1 && (
            <div className="space-y-4 pt-4">
              {messages.slice(1).map((msg, index) => {
                const isUser = msg.role === 'user';
                const displayContent = msg.content.startsWith('[') && msg.content.endsWith(']')
                  ? msg.content.replace(/\[|\]/g, '').toUpperCase()
                  : msg.content;

                return (
                  <div key={index} className="flex flex-col space-y-1.5 animate-fade-in">
                    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                      <div 
                        className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-3 text-sm shadow-sm transition-all ${
                          isUser 
                            ? 'bg-primary text-white rounded-br-none border border-primary' 
                            : 'bg-gray-50 text-gray-800 border border-gray-100 rounded-bl-none shadow-sm'
                        }`}
                      >
                        {formatMarkdown(displayContent)}
                        
                        {/* Inline Interactive widgets inside message history feed */}
                        {!isUser && msg.action && (
                          <div className="mt-4 pt-3 border-t border-gray-200 space-y-3">
                            
                            {/* 1. Plans select list — NephroConsult style cards */}
                            {msg.action.type === 'select_plan' && (
                              <div className="grid grid-cols-1 gap-3">
                                {(msg.action.data?.plans || clinicSettings.consultationTypes || fallbackPlans).map((plan, pIdx) => (
                                  <button
                                    key={pIdx}
                                    type="button"
                                    onClick={() => handleSelectPlan(plan.name)}
                                    className="p-4 bg-white hover:bg-gray-50 border border-gray-200 hover:border-primary rounded-xl text-left transition-all active:scale-[0.98] group shadow-sm"
                                  >
                                    <div className="flex justify-between items-start mb-2">
                                      <div>
                                        <h5 className="text-sm font-bold text-gray-800 group-hover:text-primary">{plan.name}</h5>
                                        <span className="text-[10px] text-gray-500">{plan.duration || 45} min</span>
                                      </div>
                                      <span className="text-sm font-extrabold text-primary flex items-center gap-1">
                                        {plan.symbol || '₹'}{plan.fee || plan.price}
                                        <span className="text-[9px] font-normal text-gray-400">{plan.currency || 'INR'}</span>
                                      </span>
                                    </div>
                                    {plan.description && (
                                      <p className="text-[11px] text-gray-600 mb-2">{plan.description}</p>
                                    )}
                                    {plan.benefits && plan.benefits.length > 0 && (
                                      <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                                        {plan.benefits.map((b, bi) => (
                                          <span key={bi} className="text-[10px] text-gray-500 flex items-center gap-1">
                                            <span className="text-green-400 text-[8px]">✓</span> {b}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </button>
                                ))}
                              </div>
                            )}

                            {/* 2. Month Calendar Date Picker — NephroConsult style */}
                            {msg.action.type === 'select_date' && (
                              <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3 shadow-sm">
                                <div className="text-[11px] bg-indigo-50/70 border border-indigo-100 p-2.5 rounded-lg text-gray-700 flex items-center gap-2">
                                  <Globe className="w-4 h-4 text-primary flex-shrink-0" />
                                  <span>Regular consultations: <b>6-10 PM IST</b> • Times converted to your local timezone</span>
                                </div>
                                <div className="text-[10px] text-gray-500 italic bg-gray-50 p-2 rounded-md">
                                  ⚠️ Same-day booking is only available for Urgent Consultations. Please select a future date or upgrade to Urgent Consultation.
                                </div>
                                
                                <div className="border border-gray-200 rounded-xl overflow-hidden">
                                  <div className="bg-gray-50 p-2.5 flex justify-between items-center border-b border-gray-200">
                                    <span className="text-xs font-bold text-gray-800">Available Consultation Dates</span>
                                    <span className="text-[10px] text-gray-500 font-medium">Click to select date</span>
                                  </div>
                                  <div className="p-2 grid grid-cols-4 sm:grid-cols-7 gap-1.5 max-h-60 overflow-y-auto">
                                    {nextDays.map((day, dIdx) => (
                                      <button
                                        key={dIdx}
                                        type="button"
                                        onClick={() => handleSelectDate(day.dateStr)}
                                        className="flex flex-col items-center justify-center p-2 rounded-lg border border-gray-200 hover:border-primary hover:bg-primary/5 transition-all group active:scale-95"
                                      >
                                        <span className="text-[9px] font-semibold text-gray-400 group-hover:text-primary uppercase">{day.dayName}</span>
                                        <span className="text-sm font-extrabold text-gray-800 group-hover:text-primary">{day.dayNum}</span>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* 3. Slot pills grid */}
                            {msg.action.type === 'select_slot' && (
                              <div className="grid grid-cols-3 gap-2">
                                {(msg.action.data.slots || []).map((slot, sIdx) => (
                                  <button
                                    key={sIdx}
                                    type="button"
                                    onClick={() => handleSelectSlot(slot)}
                                    className="py-2 text-center text-xs font-bold bg-white hover:bg-gray-50 border border-gray-200 hover:border-primary rounded-lg text-gray-700 hover:text-primary transition-all active:scale-95 shadow-sm"
                                  >
                                    {slot}
                                  </button>
                                ))}
                              </div>
                            )}

                            {/* 4. NephroConsult Patient Information Form */}
                            {msg.action.type === 'collect_patient_info' && (
                              <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3 shadow-sm text-left">
                                <p className="text-[11px] text-gray-500 font-medium pb-1 border-b border-gray-100">
                                  All fields are required except Current Medications and Document Upload
                                </p>

                                {/* Full Name & Email */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  <div>
                                    <label className="text-[10px] font-bold text-gray-600 uppercase tracking-wider block mb-1">Full Name *</label>
                                    <input
                                      type="text"
                                      value={patientForm.fullName}
                                      onChange={(e) => setPatientForm(prev => ({ ...prev, fullName: e.target.value }))}
                                      placeholder="Full Name"
                                      className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-gray-50"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] font-bold text-gray-600 uppercase tracking-wider block mb-1">Email Address *</label>
                                    <input
                                      type="email"
                                      value={patientForm.email}
                                      onChange={(e) => setPatientForm(prev => ({ ...prev, email: e.target.value }))}
                                      placeholder="email@example.com"
                                      className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-gray-50"
                                    />
                                  </div>
                                </div>

                                {/* Phone, Age, Gender */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                  <div className="md:col-span-1">
                                    <label className="text-[10px] font-bold text-gray-600 uppercase tracking-wider block mb-1">Phone Number *</label>
                                    <input
                                      type="tel"
                                      value={patientForm.phone}
                                      onChange={(e) => setPatientForm(prev => ({ ...prev, phone: e.target.value }))}
                                      placeholder="Enter phone (7-15 digits)"
                                      className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-gray-50"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] font-bold text-gray-600 uppercase tracking-wider block mb-1">Age *</label>
                                    <input
                                      type="number"
                                      value={patientForm.age}
                                      onChange={(e) => setPatientForm(prev => ({ ...prev, age: e.target.value }))}
                                      placeholder="Enter your age"
                                      className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-gray-50"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] font-bold text-gray-600 uppercase tracking-wider block mb-1">Gender *</label>
                                    <select
                                      value={patientForm.gender}
                                      onChange={(e) => setPatientForm(prev => ({ ...prev, gender: e.target.value }))}
                                      className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-gray-50"
                                    >
                                      <option value="Male">Male</option>
                                      <option value="Female">Female</option>
                                      <option value="Other">Other</option>
                                    </select>
                                  </div>
                                </div>

                                {/* Medical History & Current Symptoms */}
                                <div>
                                  <div className="flex justify-between items-center mb-1">
                                    <label className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">Medical History & Current Symptoms *</label>
                                    <span className="text-[9px] text-gray-400">Characters: {patientForm.medicalHistory.length}/2000</span>
                                  </div>
                                  <textarea
                                    rows={3}
                                    value={patientForm.medicalHistory}
                                    onChange={(e) => setPatientForm(prev => ({ ...prev, medicalHistory: e.target.value }))}
                                    placeholder="Please describe your current symptoms, relevant medical history, and any concerns you'd like to discuss (minimum 10 characters)..."
                                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-gray-50"
                                  />
                                </div>

                                {/* Current Medications (Optional) */}
                                <div>
                                  <label className="text-[10px] font-bold text-gray-600 uppercase tracking-wider block mb-1">Current Medications (Optional)</label>
                                  <textarea
                                    rows={2}
                                    value={patientForm.medications}
                                    onChange={(e) => setPatientForm(prev => ({ ...prev, medications: e.target.value }))}
                                    placeholder="List any medications you're currently taking..."
                                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-gray-50"
                                  />
                                </div>

                                {/* Upload Medical Documents (Optional) */}
                                <div>
                                  <label className="text-[10px] font-bold text-gray-600 uppercase tracking-wider block mb-1">Upload Medical Documents (Optional) - Max 5 files</label>
                                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-3 text-center hover:border-primary transition-all relative bg-gray-50/50 flex flex-col items-center justify-center gap-1 cursor-pointer">
                                    <input 
                                      type="file" 
                                      accept=".pdf,.jpg,.jpeg,.png,.docx" 
                                      onChange={handleFileUpload} 
                                      disabled={uploadingDoc}
                                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                                    />
                                    <Upload className="w-5 h-5 text-gray-400" />
                                    <span className="text-[11px] font-semibold text-gray-700">Drag & drop your files or click to browse</span>
                                    <span className="text-[9px] text-gray-400">Support: PDF, JPG, PNG files up to 10MB each</span>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={handleSubmitPatientInfo}
                                  className="w-full py-3 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95 shadow-md flex items-center justify-center gap-2 mt-2"
                                >
                                  <ChevronRight className="w-4 h-4" /> Continue to Payment
                                </button>
                              </div>
                            )}

                            {/* 5. Drag-and-drop document upload block */}
                            {msg.action.type === 'upload_document' && (
                              <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:border-primary transition-all relative bg-gray-50 flex flex-col items-center gap-2">
                                <input 
                                  type="file" 
                                  accept=".pdf,.docx,.txt" 
                                  onChange={handleFileUpload} 
                                  disabled={uploadingDoc}
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                                />
                                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm border border-gray-200">
                                  {uploadingDoc ? <Loader2 className="w-5 h-5 text-primary animate-spin" /> : <Upload className="w-5 h-5 text-primary" />}
                                </div>
                                <span className="text-xs font-bold text-gray-700">Click to Upload Medical Reports</span>
                                <span className="text-[9px] text-gray-500">PDF, DOCX, TXT (Max 5MB)</span>
                              </div>
                            )}

                            {/* 5. Payment checkout card — NephroConsult style Cashfree Integration */}
                            {msg.action.type === 'payment_checkout' && (
                              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-4 text-left">
                                <div className="flex justify-between items-center text-xs pb-2 border-b border-gray-100">
                                  <span className="text-gray-600 font-medium">Plan consultation charge:</span>
                                  <span className="text-base font-extrabold text-gray-900">
                                    {msg.action.data.currency === 'INR' ? `₹${msg.action.data.amount}` : `$${msg.action.data.amount}`}
                                  </span>
                                </div>

                                <div className="space-y-2">
                                  <div className="text-[11px] text-gray-500 font-medium flex items-center gap-1.5 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                                    <Shield className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                                    <span>Official Cashfree Payment Gateway (Supports UPI, Credit/Debit Cards, Netbanking, Wallets)</span>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => handleCashfreeCheckout(msg.action.data.amount, msg.action.data.currency)}
                                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95 shadow-md flex items-center justify-center gap-2"
                                  >
                                    <CreditCard className="w-4 h-4" /> Pay via Cashfree Payment Gateway
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* 6. Success Receipt card */}
                            {msg.action.type === 'booking_confirm' && (
                              <div className="bg-green-50 border border-green-200 p-4 rounded-xl space-y-3 shadow-sm">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 text-green-600">
                                    <CheckCircle className="w-5 h-5 flex-shrink-0" />
                                    <span className="text-xs font-bold uppercase tracking-wider">Appointment Confirmed</span>
                                  </div>
                                </div>
                                <div className="space-y-1 text-xs text-gray-600 bg-white p-3 rounded-lg border border-green-100">
                                  <p>🩺 Plan: <span className="font-semibold text-gray-900">{msg.action.data.plan}</span></p>
                                  <p>📅 Date: <span className="font-semibold text-gray-900">{msg.action.data.date}</span></p>
                                  <p>⏰ Time: <span className="font-semibold text-gray-900">{msg.action.data.slot}</span></p>
                                  {msg.action.data.patientName && (
                                    <p>👤 Patient: <span className="font-semibold text-gray-900">{msg.action.data.patientName}</span></p>
                                  )}
                                  {msg.action.data.patientEmail && (
                                    <p>📧 Email: <span className="font-semibold text-gray-900">{msg.action.data.patientEmail}</span></p>
                                  )}
                                </div>
                                <div className="text-[10px] text-gray-500 italic">
                                  Confirmation alert has been dispatched to your email/SMS.
                                </div>
                                {onOpenProfile && (
                                  <button
                                    type="button"
                                    onClick={onOpenProfile}
                                    className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
                                  >
                                    <FileText className="w-3.5 h-3.5" /> View in My Consultations & Profile
                                  </button>
                                )}
                              </div>
                            )}

                          </div>
                        )}

                      </div>
                    </div>
                  </div>
                );
              })}

              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-gray-50 text-gray-800 border border-gray-100 rounded-2xl rounded-bl-none px-4 py-3 flex items-center gap-1 shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* BOTTOM INPUT BAR (Visible on desktop always, and mobile when active messages history is loaded) */}
        <div className={`flex-shrink-0 p-4 border-t border-gray-100 bg-white/95 backdrop-blur-md shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.05)] relative z-20
          ${messages.length <= 1 ? 'hidden md:block' : 'block'}`}
        >
          <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
            
            <button 
              type="button"
              onClick={toggleListening}
              className={`p-3 rounded-xl transition-all border shadow-sm ${
                isListening 
                  ? 'bg-red-50 text-red-500 border-red-200 animate-pulse' 
                  : 'bg-white text-gray-500 border-gray-200 hover:text-primary hover:bg-gray-50 hover:border-primary'
              }`}
              title="Speak"
            >
              {isListening ? (
                <div className="flex items-center justify-center h-4 w-4">
                  <span className="wave-bar h-1" />
                  <span className="wave-bar h-2" />
                  <span className="wave-bar h-3" />
                  <span className="wave-bar h-2" />
                  <span className="wave-bar h-1" />
                </div>
              ) : (
                <Mic className="w-4.5 h-4.5" />
              )}
            </button>

            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask medical questions or type 'book'..."
              className="flex-1 px-4 py-2.5 rounded-xl text-sm bg-white border border-gray-200 focus:outline-none focus:border-primary placeholder-gray-400 shadow-sm text-gray-800 transition-all"
              disabled={isListening}
            />
            
            <button
              type="submit"
              className="p-3 rounded-xl text-white font-bold transition-all shadow-lg active:scale-95 flex items-center justify-center hover:brightness-110"
              style={{ backgroundColor: clinicSettings.themeColor }}
            >
              <Send className="w-4.5 h-4.5" />
            </button>
          </form>

          <div className="mt-3 flex items-start gap-1 text-[10px] text-gray-500">
            <AlertCircle className="w-3.5 h-3.5 text-gray-600 flex-shrink-0 mt-0.5" />
            <span>
              Disclaimer: This AI assistant provides general wellness information and does not substitute for professional medical advice, diagnosis, or treatment.
            </span>
          </div>
        </div>
      </div>

      {/* Cashfree Payment Gateway Checkout Modal */}
      <AnimatePresence>
        {showCashfreeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-gray-100 overflow-hidden text-left"
            >
              {/* Header */}
              <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white font-black flex items-center justify-center text-xs tracking-tighter shadow-sm">
                    CF
                  </div>
                  <div>
                    <h4 className="font-extrabold text-gray-900 text-sm">Cashfree Payments Gateway</h4>
                    <p className="text-[10px] text-green-600 font-semibold flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-green-500" /> 256-bit SSL Encrypted & Verified
                    </p>
                  </div>
                </div>
                <button onClick={() => setShowCashfreeModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Amount Box */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100 flex justify-between items-center">
                <div>
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Consultation Fee</span>
                  <span className="text-xs font-semibold text-gray-700">{clinicSettings?.name || 'NephroConsult Specialist Clinic'}</span>
                </div>
                <span className="text-xl font-extrabold text-blue-700">₹499 INR</span>
              </div>

              {/* Payment Methods */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Select Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setCashfreeMethod('upi')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${
                      cashfreeMethod === 'upi' ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    📱 UPI / QR
                  </button>
                  <button
                    type="button"
                    onClick={() => setCashfreeMethod('card')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${
                      cashfreeMethod === 'card' ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    💳 Card
                  </button>
                  <button
                    type="button"
                    onClick={() => setCashfreeMethod('netbanking')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${
                      cashfreeMethod === 'netbanking' ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    🏦 Netbanking
                  </button>
                </div>
              </div>

              {/* Method Inputs */}
              {cashfreeMethod === 'upi' && (
                <div className="space-y-2 bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <label className="text-[10px] font-semibold text-gray-600 block">VPA / UPI ID</label>
                  <input
                    type="text"
                    defaultValue="patient@upi"
                    placeholder="example@upi"
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                  <span className="text-[9px] text-gray-400 block">Supported: Google Pay, PhonePe, Paytm, BHIM UPI</span>
                </div>
              )}

              {cashfreeMethod === 'card' && (
                <div className="space-y-2 bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <label className="text-[10px] font-semibold text-gray-600 block">Card Details</label>
                  <input
                    type="text"
                    placeholder="4111 •••• •••• 1111"
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg bg-white mb-2"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input type="text" placeholder="MM/YY" className="px-3 py-2 text-xs border border-gray-200 rounded-lg bg-white" />
                    <input type="password" placeholder="CVV" className="px-3 py-2 text-xs border border-gray-200 rounded-lg bg-white" />
                  </div>
                </div>
              )}

              {cashfreeMethod === 'netbanking' && (
                <div className="space-y-2 bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <label className="text-[10px] font-semibold text-gray-600 block">Select Bank</label>
                  <select className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg bg-white">
                    <option>HDFC Bank</option>
                    <option>State Bank of India (SBI)</option>
                    <option>ICICI Bank</option>
                    <option>Axis Bank</option>
                  </select>
                </div>
              )}

              {/* Action Button */}
              <button
                type="button"
                onClick={handleExecuteCashfreePayment}
                disabled={cashfreeProcessing}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
              >
                {cashfreeProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Processing Cashfree Payment...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-300" /> Pay ₹499 via Cashfree Gateway
                  </>
                )}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
