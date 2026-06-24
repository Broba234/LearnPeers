import Header from '@/components/landing/Header';
import Hero from '@/components/landing/Hero';
import { HowItWorks, Features, Faq, CtaBand } from '@/components/landing/Sections';
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
      </main>
      <Footer />
    </>
  );
}
