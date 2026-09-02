import React, { useEffect, useState, useCallback } from 'react';
import { JournalEntry } from '@/types';
import JournalEditorContainer from './journal/JournalEditorContainer';
import { useDrafts } from '@/contexts/DraftsContext';
import { useJournal } from '@/contexts/JournalContext';
import { useAuth } from '@/contexts/AuthContext';
import { processPendingFutureLetters } from '@/utils/futureLetters';
import { trackEvent } from '@/lib/analytics';
import { logger } from '@/lib/logger';

interface JournalEditorProps {
  initialDraft?: JournalEntry;
  onComplete?: () => void;
}

const JournalEditor: React.FC<JournalEditorProps> = ({ initialDraft, onComplete }) => {
  const { addEntry, updateEntry } = useJournal();
  const { authState } = useAuth();
  const {
    createNewDraft,
    deleteDraft,
    publishDraft,
    autoSaveDraft,
    clearCurrentDraft,
    lastAutoSave
  } = useDrafts();
  
  const [entry, setEntry] = useState<JournalEntry | null>(() => {
    return initialDraft || createNewDraft();
  });
  const [currentEntryState, setCurrentEntryState] = useState<JournalEntry | null>(entry);

  // Update entry if initialDraft changes
  useEffect(() => {
    if (initialDraft) {
      setEntry(initialDraft);
      setCurrentEntryState(initialDraft);
    }
  }, [initialDraft?.id]);

  const handleAutoSave = useCallback((updatedEntry: JournalEntry) => {
    setCurrentEntryState(updatedEntry);
    
    // When auto-save returns a new ID (temp -> real), update our entry state
    autoSaveDraft(updatedEntry, (newId) => {
      setEntry(prev => prev ? { ...prev, id: newId } : null);
      setCurrentEntryState(prev => prev ? { ...prev, id: newId } : null);
    });
  }, [autoSaveDraft]);

  const handlePublish = useCallback(async () => {
    if (currentEntryState) {
      const published = await publishDraft(currentEntryState, addEntry);

      // Any "sealed" blocks written into the entry only become real letters
      // once we have the entry's final, real DB id (a fresh entry starts
      // with a temp `draft-...` id until this point).
      if (published && authState.user) {
        try {
          const { content: processedContent, created } = await processPendingFutureLetters(
            published.content,
            published.id,
            authState.user.id,
          );
          if (created.length > 0) {
            await updateEntry({ ...published, content: processedContent });
            created.forEach(() => trackEvent('future_letter_created'));
          }
        } catch (error) {
          // The entry itself already published successfully above — don't let a
          // failure here (e.g. the follow-up content update) block completing.
          // Any un-flagged chip will simply be retried the next time this entry is saved.
          logger.error('JournalEditor', 'failed to process pending future letters:', error);
        }
      }

      clearCurrentDraft();
      onComplete?.();
    }
  }, [currentEntryState, publishDraft, addEntry, updateEntry, authState.user, clearCurrentDraft, onComplete]);

  const handleDelete = useCallback(async () => {
    if (currentEntryState) {
      await deleteDraft(currentEntryState.id);
      clearCurrentDraft();
      onComplete?.();
    }
  }, [currentEntryState, deleteDraft, clearCurrentDraft, onComplete]);

  const handleClose = useCallback(() => {
    clearCurrentDraft();
    onComplete?.();
  }, [clearCurrentDraft, onComplete]);

  if (!entry) return null;

  return (
    <JournalEditorContainer 
      entry={entry}
      onPublish={handlePublish}
      onDelete={handleDelete}
      onClose={handleClose}
      onAutoSave={handleAutoSave}
      lastAutoSave={lastAutoSave}
    />
  );
};

export default JournalEditor;
