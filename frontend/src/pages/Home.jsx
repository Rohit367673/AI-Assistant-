import React from 'react';
import { Link } from 'react-router-dom';
import { Activity, ArrowRight, ShieldCheck, Sparkles, MessageSquare, Calendar, Globe, Cpu } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#070913] text-white flex flex-col justify-between">
      
      {/* Navbar */}
      <header className="px-6 py-5 max-w-6xl mx-auto w-full flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Activity className="w-6 h-6" />
          </div>
          <span className="font-extrabold text-lg text-white tracking-tight">ClinicAI SaaS</span>
        </div>
        <div className="flex gap-4">
          <Link to="/login" className="px-4 py-2 text-sm font-semibold text-gray-300 hover:text-white transition-colors">
            Login
          </Link>
          <Link to="/register" className="px-4.5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-md">
            Register Workspace
          </Link>
        </div>
      </header>

      {/* Hero section */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 flex flex-col justify-center py-12 md:py-20 space-y-12">
        
        {/* Copy */}
        <div className="text-center space-y-6 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" /> Next-Gen Multi-Tenant Healthcare AI
          </div>
          
          <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-none text-gradient">
            Custom AI Health Assistants For Every Clinic
          </h1>
          
          <p className="text-base md:text-lg text-gray-400 leading-relaxed">
            Enhance patient engagement, automate timeslot booking checkouts, and answer clinical questions using your custom files. Includes 3D-feeling talking doctor avatars and voice interfaces.
          </p>

          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <Link 
              to="/register" 
              className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold transition-all shadow-lg flex items-center gap-2 group hover:scale-[1.02]"
            >
              Get Started Free <ArrowRight className="w-4.5 h-4.5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link 
              to="/login" 
              className="px-6 py-3.5 border border-white/10 hover:bg-white/5 rounded-xl font-bold transition-colors"
            >
              Access Dashboard
            </Link>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8">
          {[
            { 
              title: "3D-Feeling Doctor Avatar", 
              desc: "Polished animated male/female avatars that move and lip-sync with replies during speech synthesis.", 
              icon: Cpu 
            },
            { 
              title: "Self-Service RAG Docs", 
              desc: "Upload PDFs/DOCXs with business details, pricing fees, or FAQ sheets. The AI reasons directly from them.", 
              icon: ShieldCheck 
            },
            { 
              title: "Appointment Bookings", 
              desc: "Collect details automatically through conversational AI, schedule availability slots, and confirm appointments.", 
              icon: Calendar 
            },
            { 
              title: "Pluggable Payments", 
              desc: "Checkout integrations via Razorpay, Stripe, or instant UPI QR code generation shown in the chat window.", 
              icon: Globe 
            },
            { 
              title: "Conversational Summaries", 
              desc: "Generates clinical symptoms logs, questions asked, and outlines user context before doctor visits.", 
              icon: MessageSquare 
            },
            { 
              title: "1-Line Script Widget", 
              desc: "Inject one simple script tag in your clinic website to load the customized virtual assistant instantly.", 
              icon: Sparkles 
            }
          ].map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div key={idx} className="p-6 rounded-2xl glass-card border border-white/8 hover:border-white/15 hover:bg-[#0c101f] transition-all">
                <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 w-fit mb-4">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-white text-base mb-2">{feat.title}</h3>
                <p className="text-xs text-gray-400 leading-relaxed">{feat.desc}</p>
              </div>
            );
          })}
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-6 text-center text-xs text-gray-600">
        &copy; {new Date().getFullYear()} ClinicAI SaaS Corporation. All rights reserved. Educational Demo App.
      </footer>

    </div>
  );
}
