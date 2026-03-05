import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Phone, Lock, Loader2, UserPlus, ArrowRight, ShieldCheck, Shield, MapPin } from 'lucide-react';
import axios from 'axios';

interface Ward {
  id: number;
  name: string;
}

export default function SignupPage() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+91');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // New State for Role and Ward Management
  const [role, setRole] = useState<'citizen' | 'admin'>('citizen');
  const [selectedWard, setSelectedWard] = useState('');
  const [wards, setWards] = useState<Ward[]>([]);

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

  // Fetch wards only when the user selects the "admin" role
  useEffect(() => {
    if (role === 'admin' && wards.length === 0) {
      axios.get(`${apiUrl}/wards`)
        .then(res => setWards(res.data.data))
        .catch(err => console.error("Failed to load wards:", err));
    }
  }, [role, wards.length, apiUrl]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    if (value.length < 3) {
      setPhone('+91');
      return;
    }
    if (!value.startsWith('+91')) {
      value = '+91';
    }
    if (/^\+91\d*$/.test(value)) {
      setPhone(value);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validation for Admin Ward Selection
    if (role === 'admin' && !selectedWard) {
      setError("Please select a ward to manage.");
      setLoading(false);
      return;
    }

    try {
      // Dynamically build the metadata payload
      const metaData = {
        display_name: name,
        role: role,
        ...(role === 'admin' && { ward_allocated: parseInt(selectedWard) })
      };

      const { error } = await supabase.auth.signUp({
        phone: phone,
        password: password,
        options: {
          data: metaData,
        },
      });

      if (error) throw error;
      setStep('otp');
    } catch (err: any) {
      let msg = err.message || 'Failed to sign up. Please try again.';
      if (msg.includes('404')) {
        msg = 'Supabase project not found (404). Check your VITE_SUPABASE_URL.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.verifyOtp({
        phone: phone,
        token: otp,
        type: 'sms',
      });

      if (error) throw error;
      
      // Update display name just in case it wasn't captured
      await supabase.auth.updateUser({ data: { display_name: name } });
      
      // Route based on role
      if (role === 'admin') {
        navigate('/admin/issues');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
        <div className="text-center mb-8">
          <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            {step === 'credentials' ? (
              <UserPlus className="w-8 h-8 text-blue-600" />
            ) : (
              <ShieldCheck className="w-8 h-8 text-blue-600" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            {step === 'credentials' ? 'Create Account' : 'Verify Phone'}
          </h1>
          <p className="text-slate-500 mt-2">
            {step === 'credentials' 
              ? 'Join Civic Snap to report issues' 
              : `Enter the code sent to ${phone}`}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 flex items-center gap-2">
            <span>⚠️</span> {error}
          </div>
        )}

        {step === 'credentials' ? (
          <form onSubmit={handleSignup} className="space-y-5">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                placeholder="Jane Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                required
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-1">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  id="phone"
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={handlePhoneChange}
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  required
                  maxLength={13}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
                Create Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  required
                  minLength={6}
                />
              </div>
            </div>

            {/* --- NEW: ROLE SELECTION DROPDOWN --- */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                <Shield size={16} className="text-slate-400" />
                Account Type
              </label>
              <select
                value={role}
                onChange={(e) => {
                  setRole(e.target.value as 'citizen' | 'admin');
                  if (e.target.value === 'citizen') setSelectedWard('');
                }}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white transition-all"
              >
                <option value="citizen">Citizen</option>
                <option value="admin">City Admin</option>
              </select>
            </div>

            {/* --- NEW: WARD SELECTION DROPDOWN (Conditional) --- */}
            {role === 'admin' && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 animate-in fade-in slide-in-from-top-2">
                <label className="block text-sm font-medium text-slate-700 flex items-center gap-1">
                  <MapPin size={16} className="text-slate-400" />
                  Assigned Ward
                </label>
                <select
                  required={role === 'admin'}
                  value={selectedWard}
                  onChange={(e) => setSelectedWard(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                >
                  <option value="" disabled>Select your ward...</option>
                  {wards.map((ward) => (
                    <option key={ward.id} value={ward.id}>
                      {ward.name} (Ward {ward.id})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
            >
              {loading ? <Loader2 className="animate-spin" /> : <>Sign Up <ArrowRight size={18} /></>}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label htmlFor="otp" className="block text-sm font-medium text-slate-700 mb-1">
                Verification Code
              </label>
              <input
                id="otp"
                type="text"
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-center text-2xl tracking-widest font-mono"
                maxLength={6}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="animate-spin" /> : 'Verify & Create Account'}
            </button>
            
            <button
              type="button"
              onClick={() => setStep('credentials')}
              className="w-full text-slate-500 text-sm hover:text-slate-700 py-2"
            >
              Change Phone Number
            </button>
          </form>
        )}

        {step === 'credentials' && (
          <div className="mt-6 text-center">
            <p className="text-slate-500 text-sm">
              Already have an account?{' '}
              <Link to="/login" className="text-blue-600 font-semibold hover:underline">
                Login
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}