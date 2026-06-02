import Navbar from './components/Navbar/Navbar';
import Hero from './components/Hero/Hero';
import PopularServices from './components/PopularServices/PopularServices';
import WhyChoose from './components/WhyChoose/WhyChoose';
import HowItWorks from './components/HowItWorks/HowItWorks';
import Testimonials from './components/Testimonials/Testimonials';
import PartnerCTA from './components/PartnerCTA/PartnerCTA';
import Footer from './components/Footer/Footer';
import './App.css';

function App() {
  return (
    <div className="app">
      <Navbar/>
      <Hero />
      <PopularServices />
      <WhyChoose />
      <HowItWorks />
      <Testimonials />
      <PartnerCTA />
      <Footer />
    </div>
  );
}

export default App;


