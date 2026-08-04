import Header from '@/components/landing/Header';
import Hero from '@/components/landing/Hero';
import LiveTutorsBadge from '@/components/landing/LiveTutorsBadge';
import { HowItWorks, Features, Faq, CtaBand } from '@/components/landing/Sections';
import Footer from '@/components/landing/Footer';

export const revalidate = 60; // keep the live-tutors count fresh without going fully dynamic

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero liveTutorsSlot={<LiveTutorsBadge />} />
        <HowItWorks />
        <Features />
        <Faq />
        <CtaBand />
      </main>
      <Footer />
    </>
  );
}
