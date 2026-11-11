import { Play } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import type { Palette, Playlist } from '../types';
import { formatDurationLong } from '../utils/format';
import { CoverImage } from './CoverImage';

interface PlaylistCardProps {
  playlist: Playlist;
  onOpen: (playlistId: string) => void;
  onPlayPlaylist: (playlist: Playlist) => void;
  onHoverPalette: (palette: Palette | null) => void;
}

export function PlaylistCard({
  playlist,
  onOpen,
  onPlayPlaylist,
  onHoverPalette,
}: PlaylistCardProps) {
  const { lang, t, digits } = useLanguage();

  return (
    <article
      className="story-card"
      onClick={() => onOpen(playlist.id)}
      onMouseEnter={() => onHoverPalette(playlist.palette)}
      onMouseLeave={() => onHoverPalette(null)}
    >
      <div className="story-card-cover-wrap">
        <CoverImage
          src={playlist.thumbnail}
          fallbackSrc={
            playlist.videoIds[0]
              ? `https://i.ytimg.com/vi/${playlist.videoIds[0]}/hqdefault.jpg`
              : './images/kahon-logo.jpg'
          }
          alt={playlist.title}
          className="story-card-cover"
        />
        <span className="story-card-duration">
          {digits(playlist.storyCount)} {playlist.storyCount === 1 ? t('storySingular') : t('storyPlural')}
        </span>
        <div className="story-card-play-overlay">
          <button
            type="button"
            className="floating-play-circle"
            aria-label={`${t('play')} ${playlist.title}`}
            onClick={(e) => {
              e.stopPropagation();
              onPlayPlaylist(playlist);
            }}
          >
            <Play size={18} fill="currentColor" style={{ marginLeft: 2 }} />
          </button>
        </div>
      </div>

      <div className="story-card-body">
        <div className="story-card-title" title={playlist.title}>
          {playlist.title}
        </div>
        <div className="story-card-meta">
          <span>
            {playlist.isPodcast ? t('kahonPodcast') : t('curatedSeries')}
            {playlist.totalDurationSeconds > 0
              ? ` · ${formatDurationLong(playlist.totalDurationSeconds, lang)}`
              : ''}
          </span>
        </div>
      </div>
    </article>
  );
}
