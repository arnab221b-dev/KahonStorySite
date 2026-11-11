import { Heart, ListPlus, Pause } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import type { Palette, ProgressEntry, Story } from '../types';
import { CoverImage } from './CoverImage';
import { EqualizerBars } from './EqualizerBars';

interface StoryRowProps {
  index: number;
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

export function StoryRow({
  index,
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
}: StoryRowProps) {
  const { t, tf, digits, genreLabel, viewsLabel } = useLanguage();
  const pct =
    progress && progress.duration > 0
      ? Math.min(100, Math.round((progress.position / progress.duration) * 100))
      : 0;

  return (
    <div
      className={`track-row ${isCurrent ? 'track-row--active' : ''}`}
      onClick={() => (isCurrent ? onTogglePlay() : onPlay(story))}
      onMouseEnter={() => onHoverPalette(story.palette)}
      onMouseLeave={() => onHoverPalette(null)}
    >
      <div className="track-num">
        {isCurrent && isPlaying ? (
          <EqualizerBars />
        ) : isCurrent ? (
          <Pause size={14} color="#ff9900" />
        ) : (
          <span>{digits(index + 1)}</span>
        )}
      </div>

      <CoverImage
        src={story.thumbnail}
        fallbackSrc={story.thumbnailFallback}
        alt={story.title}
        className="track-thumb"
        eager
      />

      <div className="track-main">
        <div className="track-title" title={story.title}>
          {story.title}
        </div>
        <div className="track-sub">
          {story.series || story.genres.slice(0, 2).map(genreLabel).join(' · ')}
          {pct > 2 ? ` · ${tf('percentListened', { pct: digits(pct) })}` : ''}
        </div>
      </div>

      <button
        type="button"
        className="track-author-btn"
        onClick={(e) => {
          e.stopPropagation();
          onOpenAuthor(story.author);
        }}
      >
        {story.author}
      </button>

      <div className="track-views">
        {story.viewsText ? viewsLabel(story.viewsText) : ''}
      </div>

      <div className="track-right-actions">
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
        <span style={{ minWidth: 44, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
          {story.durationText ? digits(story.durationText) : '—'}
        </span>
      </div>
    </div>
  );
}
