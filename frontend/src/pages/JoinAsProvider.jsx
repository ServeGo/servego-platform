import React from 'react';
import {
  CheckCircle2, Briefcase, Wallet, MapPin, Star, ShieldCheck,
  ArrowRight, Zap, Users, TrendingUp, Clock
} from 'lucide-react';
import { useSEO } from '../hooks/useSEO';
import { JOIN_PROVIDER_SEO } from '../data/seoRoutes';

const JOIN_SCHEMA = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebPage',
      '@id': 'https://servego24.com/join-as-provider#webpage',
      url: 'https://servego24.com/join-as-provider',
      name: 'Join ServeGo24 as a Service Provider – Earn More, Work Locally',
      description:
        'Register as an electrician, plumber, AC technician, cleaner or other home-service professional on ServeGo24. Get local job leads, transparent earnings and flexible working hours.',
      breadcrumb: {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://servego24.com/' },
          { '@type': 'ListItem', position: 2, name: 'Join as Provider', item: 'https://servego24.com/join-as-provider' },
        ],
      },
    },
    {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'How do I register as a service provider on ServeGo24?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Click "Register Now", fill in your details, select your service category, and submit. Our team reviews your profile and approves verified professionals within 24–48 hours.',
          },
        },
        {
          '@type': 'Question',
          name: 'How much does ServeGo24 charge service providers?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'ServeGo24 charges a flat 20% platform fee on completed jobs. You keep 80% of every booking — paid directly to your wallet weekly.',
          },
        },
        {
          '@type': 'Question',
          name: 'What services can I offer on ServeGo24?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'You can offer electrical work, plumbing, AC repair and service, home cleaning, carpentry, painting, CCTV installation, appliance repair, and more.',
          },
        },
        {
          '@type': 'Question',
          name: 'When do I get paid?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Earnings are settled to your registered bank account every Tuesday before 11:00 AM.',
          },
        },
      ],
    },
  ],
};

const SERVICES = [
  'Electrician', 'Plumber', 'AC Technician', 'Home Cleaner',
  'Carpenter', 'Painter', 'CCTV Technician', 'Appliance Repair',
  'RO / Water Purifier', 'Other Home Services',
];

const STEPS = [
  { step: '01', title: 'Register', desc: 'Create your professional account in under 2 minutes.' },
  { step: '02', title: 'Select Service', desc: 'Choose the services you offer and your working area.' },
  { step: '03', title: 'Get Verified', desc: 'Our team reviews your profile and approves you.' },
  { step: '04', title: 'Go Online & Earn', desc: 'Accept nearby job leads and start earning.' },
];

const BENEFITS = [
  { icon: Wallet, title: 'Keep 80% of Every Job', desc: 'Transparent earnings — no hidden deductions. Weekly payouts to your bank.' },
  { icon: MapPin, title: 'Work Near You', desc: 'Only receive leads within your chosen service radius. No long-distance travel.' },
  { icon: Clock, title: 'Flexible Hours', desc: 'Set your own availability. Work when you want, take breaks when you need.' },
  { icon: TrendingUp, title: 'Grow Your Reputation', desc: 'Build a verified profile with real customer reviews and ratings.' },
  { icon: Zap, title: 'Fast Lead Delivery', desc: 'Get notified instantly when a customer near you needs your service.' },
  { icon: Users, title: 'Dedicated Support', desc: 'Our team is available to help you with any platform or job-related queries.' },
];

const FAQS = [
  {
    q: 'How do I register as a service provider on ServeGo24?',
    a: 'Click "Register Now", fill in your details, select your service category, and submit. Our team reviews your profile and approves verified professionals within 24–48 hours.',
  },
  {
    q: 'How much does ServeGo24 charge service providers?',
    a: 'ServeGo24 charges a flat 20% platform fee on completed jobs. You keep 80% of every booking — paid directly to your wallet weekly.',
  },
  {
    q: 'What services can I offer on ServeGo24?',
    a: 'You can offer electrical work, plumbing, AC repair and service, home cleaning, carpentry, painting, CCTV installation, appliance repair, and more.',
  },
  {
    q: 'When do I get paid?',
    a: 'Earnings are settled to your registered bank account every Tuesday before 11:00 AM.',
  },
  {
    q: 'Do I need to pay anything to join?',
    a: 'No upfront fee. Registration is free. ServeGo24 only earns when you earn — a 20% platform fee on completed jobs.',
  },
  {
    q: 'What areas does ServeGo24 currently operate in?',
    a: 'ServeGo24 is currently live in Hyderabad, covering areas like Gachibowli, Madhapur, Jubilee Hills, Banjara Hills, Kondapur, Kukatpally, Begumpet and Secunderabad.',
  },
];

