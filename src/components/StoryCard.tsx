import { Heart, ListPlus, Pause, Play } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import type { Palette, ProgressEntry, Story } from '../types';
import { CoverImage } from './CoverImage';

interface StoryCardProps {
  story: Story;
  isCurrent: boolean;
  isPlaying: boolean;
  isLiked: boolean;
  progress?: ProgressEntry;
  onPlay: (story: Story) => void;
  onTogglePlay: () => void;
  onToggleLike: (storyId: string) => void;
  onAddQueue: (story: Story) => void;
  onOpenAuthor: (author: string) => void;
  onHoverPalette: (palette: Palette | null) => void;
}

export function StoryCard({
  story,
  isCurrent,
  isPlaying,
  isLiked,
  progress,
  onPlay,
  onTogglePlay,
  onToggleLike,
  onAddQueue,
  onOpenAuthor,
  onHoverPalette,
}: StoryCardProps) {
  const { t, digits, genreLabel, timeAgoLabel, viewsLabel } = useLanguage();
  const pct =
    progress && progress.duration > 0
      ? Math.min(100, Math.max(0, (progress.position / progress.duration) * 100))
      : 0;

  return (
    <article
      className={`story-card ${isCurrent ? 'story-card--playing' : ''}`}
      onClick={() => (isCurrent ? onTogglePlay() : onPlay(story))}
      onMouseEnter={() => onHoverPalette(story.palette)}
      onMouseLeave={() => onHoverPalette(null)}
    >
      <div className="story-card-cover-wrap">
        <CoverImage
          src={story.thumbnail}
          fallbackSrc={story.thumbnailFallback}
          alt={story.title}
          className="story-card-cover"
        />
        {story.durationText && (
          <span className="story-card-duration">{digits(story.durationText)}</span>
        )}
        <div className="story-card-play-overlay">
          <button
            type="button"
            className="floating-play-circle"
            aria-label={isCurrent && isPlaying ? `${t('pause')} ${story.title}` : `${t('play')} ${story.title}`}
            onClick={(e) => {
              e.stopPropagation();
              if (isCurrent) onTogglePlay();
              else onPlay(story);
            }}
          >
            {isCurrent && isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" style={{ marginLeft: 2 }} />}
          </button>
        </div>
        {pct > 1 && (
          <div className="card-progress-track">
            <div className="card-progress-fill" style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>

      <div className="story-card-body">
        <div className="story-card-title" title={story.title}>
          {story.title}
        </div>
        <span
          className="story-card-author"
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            onOpenAuthor(story.author);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.stopPropagation();
              onOpenAuthor(story.author);
            }
          }}
        >
          {story.author}
        </span>

        <div className="story-card-meta">
          <span>
            {story.viewsText ? viewsLabel(story.viewsText) : genreLabel(story.genres[0])}
            {story.publishedText ? ` · ${timeAgoLabel(story.publishedText)}` : ''}
          </span>
          <div className="story-card-actions">
            <button
              type="button"
              className="mini-icon-btn"
              title={t('addToQueue')}
              onClick={(e) => {
                e.stopPropagation();
                onAddQueue(story);
              }}
            >
              <ListPlus size={15} />
            </button>
            <button
              type="button"
              className={`mini-icon-btn ${isLiked ? 'mini-icon-btn--liked' : ''}`}
              title={isLiked ? t('unlikeStory') : t('likeStory')}
              onClick={(e) => {
                e.stopPropagation();
                onToggleLike(story.id);
              }}
            >
              <Heart size={15} fill={isLiked ? 'currentColor' : 'none'} />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
