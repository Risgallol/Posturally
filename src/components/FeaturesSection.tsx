import { Card } from "@/components/ui/card";
import { 
  Camera, 
  Shield, 
  Timer, 
  Bell, 
  Eye, 
  Cpu,
  Settings,
  Monitor
} from "lucide-react";

const features = [
  {
    icon: Camera,
    title: "Real-time Posture Monitoring",
    description: "Stay upright while you work. Your posture is continuously tracked through your webcam, with subtle nudges to bring you back on track when you start to slouch.",
    color: "text-primary"
  },
  {
    icon: Shield,
    title: "100% Private & Local",
    description: "Everything runs directly on your device. Nothing is uploaded or stored online—your posture data stays with you.",
    color: "text-health-success"
  },
  {
    icon: Timer,
    title: "Smart Timing Controls",
    description: "Fine-tune how quickly nudges appear. Set the sensitivity and reminder delays that best match your workflow.",
    color: "text-secondary"
  },
  {
    icon: Bell,
    title: "Gentle Alerts",
    description: "Stay focused without disruption. Choose between soft sounds or small visual reminders that encourage you to sit tall.",
    color: "text-health-warning"
  },
  {
    icon: Eye,
    title: "Head Direction Awareness",
    description: "Not just your back—keep your neck in check too. Get reminded when your head drifts away from your screen to prevent strain.",
    color: "text-primary"
  },
  {
    icon: Cpu,
    title: "Simple Calibration",
    description: "Set your healthy posture in one step. Sit upright, click calibrate, and the app learns your baseline instantly.",
    color: "text-health-success"
  },
  {
    icon: Monitor,
    title: "Mini View",
    description: "Keep monitoring active in a compact status window, so posture tracking continues even while you multitask.",
    color: "text-secondary"
  },
  {
    icon: Settings,
    title: "Fully Customizable",
    description: "Personalize everything—sensitivity, timing, and alerts—to fit your routine and comfort.",
    color: "text-muted-foreground"
  }
];


const FeaturesSection = () => {
  return (
    <section id="features" className="py-24 bg-muted/30">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-3xl md:text-5xl font-bold text-foreground">
            Powerful Features for
            <span className="block text-primary">Better Health</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Everything you need to maintain perfect posture throughout your workday —
            with privacy and ease as our top priorities.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card 
              key={index}
              className="p-6 bg-gradient-card border-border/50 hover:shadow-medium transition-smooth group cursor-pointer animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-lg bg-gradient-feature flex items-center justify-center group-hover:scale-110 transition-bounce">
                  <feature.icon className={`w-6 h-6 ${feature.color}`} />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-card-foreground group-hover:text-primary transition-smooth">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
