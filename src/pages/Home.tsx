import React from 'react';
import { Link } from 'react-router-dom';
import { Camera, Shield, CheckCircle, ArrowRight } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="text-center py-12 md:py-20 space-y-6">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-medium mb-4">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
          Civic Engagement Platform
        </div>
        
        <h1 className="text-4xl md:text-6xl font-bold text-slate-900 tracking-tight">
          Snap. Report. <span className="text-blue-600">Improve.</span>
        </h1>
        
        <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Empower your community by reporting civic issues instantly. 
          Use your phone to snap a photo, verify location, and track the fix.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link 
            to="/report" 
            className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-semibold shadow-lg shadow-blue-200 hover:shadow-blue-300 transition-all flex items-center justify-center gap-2"
          >
            <Camera size={20} />
            Report an Issue
          </Link>
          <Link 
            to="/dashboard" 
            className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-full font-semibold transition-all flex items-center justify-center gap-2"
          >
            Track Status
            <ArrowRight size={20} />
          </Link>
        </div>
      </section>

      {/* Features Grid */}
      <section className="grid md:grid-cols-3 gap-8">
        <FeatureCard 
          icon={<Camera className="w-8 h-8 text-orange-500" />}
          title="Instant Reporting"
          description="Snap a photo of potholes, graffiti, or broken lights. Our app automatically captures location data."
        />
        <FeatureCard 
          icon={<Shield className="w-8 h-8 text-blue-500" />}
          title="Verified Data"
          description="We use EXIF metadata to verify the time and location of every report, ensuring authenticity."
        />
        <FeatureCard 
          icon={<CheckCircle className="w-8 h-8 text-green-500" />}
          title="Track Progress"
          description="Get real-time updates on the status of your reports as city officials address them."
        />
      </section>
      
      {/* Stats / Trust Section */}
      <section className="bg-slate-900 rounded-3xl p-8 md:p-12 text-center text-white overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?auto=format&fit=crop&q=80&w=2000')] bg-cover bg-center opacity-10"></div>
        <div className="relative z-10 space-y-4">
          <h2 className="text-2xl md:text-3xl font-bold">Join 10,000+ Citizens</h2>
          <p className="text-slate-300 max-w-xl mx-auto">
            Together we can make our city cleaner, safer, and more beautiful. 
            Start reporting today.
          </p>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
      <div className="bg-slate-50 w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-3">{title}</h3>
      <p className="text-slate-500 leading-relaxed">
        {description}
      </p>
    </div>
  );
}
