import {
  Heart,
  ListOrdered,
  Maximize2,
  Moon,
  Pause,
  Play,
  Repeat,
  Repeat1,
  RotateCcw,
  RotateCw,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import type { RepeatMode, Story } from '../types';
import { formatTime } from '../utils/format';
import { CoverImage } from './CoverImage';

interface PlayerBarProps {
  story: Story;
  isPlaying: boolean;
  isBuffering: boolean;
  isLiked: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  playbackRate: number;
  shuffle: boolean;
  repeatMode: RepeatMode;
  sleepMinutesLeft: number | null;
  sleepEndOfStory: boolean;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (seconds: number) => void;
  onSkipBy: (delta: number) => void;
  onToggleLike: (storyId: string) => void;
  onVolumeChange: (v: number) => void;
  onToggleMute: () => void;
  onCycleSpeed: () => void;
  onToggleShuffle: () => void;
  onCycleRepeat: () => void;
  onSelectSleepTimer: (mode: number | 'end' | null) => void;
  onToggleQueue: () => void;
  onOpenImmersive: () => void;
  onOpenAuthor: (author: string) => void;
}

export function PlayerBar({
  story,
  isPlaying,
  isBuffering,
  isLiked,
  currentTime,
  duration,
  volume,
  muted,
  playbackRate,
  shuffle,
  repeatMode,
  sleepMinutesLeft,
  sleepEndOfStory,
  onTogglePlay,
  onPrev,
  onNext,
  onSeek,
  onSkipBy,
  onToggleLike,
  onVolumeChange,
  onToggleMute,
  onCycleSpeed,
  onToggleShuffle,
  onCycleRepeat,
  onSelectSleepTimer,
  onToggleQueue,
  onOpenImmersive,
  onOpenAuthor,
}: PlayerBarProps) {
  const [sleepMenuOpen, setSleepMenuOpen] = useState(false);
  const { lang, t, digits } = useLanguage();

  const effectiveDuration = duration > 0 ? duration : story.durationSeconds;
  const pct = effectiveDuration > 0 ? Math.min(100, (currentTime / effectiveDuration) * 100) : 0;

  return (
    <footer className="player-bar" aria-label="Audio Story Player Controls">
      <div className="player-track-info">
        <button
          type="button"
          className="player-cover-btn"
          onClick={onOpenImmersive}
          title={t('immersiveHeader')}
        >
          <CoverImage
            src={story.thumbnail}
            fallbackSrc={story.thumbnailFallback}
            alt={story.title}
            eager
          />
        </button>

        <div className="player-title-wrap">
          <div className="player-story-title" onClick={onOpenImmersive} title={story.title}>
            {story.title}
          </div>
          <div
            className="player-story-author"
            style={{ cursor: 'pointer' }}
            onClick={() => onOpenAuthor(story.author)}
          >
            {story.author}
          </div>
        </div>

        <button
          type="button"
          className={`mini-icon-btn ${isLiked ? 'mini-icon-btn--liked' : ''}`}
          onClick={() => onToggleLike(story.id)}
          aria-label={isLiked ? t('unlikeStory') : t('likeStory')}
        >
          <Heart size={17} fill={isLiked ? 'currentColor' : 'none'} />
        </button>
      </div>

      <div className="player-center">
        <div className="player-controls-row">
          <button
            type="button"
            className={`ctrl-btn ${shuffle ? 'ctrl-btn--active' : ''}`}
            onClick={onToggleShuffle}
            title={t('shuffle')}
            aria-label={t('shuffle')}
          >
            <Shuffle size={15} />
          </button>

          <button
            type="button"
            className="ctrl-btn"
            onClick={onPrev}
            title={t('previousStory')}
            aria-label={t('previousStory')}
          >
            <SkipBack size={17} />
          </button>

          <button
            type="button"
            className="ctrl-btn ctrl-btn--skip"
            onClick={() => onSkipBy(-15)}
            title={t('rewind15')}
            aria-label={t('rewind15')}
          >
            <RotateCcw size={14} />
            <span className="skip-label">{digits(15)}s</span>
          </button>

          <button
            type="button"
            className="ctrl-btn ctrl-btn--play"
            onClick={onTogglePlay}
            aria-label={isPlaying ? t('pause') : t('play')}
            title={isPlaying ? t('pause') : t('play')}
          >
            {isBuffering ? (
              <span style={{ fontSize: '0.7rem', fontWeight: 800 }}>...</span>
            ) : isPlaying ? (
              <Pause size={19} fill="currentColor" />
            ) : (
              <Play size={19} fill="currentColor" style={{ marginLeft: 2 }} />
            )}
          </button>

          <button
            type="button"
            className="ctrl-btn ctrl-btn--skip"
            onClick={() => onSkipBy(30)}
            title={t('forward30')}
            aria-label={t('forward30')}
          >
            <span className="skip-label">{digits(30)}s</span>
            <RotateCw size={14} />
          </button>

          <button
            type="button"
            className="ctrl-btn"
            onClick={onNext}
            title={t('nextStory')}
            aria-label={t('nextStory')}
          >
            <SkipForward size={17} />
          </button>

          <button
            type="button"
            className={`ctrl-btn ${repeatMode !== 'off' ? 'ctrl-btn--active' : ''}`}
            onClick={onCycleRepeat}
            title={repeatMode}
            aria-label={repeatMode}
          >
            {repeatMode === 'one' ? <Repeat1 size={15} /> : <Repeat size={15} />}
          </button>
        </div>

        <div className="scrubber-row">
          <span className="time-label">{formatTime(currentTime, lang)}</span>
          <input
            type="range"
            min={0}
            max={Math.max(1, Math.floor(effectiveDuration))}
            value={Math.min(Math.floor(currentTime), Math.max(1, Math.floor(effectiveDuration)))}
            onChange={(e) => onSeek(Number(e.target.value))}
            className="dream-range"
            aria-label="Playback progress"
            style={{
              background: `linear-gradient(90deg, #ff9900 ${pct}%, rgba(129, 129, 129, 0.34) ${pct}%)`,
            }}
          />
          <span className="time-label time-label--right">{formatTime(effectiveDuration, lang)}</span>
        </div>
      </div>

      <div className="player-right">
        <button
          type="button"
          className={`speed-pill ${playbackRate !== 1 ? 'speed-pill--active' : ''}`}
          onClick={onCycleSpeed}
          title={t('toastSpeed').replace('{speed}', digits(playbackRate))}
        >
          {digits(playbackRate)}x
        </button>

        <div className="popover-anchor">
          <button
            type="button"
            className={`ctrl-btn ${(sleepMinutesLeft !== null || sleepEndOfStory) ? 'ctrl-btn--active' : ''}`}
            onClick={() => setSleepMenuOpen((v) => !v)}
            title={t('sleepTimerTitle')}
            aria-label={t('sleepTimerTitle')}
          >
            <Moon size={16} />
          </button>
          {(sleepMinutesLeft !== null || sleepEndOfStory) && (
            <span
              style={{
                position: 'absolute',
                top: -3,
                right: -3,
                background: '#ff9900',
                color: '#181818',
                fontSize: '0.6rem',
                fontWeight: 800,
                padding: '1px 4px',
                borderRadius: 999,
                pointerEvents: 'none',
              }}
            >
              {sleepEndOfStory ? t('sleepEndShort') : `${digits(sleepMinutesLeft ?? 0)}m`}
            </span>
          )}

          {sleepMenuOpen && (
            <div className="sleep-popover" role="menu">
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#818181', padding: '4px 10px' }}>
                {t('sleepTimerTitle')}
              </div>
              {[
                { label: t('sleepOff'), val: null as null },
                { label: t('sleep15'), val: 15 },
                { label: t('sleep30'), val: 30 },
                { label: t('sleep45'), val: 45 },
                { label: t('sleep60'), val: 60 },
                { label: t('sleepEnd'), val: 'end' as const },
              ].map((opt) => {
                const active =
                  (opt.val === null && sleepMinutesLeft === null && !sleepEndOfStory) ||
                  (opt.val === 'end' && sleepEndOfStory) ||
                  (typeof opt.val === 'number' && sleepMinutesLeft === opt.val);
                return (
                  <button
                    key={opt.label}
                    type="button"
                    className={`sleep-option ${active ? 'sleep-option--active' : ''}`}
                    onClick={() => {
                      onSelectSleepTimer(opt.val);
                      setSleepMenuOpen(false);
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <button
          type="button"
          className="ctrl-btn"
          onClick={onToggleQueue}
          title={t('queue')}
          aria-label={t('queue')}
        >
          <ListOrdered size={16} />
        </button>

        <div className="volume-wrap">
          <button
            type="button"
            className="ctrl-btn"
            onClick={onToggleMute}
            aria-label="Volume mute"
          >
            {muted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <input
            type="range"
            min={0}
            max={100}
            value={muted ? 0 : volume}
            onChange={(e) => onVolumeChange(Number(e.target.value))}
            className="dream-range"
            aria-label="Volume"
            style={{
              background: `linear-gradient(90deg, #ff9900 ${muted ? 0 : volume}%, rgba(129, 129, 129, 0.34) ${muted ? 0 : volume}%)`,
            }}
          />
        </div>

        <button
          type="button"
          className="ctrl-btn"
          onClick={onOpenImmersive}
          title={t('immersiveHeader')}
          aria-label={t('immersiveHeader')}
        >
          <Maximize2 size={15} />
        </button>
      </div>
    </footer>
  );
}
