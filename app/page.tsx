import Header from "./_components/header";
import Hero from "./_components/hero";
import Features from "./_components/Features";
import HowItWorks from "./_components/HowItWorks";
import Testimonials from "./_components/Testimonials";
import Footer from "./_components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      {/* Fixed Navbar */}
      <Header />

      {/* Hero Section */}
      <Hero />
      {/* Features Grid */}
      <Features />

      {/* How It Works */}
      <HowItWorks />

      {/* Testimonials */}
      <Testimonials />

      {/* Footer */}
      <Footer />
    </div>
  );
}
