import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Heart,
  ListMusic,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import type { EmbedErrorCode } from '../hooks/useYouTubePlayer';
import { useLanguage } from '../i18n/LanguageContext';
import { localizePlaylistMeta } from '../i18n/translations';
import type { ChannelInfo, Story } from '../types';
import type { CarouselNeighbors, CarouselReason } from '../utils/carousel';
import { CoverImage } from './CoverImage';
import { EqualizerBars } from './EqualizerBars';

interface NowPlayingPanelProps {
  currentStory: Story;
  carousel: CarouselNeighbors;
  channel: ChannelInfo;
  queue: Story[];
  isPlaying: boolean;
  isLiked: boolean;
  embedError: EmbedErrorCode;
  tab: 'now' | 'queue';
  stageSlotRef: React.RefObject<HTMLDivElement>;
  desktopHidden: boolean;
  openMobile: boolean;
  onChangeTab: (tab: 'now' | 'queue') => void;
  onCloseMobile: () => void;
  onToggleLike: (storyId: string) => void;
  onPlayStory: (story: Story) => void;
  onSelectPrevNeighbor: (story: Story) => void;
  onSelectNextNeighbor: (story: Story) => void;
  onRemoveFromQueue: (index: number) => void;
  onClearQueue: () => void;
  onOpenPlaylist: (playlistId: string) => void;
  onOpenAuthor: (author: string) => void;
}

