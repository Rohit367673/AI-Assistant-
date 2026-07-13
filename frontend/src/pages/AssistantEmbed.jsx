import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import ChatInterface from '../components/ChatInterface';
import API from '../utils/api';

export default function AssistantEmbed() {
  const [searchParams] = useSearchParams();
  const clinicId = searchParams.get('clinicId') || searchParams.get('clinic');
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!clinicId) {
      setError('Missing clinic ID parameter (?clinicId=YOUR_CLINIC_ID)');
      setLoading(false);
      return;
    }

    const fetchSettings = async () => {
      try {
        const response = await API.get(`/clinic/settings?clinicId=${clinicId}`);
        if (response.data.success) {
          setSettings(response.data.settings);
          
          // Apply theme color
          document.documentElement.style.setProperty('--theme-color', response.data.settings.themeColor);
        } else {
          setError('Failed to load assistant settings.');
        }
      } catch (err) {
        console.error('Fetch embed settings error:', err);
        setError('Clinic workspace not found or network connection offline.');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [clinicId]);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-950 text-white p-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-gray-500 font-medium">Securing assistant channel...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-950 text-white p-6">
        <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-center max-w-xs space-y-2">
          <h4 className="font-bold text-red-400 text-sm">Embed Config Error</h4>
          <p className="text-xs text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-[#070913]">
      <ChatInterface clinicSettings={settings} isEmbedded={true} />
    </div>
  );
}
