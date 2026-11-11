import { ChevronDown, ExternalLink, Heart, Pause, Play, RotateCcw, RotateCw, SkipBack, SkipForward } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import type { Story } from '../types';
import type { CarouselNeighbors, CarouselReason } from '../utils/carousel';
import { formatTime } from '../utils/format';
import { CoverImage } from './CoverImage';

interface ImmersiveModalProps {
  story: Story;
  carousel: CarouselNeighbors;
  isPlaying: boolean;
  isLiked: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  onClose: () => void;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSelectPrevNeighbor: (story: Story) => void;
  onSelectNextNeighbor: (story: Story) => void;
  onSeek: (seconds: number) => void;
  onSkipBy: (delta: number) => void;
  onToggleLike: (storyId: string) => void;
  onCycleSpeed: () => void;
}

export function ImmersiveModal({
  story,
  carousel,
  isPlaying,
  isLiked,
  currentTime,
  duration,
  playbackRate,
  onClose,
  onTogglePlay,
  onPrev,
  onNext,
  onSelectPrevNeighbor,
  onSelectNextNeighbor,
  onSeek,
  onSkipBy,
  onToggleLike,
  onCycleSpeed,
}: ImmersiveModalProps) {
  const { lang, t, digits, genreLabel, viewsLabel } = useLanguage();
  const effectiveDuration = duration > 0 ? duration : story.durationSeconds;
  const pct = effectiveDuration > 0 ? Math.min(100, (currentTime / effectiveDuration) * 100) : 0;

  const reasonLabel = (reason: CarouselReason, side: 'prev' | 'next'): string => {
    if (reason === 'series') return t('carouselSeries');
    if (reason === 'queue') return t('carouselQueue');
    if (reason === 'suggested') return t('carouselSuggested');
    return side === 'prev' ? t('carouselPrev') : t('carouselNext');
  };

  return (
    <div className="immersive-overlay" role="dialog" aria-modal="true" aria-label={t('immersiveHeader')}>
      <img
        src="./images/kahon-overlay.png"
        alt=""
        aria-hidden="true"
        className="immersive-brand-overlay"
      />
      <div className="immersive-top">
        <button type="button" className="soft-btn" onClick={onClose}>
          <ChevronDown size={17} />
          <span>{t('backToLibrary')}</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img
            src="./images/kahon-logo.jpg"
            alt="Kahon"
            style={{
              width: 34,
              height: 34,
              aspectRatio: '1 / 1',
              borderRadius: 9,
              objectFit: 'cover',
              border: '1px solid rgba(255,153,0,0.45)',
              flexShrink: 0,
            }}
          />
          <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#ff9900' }}>
            {t('immersiveHeader')}
          </span>
        </div>

        <a
          href={story.youtubeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="soft-btn"
        >
          <ExternalLink size={15} />
          <span>{t('openYtShort')}</span>
        </a>
      </div>

      <div className="immersive-body">
        <div className="immersive-carousel">
          {carousel.prevStory ? (
            <button
              type="button"
              className="immersive-side-card immersive-side-card--left"
              onClick={() => onSelectPrevNeighbor(carousel.prevStory!)}
              title={`${t('carouselPrev')}: ${carousel.prevStory.title}`}
            >
              <div className="immersive-side-thumb">
                <CoverImage
                  src={carousel.prevStory.thumbnail}
                  fallbackSrc={carousel.prevStory.thumbnailFallback}
                  alt={carousel.prevStory.title}
                  eager
                />
              </div>
              <span className="np-neighbor-tag">
                ← {reasonLabel(carousel.prevReason, 'prev')}
              </span>
              <span className="np-neighbor-title">{carousel.prevStory.title}</span>
              <span style={{ fontSize: '0.7rem', color: '#818181' }}>
                {carousel.prevStory.author}
              </span>
            </button>
          ) : (
            <div />
          )}

          <div className="immersive-art-frame">
            <CoverImage
              src={story.thumbnail}
              fallbackSrc={story.thumbnailFallback}
              alt={story.title}
              eager
            />
          </div>

          {carousel.nextStory ? (
            <button
              type="button"
              className="immersive-side-card immersive-side-card--right"
              onClick={() => onSelectNextNeighbor(carousel.nextStory!)}
              title={`${t('carouselNext')}: ${carousel.nextStory.title}`}
            >
              <div className="immersive-side-thumb">
                <CoverImage
                  src={carousel.nextStory.thumbnail}
                  fallbackSrc={carousel.nextStory.thumbnailFallback}
                  alt={carousel.nextStory.title}
                  eager
                />
              </div>
              <span className="np-neighbor-tag">
                {reasonLabel(carousel.nextReason, 'next')} →
              </span>
              <span className="np-neighbor-title">{carousel.nextStory.title}</span>
              <span style={{ fontSize: '0.7rem', color: '#818181' }}>
                {carousel.nextStory.author}
              </span>
            </button>
          ) : (
            <div />
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#ff9900', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {story.series || genreLabel(story.genres[0])}
          </div>
          <h2 style={{ margin: 0, fontSize: 'clamp(1.35rem, 2.5vw, 2.05rem)', fontWeight: 800, lineHeight: 1.2 }}>
            {story.title}
          </h2>
          <div style={{ fontSize: '0.96rem', color: '#c9c5be' }}>
            {story.author} {story.viewsText ? `· ${viewsLabel(story.viewsText)}` : ''}
          </div>
        </div>

        <div className="immersive-controls">
          <div className="scrubber-row">
            <span className="time-label">{formatTime(currentTime, lang)}</span>
            <input
              type="range"
              min={0}
              max={Math.max(1, Math.floor(effectiveDuration))}
              value={Math.min(Math.floor(currentTime), Math.max(1, Math.floor(effectiveDuration)))}
              onChange={(e) => onSeek(Number(e.target.value))}
              className="dream-range"
              style={{
                background: `linear-gradient(90deg, #ff9900 ${pct}%, rgba(129, 129, 129, 0.34) ${pct}%)`,
              }}
            />
            <span className="time-label time-label--right">{formatTime(effectiveDuration, lang)}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18 }}>
            <button
              type="button"
              className={`mini-icon-btn ${isLiked ? 'mini-icon-btn--liked' : ''}`}
              onClick={() => onToggleLike(story.id)}
              title={t('likeStory')}
            >
              <Heart size={20} fill={isLiked ? 'currentColor' : 'none'} />
            </button>

            <button type="button" className="ctrl-btn" onClick={onPrev} title={t('previousStory')}>
              <SkipBack size={22} />
            </button>

            <button type="button" className="ctrl-btn" onClick={() => onSkipBy(-15)} title={t('rewind15')}>
              <RotateCcw size={20} />
            </button>

            <button
              type="button"
              className="ctrl-btn ctrl-btn--play"
              style={{ width: 60, height: 60 }}
              onClick={onTogglePlay}
              aria-label={isPlaying ? t('pause') : t('play')}
            >
              {isPlaying ? <Pause size={26} fill="currentColor" /> : <Play size={26} fill="currentColor" style={{ marginLeft: 3 }} />}
            </button>

            <button type="button" className="ctrl-btn" onClick={() => onSkipBy(30)} title={t('forward30')}>
              <RotateCw size={20} />
            </button>

            <button type="button" className="ctrl-btn" onClick={onNext} title={t('nextStory')}>
              <SkipForward size={22} />
            </button>

            <button
              type="button"
              className={`speed-pill ${playbackRate !== 1 ? 'speed-pill--active' : ''}`}
              onClick={onCycleSpeed}
            >
              {digits(playbackRate)}x
            </button>
          </div>
        </div>
      </div>

      <div style={{ height: 12 }} />
    </div>
  );
}
