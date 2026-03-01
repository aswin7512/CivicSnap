import React from 'react';
import { Camera, MapPin, Check, Building2 } from 'lucide-react';

export function Logo({ className = "w-12 h-12" }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Background Circle */}
      <div className="absolute inset-0 bg-blue-600 rounded-full opacity-10"></div>
      
      {/* City Silhouette (simplified) */}
      <Building2 className="absolute bottom-1 left-1 w-1/2 h-1/2 text-blue-300 opacity-50" />
      <Building2 className="absolute bottom-1 right-1 w-1/2 h-1/2 text-blue-300 opacity-50 transform scale-x-[-1]" />

      {/* Camera Icon (Main) */}
      <Camera className="w-3/4 h-3/4 text-orange-500 relative z-10" strokeWidth={2} />

      {/* Location Pin with Check (Overlay) */}
      <div className="absolute -top-1 right-0 bg-white rounded-full p-0.5 shadow-sm z-20">
        <div className="relative">
          <MapPin className="w-5 h-5 text-blue-500 fill-blue-100" />
          <Check className="absolute top-1 left-1 w-3 h-3 text-blue-600" strokeWidth={3} />
        </div>
      </div>
    </div>
  );
}
