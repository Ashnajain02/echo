import React from 'react';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HabitProgressProps {
  completedCount: number;
  totalCount: number;
  progress: number;
  allCompletedToday: boolean;
}

export const HabitProgress: React.FC<HabitProgressProps> = ({
  completedCount,
  totalCount,
  progress,
  allCompletedToday,
}) => {
  if (totalCount === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground font-body">Today's progress</span>
        <span className={cn(
          "font-medium flex items-center gap-1.5",
          allCompletedToday && "text-success"
        )}>
          {allCompletedToday && <CheckCircle2 className="h-4 w-4" />}
          {completedCount} / {totalCount}
        </span>
      </div>
      <Progress
        value={progress}
        className={cn(
          "h-2",
          allCompletedToday && "[&>div]:bg-success"
        )}
      />
    </div>
  );
};
