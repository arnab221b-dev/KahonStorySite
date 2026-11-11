import { LayoutGrid, List, Play } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import type { KahonCatalog, Palette, ProgressEntry, Story } from '../types';
import { StoryCard } from './StoryCard';
import { StoryRow } from './StoryRow';

interface BrowseViewProps {
  catalog: KahonCatalog;
  searchQuery: string;
  initialGenre?: string;
  currentStory: Story;
  isPlaying: boolean;
  likedSet: Set<string>;
  progressMap: Record<string, ProgressEntry>;
  onPlayStory: (story: Story, contextList?: Story[]) => void;
  onTogglePlay: () => void;
  onToggleLike: (storyId: string) => void;
  onAddQueue: (story: Story) => void;
  onOpenAuthor: (author: string) => void;
  onHoverPalette: (palette: Palette | null) => void;
}

type SortOption = 'newest' | 'popular' | 'longest' | 'shortest';

export function BrowseView({
  catalog,
  searchQuery,
  initialGenre,
  currentStory,
  isPlaying,
  likedSet,
  progressMap,
  onPlayStory,
  onTogglePlay,
  onToggleLike,
  onAddQueue,
  onOpenAuthor,
  onHoverPalette,
}: BrowseViewProps) {
  const [selectedGenre, setSelectedGenre] = useState<string>(initialGenre || 'All');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [limit, setLimit] = useState(48);
  const { t, tf, digits, genreLabel } = useLanguage();

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = catalog.stories.filter((s) => {
      if (selectedGenre !== 'All' && !s.genres.includes(selectedGenre)) return false;
      if (!q) return true;
      const hay = `${s.title} ${s.rawTitle} ${s.author} ${s.series || ''} ${s.genres.join(' ')} ${s.playlists
        .map((p) => p.title)
        .join(' ')}`.toLowerCase();
      return hay.includes(q);
    });

    if (sortBy === 'popular') {
      list = [...list].sort((a, b) => b.viewsCount - a.viewsCount);
    } else if (sortBy === 'longest') {
      list = [...list].sort((a, b) => b.durationSeconds - a.durationSeconds);
    } else if (sortBy === 'shortest') {
      list = [...list].sort((a, b) => a.durationSeconds - b.durationSeconds);
    }
    return list;
  }, [catalog.stories, searchQuery, selectedGenre, sortBy]);

  const visible = filtered.slice(0, limit);

  return (
    <section className="shelf-section">
      <div className="shelf-header" style={{ flexWrap: 'wrap' }}>
        <div>
          <h1 className="shelf-title" style={{ fontSize: '1.55rem' }}>
            {searchQuery.trim()
              ? tf('resultsFor', { query: searchQuery.trim() })
              : t('browseCatalog')}
          </h1>
          <p className="shelf-subtitle">
            {tf('showingOf', {
              visible: digits(visible.length),
              total: digits(filtered.length),
            })}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {filtered.length > 0 && (
            <button
              type="button"
              className="soft-btn soft-btn--accent"
              onClick={() => onPlayStory(filtered[0], filtered)}
            >
              <Play size={15} fill="currentColor" />
              <span>{t('playFiltered')}</span>
            </button>
          )}

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            aria-label="Sort stories"
            className="soft-btn"
            style={{ backgroundColor: '#313131' }}
          >
            <option value="newest">{t('sortNewest')}</option>
            <option value="popular">{t('sortPopular')}</option>
            <option value="longest">{t('sortLongest')}</option>
            <option value="shortest">{t('sortShortest')}</option>
          </select>

          <button
            type="button"
            className="icon-circle-btn"
            onClick={() => setViewMode((v) => (v === 'grid' ? 'list' : 'grid'))}
            aria-label="Toggle view mode"
          >
            {viewMode === 'grid' ? <List size={16} /> : <LayoutGrid size={16} />}
          </button>
        </div>
      </div>

      <div className="filter-bar">
        <button
          type="button"
          className={`pill-chip ${selectedGenre === 'All' ? 'pill-chip--active' : ''}`}
          onClick={() => {
            setSelectedGenre('All');
            setLimit(48);
          }}
        >
          {t('filterAll')} ({digits(catalog.stats.totalStories)})
        </button>
        {catalog.genres.map((g) => (
          <button
            key={g.name}
            type="button"
            className={`pill-chip ${selectedGenre === g.name ? 'pill-chip--active' : ''}`}
            onClick={() => {
              setSelectedGenre(g.name);
              setLimit(48);
            }}
          >
            {genreLabel(g.name)} ({digits(g.count)})
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="empty-state">{t('noMatches')}</div>
      ) : viewMode === 'grid' ? (
        <div className="cards-grid">
          {visible.map((story) => (
            <StoryCard
              key={story.id}
              story={story}
              isCurrent={currentStory.id === story.id}
              isPlaying={isPlaying}
              isLiked={likedSet.has(story.id)}
              progress={progressMap[story.id]}
              onPlay={(s) => onPlayStory(s, filtered)}
              onTogglePlay={onTogglePlay}
              onToggleLike={onToggleLike}
              onAddQueue={onAddQueue}
              onOpenAuthor={onOpenAuthor}
              onHoverPalette={onHoverPalette}
            />
          ))}
        </div>
      ) : (
        <div className="tracklist">
          {visible.map((story, idx) => (
            <StoryRow
              key={story.id}
              index={idx}
              story={story}
              isCurrent={currentStory.id === story.id}
              isPlaying={isPlaying}
              isLiked={likedSet.has(story.id)}
              progress={progressMap[story.id]}
              onPlay={(s) => onPlayStory(s, filtered)}
              onTogglePlay={onTogglePlay}
              onToggleLike={onToggleLike}
              onAddQueue={onAddQueue}
              onOpenAuthor={onOpenAuthor}
              onHoverPalette={onHoverPalette}
            />
          ))}
        </div>
      )}

      {visible.length < filtered.length && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 10 }}>
          <button
            type="button"
            className="soft-btn"
            onClick={() => setLimit((n) => n + 48)}
          >
            {tf('loadMore', { remaining: digits(filtered.length - visible.length) })}
          </button>
        </div>
      )}
    </section>
  );
}
