import React, { lazy, Suspense, useState } from 'react';
import { useJournal } from '@/contexts/JournalContext';
import Layout from '@/components/Layout';
import LandingPage from '@/components/landing/LandingPage';
import { Button } from '@/components/ui/button';
import { Plus, Loader2, FileText } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useDrafts } from '@/contexts/DraftsContext';
import { JournalEntry } from '@/types';
import DayNavigator from '@/components/day-navigator/DayNavigator';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

// Lazy: pulls in the full TipTap stack (starter kit + underline/image/
// task-list/placeholder extensions). Index is deliberately eager (see
// App.tsx) so *something* paints immediately, but every visitor lands here —
// including every logged-out visitor, who sees LandingPage and never
// touches this at all — so the editor itself must not ride along in that
// same eager bundle. Only fetched once someone actually clicks "new entry".
const JournalEditor = lazy(() => import('@/components/JournalEditor'));

const EditorFallback = () => (
  <div className="flex justify-center items-center py-20">
    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
  </div>
);

const Index = () => {
  const { authState } = useAuth();
  const isMobile = useIsMobile();
  const [isWriting, setIsWriting] = useState(false);
  const [editingDraft, setEditingDraft] = useState<JournalEntry | null>(null);

  const journalContext = useJournal();
  const isLoading = authState.user ? (journalContext?.isLoading || false) : false;

  const { drafts, isLoadingDrafts, deleteDraft } = useDrafts();

  const handleCreateNewEntry = () => {
    setEditingDraft(null);
    setIsWriting(true);
  };

  const handleEditDraft = (draftId: string) => {
    const draft = drafts.find(d => d.id === draftId);
    if (draft) {
      setEditingDraft(draft);
      setIsWriting(true);
    }
  };

  const handleFinishWriting = () => {
    setIsWriting(false);
    setEditingDraft(null);
  };

  const handleDeleteDraft = async (draftId: string) => {
    await deleteDraft(draftId);
  };

  if (!authState.user) {
    return <LandingPage />;
  }

  if (authState.loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  if (isWriting) {
    return (
      <Layout>
        <div className="fixed inset-0 flex flex-col" style={{ paddingTop: isMobile ? 56 : 64 }}>
          <div className="flex-1 overflow-y-auto">
            <div className="w-full max-w-3xl mx-auto px-6 md:px-16 pt-10 pb-24">
              <Suspense fallback={<EditorFallback />}>
                <JournalEditor
                  initialDraft={editingDraft || undefined}
                  onComplete={handleFinishWriting}
                />
              </Suspense>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Day Navigator — full viewport experience */}
      <DayNavigator />

      {/* Floating action buttons */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {/* Drafts button (if drafts exist) */}
        {drafts.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="rounded-full h-11 px-4 bg-card/90 backdrop-blur-sm border-border shadow-md gap-2"
              >
                <FileText className="h-4 w-4" />
                Drafts
                <span className="text-xs bg-primary/10 text-primary rounded-full px-1.5 py-0.5 font-medium">
                  {drafts.length}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 p-0">
              <div className="p-3 border-b border-border">
                <p className="text-sm font-medium">Drafts</p>
              </div>
              <div className="max-h-60 overflow-y-auto">
                {drafts.map((draft) => {
                  const preview = draft.content
                    ? draft.content.replace(/<[^>]*>/g, '').slice(0, 60)
                    : 'Empty draft';
                  return (
                    <div
                      key={draft.id}
                      className="flex items-center justify-between px-3 py-2 hover:bg-accent/50 cursor-pointer border-b border-border/50 last:border-0"
                      onClick={() => handleEditDraft(draft.id)}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm truncate">{preview || 'Empty draft'}</p>
                        <p className="text-xs text-muted-foreground">{draft.date}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 ml-2 text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteDraft(draft.id);
                        }}
                      >
                        ×
                      </Button>
                    </div>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* New Entry FAB */}
        <Button
          onClick={handleCreateNewEntry}
          className="rounded-full h-14 w-14 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg"
        >
          <Plus className="h-6 w-6" />
          <span className="sr-only">New Entry</span>
        </Button>
      </div>
    </Layout>
  );
};

export default Index;
