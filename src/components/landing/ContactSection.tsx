import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Mail } from 'lucide-react';

const CONTACT_EMAIL = 'ashnajain02@gmail.com';

const ContactSection: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const lines = [
      message.trim(),
      '',
      '—',
      name && `From: ${name}`,
      email && `Reply-to: ${email}`,
    ].filter(Boolean);

    const finalSubject = subject.trim() || 'Echo — message from the contact form';
    const body = lines.join('\n');

    const mailto =
      `mailto:${CONTACT_EMAIL}` +
      `?subject=${encodeURIComponent(finalSubject)}` +
      `&body=${encodeURIComponent(body)}`;

    window.location.href = mailto;
  };

  const canSubmit = message.trim().length > 0;

  return (
    <section id="contact" className="py-28 md:py-36 px-6 border-t border-border/40">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <p className="text-xs tracking-[0.4em] uppercase text-muted-foreground/60 mb-4">
            Contact
          </p>
          <h2 className="font-display text-4xl md:text-5xl font-normal text-foreground tracking-tight mb-4">
            Get in touch
          </h2>
          <p className="font-display italic text-lg md:text-xl text-muted-foreground/80 max-w-xl mx-auto leading-relaxed">
            Questions, feedback, bug reports — all welcome. I read every message.
          </p>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label
                htmlFor="contact-name"
                className="block text-xs tracking-widest uppercase text-muted-foreground/60 mb-2"
              >
                Name
              </label>
              <Input
                id="contact-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                autoComplete="name"
                className="bg-card/50 border-border/60"
              />
            </div>
            <div>
              <label
                htmlFor="contact-email"
                className="block text-xs tracking-widest uppercase text-muted-foreground/60 mb-2"
              >
                Email
              </label>
              <Input
                id="contact-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                autoComplete="email"
                className="bg-card/50 border-border/60"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="contact-subject"
              className="block text-xs tracking-widest uppercase text-muted-foreground/60 mb-2"
            >
              Subject
            </label>
            <Input
              id="contact-subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="What is this about?"
              className="bg-card/50 border-border/60"
            />
          </div>

          <div>
            <label
              htmlFor="contact-message"
              className="block text-xs tracking-widest uppercase text-muted-foreground/60 mb-2"
            >
              Message
            </label>
            <Textarea
              id="contact-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write what’s on your mind…"
              rows={6}
              className="bg-card/50 border-border/60 resize-none"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-center sm:justify-between gap-4 pt-2">
            <p className="text-xs text-muted-foreground/60">
              Submitting opens your mail app addressed to{' '}
              <span className="text-muted-foreground">{CONTACT_EMAIL}</span>.
            </p>
            <Button
              type="submit"
              disabled={!canSubmit}
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-8 py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send message
            </Button>
          </div>
        </motion.form>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-12 pt-10 border-t border-border/30 flex flex-col sm:flex-row items-center justify-center gap-3 text-sm text-muted-foreground/70"
        >
          <Mail className="h-4 w-4" />
          <span>Or email directly at</span>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="editorial-link text-foreground hover:text-foreground"
          >
            {CONTACT_EMAIL}
          </a>
        </motion.div>
      </div>
    </section>
  );
};

export default ContactSection;