export function NowPlayingPanel({
  currentStory,
  carousel,
  channel,
  queue,
  isPlaying,
  isLiked,
  embedError,
  tab,
  stageSlotRef,
  desktopHidden,
  openMobile,
  onChangeTab,
  onCloseMobile,
  onToggleLike,
  onPlayStory,
  onSelectPrevNeighbor,
  onSelectNextNeighbor,
  onRemoveFromQueue,
  onClearQueue,
  onOpenPlaylist,
  onOpenAuthor,
}: NowPlayingPanelProps) {
  const { lang, t, digits, genreLabel, timeAgoLabel, viewsLabel } = useLanguage();

  const embedErrorText =
    embedError === 'restricted'
      ? t('embedRestricted')
      : embedError === 'missing'
      ? t('embedMissing')
      : embedError === 'paused'
      ? t('embedPaused')
      : null;

  const reasonLabel = (reason: CarouselReason, side: 'prev' | 'next'): string => {
    if (reason === 'series') return t('carouselSeries');
    if (reason === 'queue') return t('carouselQueue');
    if (reason === 'suggested') return t('carouselSuggested');
    return side === 'prev' ? t('carouselPrev') : t('carouselNext');
  };

  return (
    <aside
      className={`right-panel glass-panel ${desktopHidden ? 'right-panel--hidden-desktop' : ''} ${
        openMobile ? 'right-panel--open-mobile' : ''
      }`}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div className="panel-tabs" style={{ flex: 1 }}>
          <button
            type="button"
            className={`panel-tab ${tab === 'now' ? 'panel-tab--active' : ''}`}
            onClick={() => onChangeTab('now')}
          >
            {t('nowPlaying')}
          </button>
          <button
            type="button"
            className={`panel-tab ${tab === 'queue' ? 'panel-tab--active' : ''}`}
            onClick={() => onChangeTab('queue')}
          >
            {t('queue')} ({digits(queue.length)})
          </button>
        </div>

        {openMobile && (
          <button
            type="button"
            className="icon-circle-btn"
            aria-label="Close panel"
            onClick={onCloseMobile}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Carousel in Now Playing tab: Previous on Left, Live YouTube Stage Middle, Next on Right */}
      {tab === 'now' && (
        <div className="np-carousel">
          <div className="np-carousel-stage">
            {carousel.prevStory ? (
              <button
                type="button"
                className="np-peek-card"
                title={`${t('carouselPrev')}: ${carousel.prevStory.title}`}
                aria-label={`${t('carouselPrev')}: ${carousel.prevStory.title}`}
                onClick={() => onSelectPrevNeighbor(carousel.prevStory!)}
              >
                <CoverImage
                  src={carousel.prevStory.thumbnail}
                  fallbackSrc={carousel.prevStory.thumbnailFallback}
                  alt={carousel.prevStory.title}
                  eager
                />
                <span className="np-peek-chevron">
                  <ChevronLeft size={18} />
                </span>
              </button>
            ) : (
              <div />
            )}

            <div ref={stageSlotRef} className="media-stage-card" />

            {carousel.nextStory ? (
              <button
                type="button"
                className="np-peek-card"
                title={`${t('carouselNext')}: ${carousel.nextStory.title}`}
                aria-label={`${t('carouselNext')}: ${carousel.nextStory.title}`}
                onClick={() => onSelectNextNeighbor(carousel.nextStory!)}
              >
                <CoverImage
                  src={carousel.nextStory.thumbnail}
                  fallbackSrc={carousel.nextStory.thumbnailFallback}
                  alt={carousel.nextStory.title}
                  eager
                />
                <span className="np-peek-chevron">
                  <ChevronRight size={18} />
                </span>
              </button>
            ) : (
              <div />
            )}
          </div>

          <div className="np-carousel-captions">
            {carousel.prevStory ? (
              <button
                type="button"
                className="np-neighbor-pill"
                onClick={() => onSelectPrevNeighbor(carousel.prevStory!)}
              >
                <span className="np-neighbor-tag">
                  ← {reasonLabel(carousel.prevReason, 'prev')}
                </span>
                <span className="np-neighbor-title">{carousel.prevStory.title}</span>
              </button>
            ) : (
              <div />
            )}
            {carousel.nextStory ? (
              <button
                type="button"
                className="np-neighbor-pill np-neighbor-pill--right"
                onClick={() => onSelectNextNeighbor(carousel.nextStory!)}
              >
                <span className="np-neighbor-tag">
                  {reasonLabel(carousel.nextReason, 'next')} →
                </span>
                <span className="np-neighbor-title">{carousel.nextStory.title}</span>
              </button>
            ) : (
              <div />
            )}
          </div>
        </div>
      )}

      <div className="right-panel-scroll">
        {embedErrorText && (
          <div className="toast-banner">
            <span>{embedErrorText}</span>
            <a
              href={currentStory.youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#ff9900', fontWeight: 700, whiteSpace: 'nowrap' }}
            >
              {t('openYtShort')}
            </a>
          </div>
        )}

        {tab === 'now' ? (
          <>
            <div className="now-meta-card">
              <div className="now-author-row">
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#ff9900', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  {isPlaying ? t('streamingAudio') : t('readyToListen')}
                </span>
                <button
                  type="button"
                  className={`mini-icon-btn ${isLiked ? 'mini-icon-btn--liked' : ''}`}
                  onClick={() => onToggleLike(currentStory.id)}
                  aria-label={isLiked ? t('unlikeStory') : t('likeStory')}
                >
                  <Heart size={16} fill={isLiked ? 'currentColor' : 'none'} />
                </button>
              </div>

              <h3 className="now-story-title">{currentStory.title}</h3>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                <button
                  type="button"
                  className="pill-chip pill-chip--active"
                  onClick={() => onOpenAuthor(currentStory.author)}
                >
                  {currentStory.author}
                </button>
                {currentStory.genres.slice(0, 3).map((g) => (
                  <span key={g} className="pill-chip" style={{ cursor: 'default' }}>
                    {genreLabel(g)}
                  </span>
                ))}
              </div>

              <div style={{ fontSize: '0.78rem', color: '#818181', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                <span>{currentStory.viewsText ? viewsLabel(currentStory.viewsText) : 'Kahon'}</span>
                <span>{timeAgoLabel(currentStory.publishedText)}</span>
              </div>

              {currentStory.playlists.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                  <div style={{ fontSize: '0.72rem', color: '#818181', fontWeight: 700 }}>
                    {t('featuredInSeries')}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {currentStory.playlists.slice(0, 4).map((pl) => (
                      <button
                        key={pl.id}
                        type="button"
                        className="pill-chip"
                        onClick={() => onOpenPlaylist(pl.id)}
                      >
                        <ListMusic size={11} style={{ marginRight: 5, verticalAlign: '-1px' }} />
                        {pl.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="palette-swatches">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <Sparkles size={13} color="#ff9900" />
                  {t('coverAmbientPalette')}
                </span>
                <div className="swatch-row">
                  <span className="swatch-chip" style={{ backgroundColor: currentStory.palette.vibrant }} />
                  <span className="swatch-chip" style={{ backgroundColor: currentStory.palette.dominant }} />
                  <span className="swatch-chip" style={{ backgroundColor: currentStory.palette.secondary }} />
                  <span className="swatch-chip" style={{ backgroundColor: currentStory.palette.deep }} />
                </div>
              </div>

              <a
                href={currentStory.youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="soft-btn"
                style={{ justifyContent: 'center', marginTop: 2 }}
              >
                <ExternalLink size={14} />
                <span>{t('openOnYoutube')}</span>
              </a>
            </div>

            <div className="about-kahon-card">
              <div className="about-kahon-header">
                <img
                  src="./images/kahon-logo.jpg"
                  alt={channel.name}
                  className="about-kahon-avatar"
                />
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700 }}>
                    {t('brandTitle')} · {t('brandTitleBn')}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#818181' }}>
                    {channel.handle} · {localizePlaylistMeta(channel.metaSummary, lang)}
                  </div>
                </div>
              </div>
              <p className="about-kahon-bio">{t('aboutKahonBio')}</p>
              <div className="about-kahon-overlay-wrap">
                <img
                  src="./images/kahon-overlay.png"
                  alt="Kahon — সাহিত্য দীর্ঘজীবী হোক"
                  className="about-kahon-overlay-img"
                />
              </div>
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.76rem', color: '#818181', fontWeight: 700, textTransform: 'uppercase' }}>
                {t('nowPlaying')}
              </span>
              {queue.length > 0 && (
                <button
                  type="button"
                  className="shelf-action-link"
                  onClick={onClearQueue}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                >
                  <Trash2 size={12} /> {t('clearUpNext')}
                </button>
              )}
            </div>

            <div className="queue-item" style={{ borderColor: 'rgba(255, 153, 0, 0.45)' }}>
              <CoverImage
                src={currentStory.thumbnail}
                fallbackSrc={currentStory.thumbnailFallback}
                alt={currentStory.title}
                className="queue-item-thumb"
                eager
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="sidebar-playlist-name" style={{ color: '#ff9900' }}>
                  {currentStory.title}
                </div>
                <div className="sidebar-playlist-sub">{currentStory.author}</div>
              </div>
              {isPlaying && <EqualizerBars />}
            </div>

            <div style={{ fontSize: '0.76rem', color: '#818181', fontWeight: 700, textTransform: 'uppercase', marginTop: 6 }}>
              {t('upNext')} ({digits(queue.length)})
            </div>

            {queue.length === 0 ? (
              <div className="empty-state" style={{ padding: '24px 14px', fontSize: '0.82rem' }}>
                {t('emptyQueue')}
              </div>
            ) : (
              queue.map((item, idx) => (
                <div
                  key={`${item.id}-${idx}`}
                  className="queue-item"
                  onClick={() => onPlayStory(item)}
                >
                  <CoverImage
                    src={item.thumbnail}
                    fallbackSrc={item.thumbnailFallback}
                    alt={item.title}
                    className="queue-item-thumb"
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="sidebar-playlist-name">{item.title}</div>
                    <div className="sidebar-playlist-sub">
                      {item.author}
                      {item.durationText ? ` · ${digits(item.durationText)}` : ''}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="mini-icon-btn"
                    title={t('removeFromQueue')}
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveFromQueue(idx);
                    }}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
