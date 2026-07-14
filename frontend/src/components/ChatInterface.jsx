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

  const doctorBg = clinicSettings.logo || (gender === 'female' ? '/assets/doctor-female.jpg' : '/assets/doctor-male.jpg');
  const isGreetingState = messages.length <= 1;

  return (
    <div className="flex items-center justify-center h-full w-full bg-slate-50/55 p-2 md:p-4">
      {/* Outer Card Container to mimic the phone/widget layout */}
      <div className="w-full max-w-[440px] h-[660px] rounded-[32px] overflow-hidden shadow-2xl border border-gray-200/80 flex flex-col relative bg-[#f8fafc]">
        
        {/* ================= GREETING STATE (Mockup design) ================= */}
        {isGreetingState ? (
          <div className="absolute inset-0 z-0 flex flex-col justify-end">
            {/* Full-bleed Doctor portrait background */}
            <div className="absolute inset-0 z-0 flex justify-center items-end pb-16">
              <img 
                src={doctorBg} 
                className="h-[85%] object-contain"
                alt="Doctor Avatar"
              />
              {/* Soft purple-blue overlay to fade the doctor image at the bottom */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#f8fafc] via-[#f8fafc]/30 to-transparent" />
            </div>

            {/* Speech Bubble floating on the left */}
            <div className="absolute top-[40%] left-4 z-20 max-w-[220px]">
              <div className="bg-white rounded-2xl px-4 py-3 shadow-lg text-gray-700 text-xs font-semibold relative border border-gray-100">
                {/* Pointer caret pointing right to the doctor */}
                <div className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-3 h-3 bg-white rotate-45 border-r border-t border-gray-100" />
                <span className="relative z-10 leading-relaxed block">{bubbleCaption}</span>
              </div>
            </div>

            {/* Suggested Question Pills floating above input */}
            <div className="absolute bottom-20 left-0 right-0 z-20 px-4 flex flex-wrap gap-2 justify-center">
              {suggestedQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(null, q)}
                  className="px-4 py-2 rounded-full bg-white/90 backdrop-blur-sm text-primary text-[11px] font-bold shadow-sm hover:shadow-md hover:scale-[1.02] transition-all border border-gray-200/50"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* ================= ACTIVE CONVERSATION STATE ================= */
          <>
            {/* Header Bar */}
            <div className="flex items-center gap-3 px-5 py-3.5 bg-white border-b border-gray-200/80 z-20 shadow-sm">
              <div className="relative w-10 h-10">
                <img src={doctorBg} className="w-full h-full object-cover rounded-full shadow-sm border border-gray-100" alt="Doctor" />
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-800">{clinicSettings.doctorName || 'AI Doctor'}</h3>
                <p className="text-[10px] text-gray-500 font-medium">{clinicSettings.specialization || 'Consultant'}</p>
              </div>
              
              {/* Controls in top header */}
              <div className="ml-auto flex items-center gap-1.5">
                {(isSpeaking || isListening) && (
                  <div className="flex items-center gap-[2px] h-4 mr-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        className="w-[2px] rounded-full bg-primary/70"
                        style={{
                          animationName: 'soundwave',
                          animationDuration: `${0.6 + Math.random() * 0.8}s`,
                          animationTimingFunction: 'ease-in-out',
                          animationIterationCount: 'infinite',
                          animationDelay: `${i * 0.05}s`,
                          height: `${4 + Math.random() * 10}px`
                        }}
                      />
                    ))}
                  </div>
                )}
                <button onClick={() => speakText(lastBotMsg)} className="p-2 rounded-full hover:bg-gray-50 text-gray-500 border border-gray-100 bg-white" title="Repeat Speech">
                  <Volume2 className="w-4 h-4" />
                </button>
                <button onClick={() => setGender(g => g === 'male' ? 'female' : 'male')} className="p-2 rounded-full hover:bg-gray-50 text-gray-500 border border-gray-100 bg-white" title="Switch Doctor Gender">
                  <Globe className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Scrollable conversation log */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" style={{ scrollbarWidth: 'none' }}>
              {messages.slice(1).map((msg, index) => {
                const isUser = msg.role === 'user';
                const displayContent = msg.content.startsWith('[') && msg.content.endsWith(']')
                  ? msg.content.replace(/\[|\]/g, '').toUpperCase()
                  : msg.content;

                return (
                  <div key={index} className="flex flex-col space-y-1.5">
                    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                      <div 
                        className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs md:text-sm shadow-sm transition-all ${
                          isUser 
                            ? 'bg-primary text-white rounded-br-none border border-primary' 
                            : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none shadow-sm'
                        }`}
                      >
                        {formatMarkdown(displayContent)}
                        
                        {/* Interactive Widget render */}
                        {!isUser && msg.action && (
                          <div className="mt-4 pt-3 border-t border-gray-100 space-y-3">
                            
                            {/* 1. Plans select list */}
                            {msg.action.type === 'select_plan' && (
                              <div className="grid grid-cols-1 gap-2.5">
                                {(clinicSettings.consultationTypes || fallbackPlans).map((plan, pIdx) => (
                                  <button
                                    key={pIdx}
                                    onClick={() => handleSelectPlan(plan.name)}
                                    className="p-3.5 bg-white hover:bg-gray-50 border border-gray-200 hover:border-primary rounded-xl text-left transition-all active:scale-[0.98] group shadow-sm"
                                  >
                                    <div className="flex justify-between items-start mb-1.5">
                                      <div>
                                        <h5 className="text-xs font-bold text-gray-800 group-hover:text-primary">{plan.name}</h5>
                                        <span className="text-[9px] text-gray-500">{plan.duration || 45} min</span>
                                      </div>
                                      <span className="text-xs font-extrabold text-primary flex items-center gap-0.5">
                                        ₹{plan.fee || plan.price}
                                        <span className="text-[8px] font-normal text-gray-400">INR</span>
                                      </span>
                                    </div>
                                    {plan.description && (
                                      <p className="text-[10px] text-gray-600 mb-1.5 leading-relaxed">{plan.description}</p>
                                    )}
                                    {plan.benefits && plan.benefits.length > 0 && (
                                      <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                                        {plan.benefits.map((b, bi) => (
                                          <span key={bi} className="text-[9px] text-gray-500 flex items-center gap-1">
                                            <span className="text-green-500 text-[8px]">✓</span> {b}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </button>
                                ))}
                              </div>
                            )}

                            {/* 2. Swipeable Date picker */}
                            {msg.action.type === 'select_date' && (
                              <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                                {nextDays.map((day, dIdx) => (
                                  <button
                                    key={dIdx}
                                    onClick={() => handleSelectDate(day.dateStr)}
                                    className="flex-shrink-0 flex flex-col items-center bg-white border border-gray-200 px-2.5 py-1.5 rounded-xl text-center min-w-[50px] hover:bg-gray-50 hover:border-primary transition-all active:scale-95 shadow-sm group"
                                  >
                                    <span className="text-[8px] text-gray-400 uppercase font-medium group-hover:text-primary">{day.dayName}</span>
                                    <span className="text-xs font-extrabold text-gray-800 group-hover:text-primary">{day.dayNum}</span>
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
                                    className="py-1.5 text-center text-[11px] font-bold bg-white hover:bg-gray-50 border border-gray-200 hover:border-primary rounded-lg text-gray-700 hover:text-primary transition-all active:scale-95 shadow-sm"
                                  >
                                    {slot}
                                  </button>
                                ))}
                              </div>
                            )}

                            {/* 4. Drag-and-drop file upload */}
                            {msg.action.type === 'upload_document' && (
                              <div className="border-2 border-dashed border-gray-200 rounded-xl p-3.5 text-center hover:border-primary transition-all relative bg-gray-50 flex flex-col items-center gap-1.5">
                                <input 
                                  type="file" 
                                  accept=".pdf,.docx,.txt" 
                                  onChange={handleFileUpload} 
                                  disabled={uploadingDoc}
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                                />
                                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm border border-gray-200">
                                  {uploadingDoc ? <Loader2 className="w-4 h-4 text-primary animate-spin" /> : <Upload className="w-4 h-4 text-primary" />}
                                </div>
                                <span className="text-xs font-bold text-gray-700">Upload Medical Reports</span>
                                <span className="text-[8px] text-gray-400">PDF, DOCX, TXT (Max 5MB)</span>
                              </div>
                            )}

                            {/* 5. UPI QR Code checkout receipt */}
                            {msg.action.type === 'payment_checkout' && (
                              <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm space-y-3.5">
                                <div className="flex justify-between items-center text-[11px]">
                                  <span className="text-gray-600 font-medium">Plan consultation charge:</span>
                                  <span className="text-xs font-extrabold text-gray-900">
                                    {msg.action.data.currency === 'INR' ? `₹${msg.action.data.amount}` : `$${msg.action.data.amount}`}
                                  </span>
                                </div>

                                <div className="flex flex-col items-center justify-center bg-white p-2 rounded-lg max-w-[120px] mx-auto shadow-sm border border-gray-150">
                                  <img 
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(msg.action.data.qrCode)}`} 
                                    alt="Payment QR"
                                    className="w-24 h-24"
                                  />
                                  <span className="text-[8px] text-gray-400 font-bold mt-1 uppercase tracking-wider">Scan with UPI App</span>
                                </div>

                                <button
                                  onClick={handleConfirmPayment}
                                  className="w-full py-2 bg-primary hover:opacity-90 text-white rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all active:scale-95 shadow-md flex items-center justify-center gap-1"
                                >
                                  <CreditCard className="w-3.5 h-3.5" /> Confirm Payment & Book
                                </button>
                              </div>
                            )}

                            {/* 6. Success Receipt */}
                            {msg.action.type === 'booking_confirm' && (
                              <div className="bg-green-50 border border-green-200 p-3 rounded-xl space-y-2 shadow-sm">
                                <div className="flex items-center gap-1.5 text-green-600">
                                  <CheckCircle className="w-4.5 h-4.5 flex-shrink-0" />
                                  <span className="text-[10px] font-bold uppercase tracking-wider">Appointment Confirmed</span>
                                </div>
                                <div className="space-y-0.5 text-[11px] text-gray-600">
                                  <p>🩺 Plan: <span className="font-semibold text-gray-900">{msg.action.data.plan}</span></p>
                                  <p>📅 Date: <span className="font-semibold text-gray-900">{msg.action.data.date}</span></p>
                                  <p>⏰ Time: <span className="font-semibold text-gray-900">{msg.action.data.slot}</span></p>
                                </div>
                                <div className="text-[9px] text-gray-500 italic">
                                  Alert dispatched to your email/SMS.
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
                  <div className="bg-white text-gray-800 border border-gray-100 rounded-2xl rounded-bl-none px-3.5 py-2.5 flex items-center gap-1 shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </>
        )}

        {/* ===== FLOATING BOTTOM INPUT PILL ===== */}
        <div className="flex-shrink-0 p-4 bg-transparent relative z-20 mt-auto">
          <form onSubmit={handleSendMessage} className="relative flex items-center bg-white rounded-full border border-gray-200/90 shadow-lg px-4 py-2 hover:border-primary/50 transition-colors">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 bg-transparent outline-none text-xs md:text-sm pr-16 pl-1 py-1.5 text-gray-800 placeholder-gray-400"
              disabled={isListening}
            />
            
            <div className="absolute right-2 flex items-center gap-1.5">
              <button 
                type="button"
                onClick={toggleListening}
                className={`p-2 rounded-full transition-all ${
                  isListening 
                    ? 'bg-red-50 text-red-500 animate-pulse' 
                    : 'text-gray-400 hover:text-primary hover:bg-gray-50'
                }`}
                title="Speak"
              >
                {isListening ? (
                  <div className="flex items-center justify-center h-4 w-4">
                    <span className="wave-bar h-1" />
                    <span className="wave-bar h-2" />
                    <span className="wave-bar h-3" />
                  </div>
                ) : (
                  <Mic className="w-4.5 h-4.5" />
                )}
              </button>

              <button
                type="submit"
                className="p-2 rounded-full text-white transition-all shadow-md active:scale-95 flex items-center justify-center hover:opacity-90"
                style={{ backgroundColor: clinicSettings.themeColor }}
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>

          {/* Small Disclaimer */}
          <div className="mt-2.5 text-[9px] text-gray-400 text-center select-none leading-normal">
            AI provides general information only and does not replace professional medical advice.
          </div>
        </div>

      </div>
    </div>
  );
}
