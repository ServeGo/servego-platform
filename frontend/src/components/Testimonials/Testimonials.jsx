import React from 'react';
import './Testimonials.css';

const testimonials = [
  {
    id: 1,
    name: 'Priya Sharma',
    role: 'Homeowner',
    rating: 5,
    review: 'Excellent service! The electrician arrived on time and fixed all our issues professionally. Highly recommended!',
    image: 'https://randomuser.me/api/portraits/women/1.jpg'
  },
  {
    id: 2,
    name: 'Rahul Verma',
    role: 'Business Owner',
    rating: 5,
    review: 'Best platform for home services. The plumber was very skilled and the pricing was transparent. Will use again.',
    image: 'https://randomuser.me/api/portraits/men/2.jpg'
  },
  {
    id: 3,
    name: 'Neha Gupta',
    role: 'IT Professional',
    rating: 5,
    review: 'Amazing experience with AC repair service. Quick booking, professional staff, and quality work. 5 stars!',
    image: 'https://randomuser.me/api/portraits/women/3.jpg'
  }
];

const Testimonials = () => {
  return (
    <section className="testimonials">
      <div className="testimonials-container">
        <div className="section-header">
          <h2 className="section-title">What Our Customers Say</h2>
          <p className="section-subtitle">
            Trusted by thousands of happy customers
          </p>
        </div>

        <div className="testimonials-grid">
          {testimonials.map(testimonial => (
            <div key={testimonial.id} className="testimonial-card">
              <div className="quote-icon">"</div>
              <p className="testimonial-text">{testimonial.review}</p>
              <div className="testimonial-footer">
                <img 
                  src={testimonial.image} 
                  alt={testimonial.name} 
                  className="testimonial-image"
                />
                <div>
                  <h4 className="testimonial-name">{testimonial.name}</h4>
                  <p className="testimonial-role">{testimonial.role}</p>
                  <div className="rating">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <span key={i} className="star">★</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
