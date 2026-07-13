import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Activity, Mail, Lock, User, PlusCircle, ArrowRight } from 'lucide-react';
import API from '../utils/api';

export default function Register() {
  const [formData, setFormData] = useState({
    clinicId: '',
    email: '',
    password: '',
    name: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await API.post('/auth/register', formData);
      if (response.data.success) {
        localStorage.setItem('clinicToken', response.data.token);
        localStorage.setItem('clinicId', response.data.clinic.clinicId);
        navigate('/dashboard');
      } else {
        setError(response.data.message || 'Registration failed.');
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.response?.data?.message || 'Workspace ID or Email already registered.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl glass-card text-white border border-white/10 p-8 space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <PlusCircle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-gradient">Register Clinic SaaS</h2>
          <p className="text-sm text-gray-400">Create a tenant workspace for your clinic</p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 font-semibold flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-indigo-400" /> Clinic Name
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Mercer Wellness Clinic"
              className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5 font-semibold flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-indigo-400" /> Clinic Workspace ID (clinicId)
            </label>
            <input
              type="text"
              name="clinicId"
              value={formData.clinicId}
              onChange={handleInputChange}
              placeholder="mercer-clinic"
              className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
              required
            />
            <p className="text-[10px] text-gray-500 mt-1">
              Used in integration links, e.g., <code>?clinic=mercer-clinic</code>
            </p>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5 font-semibold flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-indigo-400" /> Email Address
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="admin@clinic.com"
              className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5 font-semibold flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-indigo-400" /> Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 mt-2"
          >
            {loading ? 'Creating workspace...' : 'Register Workspace'} <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center pt-2">
          <p className="text-xs text-gray-400">
            Already have a workspace?{' '}
            <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-semibold underline">
              Login here
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}
