import React, { useState, useRef, useEffect, useCallback } from 'react';
import { JournalEntry as JournalEntryType, JournalComment } from '@/types';
import EntryPageLayout from '@/components/shared/EntryPageLayout';
import TrackClipPlayer from '@/components/music/TrackClipPlayer';
import InteractiveContent from '@/components/journal/InteractiveContent';
import ReflectionModule from '@/components/journal/ReflectionModule';
import CommentSection from '@/components/journal/CommentSection';
import { formatTemperature } from '@/utils/temperature';

interface LandingEntryProps {
  entry: JournalEntryType;
}

const LandingEntry: React.FC<LandingEntryProps> = ({ entry }) => {
  const [weatherEnabled, setWeatherEnabled] = useState(false);
  const [comments, setComments] = useState<JournalComment[]>(entry.comments || []);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-enable weather when entry scrolls into view.
  // Intentionally one-way: do NOT auto-disable when the entry shrinks below
  // the threshold (e.g. when the Notes section expands and pushes content out
  // of view). The user controls disabling via the "Weather on/off" toggle.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setWeatherEnabled(true);
        }
      },
      { threshold: 0.4 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Local comment handlers (no DB)
  const handleAddComment = useCallback(async (content: string) => {
    const newComment: JournalComment = {
      id: `demo-comment-${Date.now()}`,
      content,
      createdAt: Date.now(),
    };
    setComments(prev => [...prev, newComment]);
  }, []);

  const handleDeleteComment = useCallback(async (commentId: string) => {
    setComments(prev => prev.filter(c => c.id !== commentId));
  }, []);

  // No-op reflection update (demo mode)
  const handleReflectionUpdate = useCallback(async () => {}, []);

  const formatTemp = (celsius: number) => formatTemperature(celsius);

  return (
    <div ref={containerRef} className="min-h-screen flex items-center justify-center py-20">
      <div className="w-full max-w-3xl mx-auto px-6 md:px-16">
        <EntryPageLayout
          date={entry.date}
          timestamp={entry.timestamp}
          mood={entry.mood}
          weather={entry.weather}
          weatherEnabled={weatherEnabled}
          onWeatherToggle={() => setWeatherEnabled(prev => !prev)}
          formatTemperature={formatTemp}
          footer={
            <div>
              <div className="pb-4">
                <ReflectionModule
                  entryId={entry.id}
                  entryContent={entry.content}
                  entryMood={entry.mood}
                  entryTrack={entry.track}
                  reflectionQuestion={entry.reflectionQuestion || null}
                  reflectionAnswer={entry.reflectionAnswer || null}
                  onReflectionUpdate={handleReflectionUpdate}
                />
              </div>
              <div className="pb-6 pt-2">
                <CommentSection
                  comments={comments}
                  onAddComment={handleAddComment}
                  onDeleteComment={handleDeleteComment}
                />
              </div>
            </div>
          }
        >
          {/* Song */}
          {entry.track && (
            <div className="mb-8">
              <TrackClipPlayer
                track={entry.track}
                clipStartSeconds={entry.track.clipStartSeconds}
                clipEndSeconds={entry.track.clipEndSeconds}
              />
            </div>
          )}

          {/* Content */}
          <div className="text-[1.1rem] leading-[1.9] text-foreground/90">
            <InteractiveContent content={entry.content} disabled />
          </div>
        </EntryPageLayout>
      </div>
    </div>
  );
};

export default LandingEntry;
