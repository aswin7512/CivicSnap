import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { MapPin, Clock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import IssueDetailsModal from '../components/IssueDetailsModal';

interface Report {
  id: string;
  category: string;
  description: string;
  status: string;
  image_url: string;
  created_at: string;
  phone_number?: string;
  ward_id?: string;
  latitude?: number;
  longitude?: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL;
        if (!user || !user.phone) {
           setLoading(false);
           return;
        }
        
        const response = await axios.get(`${apiUrl}/complaints/user/${encodeURIComponent(user?.phone)}`);
        setReports(response.data);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError("Failed to load reports.");
        setLoading(false);
      }
    };

    fetchReports();
  }, [user]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved': return 'bg-green-100 text-green-700 border-green-200';
      case 'in_progress': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'rejected': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-amber-100 text-amber-700 border-amber-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'resolved': return <CheckCircle size={16} />;
      case 'in_progress': return <Loader2 size={16} className="animate-spin" />;
      case 'rejected': return <AlertCircle size={16} />;
      default: return <Clock size={16} />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">My Reports</h1>
        <div className="text-sm text-slate-500">
          Showing {reports.length} issues
        </div>
      </div>

      {reports.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="text-lg font-medium text-slate-900">No reports yet</h3>
          <p className="text-slate-500 mt-1">You haven't reported any issues.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {reports.map((report) => (
            <div 
              key={report.id} 
              onClick={() => setSelectedReport(report)}
              className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow group cursor-pointer"
            >
              <div className="relative h-48 overflow-hidden">
                <img 
                  src={report.image_url} 
                  alt="Issue" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5 shadow-sm backdrop-blur-md ${getStatusColor(report.status)}`}>
                  {getStatusIcon(report.status)}
                  <span className="capitalize">{report.status.replace('_', ' ')}</span>
                </div>
              </div>
              
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <p className="text-xs text-slate-400 font-medium flex items-center gap-1">
                    <Clock size={12} />
                    {new Date(report.created_at).toLocaleDateString()}
                  </p>
                  {report.latitude && (
                    <div className="text-xs text-blue-600 flex items-center gap-1">
                      <MapPin size={12} />
                      Location Linked
                    </div>
                  )}
                </div>
                
                <p className="text-slate-800 font-medium line-clamp-2 mb-4">
                  {report.description}
                </p>
                
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>ID: #{report.id}</span>
                  <span className="font-semibold text-blue-600">{report.category}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* <-- Added Modal Rendering --> */}
      {selectedReport && (
        <IssueDetailsModal 
          issue={selectedReport as any}
          onClose={() => setSelectedReport(null)} 
        />
      )}
    </div>
  );
}