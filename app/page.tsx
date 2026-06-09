import Header from '@/components/landing/Header';
import Hero from '@/components/landing/Hero';
import { HowItWorks, Features, Faq, CtaBand } from '@/components/landing/Sections';
import ContactSection from '@/components/landing/ContactSection';
import Footer from '@/components/landing/Footer';

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
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
