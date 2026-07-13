import React, { useState, useEffect } from 'react';

export default function DoctorAvatar({ gender = 'male', isSpeaking = false }) {
  const [blink, setBlink] = useState(false);
  const [mouthOpen, setMouthOpen] = useState(0); // 0 (closed) to 3 (wide open)

  // Random Eye Blinking loop
  useEffect(() => {
    const triggerBlink = () => {
      setBlink(true);
      setTimeout(() => setBlink(false), 150);
    };

    const interval = setInterval(() => {
      if (Math.random() > 0.4) {
        triggerBlink();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Lip-sync talking simulation when speaking is active
  useEffect(() => {
    if (!isSpeaking) {
      setMouthOpen(0);
      return;
    }

    const interval = setInterval(() => {
      setMouthOpen(Math.floor(Math.random() * 4)); // select random mouth opening height
    }, 120);

    return () => clearInterval(interval);
  }, [isSpeaking]);

  return (
    <div className="relative w-64 h-64 md:w-80 md:h-80 mx-auto select-none">
      {/* 3D Soft Glow Background */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-indigo-500/20 to-purple-500/30 blur-3xl" />
      
      {/* Interactive Avatar SVG */}
      <svg 
        viewBox="0 0 400 400" 
        className="w-full h-full drop-shadow-[0_10px_25px_rgba(0,0,0,0.4)] animate-float"
      >
        <defs>
          {/* Gradients for 3D Shading Effect */}
          <radialGradient id="faceGrad" cx="50%" cy="40%" r="50%" fx="50%" fy="30%">
            <stop offset="0%" stopColor="#ffd8c2" />
            <stop offset="100%" stopColor="#f4a885" />
          </radialGradient>
          <linearGradient id="hairGradMale" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#2c3e50" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
          <linearGradient id="hairGradFemale" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#8d5b4c" />
            <stop offset="100%" stopColor="#3c221a" />
          </linearGradient>
          <linearGradient id="coatGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#e2e8f0" />
          </linearGradient>
          <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#4f46e5" />
          </linearGradient>
          <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="4" stdDeviation="5" floodOpacity="0.15" />
          </filter>
        </defs>

        {/* Circular Avatar Background Container */}
        <circle cx="200" cy="200" r="185" fill="url(#bgGrad)" />

        {/* Neck */}
        <path d="M185 240 h30 v60 h-30 z" fill="#e09774" />
        
        {/* Face */}
        <path d="M140 180 C140 105, 260 105, 260 180 C260 235, 140 235, 140 180 Z" fill="url(#faceGrad)" />
        
        {/* Ears */}
        <circle cx="138" cy="180" r="12" fill="#f4a885" />
        <circle cx="262" cy="180" r="12" fill="#f4a885" />

        {/* Nose */}
        <path d="M196 175 C196 175, 200 186, 204 175" fill="none" stroke="#d58865" strokeWidth="3" strokeLinecap="round" />

        {/* Mouth (Lip-sync controlled) */}
        {mouthOpen === 0 ? (
          // Closed smiling mouth
          <path d="M182 205 Q200 215 218 205" fill="none" stroke="#b22222" strokeWidth="4" strokeLinecap="round" />
        ) : mouthOpen === 1 ? (
          // Slightly open mouth
          <ellipse cx="200" cy="207" rx="10" ry="4" fill="#660000" />
        ) : mouthOpen === 2 ? (
          // Moderately open mouth
          <ellipse cx="200" cy="208" rx="12" ry="8" fill="#660000" />
        ) : (
          // Wide open speaking mouth
          <ellipse cx="200" cy="209" rx="14" ry="12" fill="#660000" />
        )}

        {/* Eyebrows */}
        <path d="M160 145 Q175 138 185 145" fill="none" stroke="#2d3748" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M215 145 Q225 138 240 145" fill="none" stroke="#2d3748" strokeWidth="3.5" strokeLinecap="round" />

        {/* Eyes (Blinking controlled) */}
        {blink ? (
          <>
            {/* Blinked/Closed eye lines */}
            <path d="M160 158 h24" fill="none" stroke="#2d3748" strokeWidth="4" strokeLinecap="round" />
            <path d="M216 158 h24" fill="none" stroke="#2d3748" strokeWidth="4" strokeLinecap="round" />
          </>
        ) : (
          <>
            {/* Open Eyes */}
            <circle cx="172" cy="158" r="9" fill="#1e293b" />
            <circle cx="170" cy="156" r="3" fill="#ffffff" />
            <circle cx="228" cy="158" r="9" fill="#1e293b" />
            <circle cx="226" cy="156" r="3" fill="#ffffff" />
          </>
        )}

        {/* Eyeglasses (Sleek professional modern look) */}
        <circle cx="172" cy="158" r="21" fill="none" stroke="#334155" strokeWidth="3.5" />
        <circle cx="228" cy="158" r="21" fill="none" stroke="#334155" strokeWidth="3.5" />
        <path d="M193 158 h14" fill="none" stroke="#334155" strokeWidth="3.5" />
        <path d="M151 158 h-10" fill="none" stroke="#334155" strokeWidth="3.5" />
        <path d="M249 158 h10" fill="none" stroke="#334155" strokeWidth="3.5" />

        {/* Hair Styles depending on Selected Gender */}
        {gender === 'male' ? (
          <>
            {/* Male Hair */}
            <path d="M140 160 C130 150, 135 110, 160 90 C185 70, 225 70, 245 90 C265 110, 270 150, 260 160 C258 140, 252 120, 235 115 C215 110, 185 110, 165 115 C148 120, 142 140, 140 160 Z" fill="url(#hairGradMale)" />
          </>
        ) : (
          <>
            {/* Female Hair (Elegant bob with fringe) */}
            <path d="M135 180 C130 150, 135 90, 170 80 C200 70, 210 70, 230 80 C265 90, 270 150, 265 180 C268 200, 270 230, 255 240 C250 210, 250 170, 245 150 C235 100, 165 100, 155 150 C150 170, 150 210, 145 240 C130 230, 132 200, 135 180 Z" fill="url(#hairGradFemale)" />
            {/* Bangs details */}
            <path d="M150 115 Q175 100 200 120 Q225 100 250 115 Q200 85 150 115" fill="url(#hairGradFemale)" />
          </>
        )}

        {/* Body and Clothes (White Lab Coat & Blue Shirt/Tie) */}
        {/* Shirt Collar / V-neck area */}
        <path d="M170 280 L200 330 L230 280 Z" fill="#e0f2fe" />
        
        {/* Red Tie (if male) or Purple Scarf (if female) */}
        {gender === 'male' ? (
          <>
            <path d="M195 295 L205 295 L210 360 L200 375 L190 360 Z" fill="#ef4444" />
            <circle cx="200" cy="298" r="6" fill="#dc2626" />
          </>
        ) : (
          <path d="M185 305 C185 305, 200 320, 215 305 C215 305, 225 350, 200 360 Z" fill="#a78bfa" />
        )}

        {/* Stethoscope around neck */}
        <path d="M148 245 C150 300, 250 300, 252 245" fill="none" stroke="#64748b" strokeWidth="8" strokeLinecap="round" />
        <path d="M148 245 C146 250, 154 260, 152 265" fill="none" stroke="#475569" strokeWidth="6" />
        <path d="M252 245 C254 250, 246 260, 248 265" fill="none" stroke="#475569" strokeWidth="6" />
        {/* Stethoscope chest piece */}
        <path d="M200 310 L200 335" fill="none" stroke="#64748b" strokeWidth="5" />
        <circle cx="200" cy="338" r="12" fill="#94a3b8" stroke="#475569" strokeWidth="3" />
        <circle cx="200" cy="338" r="6" fill="#e2e8f0" />

        {/* White Lab Coat */}
        <path d="M110 330 C110 330, 120 270, 160 270 C175 270, 180 290, 175 320 L165 400 H95 L95 350 Z" fill="url(#coatGrad)" filter="url(#shadow)" />
        <path d="M290 330 C290 330, 280 270, 240 270 C225 270, 220 290, 225 320 L235 400 H305 L305 350 Z" fill="url(#coatGrad)" filter="url(#shadow)" />

        {/* Outer Collar flaps */}
        <path d="M160 270 L180 320 L162 335 L145 285 Z" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="1" />
        <path d="M240 270 L220 320 L238 335 L255 285 Z" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="1" />
      </svg>
    </div>
  );
}
