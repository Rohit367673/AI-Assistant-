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
    <div className="flex flex-col h-full overflow-hidden bg-slate-950/20">
      
      {/* ===== STICKY TOP: ANIMATED 3D DOCTOR AVATAR AREA ===== */}
      <div className="flex-shrink-0 flex flex-col items-center pt-4 pb-2 px-4 select-none bg-gradient-to-b from-slate-950/80 to-transparent z-10">
        <div className={`relative w-32 h-32 md:w-44 md:h-44 ${isSpeaking ? 'avatar-talking' : 'avatar-idle'}`}>
          {/* Glowing ring behind avatar */}
          <div className={`absolute inset-0 rounded-full ${isSpeaking ? 'avatar-ring-talking' : 'avatar-ring-idle'}`} />
          <img 
            src={gender === 'female' ? '/assets/doctor-female.jpg' : '/assets/doctor-male.jpg'} 
            alt="AI Doctor Avatar"
            className="w-full h-full object-cover rounded-full shadow-2xl ring-4 ring-white/20 relative z-10"
          />
          {/* Online green indicator dot */}
          <div className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-[3px] border-slate-900 shadow-lg z-20 ${isSpeaking ? 'bg-green-400 animate-pulse' : 'bg-green-400'}`} />
        </div>

        {/* Speech Bubble — SHORT CAPTION ONLY */}
        <div className="mt-3 relative max-w-[280px] md:max-w-sm">
          <div className="bg-white rounded-2xl px-4 py-2.5 shadow-2xl text-gray-700 text-[13px] font-semibold text-center leading-relaxed relative border border-gray-100 caption-animate" key={bubbleCaption}>
            {/* Caret arrow */}
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white rotate-45 border-l border-t border-gray-100/50" />
            <span className="relative z-10 block">{bubbleCaption}</span>
          </div>
        </div>

        {/* Controls: Waveform + Buttons (compact) */}
        <div className="flex items-center gap-4 mt-3">
          {/* Animated soundwaves bars (inline, compact) */}
          {(isSpeaking || isListening) && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="flex items-center justify-center gap-[2px] h-6"
            >
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="w-[3px] rounded-full bg-white/70"
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

          {/* Volume button */}
          <button
            onClick={() => speakText(lastBotMsg)}
            className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-sm border border-white/15 flex items-center justify-center text-white hover:bg-white/20 transition-all shadow-md active:scale-95"
            title="Repeat Speech"
          >
            <Volume2 className="w-4 h-4" />
          </button>

          {/* Large center Mic button */}
          <button
            onClick={toggleListening}
            className={`w-12 h-12 rounded-full flex items-center justify-center shadow-2xl transition-all active:scale-95 ${
              isListening
                ? 'bg-red-500 ring-4 ring-red-300/40 animate-pulse text-white'
                : 'bg-white text-indigo-900 hover:scale-105 ring-4 ring-white/20'
            }`}
          >
            <Mic className="w-5 h-5" />
          </button>

          {/* Gender switcher */}
          <button
            onClick={() => setGender(g => g === 'male' ? 'female' : 'male')}
            className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-sm border border-white/15 flex items-center justify-center text-white hover:bg-white/20 transition-all shadow-md active:scale-95"
            title="Switch Doctor Gender"
          >
            <Globe className="w-4 h-4" />
          </button>
        </div>

        {/* Suggested questions pills */}
        <div className="flex flex-wrap justify-center gap-1.5 mt-3 px-2">
          {suggestedQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(null, q)}
              className="px-3 py-1.5 rounded-full bg-white/90 text-indigo-700 text-[10px] font-semibold shadow-md hover:bg-white hover:shadow-lg hover:scale-[1.02] transition-all border border-white/50"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* ===== SCROLLABLE CONVERSATION HISTORY CHAT FEED ===== */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-4" style={{ scrollbarWidth: 'none' }}>
        {messages.length > 1 && (
          <div className="space-y-4 pt-2">
            {messages.slice(1).map((msg, index) => {
              const isUser = msg.role === 'user';
              const displayContent = msg.content.startsWith('[') && msg.content.endsWith(']')
                ? msg.content.replace(/\[|\]/g, '').toUpperCase()
                : msg.content;

              return (
                <div key={index} className="flex flex-col space-y-1.5">
                  <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <div 
                      className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-3 text-sm shadow-xl transition-all ${
                        isUser 
                          ? 'bg-slate-800 text-white rounded-br-none border border-slate-700' 
                          : 'bg-white/5 text-gray-200 border border-white/10 rounded-bl-none'
                      }`}
                    >
                      {formatMarkdown(displayContent)}
                      
                      {/* Inline Interactive widgets inside message history feed */}
                      {!isUser && msg.action && (
                        <div className="mt-4 pt-3 border-t border-white/10 space-y-3">
                          
                          {/* 1. Plans select list — NephroConsult style cards */}
                          {msg.action.type === 'select_plan' && (
                            <div className="grid grid-cols-1 gap-3">
                              {(clinicSettings.consultationTypes || fallbackPlans).map((plan, pIdx) => (
                                <button
                                  key={pIdx}
                                  onClick={() => handleSelectPlan(plan.name)}
                                  className="p-4 bg-white/5 hover:bg-indigo-600/80 border border-white/10 hover:border-indigo-400 rounded-xl text-left transition-all active:scale-[0.98] group"
                                >
                                  <div className="flex justify-between items-start mb-2">
                                    <div>
                                      <h5 className="text-sm font-bold text-white group-hover:text-white">{plan.name}</h5>
                                      <span className="text-[10px] text-gray-400 group-hover:text-white/70">{plan.duration || 45} min</span>
                                    </div>
                                    <span className="text-sm font-extrabold text-indigo-400 group-hover:text-white flex items-center gap-1">
                                      ₹{plan.fee || plan.price}
                                      <span className="text-[9px] font-normal text-gray-500 group-hover:text-white/60">INR</span>
                                    </span>
                                  </div>
                                  {plan.description && (
                                    <p className="text-[11px] text-gray-400 group-hover:text-white/80 mb-2">{plan.description}</p>
                                  )}
                                  {plan.benefits && plan.benefits.length > 0 && (
                                    <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                                      {plan.benefits.map((b, bi) => (
                                        <span key={bi} className="text-[10px] text-gray-500 group-hover:text-white/70 flex items-center gap-1">
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
                            <div className="flex gap-2 overflow-x-auto pb-1">
                              {nextDays.map((day, dIdx) => (
                                <button
                                  key={dIdx}
                                  onClick={() => handleSelectDate(day.dateStr)}
                                  className="flex-shrink-0 flex flex-col items-center bg-white/5 border border-white/10 px-3 py-2 rounded-xl text-center min-w-[54px] hover:bg-indigo-600 hover:border-indigo-500 transition-all active:scale-95"
                                >
                                  <span className="text-[9px] text-gray-400 uppercase font-medium">{day.dayName}</span>
                                  <span className="text-sm font-extrabold text-white">{day.dayNum}</span>
                                </button>
                              ))}
                            </div>
                          )}

                          {/* 3. Slot pills grid */}
                          {msg.action.type === 'select_slot' && (
                            <div className="grid grid-cols-3 gap-2">
                              {(msg.action.data.slots || []).map((slot, sIdx) => (
                                <button
                                  key={sIdx}
                                  onClick={() => handleSelectSlot(slot)}
                                  className="py-2 text-center text-xs font-bold bg-white/5 hover:bg-indigo-600 border border-white/10 rounded-lg text-white transition-all active:scale-95"
                                >
                                  {slot}
                                </button>
                              ))}
                            </div>
                          )}

                          {/* 4. Drag-and-drop document upload block */}
                          {msg.action.type === 'upload_document' && (
                            <div className="border-2 border-dashed border-white/20 rounded-xl p-4 text-center hover:border-white/40 transition-all relative bg-white/5 flex flex-col items-center gap-2">
                              <input 
                                type="file" 
                                accept=".pdf,.docx,.txt" 
                                onChange={handleFileUpload} 
                                disabled={uploadingDoc}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                              />
                              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                                {uploadingDoc ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <Upload className="w-5 h-5 text-white" />}
                              </div>
                              <span className="text-xs font-bold text-white">Click to Upload Medical Reports</span>
                              <span className="text-[9px] text-white/50">PDF, DOCX, TXT (Max 5MB)</span>
                            </div>
                          )}

                          {/* 5. UPI QR Code checkout receipt card */}
                          {msg.action.type === 'payment_checkout' && (
                            <div className="bg-slate-900/60 p-4 rounded-xl border border-white/10 space-y-4">
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-gray-400 font-medium">Plan consultation charge:</span>
                                <span className="text-sm font-extrabold text-white">
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
                                onClick={handleConfirmPayment}
                                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95 shadow-md flex items-center justify-center gap-1.5"
                              >
                                <CreditCard className="w-4 h-4" /> Confirm Payment & Book
                              </button>
                            </div>
                          )}

                          {/* 6. Success Receipt card */}
                          {msg.action.type === 'booking_confirm' && (
                            <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-xl space-y-3">
                              <div className="flex items-center gap-2 text-green-400">
                                <CheckCircle className="w-5 h-5 flex-shrink-0" />
                                <span className="text-xs font-bold uppercase tracking-wider">Appointment Confirmed</span>
                              </div>
                              <div className="space-y-1 text-xs text-gray-300">
                                <p>🩺 Plan: <span className="font-semibold text-white">{msg.action.data.plan}</span></p>
                                <p>📅 Date: <span className="font-semibold text-white">{msg.action.data.date}</span></p>
                                <p>⏰ Time: <span className="font-semibold text-white">{msg.action.data.slot}</span></p>
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
              <div className="flex justify-start">
                <div className="bg-white/5 text-gray-200 border border-white/10 rounded-2xl rounded-bl-none px-4 py-3 flex items-center gap-1 shadow-md">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* ===== BOTTOM INPUT BAR ===== */}
      <div className="flex-shrink-0 p-4 border-t border-white/10 bg-white/5 backdrop-blur-md">
        <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
          
          <button 
            type="button"
            onClick={toggleListening}
            className={`p-3 rounded-xl transition-all border ${
              isListening 
                ? 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse' 
                : 'bg-white/5 text-gray-400 border-white/15 hover:text-white hover:bg-white/10'
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
            className="flex-1 px-4 py-2.5 rounded-xl text-sm glass-input placeholder-gray-500 shadow-inner"
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
  );
}
