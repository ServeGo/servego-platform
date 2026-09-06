import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Search, Info, HelpCircle } from 'lucide-react';



export const FAQ = () => {
  const [customerSearch, setCustomerSearch] = useState('');
  const [partnerSearch, setPartnerSearch] = useState('');

  const [activeCustomerIndex, setActiveCustomerIndex] = useState(0);
  const [activePartnerIndex, setActivePartnerIndex] = useState(null);

  const customerFAQs= [
    {
      q: "How does the servego24 background check work?",
      a: "Every provider on our platform passes a strict check: Aadhaar verification, local police record clearance verification, practical skills tests, and basic service standards. We only list verified experts."
    },
    {
      q: "Can I choose my own service provider?",
      a: "Yes When you find a service, we list active experts with real ratings, prices, and reviews, allowing you to select the exact professional you want."
    },
    {
      q: "How does the accidental damage coverage work?",
      a: "We offer a complimentary protection of up to ₹10,000 for each booking. If any household fittings are accidentally damaged during the service, you can raise an instant support ticket for a quick refund or repair."
    },
    {
      q: "What is your cancellation policy?",
      a: "You can reschedule or cancel any booking up to 4 hours before the booked time without any fee. Within 4 hours, a standard ₹100 dispatch cancel payout is provided directly to the provider for their travel time."
    },
    {
      q: "When and how do I pay?",
      a: "You can pay securely online (UPI, credit cards, net banking) when creating your booking, or choose to pay cash afterward. Payment is completed only after you confirm the job is done."
    }
  ];

  const partnerFAQs= [
    {
      q: "What is the fee model on servego24?",
      a: "We charge a flat 20% on the total service fee to support app server hosting, support, and marketing. The remaining 80% goes directly to your wallet."
    },
    {
      q: "When are provider earnings settled?",
      a: "All platform earnings are transferred to your registered bank account weekly. Payments arrive every Tuesday before 11:00 AM."
    },
    {
      q: "How can I update my active areas?",
      a: "Log in to your Provider Dashboard. Under your profile settings, check or uncheck active Hyderabad zones (Gachibowli, Jubilee Hills, Kondapur, etc.) depending on your convenience."
    },
    {
      q: "Can I use helper assistants on a job?",
      a: "Only if they have successfully undergone basic registration and background checks. Bringing unvetted helpers to a job violates our trust guidelines and may get your account suspended."
    }
  ];

  const handleToggleCustomer = (idx) => {
    setActiveCustomerIndex(activeCustomerIndex === idx ? null : idx);
  };

  const handleTogglePartner = (idx) => {
    setActivePartnerIndex(activePartnerIndex === idx ? null : idx);
  };

  // Filter lists briefly
  const filteredCustomerFAQs = customerFAQs.filter(
    item => item.q.toLowerCase().includes(customerSearch.toLowerCase()) || item.a.toLowerCase().includes(customerSearch.toLowerCase())
  );

  const filteredPartnerFAQs = partnerFAQs.filter(
    item => item.q.toLowerCase().includes(partnerSearch.toLowerCase()) || item.a.toLowerCase().includes(partnerSearch.toLowerCase())
  );

  return (
    <div id="faq-page" className="bg-slate-50 min-h-screen py-12 px-4">
      <div className="max-w-5xl mx-auto">
        
        {/* Editorial Title */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-teal-750 font-extrabold uppercase tracking-wider text-xs font-mono">Platform Documentation</span>
          <h1 className="text-3xl md:text-5xl font-bold font-sans text-slate-900 mt-2 tracking-tight">
            Frequently Asked Questions
          </h1>
          <p className="text-slate-500 text-sm mt-2">
            Everything you need to know about booking services, partner requirements, and payouts.
          </p>
        </div>

        {/* Section Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          
          {/* Left Block for Customer FAQ guidelines */}
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
              <h2 className="text-xl font-bold text-teal-700 flex items-center gap-1.5 font-sans uppercase tracking-tight">
                <HelpCircle className="w-5 h-5 text-teal-600" />
                <span>Customer Assistance</span>
              </h2>
              {/* Filter */}
              <div className="bg-white border border-slate-300 rounded-xl px-2.5 py-1 flex items-center w-full sm:w-48 text-xs text-slate-800">
                <Search className="w-3.5 h-3.5 text-slate-400 mr-1.5" />
                <input 
                  type="text" 
                  placeholder="Filter customer..."
                  className="bg-transparent outline-none w-full"
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                />
              </div>
            </div>

            {filteredCustomerFAQs.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No matches. Try another question.</p>
            ) : (
              <div className="space-y-3">
                {filteredCustomerFAQs.map((faq, idx) => {
                  const collapsed = activeCustomerIndex === idx;
                  return (
                    <div 
                      key={idx}
                      className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs transition-all"
                    >
                      <button 
                        onClick={() => handleToggleCustomer(idx)}
                        className="w-full text-left p-4 flex justify-between items-center gap-4 text-slate-800 font-bold text-xs sm:text-sm hover:bg-slate-50 transition-colors"
                      >
                        <span>{faq.q}</span>
                        {collapsed ? <ChevronUp className="w-4 h-4 text-teal-700 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                      </button>

                      {collapsed && (
                        <div className="px-4 pb-4 text-slate-600 text-xs sm:text-sm leading-relaxed border-t border-slate-100/60 pt-3 bg-slate-50/50">
                          {faq.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Block for Partner FAQ guidelines */}
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
              <h2 className="text-xl font-bold text-emerald-700 flex items-center gap-1.5 font-sans uppercase tracking-tight">
                <HelpCircle className="w-5 h-5 text-emerald-500" />
                <span>Provider Guidelines</span>
              </h2>
              {/* Filter */}
              <div className="bg-white border border-slate-300 rounded-xl px-2.5 py-1 flex items-center w-full sm:w-48 text-xs text-slate-800">
                <Search className="w-3.5 h-3.5 text-slate-400 mr-1.5" />
                <input 
                  type="text" 
                  placeholder="Filter provider..."
                  className="bg-transparent outline-none w-full"
                  value={partnerSearch}
                  onChange={(e) => setPartnerSearch(e.target.value)}
                />
              </div>
            </div>

            {filteredPartnerFAQs.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No matches. Try another question.</p>
            ) : (
              <div className="space-y-3">
                {filteredPartnerFAQs.map((faq, idx) => {
                  const collapsed = activePartnerIndex === idx;
                  return (
                    <div 
                      key={idx}
                      className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs transition-all"
                    >
                      <button 
                        onClick={() => handleTogglePartner(idx)}
                        className="w-full text-left p-4 flex justify-between items-center gap-4 text-slate-800 font-bold text-xs sm:text-sm hover:bg-slate-50 transition-colors"
                      >
                        <span>{faq.q}</span>
                        {collapsed ? <ChevronUp className="w-4 h-4 text-emerald-600 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                      </button>

                      {collapsed && (
                        <div className="px-4 pb-4 text-slate-600 text-xs sm:text-sm leading-relaxed border-t border-slate-100/60 pt-3 bg-slate-50/50">
                          {faq.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Quick Help Banner card */}
        <div className="mt-16 bg-teal-50/50 rounded-2xl border border-teal-100 p-6 flex items-start gap-4">
          <Info className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
          <div className="text-xs text-teal-900">
            <h5 className="font-extrabold uppercase tracking-wide">Still stuck? Contact customer Support</h5>
            <p className="mt-1">If your specific question (e.g. payments, or booking problems) is not resolved above, please reach out directly to our dedicated helpdesk.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
