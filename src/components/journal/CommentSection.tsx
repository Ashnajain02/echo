
import React, { useState } from 'react';
import { toast } from 'sonner';
import { JournalComment } from '@/types';
import { formatCommentDate, formatCommentTime } from '@/utils/dateUtils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageCircle, Calendar, Clock, ChevronDown, ChevronUp, Trash2, Plus, Loader2 } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface CommentSectionProps {
  comments: JournalComment[];
  onAddComment: (content: string) => Promise<void>;
  onDeleteComment?: (commentId: string) => Promise<void>;
  className?: string;
}

const CommentSection: React.FC<CommentSectionProps> = ({
  comments = [],
  onAddComment,
  onDeleteComment,
  className,
}) => {
  const [newComment, setNewComment] = useState('');
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);
  // Guards both against firing the same write twice (a fast double-click
  // previously fired onAddComment/onDeleteComment every time — nothing
  // disabled the button while the first request was still in flight) and
  // against the ambiguous "did that save?" state a failure used to leave
  // behind: the box closed and the text was gone whether or not the write
  // actually succeeded, because neither call was awaited.
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isDeletingComment, setIsDeletingComment] = useState(false);

  const handleSubmitComment = async () => {
    const trimmed = newComment.trim();
    if (!trimmed || isSubmittingComment) return;

    setIsSubmittingComment(true);
    try {
      await onAddComment(trimmed);
      setNewComment('');
      setIsAddingComment(false);
    } catch {
      // Leave the composer open with the draft intact — nothing was lost,
      // and the user can just hit Add again once whatever failed clears up.
      toast.error("Couldn't save that note. Please try again.");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDeleteComment = async () => {
    if (!commentToDelete || !onDeleteComment || isDeletingComment) return;
    const id = commentToDelete;

    setIsDeletingComment(true);
    try {
      await onDeleteComment(id);
    } catch {
      // The note itself is untouched either way — deleteCommentFromEntry
      // only updates local state after a successful write — but
      // AlertDialogAction always closes the confirm dialog on click, so
      // without this the user has no way to know the delete silently
      // failed and the note is still sitting right there.
      toast.error("Couldn't delete that note. Please try again.");
    } finally {
      setIsDeletingComment(false);
      setCommentToDelete(null);
    }
  };


  return (
    <div className={className}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between mb-4 cursor-pointer hover:bg-muted/30 p-2 rounded-md">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              <h4 className="font-medium">
                {comments.length > 0
                  ? `Notes (${comments.length})`
                  : 'Notes'}
              </h4>
            </div>
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          {comments.length > 0 && (
            <div className="space-y-4 mb-6">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className="p-3 bg-muted rounded-md border border-border"
                >
                  <div className="flex justify-between">
                    <div className="text-sm mb-2">{comment.content}</div>
                    {onDeleteComment && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setCommentToDelete(comment.id)}
                        aria-label="Delete note"
                        className="h-6 w-6 -mt-1 -mr-1 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center text-xs text-muted-foreground gap-2">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatCommentDate(comment.createdAt)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatCommentTime(comment.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {isAddingComment ? (
            <div className="space-y-2">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a note..."
                className="min-h-[100px]"
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsAddingComment(false);
                    setNewComment('');
                  }}
                >
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSubmitComment} disabled={isSubmittingComment || !newComment.trim()}>
                  {isSubmittingComment && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                  {isSubmittingComment ? 'Adding...' : 'Add'}
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => setIsAddingComment(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              New note
            </Button>
          )}
        </CollapsibleContent>
      </Collapsible>

      <AlertDialog open={!!commentToDelete} onOpenChange={(open) => !open && setCommentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete note</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this note? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteComment}
              disabled={isDeletingComment}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CommentSection;
