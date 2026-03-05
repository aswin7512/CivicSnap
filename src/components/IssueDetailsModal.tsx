import React from 'react';
import { X, Phone, Calendar, Hash, MapPin, ExternalLink } from 'lucide-react';
import { AdminIssue } from '../pages/AdminIssues'; // Adjust import path as needed

interface IssueDetailsModalProps {
  issue: AdminIssue;
  onClose: () => void;
}

export default function IssueDetailsModal({ issue, onClose }: IssueDetailsModalProps) {
  
  // Local helper to colorize the status badge
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved': return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-amber-100 text-amber-800 border-amber-200';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-slate-900">Issue Details</h2>
            <span className={`px-3 py-1 text-xs font-bold rounded-full border uppercase tracking-wide ${getStatusColor(issue.status)}`}>
              {issue.status.replace('_', ' ')}
            </span>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-6">
          {/* Full Size Image */}
          <div className="w-full h-72 sm:h-96 bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
            <img 
              src={issue.image_url} 
              alt="Full Issue" 
              className="w-full h-full object-contain"
            />
          </div>

          {/* Title & Full Description */}
          <div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">{issue.category}</h3>
            <p className="text-slate-700 leading-relaxed whitespace-pre-wrap bg-slate-50 p-4 rounded-lg border border-slate-100">
              {issue.description || "No description provided."}
            </p>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
            
            <div className="flex items-start gap-3">
              <Hash className="w-5 h-5 text-slate-400 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Complaint ID</p>
                <p className="text-sm font-mono text-slate-800">{issue.id}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-slate-400 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Reported On</p>
                <p className="text-sm text-slate-800">
                  {new Date(issue.created_at).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Phone className="w-5 h-5 text-slate-400 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Reporter Contact</p>
                <p className="text-sm font-mono text-slate-800">{issue.phone_number || 'Anonymous'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-slate-400 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Location (Ward {issue.ward_id || '?'})</p>
                <a 
                  href={`https://www.google.com/maps/search/?api=1&query=${issue.latitude},${issue.longitude}`} 
                  target="_blank" 
                  rel="noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 mt-0.5"
                >
                  Open in Maps <ExternalLink size={14} />
                </a>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}