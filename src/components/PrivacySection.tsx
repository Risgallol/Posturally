import { Card } from "@/components/ui/card";
import { 
  Server, 
  HardDrive, 
  Eye,
  Shield
} from "lucide-react";

const privacyFeatures = [
  {
    icon: HardDrive,
    title: "On-Device Processing",
    description: "Your webcam is used to analyze posture, but every frame is processed locally on your computer—never uploaded."
  },
  {
    icon: Server,
    title: "No Image Uploads",
    description: "We never send photos or video to the cloud. What your camera sees stays entirely on your device."
  },
  {
    icon: Eye,
    title: "Privacy by Design",
    description: "Posturally is built with privacy at its core. Frames are analyzed in real time, nothing is stored, uploaded, or shared—what your camera sees stays with you."
  },
  {
    icon: Shield,
    title: "Full Control",
    description: "You’re always in charge. Start, pause, or stop posture tracking at any time with a single click."
  }
];

const PrivacySection = () => {
  return (
    <section className="py-24 bg-primary/5">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-5xl font-bold text-foreground">
              Your Privacy is
              <span className="block text-primary">Our Priority</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              We believe your personal data should stay personal. That’s why Posturally runs entirely on your device.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {privacyFeatures.map((feature, index) => (
              <Card 
                key={index}
                className="p-6 bg-card border-border/50 hover:shadow-medium transition-smooth"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-health-success/10 flex items-center justify-center flex-shrink-0">
                    <feature.icon className="w-6 h-6 text-health-success" />
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-card-foreground">
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
      </div>
    </section>
  );
};

export default PrivacySection;
