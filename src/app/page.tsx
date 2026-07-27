import { ContactSection } from "@/components/landing/contact-section";
import { Footer } from "@/components/landing/footer";
import { Hero } from "@/components/landing/hero";
import { Navigation } from "@/components/landing/navigation";
import { ProcessSection } from "@/components/landing/process-section";
import { ServicesSection } from "@/components/landing/services-section";
import { TrustStrip } from "@/components/landing/trust-strip";

export default function HomePage() {
  return (
    <>
      <Navigation />
      <main>
        <Hero />
        <TrustStrip />
        <ProcessSection />
        <ServicesSection />
        <ContactSection />
      </main>
      <Footer />
    </>
  );
}
