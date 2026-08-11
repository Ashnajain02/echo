import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';
import LandingEntry from './LandingEntry';
import OnThisDayShowcase from './OnThisDayShowcase';
import MusicWaveformShowcase from './MusicWaveformShowcase';
import EncryptionAnimation from './EncryptionAnimation';
import ContactSection from './ContactSection';
import { landingEntries } from '@/data/landingEntries';
import { DemoModeProvider } from '@/contexts/DemoModeContext';

const LandingPage: React.FC = () => {
  return (
    <DemoModeProvider>
    <div className="min-h-screen bg-background">
      {/* Hero — minimal, above the fold */}
      <section className="h-screen flex flex-col items-center justify-center relative px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="absolute top-6 right-6"
        >
          <Link to="/auth">
            <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
              Sign In
            </Button>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-center"
        >
          <h1 className="font-display text-8xl md:text-[10rem] font-normal text-foreground tracking-tight leading-none flex justify-center">
            {'Echo'.split('').map((letter, i) => (
              <motion.span
                key={i}
                className="inline-block"
                animate={{ y: [0, -8, 0, 6, 0] }}
                transition={{
                  duration: 4 + i * 0.6,
                  delay: 1.2 + i * 0.3,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                {letter}
              </motion.span>
            ))}
          </h1>
          <p className="mt-4 text-lg text-muted-foreground/70">
            A JOURNALING EXPERIENCE
          </p>
          <div className="mt-10">
            <Link to="/auth?tab=signup">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-8 py-3 text-base">
                Start Writing
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="absolute bottom-10 flex flex-col items-center gap-1.5"
        >
          <span className="text-xs tracking-widest uppercase text-foreground/60 font-medium">Scroll to explore</span>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <ChevronDown className="h-6 w-6 text-foreground/50" />
          </motion.div>
        </motion.div>
      </section>

      {/* Demo entries — vertical scroll, each roughly full viewport.
          Only the first is a realistic journal entry; every other feature
          gets its own bespoke showcase (OnThisDayShowcase,
          MusicWaveformShowcase, EncryptionAnimation) rather than pretending
          to be an entry. */}
      <LandingEntry entry={landingEntries[0]} />
      <OnThisDayShowcase />
      <MusicWaveformShowcase />

      {/* Encryption animation — "Your thoughts are always protected" already
          demonstrates encryption on its own; no separate mock entry needed. */}
      <EncryptionAnimation />

      {/* Final CTA */}
      <section className="py-12 text-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="font-display text-4xl md:text-5xl font-normal text-foreground tracking-tight mb-6">
            Start your journal
          </h2>
          <Link to="/auth?tab=signup">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-10 py-3 text-base">
              Begin Writing
            </Button>
          </Link>
          <p className="mt-4 text-sm text-muted-foreground/50">
            Free forever
          </p>
        </motion.div>
      </section>

      {/* Contact */}
      <ContactSection />
    </div>
    </DemoModeProvider>
  );
};

export default LandingPage;
