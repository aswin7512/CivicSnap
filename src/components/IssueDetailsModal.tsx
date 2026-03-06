import React from 'react';
import { X, Phone, Calendar, Hash, MapPin, ExternalLink, ThumbsUp, PlusCircle, AlertTriangle } from 'lucide-react';
import { AdminIssue } from '../pages/AdminIssues'; 

interface IssueDetailsModalProps {
  issue: AdminIssue;
  onClose: () => void;
  // New props for Duplicate Checking Mode
  duplicateMode?: boolean;
  onConfirmSame?: () => void;
  onConfirmDifferent?: () => void;
  isVoting?: boolean;
}

export default function IssueDetailsModal({ 
  issue, 
  onClose, 
  duplicateMode = false,
  onConfirmSame,
  onConfirmDifferent,
  isVoting = false
}: IssueDetailsModalProps) {
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved': return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-amber-100 text-amber-800 border-amber-200';
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col relative">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            {duplicateMode && <AlertTriangle className="text-amber-500 w-6 h-6 animate-pulse" />}
            <h2 className="text-xl font-bold text-slate-900">
              {duplicateMode ? "Similar Issue Found nearby" : "Issue Details"}
            </h2>
            {!duplicateMode && (
              <span className={`px-3 py-1 text-xs font-bold rounded-full border uppercase tracking-wide ${getStatusColor(issue.status)}`}>
                {issue.status.replace('_', ' ')}
              </span>
            )}
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
          {duplicateMode && (
             <p className="text-slate-600 font-medium bg-amber-50 p-3 rounded-lg border border-amber-100">
               Someone recently reported a <span className="font-bold text-slate-900">{issue.category}</span> issue very close to your location. Is this the same issue you are trying to report?
             </p>
          )}

          <div className="w-full h-64 sm:h-80 bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
            <img src={issue.image_url} alt="Full Issue" className="w-full h-full object-cover" />
          </div>

          <div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">{issue.category}</h3>
            <p className="text-slate-700 leading-relaxed whitespace-pre-wrap bg-slate-50 p-4 rounded-lg border border-slate-100">
              {issue.description || "No description provided."}
            </p>
          </div>

          {/* Action Buttons for Duplicate Mode */}
          {duplicateMode && onConfirmSame && onConfirmDifferent && (
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-100 mt-6">
              <button 
                onClick={onConfirmSame}
                disabled={isVoting}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-70"
              >
                {isVoting ? "Adding vote..." : <><ThumbsUp size={18} /> Yes, it's the same</>}
              </button>
              <button 
                onClick={onConfirmDifferent}
                className="flex-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <PlusCircle size={18} /> No, report as new
              </button>
            </div>
          )}

          {/* Standard Metadata Grid (Hidden during duplicate check for cleanliness) */}
          {!duplicateMode && (
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
                <MapPin className="w-5 h-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase">Location</p>
                  <a href={`googleusercontent.com/maps.google.com...$${issue.latitude},${issue.longitude}`} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline">
                    View Map <ExternalLink size={12} className="inline" />
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}