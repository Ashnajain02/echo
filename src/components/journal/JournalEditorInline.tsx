import React, { useState } from 'react';
import { toast } from 'sonner';
import { JournalEntry } from '@/types';
import { getPlainTextContent } from '@/utils/journalEntryMapper';
import { useJournal } from '@/contexts/JournalContext';
import { useAuth } from '@/contexts/AuthContext';
import { processPendingFutureLetters } from '@/utils/futureLetters';
import { trackEvent } from '@/lib/analytics';
import { logger } from '@/lib/logger';
import { getErrorMessage } from '@/lib/errors';

import { Button } from '@/components/ui/button';
import MusicSection from '@/components/music/MusicSection';
import { useWeatherData } from '@/hooks/useWeatherData';
import MoodSelector from '@/components/MoodSelector';
import WeatherDisplay from './WeatherDisplay';
import RichTextEditor from './RichTextEditor';
import EntryPageLayout from '@/components/shared/EntryPageLayout';
import { X, Check } from 'lucide-react';

interface JournalEditorInlineProps {
  entry: JournalEntry;
  onSave: () => void;
  onCancel: () => void;
}

const JournalEditorInline: React.FC<JournalEditorInlineProps> = ({
  entry: initialEntry,
  onSave,
  onCancel
}) => {
  const { updateEntry } = useJournal();
  const { authState } = useAuth();

  const {
    weatherData,
    isLoadingWeather,
    handleGetWeather
  } = useWeatherData(initialEntry.weather);

  const [content, setContent] = useState(initialEntry.content || '');
  const [selectedMood, setSelectedMood] = useState(initialEntry.mood || 'neutral');
  const [selectedTrack, setSelectedTrack] = useState(initialEntry.track);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!getPlainTextContent(content)) {
      return;
    }

    setIsSaving(true);
    try {
      let finalContent = content;
      if (authState.user) {
        const { content: processedContent, created } = await processPendingFutureLetters(
          content,
          initialEntry.id,
          authState.user.id,
        );
        finalContent = processedContent;
        created.forEach(() => trackEvent('future_letter_created'));
      }

      const updatedEntry: JournalEntry = {
        ...initialEntry,
        content: finalContent,
        mood: selectedMood,
        weather: weatherData || initialEntry.weather,
        track: selectedTrack,
      };
      await updateEntry(updatedEntry);
      onSave();
    } catch (error) {
      // Editor deliberately stays open (onSave() above didn't run) so
      // nothing typed is lost — but that was previously the only signal;
      // logged-only-to-console meant no one but this one browser's devtools
      // ever saw it, and no message meant the user didn't either.
      logger.error('JournalEditorInline', 'failed to save entry:', error);
      toast.error(getErrorMessage(error, "Couldn't save your changes. Please try again."));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (getPlainTextContent(content) !== getPlainTextContent(initialEntry.content)) {
      const confirmCancel = window.confirm("You have unsaved changes. Discard them?");
      if (!confirmCancel) return;
    }
    onCancel();
  };

  return (
    <EntryPageLayout
      date={initialEntry.date}
      timestamp={initialEntry.timestamp}
      mood={selectedMood}
      weather={weatherData || initialEntry.weather}
      actions={
        <WeatherDisplay
          weatherData={weatherData}
          isLoading={isLoadingWeather}
          onRefresh={handleGetWeather}
        />
      }
    >
      {/* Music */}
      <div className="mb-6">
        <MusicSection selectedTrack={selectedTrack} onTrackSelect={setSelectedTrack} />
      </div>

      {/* Mood */}
      <div className="mb-6">
        <MoodSelector selectedMood={selectedMood} onChange={setSelectedMood} />
      </div>

      {/* Content */}
      <div className="mb-8">
        <RichTextEditor
          content={content}
          onChange={setContent}
          placeholder="What's on your mind today..."
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-6">
        <Button variant="ghost" onClick={handleCancel} className="text-muted-foreground">
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-foreground text-background hover:bg-foreground/90"
        >
          <Check className="h-4 w-4 mr-2" />
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </EntryPageLayout>
  );
};

export default JournalEditorInline;
