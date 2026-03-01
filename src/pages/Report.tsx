import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Loader2, CheckCircle, AlertTriangle, X } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = [
  'Pothole',
  'Streetlight',
  'Garbage',
  'Graffiti',
  'Water Leak',
  'Signage',
  'Other'
];

export default function ReportPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Create preview
    const objectUrl = URL.createObjectURL(selectedFile);
    setPreview(objectUrl);
    setFile(selectedFile);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('image', file);
    formData.append('category', category);
    formData.append('description', description);
    // Send phone number as user ID if available, otherwise fallback to auth ID
    formData.append('user', user?.phone || user?.id || 'anonymous');

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://24ee-103-170-55-105.ngrok-free.app/api/v1';
      await axios.post(`${apiUrl}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      setSuccess(true);
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (err: any) {
      console.error(err);
      const apiUrl = import.meta.env.VITE_API_URL || 'https://24ee-103-170-55-105.ngrok-free.app/api/v1';
      
      let errorMessage = "Failed to submit report.";
      
      if (err.message?.includes('404')) {
        errorMessage = `API Endpoint not found (404). Trying to reach: ${apiUrl}/report`;
      } else if (err.code === 'ERR_NETWORK') {
        errorMessage = `Cannot connect to server at ${apiUrl}. Is the backend running?`;
      } else {
        errorMessage = err.response?.data?.message || err.message || errorMessage;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const clearFile = () => {
    setFile(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6 animate-bounce">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="text-3xl font-bold text-slate-900 mb-2">Report Submitted!</h2>
        <p className="text-slate-500">Thank you for helping improve our city.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-slate-900 mb-6">Report an Issue</h1>
      
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        {error && (
          <div className="bg-amber-50 text-amber-800 p-4 rounded-xl mb-6 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Image Upload Area */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">Evidence Photo</label>
            
            {!preview ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors group"
              >
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Upload className="w-8 h-8 text-blue-600" />
                </div>
                <p className="text-slate-900 font-medium">Click to upload photo</p>
                <p className="text-slate-500 text-sm mt-1">JPG, PNG (Max 10MB)</p>
              </div>
            ) : (
              <div className="relative rounded-xl overflow-hidden border border-slate-200">
                <img src={preview} alt="Preview" className="w-full h-64 object-cover" />
                <button 
                  type="button"
                  onClick={clearFile}
                  className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full backdrop-blur-sm transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            )}
            
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*" 
              className="hidden" 
            />
          </div>

          {/* Category Selection */}
          <div className="space-y-2">
            <label htmlFor="category" className="block text-sm font-medium text-slate-700">Category</label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label htmlFor="description" className="block text-sm font-medium text-slate-700">Description</label>
            <textarea
              id="description"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue..."
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || !file}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-200 hover:shadow-blue-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" /> : 'Submit Report'}
          </button>
        </form>
      </div>
    </div>
  );
}
