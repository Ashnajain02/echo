import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCcw, ChevronRight, X } from 'lucide-react';

interface ReflectionQuestionProps {
  question: string;
  isEditing: boolean;
  isLoading: boolean;
  onRefresh: () => void;
  onCycle: () => void;
  onClose: () => void;
  totalQuestions: number;
  currentIndex: number;
}

const ReflectionQuestion: React.FC<ReflectionQuestionProps> = ({
  question,
  isEditing,
  isLoading,
  onRefresh,
  onCycle,
  onClose,
  totalQuestions,
  currentIndex
}) => {
  return (
    <div className={`flex justify-between items-start p-2 rounded-md ${!isEditing ? 'bg-muted/60' : ''}`}>
      <div className="flex-1">
        <div className="font-medium text-left">
          {question}
        </div>
        {isEditing && totalQuestions > 1 && (
          <div className="text-xs text-muted-foreground mt-1">
            Question {currentIndex + 1} of {totalQuestions}
          </div>
        )}
      </div>
      <div className="flex space-x-1 ml-2">
        {isEditing && totalQuestions > 1 && (
          <Button
            size="icon"
            variant="ghost"
            onClick={onCycle}
            disabled={isLoading}
            className="h-8 w-8 p-0"
            title="Next question"
            aria-label="Next question"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
        {isEditing && (
          <Button
            size="icon"
            variant="ghost"
            onClick={onRefresh}
            disabled={isLoading}
            className="h-8 w-8 p-0"
            title="Generate new questions"
            aria-label="Generate new questions"
          >
            <RefreshCcw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        )}
        <Button
          size="icon"
          variant="ghost"
          onClick={onClose}
          className="h-8 w-8 p-0"
          title="Close"
          aria-label="Close reflection"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default ReflectionQuestion;
