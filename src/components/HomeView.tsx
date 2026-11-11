import { Headphones, Play, Shuffle, Sparkles } from 'lucide-react';
import { useMemo } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import type { KahonCatalog, NavSection, Palette, Playlist, ProgressEntry, Story } from '../types';
import { formatDurationLong, getTimeGreeting } from '../utils/format';
import { CoverImage } from './CoverImage';
import { PlaylistCard } from './PlaylistCard';
import { StoryCard } from './StoryCard';

interface HomeViewProps {
  catalog: KahonCatalog;
  currentStory: Story;
  isPlaying: boolean;
  likedSet: Set<string>;
  progressMap: Record<string, ProgressEntry>;
  onPlayStory: (story: Story, contextList?: Story[]) => void;
  onTogglePlay: () => void;
  onToggleLike: (storyId: string) => void;
  onAddQueue: (story: Story) => void;
  onPlayPlaylist: (playlist: Playlist, shuffle?: boolean) => void;
  onNavigate: (section: NavSection) => void;
  onHoverPalette: (palette: Palette | null) => void;
  onShuffleChannel: () => void;
}

export function HomeView({
  catalog,
  currentStory,
  isPlaying,
  likedSet,
  progressMap,
  onPlayStory,
  onTogglePlay,
  onToggleLike,
  onAddQueue,
  onPlayPlaylist,
  onNavigate,
  onHoverPalette,
  onShuffleChannel,
}: HomeViewProps) {
  const { lang, t, tf, digits, timeAgoLabel } = useLanguage();
  const greeting = useMemo(() => getTimeGreeting(lang), [lang]);

  const spotlight = catalog.stories[0];

  const quickPickPlaylists = useMemo(() => {
    const preferredOrder = [
      'Kahon Originals',
      'Kahon Detective Stories',
      'Kahon Horror Stories',
      'Kahon Classics',
      'Suspense Thriller',
      'Abhik Arjun Dutta X Kahon',
    ];
    const picked: Playlist[] = [];
    for (const name of preferredOrder) {
      const found = catalog.playlists.find((p) => p.title === name && p.storyCount > 0);
      if (found) picked.push(found);
    }
    if (picked.length < 6) {
      for (const p of catalog.playlists) {
        if (p.storyCount > 0 && !picked.some((x) => x.id === p.id)) {
          picked.push(p);
        }
        if (picked.length === 6) break;
      }
    }
    return picked;
  }, [catalog.playlists]);

  const continueListening = useMemo(() => {
    const storyMap = new Map(catalog.stories.map((s) => [s.id, s]));
    return Object.entries(progressMap)
      .filter(([, p]) => p.position > 15 && (p.duration <= 0 || p.position / p.duration < 0.96))
      .sort((a, b) => b[1].updatedAt - a[1].updatedAt)
      .map(([id]) => storyMap.get(id))
      .filter((s): s is Story => Boolean(s))
      .slice(0, 6);
  }, [catalog.stories, progressMap]);

  const latestStories = useMemo(() => catalog.stories.slice(0, 8), [catalog.stories]);

  const popularStories = useMemo(
    () => [...catalog.stories].sort((a, b) => b.viewsCount - a.viewsCount).slice(0, 8),
    [catalog.stories]
  );

  const marathonStories = useMemo(
    () =>
      catalog.stories
        .filter((s) => s.durationSeconds >= 7200)
        .sort((a, b) => b.durationSeconds - a.durationSeconds)
        .slice(0, 8),
    [catalog.stories]
  );

  const featuredAuthors = useMemo(
    () => catalog.topAuthors.filter((a) => a.name !== 'Kahon Ensemble').slice(0, 8),
    [catalog.topAuthors]
  );

  const featuredPlaylists = useMemo(
    () =>
      catalog.playlists
        .filter((p) => p.storyCount >= 4 && !p.title.toLowerCase().includes('promo'))
        .slice(0, 8),
    [catalog.playlists]
  );

  const renderStoryCards = (list: Story[]) => (
    <div className="cards-grid">
      {list.map((story) => (
        <StoryCard
          key={story.id}
          story={story}
          isCurrent={currentStory.id === story.id}
          isPlaying={isPlaying}
          isLiked={likedSet.has(story.id)}
          progress={progressMap[story.id]}
          onPlay={(s) => onPlayStory(s, list)}
          onTogglePlay={onTogglePlay}
          onToggleLike={onToggleLike}
          onAddQueue={onAddQueue}
          onOpenAuthor={(authorName) => onNavigate({ type: 'author', authorName })}
          onHoverPalette={onHoverPalette}
        />
      ))}
    </div>
  );

  return (
    <>
      <section className="hero-sanctuary">
        <div className="hero-glow" />
        <img
          src="./images/kahon-overlay.png"
          alt=""
          aria-hidden="true"
          className="hero-brand-overlay"
        />
        <div className="hero-content">
          <div className="hero-eyebrow">
            <Sparkles size={14} />
            <span>{greeting.primary} · {greeting.secondary}</span>
          </div>
          <h1 className="hero-title">
            {t('heroTitlePrefix')} <span style={{ color: '#ff9900' }}>{t('heroTitleAccent')}</span>
          </h1>
          <p className="hero-subtitle">
            {greeting.subtext}.{' '}
            {tf('heroBody', {
              count: digits(catalog.stats.totalStories),
              handle: catalog.channel.handle,
            })}
          </p>

          <div className="hero-stats-row">
            <span className="stat-pill">
              <strong>{digits(catalog.stats.totalStories)}</strong> {t('statAudioStories')}
            </span>
            <span className="stat-pill">
              <strong>{digits(catalog.stats.totalPlaylists)}</strong> {t('statCuratedSeries')}
            </span>
            <span className="stat-pill">
              <strong>{digits(catalog.stats.totalDurationHours)}h</strong> {t('statListeningTime')}
            </span>
            <span className="stat-pill">
              <strong>{digits('221K+')}</strong> {t('statListeners')}
            </span>
          </div>

          <div className="hero-actions">
            <button
              type="button"
              className="soft-btn soft-btn--accent"
              onClick={() => onPlayStory(spotlight, latestStories)}
            >
              <Play size={16} fill="currentColor" />
              <span>{t('playLatest')}</span>
            </button>
            <button type="button" className="soft-btn" onClick={onShuffleChannel}>
              <Shuffle size={15} />
              <span>{t('surpriseMe')}</span>
            </button>
            <button
              type="button"
              className="soft-btn"
              onClick={() => onNavigate({ type: 'browse' })}
            >
              <Headphones size={15} />
              <span>{t('exploreAll')}</span>
            </button>
          </div>
        </div>

        <div
          className="hero-spotlight-card"
          onClick={() => onPlayStory(spotlight, latestStories)}
          onMouseEnter={() => onHoverPalette(spotlight.palette)}
          onMouseLeave={() => onHoverPalette(null)}
        >
          <div className="hero-spotlight-img-wrap">
            <CoverImage
              src={spotlight.thumbnail}
              fallbackSrc={spotlight.thumbnailFallback}
              alt={spotlight.title}
              className="hero-spotlight-img"
              eager
            />
            <span className="hero-spotlight-badge">
              {t('latestBadge')}
              {spotlight.durationText ? ` · ${digits(spotlight.durationText)}` : ''}
            </span>
          </div>
          <div className="hero-spotlight-meta">
            <div style={{ minWidth: 0 }}>
              <div className="hero-spotlight-title">{spotlight.title}</div>
              <div className="hero-spotlight-author">
                {spotlight.author} {spotlight.publishedText ? `· ${timeAgoLabel(spotlight.publishedText)}` : ''}
              </div>
            </div>
            <span className="floating-play-circle" style={{ width: 38, height: 38 }}>
              <Play size={16} fill="currentColor" style={{ marginLeft: 2 }} />
            </span>
          </div>
        </div>
      </section>

      <section className="shelf-section">
        <div className="quick-picks-grid">
          {quickPickPlaylists.map((pl) => (
            <div
              key={pl.id}
              className="quick-pick-card"
              onClick={() => onNavigate({ type: 'playlist', playlistId: pl.id })}
              onMouseEnter={() => onHoverPalette(pl.palette)}
              onMouseLeave={() => onHoverPalette(null)}
            >
              <CoverImage
                src={pl.thumbnail}
                alt={pl.title}
                className="quick-pick-thumb"
                eager
              />
              <div className="quick-pick-info">
                <div className="quick-pick-title">{pl.title}</div>
                <div className="quick-pick-sub">
                  {digits(pl.storyCount)} {pl.storyCount === 1 ? t('storySingular') : t('storyPlural')} ·{' '}
                  {formatDurationLong(pl.totalDurationSeconds, lang)}
                </div>
              </div>
              <button
                type="button"
                className="floating-play-circle"
                aria-label={`${t('play')} ${pl.title}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onPlayPlaylist(pl);
                }}
              >
                <Play size={16} fill="currentColor" style={{ marginLeft: 2 }} />
              </button>
            </div>
          ))}
        </div>
      </section>

      {continueListening.length > 0 && (
        <section className="shelf-section">
          <div className="shelf-header">
            <div>
              <h2 className="shelf-title">{t('continueListening')}</h2>
              <p className="shelf-subtitle">{t('continueSub')}</p>
            </div>
            <button
              type="button"
              className="shelf-action-link"
              onClick={() => onNavigate({ type: 'library', tab: 'resume' })}
            >
              {t('seeAll')}
            </button>
          </div>
          {renderStoryCards(continueListening)}
        </section>
      )}

      <section className="shelf-section">
        <div className="shelf-header">
          <div>
            <h2 className="shelf-title">{t('freshTitle')}</h2>
            <p className="shelf-subtitle">{t('freshSub')}</p>
          </div>
          <button
            type="button"
            className="shelf-action-link"
            onClick={() => onNavigate({ type: 'browse' })}
          >
            {tf('browseAllCount', { count: digits(catalog.stats.totalStories) })}
          </button>
        </div>
        {renderStoryCards(latestStories)}
      </section>

      <section className="shelf-section">
        <div className="shelf-header">
          <div>
            <h2 className="shelf-title">{t('favoritesTitle')}</h2>
            <p className="shelf-subtitle">{t('favoritesSub')}</p>
          </div>
          <button
            type="button"
            className="shelf-action-link"
            onClick={() => onNavigate({ type: 'browse' })}
          >
            {t('explore')}
          </button>
        </div>
        {renderStoryCards(popularStories)}
      </section>

      <section className="shelf-section">
        <div className="shelf-header">
          <div>
            <h2 className="shelf-title">{t('authorsTitle')}</h2>
            <p className="shelf-subtitle">{t('authorsSub')}</p>
          </div>
        </div>
        <div className="authors-row">
          {featuredAuthors.map((author) => (
            <button
              key={author.name}
              type="button"
              className="author-card"
              onClick={() => onNavigate({ type: 'author', authorName: author.name })}
            >
              <span className="author-monogram">{author.name.charAt(0).toUpperCase()}</span>
              <span className="author-name">{author.name}</span>
              <span className="author-count">
                {digits(author.count)} {author.count === 1 ? t('storySingular') : t('storyPlural')}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="shelf-section">
        <div className="shelf-header">
          <div>
            <h2 className="shelf-title">{t('seriesTitle')}</h2>
            <p className="shelf-subtitle">{t('seriesSub')}</p>
          </div>
          <button
            type="button"
            className="shelf-action-link"
            onClick={() => onNavigate({ type: 'playlists' })}
          >
            {tf('allSeriesCount', { count: digits(catalog.stats.totalPlaylists) })}
          </button>
        </div>
        <div className="cards-grid">
          {featuredPlaylists.map((pl) => (
            <PlaylistCard
              key={pl.id}
              playlist={pl}
              onOpen={(playlistId) => onNavigate({ type: 'playlist', playlistId })}
              onPlayPlaylist={(p) => onPlayPlaylist(p)}
              onHoverPalette={onHoverPalette}
            />
          ))}
        </div>
      </section>

      <section className="shelf-section">
        <div className="shelf-header">
          <div>
            <h2 className="shelf-title">{t('marathonsTitle')}</h2>
            <p className="shelf-subtitle">{t('marathonsSub')}</p>
          </div>
        </div>
        {renderStoryCards(marathonStories)}
      </section>
    </>
  );
}
