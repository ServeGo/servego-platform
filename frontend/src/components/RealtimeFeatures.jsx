import React from 'react';
import { BellRing, MapPin, MessageSquare, LifeBuoy } from 'lucide-react';

const FEATURES = [
  {
    icon: BellRing,
    title: 'Instant notifications',
    desc: 'Booking and lead updates, payment status, and support responses — pushed to your inbox in real time.',
  },
  {
    icon: MapPin,
    title: 'Live tracking & ETA',
    desc: 'Follow the specialist on the map with on-the-way and arrived updates, route, and arrival estimate.',
  },
  {
    icon: MessageSquare,
    title: 'Booking chat',
    desc: 'Message the specialist directly on the booking thread and keep a written record of the job.',
  },
  {
    icon: LifeBuoy,
    title: 'Admin-backed support',
    desc: 'Raise a ticket from your dashboard — the team responds and closes it with a reply.',
  },
];

export default function RealtimeFeatures() {
  return (
    <section className="py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-teal-700 font-bold uppercase tracking-[0.25em] text-[11px]">Always in the loop</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">Real-time updates on every job</h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-1.5 font-semibold">
            From the moment your request is broadcast until the job is complete, every change lands on your dashboard and inbox instantly.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURES.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ icon: Icon, title, desc }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:-translate-y-1 hover:shadow-lg transition-all">
      <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-500/10">
        <Icon className="w-6 h-6" />
      </div>
      <h4 className="text-sm font-bold text-slate-900 mt-4">{title}</h4>
      <p className="text-slate-500 text-xs mt-2 leading-relaxed font-semibold">{desc}</p>
    </div>
  );
}
