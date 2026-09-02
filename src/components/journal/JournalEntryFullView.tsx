import React, { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { createPortal } from 'react-dom';
import type { JournalEntry } from '@/types';
import CommentSection from './CommentSection';
import TrackClipPlayer from '@/components/music/TrackClipPlayer';
import EntryPageLayout from '@/components/shared/EntryPageLayout';
import InteractiveContent from './InteractiveContent';
import ReflectionModule from './ReflectionModule';
import EntryActions from './EntryActions';
import { useEntryState } from './useEntryState';
import { useEntryFutureLetters } from '@/hooks/useFutureLetters';
import FutureLetterCard from './future-letters/FutureLetterCard';
import { useFutureLetterPortalTargets } from './future-letters/useFutureLetterPortalTargets';

// Lazy: this component is reachable from LandingPage (via LandingEntry),
// which every logged-out visitor sees, and `isPreview` there means the edit
// path below can never actually trigger — but a *static* import still
// bundles JournalEditorInline's full TipTap dependency graph into that same
// eager chunk regardless of whether it's reachable. Splitting it out means
// LandingPage's demo entry, and every read-only entry in the main feed,
// stops paying for an editor it isn't using.
const JournalEditorInline = lazy(() => import('./JournalEditorInline'));

interface JournalEntryFullViewProps {
  entry: JournalEntry;
  className?: string;
  isPreview?: boolean;
  initialWeatherEnabled?: boolean;
}

const BLUR_STYLE_VISIBLE = {
  filter: 'blur(4px)',
  opacity: 0.6,
  transition: 'filter 0.8s ease, opacity 0.8s ease',
};
const BLUR_STYLE_HIDDEN = {
  filter: 'blur(0px)',
  opacity: 1,
  transition: 'filter 0.8s ease, opacity 0.8s ease',
};

/**
 * Editorial full-page layout for an entry. Used by ScrollEntry (Memories
 * full-view) and LandingEntry. Mounts a fullscreen weather overlay via the
 * global WeatherOverlayContext rather than its own particle canvas.
 */
const JournalEntryFullView: React.FC<JournalEntryFullViewProps> = ({
  entry,
  className,
  isPreview = false,
  initialWeatherEnabled,
}) => {
  const state = useEntryState({ entry, isPreview, initialWeatherEnabled });
  const { letters: futureLetters, openLetter, saveReply } = useEntryFutureLetters(isPreview ? undefined : entry.id);
  const letterPortals = useFutureLetterPortalTargets(state.contentRef, state.localContent, futureLetters);

  if (state.isEditing) {
    return (
      <Suspense fallback={<Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto my-20" />}>
        <JournalEditorInline
          entry={entry}
          onSave={state.stopEditing}
          onCancel={state.stopEditing}
        />
      </Suspense>
    );
  }

  const blurStyle = state.shouldBlurContent ? BLUR_STYLE_VISIBLE : BLUR_STYLE_HIDDEN;

  return (
    <EntryPageLayout
      date={entry.date}
      timestamp={entry.timestamp}
      mood={entry.mood}
      weather={entry.weather}
      weatherEnabled={state.weatherEnabled}
      formatTemperature={state.formatTemp}
      actions={!isPreview ? (
        <EntryActions onEdit={state.startEditing} onDelete={state.handleDelete} />
      ) : undefined}
      footer={!isPreview ? (
        <div style={blurStyle}>
          <div className="pb-4">
            <ReflectionModule
              entryId={entry.id}
              entryContent={entry.content}
              entryMood={entry.mood}
              entryTrack={entry.track}
              reflectionQuestion={entry.reflectionQuestion || null}
              reflectionAnswer={entry.reflectionAnswer || null}
              onReflectionUpdate={state.handleReflectionUpdate}
            />
          </div>
          <div className="pb-6 pt-2">
            <CommentSection
              comments={entry.comments || []}
              onAddComment={state.handleAddComment}
              onDeleteComment={state.handleDeleteComment}
            />
          </div>
        </div>
      ) : undefined}
      className={className}
    >
      {entry.track && (
        <div className="mb-8">
          <TrackClipPlayer
            track={entry.track}
            clipStartSeconds={entry.track.clipStartSeconds}
            clipEndSeconds={entry.track.clipEndSeconds}
            onPlayStateChange={state.handleTrackPlayStateChange}
          />
        </div>
      )}

      <div className="relative">
        <div
          ref={state.contentRef}
          data-entry-content
          style={blurStyle}
        >
          <InteractiveContent
            content={state.localContent}
            onContentChange={state.handleContentChange}
            disabled={isPreview}
          />
          {/* Once a sealed letter is due, its live card portals directly into
              the chip's own position in the text above — same box for its
              whole lifecycle, not a second one down here. */}
          {letterPortals.map(({ letter, mountEl }) =>
            createPortal(
              <FutureLetterCard letter={letter} onOpen={openLetter} onSaveReply={saveReply} />,
              mountEl,
              letter.id,
            )
          )}
        </div>
        {state.shouldBlurContent && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-card/80 backdrop-blur-sm border border-border/50 px-5 py-2.5 rounded-full text-sm text-muted-foreground">
              Play the song to read
            </div>
          </div>
        )}
      </div>
    </EntryPageLayout>
  );
};

export default JournalEntryFullView;
