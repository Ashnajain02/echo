import React, { useState } from 'react';

import { supabase } from '@/integrations/supabase/client';
import { generateReflectionQuestions } from '@/services/api';
import { useIsDemoMode } from '@/contexts/DemoModeContext';
import { logger } from '@/lib/logger';
import { trackEvent } from '@/lib/analytics';
import ReflectionQuestion from './reflection/ReflectionQuestion';
import ReflectionEditor from './reflection/ReflectionEditor';
import ReflectionDisplay from './reflection/ReflectionDisplay';
import ReflectionTrigger from './reflection/ReflectionTrigger';
import { MusicTrack } from '@/types';

interface ReflectionModuleProps {
  entryId: string;
  entryContent: string;
  entryMood: string;
  entryTrack?: MusicTrack;
  reflectionQuestion: string | null;
  reflectionAnswer: string | null;
  onReflectionUpdate: () => void;
}

const ReflectionModule: React.FC<ReflectionModuleProps> = ({
  entryId,
  entryContent,
  entryMood,
  entryTrack,
  reflectionQuestion,
  reflectionAnswer,
  onReflectionUpdate,
}) => {
  const demo = useIsDemoMode();
  const [isLoading, setIsLoading] = useState(false);
  const [questions, setQuestions] = useState<string[]>(reflectionQuestion ? [reflectionQuestion] : []);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState(reflectionAnswer || '');
  const [isEditing, setIsEditing] = useState(false);
  const [showModule, setShowModule] = useState(!!reflectionQuestion);

  const currentQuestion = questions[currentQuestionIndex] || '';

  const generateQuestions = async () => {
    setIsLoading(true);
    try {
      // Include track information if available
      const trackInfo = entryTrack ? {
        name: entryTrack.name,
        artist: entryTrack.artist
      } : undefined;
      
      // Use the API service to call the Supabase function
      const generatedQuestions = await generateReflectionQuestions(entryContent, entryMood, trackInfo, demo);
      
      setQuestions(generatedQuestions);
      setCurrentQuestionIndex(0);
      setShowModule(true);
      setIsEditing(true);
      trackEvent('reflection_generated');
    } catch (error) {
      logger.error('ReflectionModule', 'failed to generate reflection questions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const cycleQuestion = () => {
    if (questions.length > 1) {
      setCurrentQuestionIndex((prev) => (prev + 1) % questions.length);
    }
  };

  const saveReflection = async () => {
    if (!currentQuestion || !answer.trim()) {
      return;
    }

    setIsLoading(true);
    try {
      if (!demo) {
        const { error } = await supabase
          .from('journal_entries')
          .update({
            reflection_question: currentQuestion,
            reflection_answer: answer.trim(),
            updated_at: new Date().toISOString()
          })
          .eq('id', entryId);

        if (error) throw error;
      }

      setIsEditing(false);
      onReflectionUpdate();
    } catch (error) {
      logger.error('ReflectionModule', 'failed to save reflection:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteReflection = async () => {
    setIsLoading(true);
    try {
      if (!demo) {
        const { error } = await supabase
          .from('journal_entries')
          .update({
            reflection_question: null,
            reflection_answer: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', entryId);

        if (error) throw error;
      }

      setQuestions([]);
      setCurrentQuestionIndex(0);
      setAnswer('');
      setShowModule(false);
      onReflectionUpdate();
    } catch (error) {
      logger.error('ReflectionModule', 'failed to delete reflection:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (isEditing && answer.trim()) {
      const confirmed = window.confirm('You have an unsaved reflection. Are you sure you want to discard it?');
      if (!confirmed) return;
    }
    
    if (!reflectionQuestion && !reflectionAnswer) {
      // If there's no saved reflection, hide the module completely
      setShowModule(false);
    } else {
      // If there's a saved reflection, return to view mode
      setIsEditing(false);
      setQuestions(reflectionQuestion ? [reflectionQuestion] : []);
      setCurrentQuestionIndex(0);
      setAnswer(reflectionAnswer || '');
    }
  };

  if (!showModule) {
    return <ReflectionTrigger onClick={generateQuestions} isLoading={isLoading} />;
  }

  return (
    <div className="border border-border rounded-md p-4 mt-4 bg-muted/20">
      <div className="flex flex-col space-y-4">
        <ReflectionQuestion 
          question={currentQuestion}
          isEditing={isEditing}
          isLoading={isLoading}
          onRefresh={generateQuestions}
          onCycle={cycleQuestion}
          onClose={handleClose}
          totalQuestions={questions.length}
          currentIndex={currentQuestionIndex}
        />
        
        {isEditing ? (
          <ReflectionEditor
            answer={answer}
            isLoading={isLoading}
            onChange={setAnswer}
            onSave={saveReflection}
          />
        ) : (
          <ReflectionDisplay
            answer={answer}
            onEdit={() => setIsEditing(true)}
            onDelete={deleteReflection}
            isLoading={isLoading}
          />
        )}
      </div>
    </div>
  );
};

export default ReflectionModule;
