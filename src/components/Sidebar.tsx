import { BookOpen, Compass, ExternalLink, Home, Library, ListMusic, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { localizePlaylistMeta } from '../i18n/translations';
import type { ChannelInfo, NavSection, Playlist } from '../types';
import { CoverImage } from './CoverImage';

interface SidebarProps {
  channel: ChannelInfo;
  playlists: Playlist[];
  nav: NavSection;
  likedCount: number;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onNavigate: (section: NavSection) => void;
}

export function Sidebar({
  channel,
  playlists,
  nav,
  likedCount,
  mobileOpen,
  onCloseMobile,
  onNavigate,
}: SidebarProps) {
  const [filter, setFilter] = useState<'all' | 'series' | 'podcasts'>('all');
  const { lang, t, digits } = useLanguage();

  const filteredPlaylists = useMemo(() => {
    const valid = playlists.filter((p) => p.storyCount > 0);
    if (filter === 'podcasts') return valid.filter((p) => p.isPodcast || p.title.toLowerCase().includes('podcast'));
    if (filter === 'series') return valid.filter((p) => !p.isPodcast);
    return valid;
  }, [playlists, filter]);

  const navigateAndClose = (section: NavSection) => {
    onNavigate(section);
    onCloseMobile();
  };

  return (
    <aside className={`sidebar glass-panel ${mobileOpen ? 'sidebar--open-mobile' : ''}`}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          type="button"
          className="brand-lockup"
          style={{ flex: 1 }}
          onClick={() => navigateAndClose({ type: 'home' })}
        >
          <div className="brand-logo-wrap">
            <img
              src="./images/kahon-logo.jpg"
              alt="Kahon (কাহন) Official Logo"
              className="brand-logo-img"
            />
          </div>
          <div className="brand-text">
            <div className="brand-title">
              <span>{t('brandTitle')}</span>
              <span className="brand-title-bn">{t('brandTitleBn')}</span>
            </div>
            <div className="brand-sub">{t('brandSub')}</div>
          </div>
        </button>

        {mobileOpen && (
          <button
            type="button"
            className="icon-circle-btn"
            aria-label="Close navigation menu"
            onClick={onCloseMobile}
          >
            <X size={18} />
          </button>
        )}
      </div>

      <nav className="nav-menu" aria-label="Primary Navigation">
        <button
          type="button"
          className={`nav-item ${nav.type === 'home' ? 'nav-item--active' : ''}`}
          onClick={() => navigateAndClose({ type: 'home' })}
        >
          <Home size={18} />
          <span>{t('navHome')}</span>
        </button>
        <button
          type="button"
          className={`nav-item ${nav.type === 'browse' ? 'nav-item--active' : ''}`}
          onClick={() => navigateAndClose({ type: 'browse' })}
        >
          <Compass size={18} />
          <span>{t('navBrowse')}</span>
        </button>
        <button
          type="button"
          className={`nav-item ${nav.type === 'playlists' ? 'nav-item--active' : ''}`}
          onClick={() => navigateAndClose({ type: 'playlists' })}
        >
          <ListMusic size={18} />
          <span>{t('navPlaylists')}</span>
        </button>
        <button
          type="button"
          className={`nav-item ${nav.type === 'library' ? 'nav-item--active' : ''}`}
          onClick={() => navigateAndClose({ type: 'library', tab: 'liked' })}
        >
          <Library size={18} />
          <span>{t('navLibrary')} ({digits(likedCount)})</span>
        </button>
      </nav>

      <div className="sidebar-section-header">
        <span className="sidebar-section-title">{t('channelSeries')}</span>
        <BookOpen size={14} color="#818181" />
      </div>

      <div className="sidebar-pills">
        <button
          type="button"
          className={`pill-chip ${filter === 'all' ? 'pill-chip--active' : ''}`}
          onClick={() => setFilter('all')}
        >
          {t('filterAll')} ({digits(playlists.filter((p) => p.storyCount > 0).length)})
        </button>
        <button
          type="button"
          className={`pill-chip ${filter === 'series' ? 'pill-chip--active' : ''}`}
          onClick={() => setFilter('series')}
        >
          {t('filterSeries')}
        </button>
        <button
          type="button"
          className={`pill-chip ${filter === 'podcasts' ? 'pill-chip--active' : ''}`}
          onClick={() => setFilter('podcasts')}
        >
          {t('filterPodcasts')}
        </button>
      </div>

      <div className="sidebar-library-scroll">
        {filteredPlaylists.map((pl) => {
          const isActive = nav.type === 'playlist' && nav.playlistId === pl.id;
          return (
            <button
              key={pl.id}
              type="button"
              className={`sidebar-playlist-item ${isActive ? 'sidebar-playlist-item--active' : ''}`}
              onClick={() => navigateAndClose({ type: 'playlist', playlistId: pl.id })}
            >
              <CoverImage
                src={pl.thumbnail}
                fallbackSrc={
                  pl.videoIds[0]
                    ? `https://i.ytimg.com/vi/${pl.videoIds[0]}/hqdefault.jpg`
                    : './images/kahon-logo.jpg'
                }
                alt={pl.title}
                className="sidebar-playlist-thumb"
              />
              <div className="sidebar-playlist-meta">
                <div className="sidebar-playlist-name">{pl.title}</div>
                <div className="sidebar-playlist-sub">
                  {digits(pl.storyCount)} {pl.storyCount === 1 ? t('episodeSingular') : t('episodePlural')}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="sidebar-footer">
        <a
          href={channel.url}
          target="_blank"
          rel="noopener noreferrer"
          className="channel-pill-link"
        >
          <img
            src="./images/kahon-logo.jpg"
            alt={channel.name}
            className="channel-avatar-mini"
          />
          <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {channel.handle} · {localizePlaylistMeta(channel.metaSummary, lang)}
          </span>
          <ExternalLink size={13} />
        </a>
      </div>
    </aside>
  );
}
