import { useState } from 'react';
import { toggleReaction } from '../community-api';
import './vote-control.css';

interface VoteControlProps {
  targetType: 'DISCUSSION' | 'DISCUSSION_REPLY';
  targetId: string;
  initialScore: number;
  initialVote: string | null;
  orientation?: 'vertical' | 'horizontal';
}

export function VoteControl({ targetType, targetId, initialScore, initialVote, orientation = 'vertical' }: VoteControlProps) {
  const [score, setScore] = useState(initialScore);
  const [userVote, setUserVote] = useState<string | null>(initialVote);
  const [isLoading, setIsLoading] = useState(false);

  const handleVote = async (reactionType: 'UPVOTE' | 'DOWNVOTE') => {
    if (isLoading) return;

    const previousScore = score;
    const previousVote = userVote;

    // Optimistic update logic
    let newScore = score;
    let newVote: string | null = reactionType;

    if (userVote === reactionType) {
      // Removing vote
      newVote = null;
      newScore += reactionType === 'UPVOTE' ? -1 : 1;
    } else {
      // Changing or adding vote
      if (userVote === 'UPVOTE' && reactionType === 'DOWNVOTE') {
        newScore -= 2;
      } else if (userVote === 'DOWNVOTE' && reactionType === 'UPVOTE') {
        newScore += 2;
      } else {
        newScore += reactionType === 'UPVOTE' ? 1 : -1;
      }
    }

    setScore(newScore);
    setUserVote(newVote);
    setIsLoading(true);

    try {
      await toggleReaction({ targetType, targetId, reactionType });
    } catch (err) {
      // Rollback on failure
      setScore(previousScore);
      setUserVote(previousVote);
      console.error('Failed to toggle reaction', err);
    } finally {
      setIsLoading(false);
    }
  };

  const isUpvoted = userVote === 'UPVOTE';
  const isDownvoted = userVote === 'DOWNVOTE';

  return (
    <div className={`vote-control vote-control--${orientation}`}>
      <button 
        className={`vote-control__btn vote-control__btn--up ${isUpvoted ? 'active' : ''}`}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleVote('UPVOTE'); }}
        aria-label="Upvote"
        disabled={isLoading}
      >
        ▲
      </button>
      
      <span className={`vote-control__score ${isUpvoted ? 'positive' : ''} ${isDownvoted ? 'negative' : ''} ${score < 0 ? 'negative-total' : ''}`}>
        {score}
      </span>
      
      <button 
        className={`vote-control__btn vote-control__btn--down ${isDownvoted ? 'active' : ''}`}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleVote('DOWNVOTE'); }}
        aria-label="Downvote"
        disabled={isLoading}
      >
        ▼
      </button>
    </div>
  );
}
