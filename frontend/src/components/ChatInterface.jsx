import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Mic, MicOff, Volume2, VolumeX, Calendar, RefreshCw, X,
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

export default function ChatInterface({ clinicSettings, user, initialMessages, isMuted, gender, setGender }) {
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
  
  // File upload state inside chat
  const [uploadingDoc, setUploadingDoc] = useState(false);

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

  const handleConfirmPayment = () => {
    handleSendMessage(null, `[Confirm Payment / Transaction Verification]`);
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
    <div className="flex flex-col md:flex-row h-full overflow-hidden bg-slate-50 relative select-none">
      
      {/* ===== LEFT PANEL / BACKGROUND: IMMERSIVE 3D DOCTOR AVATAR ===== */}
      {/* On mobile, this covers the full screen initially (messages.length <= 1) and hides when the conversation starts */}
      <div className={`relative flex-shrink-0 flex flex-col justify-between overflow-hidden bg-slate-100 transition-all duration-500 z-10
        ${messages.length <= 1 
          ? 'w-full h-full flex' 
          : 'hidden md:flex md:w-[40%] md:h-full border-r border-gray-200'
        }`}
      >
        {/* Full-bleed Doctor Background Image */}
        <div className="absolute inset-0 z-0">
          <img 
            src={clinicSettings.logo || (activeGender === 'female' ? '/assets/doctor-female.jpg' : '/assets/doctor-male.jpg')} 
            alt="AI Doctor"
            className="w-full h-full object-cover object-top"
          />
          {/* Light-blue gradient overlay for blending the bottom */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-slate-900/10 to-transparent" />
        </div>

        {/* Top Floating Clinic Header */}
        <div className="relative z-10 p-4 flex justify-between items-center w-full bg-gradient-to-b from-black/20 to-transparent">
          <span className="bg-white/90 backdrop-blur-md px-3.5 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider text-slate-800 border border-white/20 shadow-md">
            {clinicSettings.name || 'AI Doctor'}
          </span>
          <span className="text-[9px] font-bold text-white bg-green-500/80 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> Online
          </span>
        </div>

        {/* Center: Immersive Speech Bubble overlay */}
        <div className="relative z-10 px-6 flex justify-center items-center flex-1">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-xl text-gray-800 text-[13px] md:text-sm font-semibold max-w-[280px] md:max-w-xs text-center border border-white/30 relative caption-animate" key={bubbleCaption}>
            {/* Caret arrow */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white/95 rotate-45 border-r border-b border-gray-200/50" />
            <span className="relative z-10 block">{bubbleCaption}</span>
          </div>
        </div>

        {/* Bottom Panel Actions & Inputs */}
        <div className="relative z-10 p-4 md:p-6 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent flex flex-col items-center gap-3">
          
          {/* Animated soundwaves */}
          {(isSpeaking || isListening) && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="flex items-center justify-center gap-[2.5px] h-6"
            >
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="w-[3px] rounded-full bg-white"
                  style={{
                    animationName: 'soundwave',
                    animationDuration: `${0.6 + Math.random() * 0.8}s`,
                    animationTimingFunction: 'ease-in-out',
                    animationIterationCount: 'infinite',
                    animationDelay: `${i * 0.05}s`,
                    height: `${4 + Math.random() * 18}px`
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
              className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 border border-white/25 flex items-center justify-center text-white transition-all shadow-md active:scale-95"
              title="Repeat Speech"
            >
              <Volume2 className="w-4.5 h-4.5" />
            </button>

            {/* Immersive voice mic */}
            <button
              type="button"
              onClick={toggleListening}
              className={`w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all active:scale-95 ${
                isListening
                  ? 'bg-red-500 ring-4 ring-red-100 animate-pulse text-white'
                  : 'bg-white text-primary hover:scale-105 ring-4 ring-white/10'
              }`}
            >
              <Mic className="w-6 h-6" />
            </button>

            {/* Gender switcher */}
            <button
              type="button"
              onClick={() => activeSetGender(g => g === 'male' ? 'female' : 'male')}
              className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 border border-white/25 flex items-center justify-center text-white transition-all shadow-md active:scale-95"
              title="Switch Doctor Gender"
            >
              <Globe className="w-4.5 h-4.5" />
            </button>
          </div>

          {/* Suggested Questions Pills (Floating directly above the input on Mobile Welcome screen) */}
          {messages.length <= 1 && (
            <div className="flex flex-wrap justify-center gap-1.5 mt-2 max-w-sm md:hidden">
              {suggestedQuestions.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(null, q)}
                  className="px-3 py-1.5 rounded-xl bg-white text-primary text-[10px] font-bold shadow-md border border-gray-100 hover:bg-gray-50 active:scale-95 transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* IMMERSIVE INPUT BAR (Only visible on mobile welcome screen, where the right panel is hidden) */}
          {messages.length <= 1 && (
            <div className="w-full mt-2 md:hidden">
              <form onSubmit={handleSendMessage} className="bg-white/95 backdrop-blur-md rounded-2xl p-2 border border-white/20 shadow-xl flex items-center gap-2">
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

      {/* ===== RIGHT PANEL: CHAT HISTORY & PLANS PANEL ===== */}
      {/* On mobile, this covers the full screen when conversation starts (messages.length > 1) */}
      <div className={`flex-1 flex flex-col h-full bg-white relative transition-all duration-500
        ${messages.length <= 1 ? 'hidden md:flex' : 'flex'}`}
      >
        {/* Mobile Header Bar (Only visible on mobile when active conversation is ongoing) */}
        {messages.length > 1 && (
          <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-100 md:hidden bg-white/95 backdrop-blur-md z-20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-200">
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
              title="Switch Doctor Gender"
            >
              <Globe className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Scrollable Conversation History Feed */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-4" style={{ scrollbarWidth: 'none' }}>
          
          {/* Welcome Dashboard layout (Shown inside the right pane only on Desktop welcome state) */}
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

          {/* Chat Messages */}
          {messages.length > 1 && (
            <div className="space-y-4 pt-4">
              {messages.slice(1).map((msg, index) => {
                const isUser = msg.role === 'user';
                const displayContent = msg.content.startsWith('[') && msg.content.endsWith(']')
                  ? msg.content.replace(/\[|\]/g, '').toUpperCase()
                  : msg.content;

                return (
                  <div key={index} className="flex flex-col space-y-1.5">
                    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                      <div 
                        className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-3 text-sm shadow-sm transition-all ${
                          isUser 
                            ? 'bg-primary text-white rounded-br-none border border-primary animate-fade-in-right' 
                            : 'bg-gray-50 text-gray-800 border border-gray-100 rounded-bl-none shadow-sm animate-fade-in-left'
                        }`}
                      >
                        {formatMarkdown(displayContent)}
                        
                        {/* Inline Interactive widgets inside message history feed */}
                        {!isUser && msg.action && (
                          <div className="mt-4 pt-3 border-t border-gray-200 space-y-3">
                            
                            {/* 1. Plans select list — NephroConsult style cards */}
                            {msg.action.type === 'select_plan' && (
                              <div className="grid grid-cols-1 gap-3">
                                {(clinicSettings.consultationTypes || fallbackPlans).map((plan, pIdx) => (
                                  <button
                                    key={pIdx}
                                    type="button"
                                    onClick={() => handleSelectPlan(plan.name)}
                                    className="p-4 bg-white hover:bg-gray-50 border border-gray-200 hover:border-primary rounded-xl text-left transition-all active:scale-[0.98] group shadow-sm animate-slide-up"
                                  >
                                    <div className="flex justify-between items-start mb-2">
                                      <div>
                                        <h5 className="text-sm font-bold text-gray-800 group-hover:text-primary">{plan.name}</h5>
                                        <span className="text-[10px] text-gray-500">{plan.duration || 45} min</span>
                                      </div>
                                      <span className="text-sm font-extrabold text-primary flex items-center gap-1">
                                        ₹{plan.fee || plan.price}
                                        <span className="text-[9px] font-normal text-gray-400">INR</span>
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

                            {/* 2. Swipeable Date picker row */}
                            {msg.action.type === 'select_date' && (
                              <div className="flex gap-2 overflow-x-auto pb-1 animate-slide-up">
                                {nextDays.map((day, dIdx) => (
                                  <button
                                    key={dIdx}
                                    type="button"
                                    onClick={() => handleSelectDate(day.dateStr)}
                                    className="flex-shrink-0 flex flex-col items-center bg-white border border-gray-200 px-3 py-2 rounded-xl text-center min-w-[54px] hover:bg-gray-50 hover:border-primary transition-all active:scale-95 shadow-sm group"
                                  >
                                    <span className="text-[9px] text-gray-500 uppercase font-medium group-hover:text-primary">{day.dayName}</span>
                                    <span className="text-sm font-extrabold text-gray-800 group-hover:text-primary">{day.dayNum}</span>
                                  </button>
                                ))}
                              </div>
                            )}

                            {/* 3. Slot pills grid */}
                            {msg.action.type === 'select_slot' && (
                              <div className="grid grid-cols-3 gap-2 animate-slide-up">
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

                            {/* 4. Drag-and-drop document upload block */}
                            {msg.action.type === 'upload_document' && (
                              <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:border-primary transition-all relative bg-gray-50 flex flex-col items-center gap-2 animate-slide-up">
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

                            {/* 5. UPI QR Code checkout receipt card */}
                            {msg.action.type === 'payment_checkout' && (
                              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-4 animate-slide-up">
                                <div className="flex justify-between items-center text-xs">
                                  <span className="text-gray-600 font-medium">Plan consultation charge:</span>
                                  <span className="text-sm font-extrabold text-gray-900">
                                    {msg.action.data.currency === 'INR' ? `₹${msg.action.data.amount}` : `$${msg.action.data.amount}`}
                                  </span>
                                </div>

                                <div className="flex flex-col items-center justify-center bg-white p-3 rounded-lg max-w-[140px] mx-auto shadow-md">
                                  <img 
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(msg.action.data.qrCode)}`} 
                                    alt="Payment QR"
                                    className="w-28 h-28"
                                  />
                                  <span className="text-[9px] text-gray-500 font-bold mt-1 uppercase tracking-wider">Scan with UPI App</span>
                                </div>

                                <button
                                  type="button"
                                  onClick={handleConfirmPayment}
                                  className="w-full py-2.5 bg-primary hover:opacity-90 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95 shadow-md flex items-center justify-center gap-1.5"
                                >
                                  <CreditCard className="w-4 h-4" /> Confirm Payment & Book
                                </button>
                              </div>
                            )}

                            {/* 6. Success Receipt card */}
                            {msg.action.type === 'booking_confirm' && (
                              <div className="bg-green-50 border border-green-200 p-4 rounded-xl space-y-3 shadow-sm animate-slide-up">
                                <div className="flex items-center gap-2 text-green-600">
                                  <CheckCircle className="w-5 h-5 flex-shrink-0" />
                                  <span className="text-xs font-bold uppercase tracking-wider">Appointment Confirmed</span>
                                </div>
                                <div className="space-y-1 text-xs text-gray-600">
                                  <p>🩺 Plan: <span className="font-semibold text-gray-900">{msg.action.data.plan}</span></p>
                                  <p>📅 Date: <span className="font-semibold text-gray-900">{msg.action.data.date}</span></p>
                                  <p>⏰ Time: <span className="font-semibold text-gray-900">{msg.action.data.slot}</span></p>
                                </div>
                                <div className="text-[10px] text-gray-500 italic">
                                  Confirmation alert has been dispatched to your email/SMS.
                                </div>
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
                <div className="flex justify-start animate-pulse">
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

    </div>
  );
}
