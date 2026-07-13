import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, User, Phone, Mail, Globe, FileText, CheckCircle, CreditCard, ChevronRight, ChevronLeft } from 'lucide-react';
import API from '../utils/api';

export default function BookingCalendar({ clinicSettings, onBookingSuccess, onClose }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    patientName: '',
    patientPhone: '',
    patientEmail: '',
    consultationType: clinicSettings.consultationTypes?.[0]?.name || 'General Consultation',
    date: new Date().toISOString().split('T')[0],
    time: clinicSettings.appointmentSlots?.[0] || '10:00',
    country: 'United States',
    notes: '',
    paymentProvider: 'None',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Generate next 7 days for quick picking
  const getNext7Days = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const nextDate = new Date();
      nextDate.setDate(today.getDate() + i);
      // Skip sundays if clinic business hours exclude sundays
      dates.push(nextDate.toISOString().split('T')[0]);
    }
    return dates;
  };

  const nextDays = getNext7Days();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectDate = (date) => {
    setFormData(prev => ({ ...prev, date }));
  };

  const handleSelectTime = (time) => {
    setFormData(prev => ({ ...prev, time }));
  };

  const handleSelectType = (type) => {
    setFormData(prev => ({ ...prev, consultationType: type }));
  };

  const handleSelectPayment = (provider) => {
    setFormData(prev => ({ ...prev, paymentProvider: provider }));
  };

  const handleSubmitBooking = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await API.post('/appointments/book', {
        clinicId: clinicSettings.clinicId,
        ...formData
      });
      if (response.data.success) {
        setStep(4);
        if (onBookingSuccess) {
          onBookingSuccess(response.data.appointment);
        }
      } else {
        setError(response.data.message || 'Failed to complete booking.');
      }
    } catch (err) {
      console.error('Booking submission error:', err);
      setError(err.response?.data?.message || 'Server error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-lg overflow-hidden rounded-2xl glass-card text-white border border-white/10"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-white/5">
          <div>
            <h3 className="text-lg font-semibold text-gradient">Schedule Appointment</h3>
            <p className="text-xs text-gray-400">with {clinicSettings.doctorName}</p>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors text-sm font-medium"
          >
            Cancel
          </button>
        </div>

        {/* Progress Stepper bar */}
        <div className="flex h-1 bg-white/5">
          <div 
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>

        {/* Body content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm">
              {error}
            </div>
          )}

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                {/* Consultation Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Consultation Type</label>
                  <div className="grid grid-cols-1 gap-2">
                    {clinicSettings.consultationTypes?.map((type, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectType(type.name)}
                        className={`flex justify-between items-center p-3 rounded-xl border text-sm transition-all ${
                          formData.consultationType === type.name
                            ? 'border-indigo-500 bg-indigo-500/25 text-white'
                            : 'border-white/10 bg-white/5 hover:bg-white/10 text-gray-300'
                        }`}
                      >
                        <span className="font-medium">{type.name}</span>
                        <span className="text-indigo-300">${type.fee}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date Picker */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-indigo-400" /> Select Date
                  </label>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {nextDays.map((d, idx) => {
                      const dateObj = new Date(d);
                      const isSelected = formData.date === d;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectDate(d)}
                          className={`flex-shrink-0 flex flex-col items-center p-3 rounded-xl border w-16 text-center transition-all ${
                            isSelected
                              ? 'border-indigo-500 bg-indigo-500/25 text-white'
                              : 'border-white/10 bg-white/5 hover:bg-white/10 text-gray-400'
                          }`}
                        >
                          <span className="text-[10px] uppercase font-bold text-gray-500">
                            {dateObj.toLocaleDateString('en-US', { weekday: 'short' })}
                          </span>
                          <span className="text-lg font-bold text-white mt-0.5">{dateObj.getDate()}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Time Slots */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-indigo-400" /> Select Time
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {clinicSettings.appointmentSlots?.map((time, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectTime(time)}
                        className={`p-2 text-center rounded-lg border text-xs font-semibold transition-all ${
                          formData.time === time
                            ? 'border-indigo-500 bg-indigo-500/25 text-white'
                            : 'border-white/10 bg-white/5 hover:bg-white/10 text-gray-300'
                        }`}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="flex items-center gap-1 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-medium transition-colors"
                  >
                    Next Details <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1 flex items-center gap-1"><User className="w-3 h-3 text-indigo-400"/> Name</label>
                    <input
                      type="text"
                      name="patientName"
                      value={formData.patientName}
                      onChange={handleInputChange}
                      placeholder="Jane Doe"
                      className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1 flex items-center gap-1"><Phone className="w-3 h-3 text-indigo-400"/> Phone</label>
                      <input
                        type="tel"
                        name="patientPhone"
                        value={formData.patientPhone}
                        onChange={handleInputChange}
                        placeholder="+1 555-0199"
                        className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1 flex items-center gap-1"><Mail className="w-3 h-3 text-indigo-400"/> Email</label>
                      <input
                        type="email"
                        name="patientEmail"
                        value={formData.patientEmail}
                        onChange={handleInputChange}
                        placeholder="jane@example.com"
                        className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 mb-1 flex items-center gap-1"><Globe className="w-3 h-3 text-indigo-400"/> Country</label>
                    <input
                      type="text"
                      name="country"
                      value={formData.country}
                      onChange={handleInputChange}
                      placeholder="United States"
                      className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 mb-1 flex items-center gap-1"><FileText className="w-3 h-3 text-indigo-400"/> Special Notes (Symptoms, history, etc.)</label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      placeholder="Describe what you want to consult about..."
                      className="w-full px-4 py-2 rounded-xl glass-input text-sm h-20 resize-none"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex items-center gap-1 px-4 py-2.5 border border-white/10 hover:bg-white/5 rounded-xl font-medium transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    disabled={!formData.patientName || !formData.patientPhone || !formData.patientEmail}
                    className="flex items-center gap-1 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:pointer-events-none rounded-xl font-medium transition-colors"
                  >
                    Checkout Payment <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <div>
                  <h4 className="text-sm font-semibold text-gray-300 mb-2">Review Booking Summary</h4>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-sm space-y-2">
                    <div className="flex justify-between"><span className="text-gray-400">Consultation:</span><span>{formData.consultationType}</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">Date/Time:</span><span>{formData.date} at {formData.time}</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">Patient:</span><span>{formData.patientName}</span></div>
                    <div className="flex justify-between font-bold border-t border-white/10 pt-2 text-indigo-300">
                      <span>Total Consultation Fee:</span>
                      <span>${clinicSettings.consultationTypes?.find(c => c.name === formData.consultationType)?.fee || 50}</span>
                    </div>
                  </div>
                </div>

                {/* Pluggable Payment gateways selectors */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-indigo-400" /> Select Payment Provider
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    {clinicSettings.paymentSettings?.qrCodeEnabled && (
                      <button
                        type="button"
                        onClick={() => handleSelectPayment('QR')}
                        className={`flex items-center justify-between p-3 rounded-xl border text-sm transition-all ${
                          formData.paymentProvider === 'QR'
                            ? 'border-indigo-500 bg-indigo-500/25 text-white'
                            : 'border-white/10 bg-white/5 hover:bg-white/10 text-gray-300'
                        }`}
                      >
                        <span className="font-semibold">Scan QR Code (UPI)</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-300 font-bold">Instant</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleSelectPayment('Stripe')}
                      className={`flex items-center justify-between p-3 rounded-xl border text-sm transition-all ${
                        formData.paymentProvider === 'Stripe'
                          ? 'border-indigo-500 bg-indigo-500/25 text-white'
                          : 'border-white/10 bg-white/5 hover:bg-white/10 text-gray-300'
                      }`}
                    >
                      <span className="font-semibold">Credit/Debit Card (Stripe Sandbox)</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">Secure</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectPayment('Razorpay')}
                      className={`flex items-center justify-between p-3 rounded-xl border text-sm transition-all ${
                        formData.paymentProvider === 'Razorpay'
                          ? 'border-indigo-500 bg-indigo-500/25 text-white'
                          : 'border-white/10 bg-white/5 hover:bg-white/10 text-gray-300'
                      }`}
                    >
                      <span className="font-semibold">Net Banking / UPI (Razorpay Sandbox)</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">Popular</span>
                    </button>
                  </div>
                </div>

                {formData.paymentProvider === 'QR' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="p-3 rounded-xl border border-yellow-500/30 bg-yellow-500/10 flex flex-col items-center"
                  >
                    <p className="text-[11px] text-yellow-300 text-center mb-2">
                      Scan UPI QR code or pay to: <b>{clinicSettings.paymentSettings?.qrValue || 'clinic@upi'}</b>. Once complete, click "Confirm Appointment" below.
                    </p>
                    <div className="w-28 h-28 bg-white p-2 rounded-lg flex items-center justify-center">
                      {/* Simple mock QR SVG */}
                      <svg viewBox="0 0 100 100" className="w-full h-full text-black">
                        <rect x="0" y="0" width="25" height="25" />
                        <rect x="75" y="0" width="25" height="25" />
                        <rect x="0" y="75" width="25" height="25" />
                        <rect x="35" y="35" width="30" height="30" />
                        <rect x="10" y="40" width="10" height="10" />
                        <rect x="80" y="80" width="10" height="10" />
                        <rect x="50" y="10" width="10" height="15" />
                        <rect x="10" y="50" width="15" height="10" />
                      </svg>
                    </div>
                  </motion.div>
                )}

                <div className="pt-2 flex justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="flex items-center gap-1 px-4 py-2.5 border border-white/10 hover:bg-white/5 rounded-xl font-medium transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmitBooking}
                    disabled={loading || formData.paymentProvider === 'None'}
                    className="flex items-center gap-1 px-5 py-2.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:pointer-events-none rounded-xl font-bold transition-colors"
                  >
                    {loading ? 'Processing...' : 'Confirm Appointment'}
                  </button>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-6 text-center space-y-4"
              >
                <div className="mx-auto w-16 h-16 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center text-green-400">
                  <CheckCircle className="w-10 h-10" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xl font-bold text-white">Booking Confirmed!</h4>
                  <p className="text-sm text-gray-400">
                    Your appointment with <b>{clinicSettings.doctorName}</b> is scheduled.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-xs text-left max-w-sm mx-auto space-y-1.5">
                  <div><b>Patient Name:</b> {formData.patientName}</div>
                  <div><b>Appointment Slot:</b> {formData.date} at {formData.time}</div>
                  <div><b>Consultation Type:</b> {formData.consultationType}</div>
                  <div><b>Payment Status:</b> {formData.paymentProvider !== 'None' && formData.paymentProvider !== 'QR' ? 'Paid (Sandbox)' : 'Pending Verification'}</div>
                </div>
                <p className="text-xs text-gray-500">
                  An email confirmation has been sent to {formData.patientEmail}.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-semibold transition-colors"
                  >
                    Close & Return to Chat
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
