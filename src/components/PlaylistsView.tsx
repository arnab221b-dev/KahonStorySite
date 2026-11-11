import { useMemo, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import type { Palette, Playlist } from '../types';
import { PlaylistCard } from './PlaylistCard';

interface PlaylistsViewProps {
  playlists: Playlist[];
  onOpenPlaylist: (playlistId: string) => void;
  onPlayPlaylist: (playlist: Playlist) => void;
  onHoverPalette: (palette: Palette | null) => void;
}

export function PlaylistsView({
  playlists,
  onOpenPlaylist,
  onPlayPlaylist,
  onHoverPalette,
}: PlaylistsViewProps) {
  const [filter, setFilter] = useState<'all' | 'series' | 'podcasts'>('all');
  const { t, tf, digits } = useLanguage();

  const items = useMemo(() => {
    const valid = playlists.filter((p) => p.storyCount > 0);
    if (filter === 'podcasts') return valid.filter((p) => p.isPodcast || p.title.toLowerCase().includes('podcast'));
    if (filter === 'series') return valid.filter((p) => !p.isPodcast);
    return valid;
  }, [playlists, filter]);

  return (
    <section className="shelf-section">
      <div className="shelf-header" style={{ flexWrap: 'wrap' }}>
        <div>
          <h1 className="shelf-title" style={{ fontSize: '1.55rem' }}>
            {t('playlistsHeading')}
          </h1>
          <p className="shelf-subtitle">
            {tf('playlistsSub', { count: digits(items.length) })}
          </p>
        </div>

        <div className="filter-bar">
          <button
            type="button"
            className={`pill-chip ${filter === 'all' ? 'pill-chip--active' : ''}`}
            onClick={() => setFilter('all')}
          >
            {t('filterAll')}
          </button>
          <button
            type="button"
            className={`pill-chip ${filter === 'series' ? 'pill-chip--active' : ''}`}
            onClick={() => setFilter('series')}
          >
            {t('filterStorySeries')}
          </button>
          <button
            type="button"
            className={`pill-chip ${filter === 'podcasts' ? 'pill-chip--active' : ''}`}
            onClick={() => setFilter('podcasts')}
          >
            {t('filterPodcasts')}
          </button>
        </div>
      </div>

      <div className="cards-grid">
        {items.map((pl) => (
          <PlaylistCard
            key={pl.id}
            playlist={pl}
            onOpen={onOpenPlaylist}
            onPlayPlaylist={onPlayPlaylist}
            onHoverPalette={onHoverPalette}
          />
        ))}
      </div>
    </section>
  );
}
