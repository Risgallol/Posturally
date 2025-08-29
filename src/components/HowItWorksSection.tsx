import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Camera,
  Settings,
  Monitor,
  ArrowRight,
  PictureInPicture2
} from "lucide-react";
import { Link } from "react-router-dom";  // ✅ Import Link

const steps = [
  {
    icon: Camera,
    title: "Start Your Camera",
    description:
      "Click “Start Camera”. Make sure both shoulders and your head are visible in the frame.",
    step: "01",
  },
  {
    icon: Settings,
    title: "Calibrate Your Posture",
    description:
      "Sit upright comfortably, then click “Calibrate”. This sets your personal good-posture baseline.",
    step: "02",
  },
  {
    icon: PictureInPicture2,
    title: "Keep Active",
    description:
      "Click “Keep active” to open the mini status window. Monitoring continues—even when you switch tabs or apps.",
    step: "03",
  },
  {
    icon: Monitor,
    title: "Work Naturally",
    description:
      "Carry on with your tasks. The app quietly tracks posture and head direction, giving gentle reminders if you start to slouch or look away too long.",
    step: "04",
  },
];

const HowItWorksSection = () => {
  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-3xl md:text-5xl font-bold text-foreground">
            How It Works
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Get started in minutes—simple setup, clear feedback, and a mini window to keep monitoring active while you work.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {steps.map((step, index) => (
            <div key={index} className="relative group">
              <Card className="p-6 bg-gradient-card border-border/50 hover:shadow-medium transition-smooth h-full">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-lg bg-gradient-feature flex items-center justify-center">
                      <step.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="text-2xl font-bold text-primary/20 group-hover:text-primary/40 transition-smooth">
                      {step.step}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-card-foreground">
                      {step.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              </Card>

              {/* Arrow connector for desktop */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                  <ArrowRight className="w-6 h-6 text-primary/30" />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="text-center">
          <Card className="inline-block p-8 bg-gradient-feature border-primary/20">
            <div className="space-y-4">
              <h3 className="text-2xl font-bold text-foreground">
                Ready to Improve Your Posture?
              </h3>
              <p className="text-muted-foreground">
                
              </p>
              <Link to="/app">
                <Button variant="hero" size="lg" className="text-lg px-8">
                  <Camera className="w-5 h-5" />
                  Launch Posturally
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
