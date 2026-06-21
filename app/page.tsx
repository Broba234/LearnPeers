import Header from '@/components/landing/Header';
import Hero from '@/components/landing/Hero';
import SocialProof from '@/components/landing/SocialProof';
import { HowItWorks, Features, Faq, CtaBand } from '@/components/landing/Sections';
import ContactSection from '@/components/landing/ContactSection';
import Footer from '@/components/landing/Footer';

// The social-proof band reads live data from the DB, so render this route
// dynamically rather than statically prerendering at build time.
export const dynamic = 'force-dynamic';

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <SocialProof />
        <HowItWorks />
        <Features />
        <Faq />
        <CtaBand />
        <ContactSection />
      </main>
      <Footer />
    </>
  );
}
