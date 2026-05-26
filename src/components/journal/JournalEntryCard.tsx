import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { JournalEntry } from '@/types';
import { moodLabels } from '@/constants/moods';
import { formatEntryDate, formatEntryYear, formatEntryTime } from '@/utils/dateUtils';
import CommentSection from './CommentSection';
import TrackClipPlayer from '@/components/music/TrackClipPlayer';
import InteractiveContent from './InteractiveContent';
import JournalEditorInline from './JournalEditorInline';
import ReflectionModule from './ReflectionModule';
import EntryActions from './EntryActions';
import {
  WeatherOverlay,
  WeatherAnimationButton,
} from './weather-overlay';
import { useEntryState } from './useEntryState';
import { useEntryCardWeather } from './useEntryCardWeather';

interface JournalEntryCardProps {
  entry: JournalEntry;
  className?: string;
  isPreview?: boolean;
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
 * Card layout for a published entry. Used on the Memories page and anywhere
 * else an entry is rendered as a self-contained box (header + content + reflection).
 */
const JournalEntryCard: React.FC<JournalEntryCardProps> = ({ entry, className, isPreview = false }) => {
  const state = useEntryState({ entry, isPreview });
  const {
    articleRef,
    weatherCategory,
    timeOfDay,
    contentAreaBounds,
    isWeatherPlaying,
    isWeatherVisible,
    weatherOpacity,
    weatherPhase,
    playWeatherAnimation,
  } = useEntryCardWeather(entry);

  if (state.isEditing) {
    return (
      <JournalEditorInline
        entry={entry}
        onSave={state.stopEditing}
        onCancel={state.stopEditing}
      />
    );
  }

  const dateSource = entry.timestamp || entry.date;
  const formattedDate = formatEntryDate(dateSource);
  const formattedYear = formatEntryYear(dateSource);
  const formattedTime = entry.timestamp ? formatEntryTime(entry.timestamp) : '';

  const blurStyle = state.shouldBlurContent ? BLUR_STYLE_VISIBLE : BLUR_STYLE_HIDDEN;
  const weatherButtonDisabled = Boolean(entry.track && !state.hasClickedToPlay);
  const moodLabel = moodLabels[entry.mood] || entry.mood;

  return (
    <motion.article
      ref={articleRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn(
        'overflow-hidden relative bg-card border border-border rounded-md',
        className,
      )}
    >
      {weatherCategory && (
        <WeatherOverlay
          category={weatherCategory}
          timeOfDay={timeOfDay}
          isVisible={isWeatherVisible}
          opacity={weatherOpacity}
          phase={weatherPhase}
          contentAreaBounds={contentAreaBounds}
        />
      )}

      {/* Header — mobile */}
      <div className="sm:hidden px-4 py-4 border-b border-border">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="font-display text-2xl font-semibold leading-tight text-foreground">{formattedDate}</h3>
            <p className="text-sm text-muted-foreground">{formattedYear}</p>
          </div>
          {!isPreview && (
            <EntryActions onEdit={state.startEditing} onDelete={state.handleDelete} />
          )}
        </div>
        <div className="flex items-center gap-2 mt-3">
          <span className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary border border-primary/20">
            {moodLabel}
          </span>
          {!isPreview && weatherCategory && (
            <WeatherAnimationButton
              isPlaying={isWeatherPlaying}
              onClick={playWeatherAnimation}
              disabled={weatherButtonDisabled}
            />
          )}
        </div>
        {entry.weather && (
          <div className="flex items-center gap-2 text-sm mt-2 text-muted-foreground flex-wrap">
            {formattedTime && (<><span>{formattedTime}</span><span>·</span></>)}
            <span>{state.formatTemp(entry.weather.temperature)}</span>
            {entry.weather.description && (<><span>·</span><span className="capitalize">{entry.weather.description}</span></>)}
            {entry.weather.location && (<><span>·</span><span>{entry.weather.location}</span></>)}
          </div>
        )}
        {!entry.weather && formattedTime && (
          <div className="text-sm mt-2 text-muted-foreground">{formattedTime}</div>
        )}
      </div>

      {/* Header — desktop */}
      <div className="hidden sm:block px-6 py-5 border-b border-border">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-display text-2xl font-semibold leading-tight text-foreground">{formattedDate}</h3>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              <span>{formattedYear}</span>
              {formattedTime && (<><span>·</span><span>{formattedTime}</span></>)}
              {entry.weather && (
                <>
                  <span>·</span><span>{state.formatTemp(entry.weather.temperature)}</span>
                  {entry.weather.description && (<><span>·</span><span className="capitalize">{entry.weather.description}</span></>)}
                  {entry.weather.location && (<><span>·</span><span>{entry.weather.location}</span></>)}
                </>
              )}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="px-2.5 py-0.5 text-xs rounded-full bg-primary/10 text-primary border border-primary/20">
                {moodLabel}
              </span>
              {!isPreview && weatherCategory && (
                <WeatherAnimationButton
                  isPlaying={isWeatherPlaying}
                  onClick={playWeatherAnimation}
                  disabled={weatherButtonDisabled}
                />
              )}
            </div>
          </div>
          {!isPreview && (
            <EntryActions onEdit={state.startEditing} onDelete={state.handleDelete} />
          )}
        </div>
      </div>

      {entry.track && (
        <div className="px-6 py-4 border-b border-border bg-accent/20">
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
          className="px-6 py-6"
          style={blurStyle}
        >
          <InteractiveContent
            content={state.localContent}
            onContentChange={state.handleContentChange}
            disabled={isPreview}
          />
        </div>
        {state.shouldBlurContent && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-card border border-border px-5 py-2.5 rounded-full text-sm text-muted-foreground shadow-sm">
              Play the song to read
            </div>
          </div>
        )}
      </div>

      {!isPreview && (
        <div style={blurStyle}>
          <div className="px-6 pb-4">
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
          <div className="px-6 pb-6 pt-2 border-t border-border">
            <CommentSection
              comments={entry.comments || []}
              onAddComment={state.handleAddComment}
              onDeleteComment={state.handleDeleteComment}
            />
          </div>
        </div>
      )}
    </motion.article>
  );
};

export default JournalEntryCard;