export function JoinAsProvider({ onNavigate }) {
  useSEO({
    title: JOIN_PROVIDER_SEO.title,
    description: JOIN_PROVIDER_SEO.description,
    path: JOIN_PROVIDER_SEO.path,
    schema: JOIN_SCHEMA,
  });

  return (
    <div id="join-provider-page" className="bg-slate-50 min-h-screen">

      {/* Hero */}
      <section className="bg-slate-900 text-white py-16 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,#0f766e_0%,transparent_55%)] opacity-40 pointer-events-none" />
        <div className="relative max-w-4xl mx-auto text-center">
          <nav aria-label="Breadcrumb" className="mb-6">
            <ol className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-medium">
              <li><button onClick={() => onNavigate('home')} className="hover:text-white transition-colors">Home</button></li>
              <li aria-hidden="true" className="text-slate-600">/</li>
              <li className="text-slate-300" aria-current="page">Join as Provider</li>
            </ol>
          </nav>
          <span className="inline-block bg-teal-600/20 border border-teal-500/30 text-teal-300 text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-4">
            For Service Professionals
          </span>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight">
            Grow Your Service Business<br />
            <span className="text-teal-400">with ServeGo24</span>
          </h1>
          <p className="mt-4 text-slate-300 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
            Join hundreds of verified electricians, plumbers, AC technicians, cleaners and other home-service professionals earning locally in Hyderabad. Get job leads near you, keep 80% of every booking, and work on your own schedule.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => onNavigate('signup')}
              className="bg-teal-600 hover:bg-teal-500 text-white font-bold px-8 py-3.5 rounded-xl text-sm transition-all shadow-lg flex items-center gap-2"
            >
              Register Now — It's Free
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onNavigate('login')}
              className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold px-6 py-3.5 rounded-xl text-sm transition-all"
            >
              Already registered? Sign In
            </button>
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400 font-medium">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-teal-400" /> Free to join</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-teal-400" /> Keep 80% earnings</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-teal-400" /> Weekly payouts</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-teal-400" /> Work near you</span>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-14 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">How It Works</h2>
            <p className="text-slate-500 text-sm mt-2">Start receiving local job leads in 4 simple steps.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map(({ step, title, desc }) => (
              <div key={step} className="bg-slate-50 rounded-2xl border border-slate-200 p-5 text-center">
                <span className="text-3xl font-black text-teal-600/30">{step}</span>
                <h3 className="text-sm font-extrabold text-slate-900 mt-2">{title}</h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-14 px-4 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Why Professionals Choose ServeGo24</h2>
            <p className="text-slate-500 text-sm mt-2">Built for local service professionals who want steady work and fair pay.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {BENEFITS.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mb-3">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-extrabold text-slate-900">{title}</h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services you can offer */}
      <section className="py-14 px-4 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight mb-3">Services You Can Offer</h2>
          <p className="text-slate-500 text-sm mb-8">ServeGo24 supports a wide range of home and local services.</p>
          <div className="flex flex-wrap justify-center gap-2.5">
            {SERVICES.map((s) => (
              <span key={s} className="bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold px-4 py-2 rounded-full">
                {s}
              </span>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-4 font-medium">Don't see your service? Register and our team will review your category.</p>
        </div>
      </section>

      {/* Trust signals */}
      <section className="py-14 px-4 bg-slate-900 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-extrabold tracking-tight mb-2">Trusted by Professionals in Hyderabad</h2>
          <p className="text-slate-400 text-sm mb-10">Real numbers from our growing provider community.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {[
              { value: '200+', label: 'Registered Professionals' },
              { value: '4,500+', label: 'Jobs Completed' },
              { value: '4.85★', label: 'Average Provider Rating' },
              { value: '80%', label: 'Earnings You Keep' },
            ].map(({ value, label }) => (
              <div key={label} className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <p className="text-2xl font-black text-teal-400">{value}</p>
                <p className="text-xs text-slate-400 mt-1 font-medium">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Verification process */}
      <section className="py-14 px-4 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Our Verification Process</h2>
            <p className="text-slate-500 text-sm mt-2">We verify every professional to maintain quality and customer trust.</p>
          </div>
          <div className="space-y-3">
            {[
              { icon: ShieldCheck, title: 'Identity Verification', desc: 'Aadhaar-based identity check to confirm you are who you say you are.' },
              { icon: Briefcase, title: 'Skills Assessment', desc: 'Practical skills review for your service category.' },
              { icon: Star, title: 'Profile Approval', desc: 'Admin reviews your profile before you go live on the platform.' },
              { icon: CheckCircle2, title: 'Ongoing Quality Monitoring', desc: 'Customer ratings and reviews keep the platform quality high for everyone.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-4 bg-slate-50 rounded-xl border border-slate-200 p-4">
                <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                  <Icon className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">{title}</h3>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-14 px-4 bg-slate-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight text-center mb-8">Provider FAQs</h2>
          <div className="space-y-3">
            {FAQS.map(({ q, a }) => (
              <div key={q} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <h3 className="text-sm font-extrabold text-slate-900">{q}</h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-14 px-4 bg-teal-700 text-white text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">Ready to Start Earning?</h2>
          <p className="text-teal-100 text-sm mt-2 mb-8">
            Join ServeGo24 today. Registration is free and takes less than 2 minutes.
          </p>
          <button
            onClick={() => onNavigate('signup')}
            className="bg-white text-teal-700 hover:bg-teal-50 font-extrabold px-8 py-3.5 rounded-xl text-sm transition-all shadow-lg inline-flex items-center gap-2"
          >
            Register as a Professional
            <ArrowRight className="w-4 h-4" />
          </button>
          <p className="text-teal-200 text-xs mt-4 font-medium">
            Questions? Call us: <a href="tel:18004102026" className="underline font-bold">1800-410-2026</a>
          </p>
        </div>
      </section>

    </div>
  );
}
