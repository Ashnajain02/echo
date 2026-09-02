import React from 'react';
import { cn } from '@/lib/utils';

/**
 * The drawn envelope — body, folded flap, wax seal — shared by every place
 * a sealed letter shows up as a live React component (the in-editor
 * composer once sealed, the open trigger, the arrival banner). The one
 * place this ISN'T used is futureLetterNode.ts's read-only fallback markup,
 * which has to be a DOM-output-spec array rather than JSX — keep that one
 * in sync by hand if this changes.
 */
export const FutureLetterEnvelope: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 64 48" className={cn('future-letter-envelope-svg', className)} aria-hidden="true">
    <rect x="2" y="2" width="60" height="44" rx="3" className="future-letter-envelope-body" />
    <path d="M2,2 L62,2 L32,26 Z" className="future-letter-envelope-flap" />
    <circle cx="32" cy="24" r="3.5" className="future-letter-envelope-seal" />
  </svg>
);

export default FutureLetterEnvelope;
