import React, { useState, useEffect, useCallback } from 'react';
import { JournalEntry } from '@/types';
import { getPlainTextContent } from '@/utils/journalEntryMapper';
import { trackEvent } from '@/lib/analytics';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { getLocalDate, getUtcTimestamp, getUserTimezone, formatEntryTime } from '@/utils/dateUtils';
import MusicSection from '@/components/music/MusicSection';
import { useWeatherData } from '@/hooks/useWeatherData';
import MoodSelector from '@/components/MoodSelector';

import RichTextEditor from './RichTextEditor';
import EntryPageLayout from '@/components/shared/EntryPageLayout';
import { Trash2, Save, Send } from 'lucide-react';

interface JournalEditorContainerProps {
  entry: JournalEntry;
  onPublish: () => void;
  onDelete: () => void;
  onClose: () => void;
  onAutoSave: (entry: JournalEntry) => void;
  lastAutoSave: Date | null;
}

const JournalEditorContainer: React.FC<JournalEditorContainerProps> = ({
  entry: initialEntry,
  onPublish,
  onDelete,
  onClose,
  onAutoSave,
  lastAutoSave
}) => {
  const [entry, setEntry] = useState<JournalEntry>(initialEntry);
  const {
    weatherData,
    isLoadingWeather,
    locationError,
    handleGetWeather
  } = useWeatherData(initialEntry?.weather || entry.weather);

  const [content, setContent] = useState(initialEntry?.content || '');
  const [selectedMood, setSelectedMood] = useState(initialEntry?.mood || 'neutral');
  const [selectedTrack, setSelectedTrack] = useState(initialEntry?.track);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!entry.date || !entry.timestamp) {
      setEntry(prev => ({
        ...prev,
        date: prev.date || getLocalDate(),
        timestamp: prev.timestamp || getUtcTimestamp(),
        timezone: prev.timezone || getUserTimezone(),
      }));
    }
  }, [entry.date, entry.timestamp]);

  useEffect(() => {
    if (initialEntry.id && initialEntry.id !== entry.id) {
      setEntry(prev => ({ ...prev, id: initialEntry.id }));
    }
  }, [initialEntry.id]);

  const getCurrentEntry = useCallback((): JournalEntry => {
    return {
      ...entry,
      content,
      mood: selectedMood,
      track: selectedTrack,
      weather: weatherData || undefined,
    };
  }, [entry, content, selectedMood, selectedTrack, weatherData]);

  useEffect(() => {
    const currentEntry = getCurrentEntry();
    onAutoSave(currentEntry);
  }, [getCurrentEntry, onAutoSave]);

  const handlePublish = async () => {
    const plainText = getPlainTextContent(content);
    if (!plainText) {
      return;
    }
    setIsPublishing(true);
    try {
      onPublish();
      // mood/weather/track are the app's existing plaintext metadata (never
      // the encrypted entry text) — same fields already shown in the UI, so
      // no new privacy surface here. content_length_bucket avoids sending
      // the actual text while still being useful for "are people writing
      // more over time."
      trackEvent('entry_published', {
        has_track: Boolean(selectedTrack),
        has_weather: Boolean(weatherData),
        mood: selectedMood,
        content_length_bucket: plainText.length < 200 ? 'short' : plainText.length < 800 ? 'medium' : 'long',
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDelete = async () => {
    const hasContent = getPlainTextContent(content) || selectedTrack || selectedMood !== 'neutral';
    if (hasContent) {
      const confirmDelete = window.confirm("Are you sure you want to delete this entry? This cannot be undone.");
      if (!confirmDelete) return;
    }
    setIsDeleting(true);
    try { onDelete(); } finally { setIsDeleting(false); }
  };

  const handleSaveAndClose = () => {
    onClose();
  };

  const autoSaveText = lastAutoSave
    ? <>Auto-saved {formatEntryTime(lastAutoSave.getTime())}</>
    : null;

  return (
    <EntryPageLayout
      date={entry.date}
      timestamp={entry.timestamp}
      mood={selectedMood}
      weather={weatherData || undefined}
      metadataExtra={autoSaveText}
    >
      {locationError && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>
            {locationError}{' '}
            <Button variant="link" className="p-0 h-auto text-destructive" onClick={handleGetWeather}>
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Music */}
      <div className="mb-6">
        <MusicSection
          selectedTrack={selectedTrack}
          onTrackSelect={setSelectedTrack}
        />
      </div>

      {/* Mood */}
      <div className="mb-6">
        <MoodSelector selectedMood={selectedMood} onChange={setSelectedMood} />
      </div>

      {/* Content - Rich Text Editor */}
      <div className="mb-8">
        <RichTextEditor
          content={content}
          onChange={setContent}
          placeholder="What's on your mind today..."
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-6">
        <Button
          variant="ghost"
          onClick={handleDelete}
          disabled={isDeleting}
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          {isDeleting ? "Deleting..." : "Delete"}
        </Button>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleSaveAndClose}
            className="text-muted-foreground"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Draft
          </Button>
          <Button
            onClick={handlePublish}
            disabled={isPublishing}
            className="bg-foreground text-background hover:bg-foreground/90"
          >
            <Send className="h-4 w-4 mr-2" />
            {isPublishing ? "Publishing..." : "Publish"}
          </Button>
        </div>
      </div>
    </EntryPageLayout>
  );
};

export default JournalEditorContainer;
