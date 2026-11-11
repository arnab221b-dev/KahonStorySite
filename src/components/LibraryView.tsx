import { Clock, Heart, History, Play } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import type { KahonCatalog, Palette, ProgressEntry, Story } from '../types';
import { StoryRow } from './StoryRow';

interface LibraryViewProps {
  catalog: KahonCatalog;
  initialTab?: 'liked' | 'history' | 'resume';
  likedIds: string[];
  historyIds: string[];
  progressMap: Record<string, ProgressEntry>;
  currentStory: Story;
  isPlaying: boolean;
  likedSet: Set<string>;
  onPlayStory: (story: Story, contextList?: Story[]) => void;
  onTogglePlay: () => void;
  onToggleLike: (storyId: string) => void;
  onAddQueue: (story: Story) => void;
  onOpenAuthor: (author: string) => void;
  onHoverPalette: (palette: Palette | null) => void;
}

export function LibraryView({
  catalog,
  initialTab = 'liked',
  likedIds,
  historyIds,
  progressMap,
  currentStory,
  isPlaying,
  likedSet,
  onPlayStory,
  onTogglePlay,
  onToggleLike,
  onAddQueue,
  onOpenAuthor,
  onHoverPalette,
}: LibraryViewProps) {
  const [tab, setTab] = useState<'liked' | 'resume' | 'history'>(initialTab);
  const { t, digits } = useLanguage();
  const storyMap = useMemo(() => new Map(catalog.stories.map((s) => [s.id, s])), [catalog.stories]);

  const likedStories = useMemo(
    () => likedIds.map((id) => storyMap.get(id)).filter((s): s is Story => Boolean(s)),
    [likedIds, storyMap]
  );

  const resumeStories = useMemo(
    () =>
      Object.entries(progressMap)
        .filter(([, p]) => p.position > 15 && (p.duration <= 0 || p.position / p.duration < 0.96))
        .sort((a, b) => b[1].updatedAt - a[1].updatedAt)
        .map(([id]) => storyMap.get(id))
        .filter((s): s is Story => Boolean(s)),
    [progressMap, storyMap]
  );

  const historyStories = useMemo(
    () => historyIds.map((id) => storyMap.get(id)).filter((s): s is Story => Boolean(s)),
    [historyIds, storyMap]
  );

  const activeList = tab === 'liked' ? likedStories : tab === 'resume' ? resumeStories : historyStories;

  return (
    <section className="shelf-section">
      <div className="shelf-header" style={{ flexWrap: 'wrap' }}>
        <div>
          <h1 className="shelf-title" style={{ fontSize: '1.55rem' }}>
            {t('navLibrary')}
          </h1>
          <p className="shelf-subtitle">{t('librarySub')}</p>
        </div>

        {activeList.length > 0 && (
          <button
            type="button"
            className="soft-btn soft-btn--accent"
            onClick={() => onPlayStory(activeList[0], activeList)}
          >
            <Play size={15} fill="currentColor" />
            <span>{t('playAll')}</span>
          </button>
        )}
      </div>

      <div className="filter-bar">
        <button
          type="button"
          className={`pill-chip ${tab === 'liked' ? 'pill-chip--active' : ''}`}
          onClick={() => setTab('liked')}
        >
          <Heart size={12} style={{ marginRight: 5, verticalAlign: '-1px' }} />
          {t('tabLiked')} ({digits(likedStories.length)})
        </button>
        <button
          type="button"
          className={`pill-chip ${tab === 'resume' ? 'pill-chip--active' : ''}`}
          onClick={() => setTab('resume')}
        >
          <Clock size={12} style={{ marginRight: 5, verticalAlign: '-1px' }} />
          {t('tabInProgress')} ({digits(resumeStories.length)})
        </button>
        <button
          type="button"
          className={`pill-chip ${tab === 'history' ? 'pill-chip--active' : ''}`}
          onClick={() => setTab('history')}
        >
          <History size={12} style={{ marginRight: 5, verticalAlign: '-1px' }} />
          {t('tabRecent')} ({digits(historyStories.length)})
        </button>
      </div>

      {activeList.length === 0 ? (
        <div className="empty-state">
          {tab === 'liked' && t('emptyLiked')}
          {tab === 'resume' && t('emptyResume')}
          {tab === 'history' && t('emptyHistory')}
        </div>
      ) : (
        <div className="tracklist">
          {activeList.map((story, idx) => (
            <StoryRow
              key={story.id}
              index={idx}
              story={story}
              isCurrent={currentStory.id === story.id}
              isPlaying={isPlaying}
              isLiked={likedSet.has(story.id)}
              progress={progressMap[story.id]}
              onPlay={(s) => onPlayStory(s, activeList)}
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
