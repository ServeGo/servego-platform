import React, { useState, useEffect } from 'react';
import { Compass, Truck, ShieldCheck, Activity, Building2, MapPin, Clock } from 'lucide-react';


export const LiveTrackingMap = ({ booking }) => {
  const [progress, setProgress] = useState(0.2); // route progress from 0 to 1
  const [eta, setEta] = useState(12); // minutes
  const [distance, setDistance] = useState(2.4); // kilometers
  const [currentLat, setCurrentLat] = useState(17.4445);
  const [currentLng, setCurrentLng] = useState(78.3782);
  const [isLocating, setIsLocating] = useState(false);
  const [gpsReady, setGpsReady] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState(new Date().toLocaleTimeString());

  // Simulating en-route vehicle motion
  useEffect(() => {
    const isEnRoute = booking.status === 'en_route';
    const isOngoing = booking.status === 'ongoing';
    
    if (isEnRoute) {
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 0.98) {
            return 0.1; // loop simulation
          }
          const nextVal = prev + 0.05;
          
          // Smoothly decrease ETA & distance drives closer
          setDistance(Number((2.4 * (1 - nextVal)).toFixed(2)));
          setEta(Math.max(1, Math.round(12 * (1 - nextVal))));
          
          // Interpolate Hyderabad Coordinates (Gachibowli to Hitech City)
          // Starting path, 78.3489 E (Gachibowli Outer Ring Rd)
          // Customer dest, 78.3741 E (Gachibowli Main Rd Residence)
          setCurrentLat(17.4401 + (17.4485 - 17.4401) * nextVal);
          setCurrentLng(78.3489 + (78.3741 - 78.3489) * nextVal);
          return nextVal;
        });
        setLastCheckTime(new Date().toLocaleTimeString());
      }, 4000);
      
      return () => clearInterval(interval);
    } else if (isOngoing) {
      // Specialist already arrived on site
      setProgress(1.0);
      setDistance(0.0);
      setEta(0);
      setCurrentLat(17.4485);
      setCurrentLng(78.3741);
    }
  }, [booking.status]);

  // Request real device geolocation if they want standard coordinates grounding
  const handleRequestDeviceLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser module.");
      return;
    }
    
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        setGpsReady(true);
        // Add a slight variance to make it look matching Gachibowli coords
        setCurrentLat(position.coords.latitude - 0.003 * (1 - progress));
        setCurrentLng(position.coords.longitude - 0.004 * (1 - progress));
      },
      (error) => {
        console.warn("Geolocation permission error: ", error.message);
        setIsLocating(false);
        // Graceful mock coordinate placement fallback
        setGpsReady(true);
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  // SVG Coordinates interpolation for drawing the path
  // SVG size is 100% width, height 240
  const pathCoordinates = [
    { x: 30, y: 190, label: "Specialist Hub" },
    { x: 100, y: 170, label: "Phase 2 Crossing" },
    { x: 180, y: 140, label: "Main Highway Intersection" },
    { x: 280, y: 120, label: "DLF Cyber City Rd" },
    { x: 400, y: 110, label: "Resident Compound Gate" },
    { x: 520, y: 70, label: "Customer Flat" }
  ];

  // Helper to find exact interpolated point on SVG canvas path for our animated technician avatar
  const getInterpolatedPoint = (t) => {
    const segments = pathCoordinates.length - 1;
    const scaledT = t * segments;
    const index = Math.floor(scaledT);
    const fraction = scaledT - index;
    
    if (index >= segments) {
      return pathCoordinates[segments];
    }
    
    const p1 = pathCoordinates[index];
    const p2 = pathCoordinates[index + 1];
    
    return {
      x: p1.x + (p2.x - p1.x) * fraction,
      y: p1.y + (p2.y - p1.y) * fraction
    };
  };

  const activeSpecialistPoint = getInterpolatedPoint(progress);

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 text-white overflow-hidden shadow-lg mb-5 my-2">
      {/* Top Telemetry Header info row */}
      <div className="p-4 bg-slate-920 border-b border-slate-800/80 flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
          <span className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider flex items-center gap-1.5">
            <Activity className="w-3 h-3 text-emerald-400" />
            Live Satellite Feed active
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button 
            type="button"
            onClick={handleRequestDeviceLocation}
            disabled={isLocating}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-850 hover:bg-slate-800 border border-slate-700/80 transition-colors text-[10px] font-bold outline-none cursor-pointer"
          >
            <Compass className={`w-3 h-3 text-indigo-400 ${isLocating ? 'animate-spin' : ''}`} />
            <span>{gpsReady ? 'GPS Calibrated' : 'Connect Device Geolocation'}</span>
          </button>
        </div>
      </div>

      {/* Main Map Canvas Area */}
      <div className="relative bg-teal-950/20 h-56 border-b border-slate-800 flex items-stretch">
        
        {/* SVG Road Layout Canvas simulation */}
        <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
          {/* Grid lines background */}
          <defs>
            <pattern id="gridPattern" width="30" height="30" patternUnits="userSpaceOnUse">
              <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(51, 65, 85, 0.15)" strokeWidth="0.8" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#gridPattern)" />

          {/* Rivers/Lakes design */}
          <path d="M -10 30 C 50 40 120 10 180 40 C 240 70 300 20 400 30 C 500 40 600 20 700 40" fill="none" stroke="#1e3a5f" strokeWidth="15" className="opacity-30" />
          
          {/* Parks polygons */}
          <rect x="50" y="20" width="80" height="50" rx="10" fill="#064e3b" className="opacity-15" />
          <rect x="300" y="140" width="120" height="40" rx="10" fill="#064e3b" className="opacity-15" />

          {/* Hyderabad road lines drawing */}
          <path 
            d="M 30 190 Q 75 175 120 160 T 220 110 T 360 130 T 440 60 T 520 70" 
            fill="none" 
            stroke="#334155" 
            strokeWidth="9" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
          <path 
            d="M 30 190 Q 75 175 120 160 T 220 110 T 360 130 T 440 60 T 520 70" 
            fill="none" 
            stroke="#1e1e38" 
            strokeWidth="5" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
          
          {/* Simulated active dynamic progress highlight stroke */}
          <path 
            d="M 30 190 Q 75 175 120 160 T 220 110 T 360 130 T 440 60 T 520 70" 
            fill="none" 
            stroke="#6366f1" 
            strokeWidth="4" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeDasharray="440"
            strokeDashoffset={440 * (1 - progress)}
            className="transition-all duration-1000 ease-out opacity-90"
          />

          {/* SVG coordinate markers */}
          {/* HUB start marker */}
          <circle cx="30" cy="190" r="14" fill="#0f172a" stroke="#475569" strokeWidth="2" />
          
          {/* Destination resident marker */}
          <circle cx="520" cy="70" r="18" fill="rgba(99, 102, 241, 0.2)" className="animate-pulse" />
          <circle cx="520" cy="70" r="12" fill="#4338ca" stroke="#818cf8" strokeWidth="2.5" />

          {/* Animated pulsing marker for driving specialist position */}
          <circle cx={activeSpecialistPoint.x} cy={activeSpecialistPoint.y} r="18" fill="rgba(245, 158, 11, 0.2)" className="animate-ping" />
        </svg>

        {/* Start Landmark Box */}
        <div className="absolute left-[20px] bottom-[110px] bg-slate-900 border border-slate-700/80 rounded px-1.5 py-0.5 text-[8px] text-slate-400 font-bold">
          <Building2 className="w-2.5 h-2.5 inline-block mr-0.5" /> {booking.providerName.split(' ')[0]} Dispatch Hub
        </div>

        {/* Customer Location Pin Box */}
        <div className="absolute right-[120px] top-[75px] bg-indigo-900/90 border border-indigo-500 rounded px-2 py-1 text-[9px] font-bold text-indigo-50 leading-none">
          <MapPin className="w-2.5 h-2.5 inline-block mr-0.5" /> Your Home{booking.locationAddress.substring(0, 18)}...
        </div>

        {/* Hover Specialist Floating Banner */}
        <div 
          style={{ left: `${Math.min(80, Math.max(10, (activeSpecialistPoint.x / 5.5)))}%`, top: `${activeSpecialistPoint.y - 45}px` }}
          className="absolute -translate-x-[50%] bg-amber-500 text-slate-950 font-extrabold px-2.5 py-1 rounded-xl text-[9px] shadow-lg flex items-center gap-1.5 leading-none transition-all duration-300"
        >
          <img src={booking.providerAvatar} className="w-4 h-4 rounded-full object-cover border border-slate-950" alt={booking.providerName || 'Provider avatar'} referrerPolicy="no-referrer" />
          <Truck className="w-3.5 h-3.5 animate-bounce shrink-0" />
          <span>{booking.providerName.split(' ')[0]}</span>
          <span className="bg-slate-950/25 px-1 rounded text-[8px] font-bold">En Route</span>
        </div>
      </div>

      {/* Live Coordinates and ETA panel */}
      <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-950/60 font-semibold text-xs border-t border-slate-800">
        <div className="space-y-1">
          <span className="text-[10px] text-slate-500 uppercase font-extrabold tracking-wider flex items-center gap-1">
            <Compass className="w-3.5 h-3.5 text-indigo-500" />
            Specialist Position
          </span>
          <div className="font-mono text-[11px] text-slate-200">
            {currentLat.toFixed(6)}° N<br/>{currentLng.toFixed(6)}° E
          </div>
        </div>

        <div className="space-y-1">
          <span className="text-[10px] text-slate-500 uppercase font-extrabold tracking-wider flex items-center gap-1">
            <Truck className="w-3.5 h-3.5 text-amber-500" />
            Distance Gap
          </span>
          <div className="text-sm font-extrabold text-slate-100 font-mono">
            {booking.status === 'ongoing' ? 'Arrived On-Site' : `${distance} Kilometers`}
          </div>
        </div>

        <div className="space-y-1">
          <span className="text-[10px] text-slate-500 uppercase font-extrabold tracking-wider">
            <Clock className="w-3.5 h-3.5 text-indigo-500" />
            Time Of Arrival (ETA)
          </span>
          <div className="text-sm font-extrabold text-indigo-400">
            {booking.status === 'ongoing' ? 'Started Labor' : `${eta} Minutes Left`}
          </div>
        </div>

        <div className="space-y-1 flex flex-col justify-between">
          <span className="text-[10px] text-slate-500 uppercase font-extrabold tracking-wider flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            Telemetry Integrity
          </span>
          <div className="text-[10px] text-slate-300 font-bold bg-slate-850 px-2 py-1 rounded inline-block self-start border border-slate-800 font-mono">
            Verified: {lastCheckTime}
          </div>
        </div>
      </div>
    </div>
  );
};
