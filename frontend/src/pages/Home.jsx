import React from 'react';
import Hero from '../components/Hero/Hero';
import PopularServices from '../components/PopularServices/PopularServices';
import WhyChoose from '../components/WhyChoose/WhyChoose';
import HowItWorks from '../components/HowItWorks/HowItWorks';
import Testimonials from '../components/Testimonials/Testimonials';
import PartnerCTA from '../components/PartnerCTA/PartnerCTA';

const Home = () => {
  return (
    <>
      <Hero />
      <PopularServices />
      <WhyChoose />
      <HowItWorks />
      <Testimonials />
      <PartnerCTA />
    </>
  );
};

export default Home;
