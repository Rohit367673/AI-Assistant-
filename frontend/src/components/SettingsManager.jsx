import React, { useState, useEffect } from 'react';
import { Save, CheckCircle, AlertTriangle, Plus, Trash2, Sliders, Palette, Calendar, DollarSign, CreditCard } from 'lucide-react';
import API from '../utils/api';

export default function SettingsManager({ initialProfile, onProfileUpdate }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [newType, setNewType] = useState({ name: '', fee: 0 });

  useEffect(() => {
    if (initialProfile) {
      setProfile(initialProfile);
    }
  }, [initialProfile]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handlePaymentSettingsChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    setProfile(prev => ({
      ...prev,
      paymentSettings: {
        ...prev.paymentSettings,
        [name]: val
      }
    }));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await API.put('/clinic/profile', profile);
      if (response.data.success) {
        setSuccess(true);
        if (onProfileUpdate) {
          onProfileUpdate(response.data.clinic);
        }
        
        // Dynamically update primary theme CSS variable
        document.documentElement.style.setProperty('--theme-color', response.data.clinic.themeColor);
      }
    } catch (err) {
      console.error('Save profile error:', err);
      setError(err.response?.data?.message || 'Failed to save configurations.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddConsultationType = () => {
    if (!newType.name.trim() || newType.fee <= 0) return;
    setProfile(prev => ({
      ...prev,
      consultationTypes: [...prev.consultationTypes, { ...newType }]
    }));
    setNewType({ name: '', fee: 0 });
  };

  const handleRemoveConsultationType = (index) => {
    setProfile(prev => ({
      ...prev,
      consultationTypes: prev.consultationTypes.filter((_, idx) => idx !== index)
    }));
  };

  if (!profile) return <div className="text-center py-6 text-gray-500 text-sm">Loading configurations...</div>;

  const colorPresets = [
    { name: 'Indigo', value: '#6366f1' },
    { name: 'Violet', value: '#8b5cf6' },
    { name: 'Emerald', value: '#10b981' },
    { name: 'Rose', value: '#f43f5e' },
    { name: 'Cyan', value: '#06b6d4' },
    { name: 'Amber', value: '#f59e0b' }
  ];

  return (
    <form onSubmit={handleSaveProfile} className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-gradient">Admin Settings Workspace</h3>
          <p className="text-sm text-gray-400">Configure clinic branding, doctor details, timeslots, and payments.</p>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-md"
        >
          <Save className="w-4.5 h-4.5" /> {loading ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {success && (
        <div className="p-3.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-300 text-sm flex items-center gap-2">
          <CheckCircle className="w-5 h-5 flex-shrink-0" /> Configurations saved successfully. Theme updated.
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" /> {error}
        </div>
      )}

      {/* Grid segments */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Section 1: Branding & Appearance */}
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-4">
          <h4 className="text-sm font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-2">
            <Palette className="w-4.5 h-4.5 text-indigo-400" /> Branding & Theme
          </h4>
          
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Theme Color Selector</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {colorPresets.map(preset => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setProfile(prev => ({ ...prev, themeColor: preset.value }))}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    profile.themeColor === preset.value 
                      ? 'border-white text-white' 
                      : 'border-white/10 text-gray-400 hover:text-white'
                  }`}
                >
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: preset.value }} />
                  {preset.name}
                </button>
              ))}
            </div>
            <input
              type="text"
              name="themeColor"
              value={profile.themeColor}
              onChange={handleInputChange}
              placeholder="#6366f1"
              className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Logo Image Base64 URL (Optional)</label>
            <input
              type="text"
              name="logo"
              value={profile.logo}
              onChange={handleInputChange}
              placeholder="data:image/png;base64,..."
              className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
            />
          </div>
        </div>

        {/* Section 2: Clinic & Doctor Details */}
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-4">
          <h4 className="text-sm font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-2">
            <Sliders className="w-4.5 h-4.5 text-indigo-400" /> Doctor & Specialty
          </h4>
          
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Doctor's Name</label>
            <input
              type="text"
              name="doctorName"
              value={profile.doctorName}
              onChange={handleInputChange}
              className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Medical Specialization</label>
            <input
              type="text"
              name="specialization"
              value={profile.specialization}
              onChange={handleInputChange}
              className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
              required
            />
          </div>
        </div>

        {/* Section 3: AI Prompt & Persona settings */}
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-4 md:col-span-2">
          <h4 className="text-sm font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-2">
            <Palette className="w-4.5 h-4.5 text-indigo-400" /> AI Personality & Text Prompts
          </h4>
          
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Welcome Speech Message</label>
            <input
              type="text"
              name="welcomeMessage"
              value={profile.welcomeMessage}
              onChange={handleInputChange}
              className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Custom Prompt Config Guidelines</label>
            <textarea
              name="promptConfig"
              value={profile.promptConfig}
              onChange={handleInputChange}
              className="w-full px-4 py-2 rounded-xl glass-input text-sm h-28 resize-none"
              required
            />
          </div>
        </div>

        {/* Section 4: Calendar Slots & Fees */}
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-4">
          <h4 className="text-sm font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-2">
            <Calendar className="w-4.5 h-4.5 text-indigo-400" /> Business Calendar slots
          </h4>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Time Slots (Comma separated)</label>
            <input
              type="text"
              value={profile.appointmentSlots?.join(', ')}
              onChange={(e) => {
                const arr = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                setProfile(prev => ({ ...prev, appointmentSlots: arr }));
              }}
              placeholder="09:00, 10:00, 11:00"
              className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-2">Consultation Types & Pricing</label>
            
            <div className="space-y-2 max-h-40 overflow-y-auto mb-3">
              {profile.consultationTypes?.map((type, idx) => (
                <div key={idx} className="flex justify-between items-center p-2.5 rounded-xl bg-white/3 border border-white/5 text-sm">
                  <span>{type.name}</span>
                  <div className="flex items-center gap-2 text-indigo-300 font-semibold">
                    <span>${type.fee}</span>
                    <button 
                      type="button" 
                      onClick={() => handleRemoveConsultationType(idx)} 
                      className="p-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2 items-center pt-2">
              <input
                type="text"
                placeholder="Consultation name"
                value={newType.name}
                onChange={(e) => setNewType(prev => ({ ...prev, name: e.target.value }))}
                className="flex-1 px-3 py-1.5 rounded-lg glass-input text-xs"
              />
              <input
                type="number"
                placeholder="Price"
                value={newType.fee}
                onChange={(e) => setNewType(prev => ({ ...prev, fee: parseFloat(e.target.value) || 0 }))}
                className="w-20 px-3 py-1.5 rounded-lg glass-input text-xs"
              />
              <button
                type="button"
                onClick={handleAddConsultationType}
                className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Section 5: Payment Integrations */}
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-4">
          <h4 className="text-sm font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-2">
            <CreditCard className="w-4.5 h-4.5 text-indigo-400" /> Pluggable Payments Settings
          </h4>

          <div className="space-y-3">
            <label className="flex items-center gap-3 text-sm text-gray-200">
              <input
                type="checkbox"
                name="qrCodeEnabled"
                checked={profile.paymentSettings?.qrCodeEnabled}
                onChange={handlePaymentSettingsChange}
                className="w-4.5 h-4.5 accent-indigo-500 bg-slate-900 border-white/10 rounded"
              />
              Enable UPI QR Payments
            </label>
            
            {profile.paymentSettings?.qrCodeEnabled && (
              <div>
                <label className="block text-[11px] text-gray-400 mb-1">Payee UPI VPA address or String</label>
                <input
                  type="text"
                  name="qrValue"
                  value={profile.paymentSettings?.qrValue}
                  onChange={handlePaymentSettingsChange}
                  placeholder="upi://pay?pa=clinic@upi&pn=ClinicAI"
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-xs"
                />
              </div>
            )}

            <label className="flex items-center gap-3 text-sm text-gray-200">
              <input
                type="checkbox"
                name="cashfreeEnabled"
                checked={profile.paymentSettings?.cashfreeEnabled}
                onChange={handlePaymentSettingsChange}
                className="w-4.5 h-4.5 accent-indigo-500 bg-slate-900 border-white/10 rounded"
              />
              Enable Cashfree Payment Gateway
            </label>

            {profile.paymentSettings?.cashfreeEnabled && (
              <div className="space-y-2 pl-6 pt-1 border-l-2 border-indigo-500/30">
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">Cashfree App ID</label>
                  <input
                    type="text"
                    name="cashfreeAppId"
                    value={profile.paymentSettings?.cashfreeAppId || ''}
                    onChange={handlePaymentSettingsChange}
                    placeholder="e.g. TEST108386203fd97c98761cc..."
                    className="w-full px-4 py-2 rounded-xl glass-input text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">Cashfree Secret Key</label>
                  <input
                    type="password"
                    name="cashfreeSecretKey"
                    value={profile.paymentSettings?.cashfreeSecretKey || ''}
                    onChange={handlePaymentSettingsChange}
                    placeholder="Cashfree Secret Key"
                    className="w-full px-4 py-2 rounded-xl glass-input text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">Cashfree Environment</label>
                  <select
                    name="cashfreeEnvironment"
                    value={profile.paymentSettings?.cashfreeEnvironment || 'sandbox'}
                    onChange={handlePaymentSettingsChange}
                    className="w-full px-4 py-2 rounded-xl glass-input text-xs bg-slate-900 text-gray-200"
                  >
                    <option value="sandbox">Sandbox (Testing)</option>
                    <option value="production">Production (Live)</option>
                  </select>
                </div>
              </div>
            )}

            <label className="flex items-center gap-3 text-sm text-gray-200">
              <input
                type="checkbox"
                name="stripeEnabled"
                checked={profile.paymentSettings?.stripeEnabled}
                onChange={handlePaymentSettingsChange}
                className="w-4.5 h-4.5 accent-indigo-500 bg-slate-900 border-white/10 rounded"
              />
              Enable Stripe Module (Sandbox)
            </label>

            <label className="flex items-center gap-3 text-sm text-gray-200">
              <input
                type="checkbox"
                name="razorpayEnabled"
                checked={profile.paymentSettings?.razorpayEnabled}
                onChange={handlePaymentSettingsChange}
                className="w-4.5 h-4.5 accent-indigo-500 bg-slate-900 border-white/10 rounded"
              />
              Enable Razorpay Module (Sandbox)
            </label>
          </div>
        </div>

      </div>
    </form>
  );
}
