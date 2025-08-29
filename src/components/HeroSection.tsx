import { Button } from "@/components/ui/button";
import { Camera, Shield, Zap, Monitor } from "lucide-react";
import { Link } from "react-router-dom";
import heroVideo from "@/assets/Posturavid.mp4";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center bg-gradient-hero overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-hero opacity-95" />
      <div className="absolute top-20 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse-soft" />
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="text-center lg:text-left space-y-8 animate-fade-in">
            <div className="space-y-4">
              <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight">
                Perfect Your
                <span className="block bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                  Posture
                </span>
                Naturally
              </h1>
              <p className="text-xl text-blue-100 max-w-lg mx-auto lg:mx-0">
                Gentle nudges remind you to sit upright. Runs fully on your browser — no downloads, no uploads, no privacy concerns.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link to="/app">
                <Button variant="hero" size="lg" className="text-lg px-8">
                  <Camera className="w-5 h-5" />
                  Try It Now
                </Button>
              </Link>

              {/* Secondary button → smooth-scroll to Features */}
              <a href="#features">
                <Button
                  variant="outline"
                  size="lg"
                  className="text-lg px-8 border-white/30 text-white bg-white/10 hover:bg-white/20 hover:text-white"
                >
                  Learn More
                </Button>
              </a>
            </div>

            <div className="flex items-center justify-center lg:justify-start gap-8 text-sm text-blue-100">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                100% Private
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Real-time Nudges
              </div>
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4" />
                Stay Focused
              </div>
            </div>
          </div>

          {/* Hero Video */}
          <div className="relative animate-fade-in">
            <div className="relative">
              <video
                src={heroVideo}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-auto rounded-2xl shadow-strong"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
