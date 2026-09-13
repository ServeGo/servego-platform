import React from 'react';
import { ClipboardCheck, ShieldCheck, Wrench, Eye, ThumbsUp } from 'lucide-react';
import { AUDIT_IMAGES } from './homeImages';

const STAGES = [
  {
    icon: ClipboardCheck,
    title: 'Background Verification',
    desc: 'Every specialist undergoes identity & background checks before onboarding.',
  },
  {
    icon: Wrench,
    title: 'Skills Assessment',
    desc: 'Hands-on evaluation of technical ability and domain expertise.',
  },
  {
    icon: ShieldCheck,
    title: 'Safety Compliance',
    desc: 'Safety protocols, tool hygiene, and protective equipment standards.',
  },
  {
    icon: Eye,
    title: 'On-Job Supervision',
    desc: 'Periodic quality checks during initial jobs via customer feedback.',
  },
  {
    icon: ThumbsUp,
    title: 'Ongoing Rating',
    desc: 'Continuous performance tracking with customer ratings and reviews.',
  },
];

export default function QualityAudit() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
      {/* Header */}
      <div className="text-center mb-12">
        <span className="text-teal-700 font-bold uppercase tracking-[0.2em] text-[11px]">
          Trust & Quality
        </span>
        <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
          Our 5-Stage Professional <span className="text-teal-700">Quality Audit</span>
        </h2>
        <p className="mt-3 text-sm text-slate-500 max-w-xl mx-auto">
          Every specialist on our platform goes through a rigorous 5-stage vetting process 
          before they serve your home.
        </p>
      </div>

      {/* Stages */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-5">
        {STAGES.map((stage, idx) => {
          const Icon = stage.icon;
          return (
            <div
              key={idx}
              className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white hover:border-teal-300 hover:shadow-lg transition-all"
            >
              {/* Image top */}
              <div className="h-28 sm:h-36 overflow-hidden">
                <img
                  src={AUDIT_IMAGES[idx]}
                  alt={stage.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
              </div>
              {/* Content */}
              <div className="p-3 sm:p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 rounded-full bg-teal-700 text-white text-[10px] font-extrabold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <Icon className="w-4 h-4 text-teal-700" />
                </div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                  {stage.title}
                </h4>
                <p className="text-[10px] sm:text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">
                  {stage.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
