import { Navbar } from "@/features/common/Navbar";
import { HeroSection } from "@/components/landing-page/hero-section";
import { VisualDemoSection } from "@/components/landing-page/visual-demo-section";
import { BentoFeatures } from "@/components/landing-page/bento-features";
import { WorkflowSection } from "@/components/landing-page/workflow-section";
import { UseCases } from "@/components/landing-page/use-cases-section";
import { FinalCTA } from "@/components/landing-page/final-cta";
import { Footer } from "@/components/landing-page/footer";
import { CursorSpotlight } from "@/components/landing-page/cursor-spotlight";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30">
      <CursorSpotlight />
      <Navbar />
      <main className="pt-16">
        <HeroSection />
        <VisualDemoSection />
        <BentoFeatures />
        <WorkflowSection />
        <UseCases />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
