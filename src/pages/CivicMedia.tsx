import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { MapPin, AlertCircle, Loader2 } from 'lucide-react';
import IssueDetailsModal from '../components/IssueDetailsModal'; // <-- Added Import

interface FeedItem {
  id: string;
  category: string;
  description: string;
  status: string;
  image_url: string;
  created_at: string;
  latitude: number;
  longitude: number;
  phone_number?: string; // Optional for modal
  ward_id?: string; // Optional for modal
}

export default function CivicMedia() {
  const [searchParams] = useSearchParams();
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [wardName, setWardName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // <-- Added Modal State
  const [selectedPost, setSelectedPost] = useState<FeedItem | null>(null);

  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');

  useEffect(() => {
    const fetchLocalFeed = async () => {
      if (!lat || !lon) {
        setError("Location coordinates missing. Please go back and try again.");
        setLoading(false);
        return;
      }

      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
        const response = await axios.get(`${apiUrl}/complaints/ward?lat=${lat}&lon=${lon}`);
        
        setFeed(response.data.data);
        setWardName(response.data.ward_name);
        setLoading(false);
      } catch (err: any) {
        if (err.response && err.response.status === 404) {
           setError("No registered ward found at your current location. You might be outside the city limits.");
        } else {
           setError("Failed to load the local feed. Please check your connection.");
        }
        setLoading(false);
      }
    };

    fetchLocalFeed();
  }, [lat, lon]);

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const past = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <p className="text-slate-500 font-medium">Finding local issues...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-6">
        <AlertCircle className="w-12 h-12 text-slate-300 mb-4" />
        <h2 className="text-xl font-semibold text-slate-800 mb-2">Oops!</h2>
        <p className="text-slate-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto pb-12 relative">
      
      {/* Standard Page Header */}
      <div className="py-6 px-4 md:px-0">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
          Local Feed
        </h1>
        <p className="text-sm text-blue-600 font-medium flex items-center gap-1 mt-2">
          <MapPin size={16} /> {wardName}
        </p>
      </div>

      {/* Feed List */}
      <div className="divide-y divide-gray-100 bg-gray-50/50 rounded-2xl md:border border-gray-100 overflow-hidden">
        {feed.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin size={32} />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">All clear!</h3>
            <p className="text-slate-500 text-sm">No issues have been reported in {wardName} recently.</p>
          </div>
        ) : (
          feed.map((post) => (
            <article key={post.id} className="bg-white pb-5 mb-4 shadow-sm sm:rounded-2xl border border-gray-100 overflow-hidden">
              
              {/* Image - Now clickable to open Modal */}
              <div 
                className="w-full aspect-square bg-gray-200 relative cursor-pointer group"
                onClick={() => setSelectedPost(post)}
              >
                <img 
                  src={post.image_url} 
                  alt={post.category} 
                  className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                />
                {/* Status Badge */}
                <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-semibold capitalize tracking-wide border border-white/10 shadow-lg">
                  {post.status.replace('_', ' ')}
                </div>
              </div>

              {/* Content Block */}
              <div className="px-5 mt-4">
                <p className="text-sm text-slate-900 leading-relaxed">
                  <span className="font-bold mr-2 text-slate-900">{post.category}</span>
                  <span className="text-slate-700">{post.description}</span>
                </p>
                <p className="text-xs text-slate-400 mt-3 tracking-wide uppercase font-semibold">
                  {getTimeAgo(post.created_at)}
                </p>
              </div>

            </article>
          ))
        )}
      </div>

      {/* <-- Added Modal Rendering --> */}
      {selectedPost && (
        <IssueDetailsModal 
          issue={selectedPost as any} // Cast to bypass strict AdminIssue interface requirements
          onClose={() => setSelectedPost(null)} 
        />
      )}

    </div>
  );
}