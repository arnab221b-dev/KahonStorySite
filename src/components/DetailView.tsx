import { ExternalLink, Play, Shuffle } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import type { Palette, ProgressEntry, Story } from '../types';
import { formatDurationLong } from '../utils/format';
import { CoverImage } from './CoverImage';
import { StoryRow } from './StoryRow';

interface DetailViewProps {
  kind: 'Series Playlist' | 'Author Collection' | 'Podcast Series';
  title: string;
  subtitle?: string;
  coverUrl: string;
  youtubeUrl?: string;
  stories: Story[];
  currentStory: Story;
  isPlaying: boolean;
  likedSet: Set<string>;
  progressMap: Record<string, ProgressEntry>;
  onPlayStory: (story: Story, contextList?: Story[]) => void;
  onPlayAll: (stories: Story[], shuffle?: boolean) => void;
  onTogglePlay: () => void;
  onToggleLike: (storyId: string) => void;
  onAddQueue: (story: Story) => void;
  onOpenAuthor: (author: string) => void;
  onHoverPalette: (palette: Palette | null) => void;
}

export function DetailView({
  kind,
  title,
  subtitle,
  coverUrl,
  youtubeUrl,
  stories,
  currentStory,
  isPlaying,
  likedSet,
  progressMap,
  onPlayStory,
  onPlayAll,
  onTogglePlay,
  onToggleLike,
  onAddQueue,
  onOpenAuthor,
  onHoverPalette,
}: DetailViewProps) {
  const { lang, t, digits } = useLanguage();
  const totalSecs = stories.reduce((acc, s) => acc + s.durationSeconds, 0);

  const kindLabel =
    kind === 'Podcast Series'
      ? t('detailKindPodcast')
      : kind === 'Author Collection'
      ? t('detailKindAuthor')
      : t('detailKindSeries');

  return (
    <section className="shelf-section">
      <div className="detail-hero">
        <img
          src="./images/kahon-overlay.png"
          alt=""
          aria-hidden="true"
          className="detail-brand-overlay"
        />
        <CoverImage src={coverUrl} alt={title} className="detail-cover" eager />

        <div className="detail-meta">
          <span className="detail-type">{kindLabel}</span>
          <h1 className="detail-title">{title}</h1>
          {subtitle && <div style={{ fontSize: '0.88rem', color: '#c9c5be' }}>{subtitle}</div>}
          <div className="detail-stats">
            {digits(stories.length)} {stories.length === 1 ? t('episodeSingular') : t('episodePlural')} ·{' '}
            {formatDurationLong(totalSecs, lang)} {t('totalListening')}
          </div>

          <div className="detail-actions">
            {stories.length > 0 && (
              <>
                <button
                  type="button"
                  className="soft-btn soft-btn--accent"
                  onClick={() => onPlayAll(stories, false)}
                >
                  <Play size={16} fill="currentColor" />
                  <span>{t('playAll')}</span>
                </button>
                <button
                  type="button"
                  className="soft-btn"
                  onClick={() => onPlayAll(stories, true)}
                >
                  <Shuffle size={15} />
                  <span>{t('shuffle')}</span>
                </button>
              </>
            )}
            {youtubeUrl && (
              <a
                href={youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="soft-btn"
              >
                <ExternalLink size={15} />
                <span>{t('youtubePlaylist')}</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {stories.length === 0 ? (
        <div className="empty-state">{t('emptyCollection')}</div>
      ) : (
        <div className="tracklist">
          {stories.map((story, idx) => (
            <StoryRow
              key={story.id}
              index={idx}
              story={story}
              isCurrent={currentStory.id === story.id}
              isPlaying={isPlaying}
              isLiked={likedSet.has(story.id)}
              progress={progressMap[story.id]}
              onPlay={(s) => onPlayStory(s, stories)}
              onTogglePlay={onTogglePlay}
              onToggleLike={onToggleLike}
              onAddQueue={onAddQueue}
              onOpenAuthor={onOpenAuthor}
              onHoverPalette={onHoverPalette}
            />
          ))}
        </div>
      )}
    </section>
  );
}
