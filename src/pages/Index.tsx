import PosturaHeaderLanding from "@/components/PosturaHeaderLanding";
import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import PrivacySection from "@/components/PrivacySection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <PosturaHeaderLanding />

      {/* Product (use hero as product intro) */}
      <section id="product">
        <HeroSection />
      </section>

      {/* Features */}
      <section id="features">
        <FeaturesSection />
      </section>

      {/* How It Works */}
      <section id="how-it-works">
        <HowItWorksSection />
      </section>

      {/* Privacy */}
      <section id="privacy">
        <PrivacySection />
      </section>

      <Footer />
    </div>
  );
};

export default Index;
