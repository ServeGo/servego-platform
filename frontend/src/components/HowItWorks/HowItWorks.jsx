import React from 'react';
import './HowItWorks.css';

const steps = [
  {
    id: 1,
    icon: '🔍',
    title: 'Choose a Service',
    description: 'Browse and select the service you need from our wide range of options.',
    number: '01'
  },
  {
    id: 2,
    icon: '📅',
    title: 'Book a Professional',
    description: 'Pick your preferred time slot and get matched with a verified expert.',
    number: '02'
  },
  {
    id: 3,
    icon: '✅',
    title: 'Get the Job Done',
    description: 'Service professional arrives, completes the work, and you pay securely.',
    number: '03'
  }
];

const HowItWorks = () => {
  return (
    <section className="how-it-works">
      <div className="hiw-container">
        <div className="section-header">
          <h2 className="section-title">How It Works</h2>
          <p className="section-subtitle">
            Three simple steps to get your service done
          </p>
        </div>

        <div className="steps-container">
          {steps.map((step, index) => (
            <div key={step.id} className="step-card">
              <div className="step-number">{step.number}</div>
              <div className="step-icon">{step.icon}</div>
              <h3 className="step-title">{step.title}</h3>
              <p className="step-description">{step.description}</p>
              {index < steps.length - 1 && (
                <div className="step-arrow">→</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
