import React, { useState } from 'react';
import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { FutureLetterEnvelope } from './future-letters/FutureLetterEnvelope';

/**
 * The live, in-document view for a futureLetter node while the editor is
 * mounted — an inline composer that collapses into a small, quiet envelope
 * mark once the user seals it. See futureLetterNode.ts for the read-only
 * fallback markup used when there's no editor around (InteractiveContent).
 */
const FutureLetterNodeView: React.FC<NodeViewProps> = ({ node, updateAttributes, deleteNode }) => {
  const { message, sealed } = node.attrs as { message: string; sealed: boolean };
  const [draft, setDraft] = useState(message || '');

  const handleSeal = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    updateAttributes({ message: trimmed, sealed: true });
  };

  if (sealed) {
    return (
      <NodeViewWrapper className="future-letter-envelope-wrap" contentEditable={false} data-drag-handle>
        <FutureLetterEnvelope />
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper className="future-letter-composer" contentEditable={false}>
      <div className="future-letter-composer-header">
        <span aria-hidden="true">✉</span>
        <span>Write a letter to your future self</span>
      </div>
      <Textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="You are smart and strong..."
        className="future-letter-composer-textarea"
        maxLength={500}
        autoFocus
      />
      <div className="future-letter-composer-actions">
        <Button type="button" variant="ghost" size="sm" onClick={() => deleteNode()}>
          Cancel
        </Button>
        <Button type="button" size="sm" onClick={handleSeal} disabled={!draft.trim()}>
          Seal it
        </Button>
      </div>
    </NodeViewWrapper>
  );
};

export default FutureLetterNodeView;
