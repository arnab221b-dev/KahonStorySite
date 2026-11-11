import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  KahonCatalog,
  NavSection,
  Palette,
  Playlist,
  ProgressEntry,
  RepeatMode,
  Story,
} from './types';
import { applyAmbientPalette } from './utils/color';
import { resolveCarouselNeighbors } from './utils/carousel';
import { useLanguage } from './i18n/LanguageContext';
import { usePersistentState } from './hooks/usePersistentState';
import { useYouTubePlayer } from './hooks/useYouTubePlayer';
import { AmbientBackdrop } from './components/AmbientBackdrop';
import { BrowseView } from './components/BrowseView';
import { DetailView } from './components/DetailView';
import { HomeView } from './components/HomeView';
import { ImmersiveModal } from './components/ImmersiveModal';
import { LibraryView } from './components/LibraryView';
import { NowPlayingPanel } from './components/NowPlayingPanel';
import { PlayerBar } from './components/PlayerBar';
import { PlaylistsView } from './components/PlaylistsView';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5, 1.75, 2];

/**
 * Load the Kahon story & playlist catalog from the static JSON asset
 * kept fresh by scheduled YouTube syncs.
 */
async function fetchKahonCatalog(signal?: AbortSignal): Promise<KahonCatalog> {
  const res = await fetch('./data/kahonData.json', {
    signal,
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`Unable to load Kahon catalog (${res.status})`);
  }
  return (await res.json()) as KahonCatalog;
}

export function App() {
  const { lang } = useLanguage();
  const [catalog, setCatalog] = useState<KahonCatalog | null>(null);
  const [loadError, setLoadError] = useState(false);

  const loadData = useCallback((signal?: AbortSignal) => {
    setLoadError(false);
    fetchKahonCatalog(signal)
      .then((data) => {
        setCatalog(data);
      })
      .catch((err) => {
        if ((err as Error)?.name === 'AbortError') return;
        setLoadError(true);
      });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadData(controller.signal);
    return () => controller.abort();
  }, [loadData]);

  if (!catalog) {
    return (
      <div
        className="app-root"
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <AmbientBackdrop isPlaying={false} />
        <div
          className="glass-panel"
          style={{
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 14,
            padding: '28px 32px',
            borderRadius: 24,
            textAlign: 'center',
            maxWidth: 340,
          }}
        >
          <img
            src="./images/kahon-logo.jpg"
            alt="Kahon"
            style={{
              width: 72,
              height: 72,
              aspectRatio: '1 / 1',
              borderRadius: 16,
              objectFit: 'cover',
              border: '1px solid rgba(255, 153, 0, 0.4)',
            }}
          />
          <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#f6f3ee' }}>
            {lang === 'bn' ? 'কাহন · অডিও গল্পের আসর' : 'Kahon · কাহন'}
          </div>
          {loadError ? (
            <button
              type="button"
              className="soft-btn soft-btn--accent"
              onClick={() => loadData()}
            >
              {lang === 'bn' ? 'আবার চেষ্টা করুন' : 'Retry'}
            </button>
          ) : (
            <div style={{ fontSize: '0.84rem', color: '#818181' }}>
              {lang === 'bn' ? 'গল্পের আসর সাজানো হচ্ছে...' : 'Tuning into Kahon sanctuary...'}
            </div>
          )}
        </div>
      </div>
    );
  }

  return <KahonPlayerApp catalog={catalog} />;
}

function KahonPlayerApp({ catalog }: { catalog: KahonCatalog }) {
  const { t, tf, digits } = useLanguage();
  const storyMap = useMemo(
    () => new Map(catalog.stories.map((s) => [s.id, s])),
    [catalog.stories]
  );
  const playlistMap = useMemo(
    () => new Map(catalog.playlists.map((p) => [p.id, p])),
    [catalog.playlists]
  );

  // Persisted listener preferences & history
  const [lastStoryId, setLastStoryId] = usePersistentState<string>(
    'kahon_last_story',
    catalog.stories[0]?.id || ''
  );
  const [likedIds, setLikedIds] = usePersistentState<string[]>('kahon_liked', []);
  const [historyIds, setHistoryIds] = usePersistentState<string[]>('kahon_history', []);
  const [progressMap, setProgressMap] = usePersistentState<Record<string, ProgressEntry>>(
    'kahon_progress',
    {}
  );
  const [volume, setVolume] = usePersistentState<number>('kahon_volume', 85);
  const [muted, setMuted] = usePersistentState<boolean>('kahon_muted', false);
  const [playbackRate, setPlaybackRate] = usePersistentState<number>('kahon_speed', 1);
  const [shuffle, setShuffle] = usePersistentState<boolean>('kahon_shuffle', false);
  const [repeatMode, setRepeatMode] = usePersistentState<RepeatMode>('kahon_repeat', 'off');

  // Navigation history
  const [navStack, setNavStack] = useState<NavSection[]>([{ type: 'home' }]);
  const [navIdx, setNavIdx] = useState(0);
  const currentNav = navStack[navIdx];

  const [searchQuery, setSearchQuery] = useState('');
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [mobileRightOpen, setMobileRightOpen] = useState(false);
  const [immersiveOpen, setImmersiveOpen] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [hoveredPalette, setHoveredPalette] = useState<Palette | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Playback state
  const currentStory = useMemo(
    () => storyMap.get(lastStoryId) || catalog.stories[0],
    [lastStoryId, storyMap]
  );
  const [autoplayToken, setAutoplayToken] = useState(0);
  const [initialPosition, setInitialPosition] = useState<number>(
    () => progressMap[currentStory.id]?.position || 0
  );
  const [queue, setQueue] = useState<Story[]>([]);
  const [contextList, setContextList] = useState<Story[]>(catalog.stories);
  const [playHistoryBacklog, setPlayHistoryBacklog] = useState<Story[]>([]);

  // Sleep timer
  const [sleepMinutesLeft, setSleepMinutesLeft] = useState<number | null>(null);
  const [sleepEndOfStory, setSleepEndOfStory] = useState(false);

  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const lastSavedTickRef = useRef<number>(0);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(t);
  }, [toast]);

  const likedSet = useMemo(() => new Set(likedIds), [likedIds]);

  const navigate = useCallback(
    (section: NavSection) => {
      setNavStack((prev) => {
        const sliced = prev.slice(0, navIdx + 1);
        return [...sliced, section];
      });
      setNavIdx((i) => i + 1);
    },
    [navIdx]
  );

  const goBack = useCallback(() => {
    setNavIdx((i) => Math.max(0, i - 1));
  }, []);

  const goForward = useCallback(() => {
    setNavIdx((i) => Math.min(navStack.length - 1, i + 1));
  }, [navStack.length]);

  const handleSearchChange = useCallback(
    (q: string) => {
      setSearchQuery(q);
      if (q.trim() && currentNav.type !== 'browse') {
        navigate({ type: 'browse', query: q });
      }
    },
    [currentNav.type, navigate]
  );

  const recordHistory = useCallback(
    (storyId: string) => {
      setHistoryIds((prev) => [storyId, ...prev.filter((id) => id !== storyId)].slice(0, 60));
    },
    [setHistoryIds]
  );

  const playStory = useCallback(
    (story: Story, newContext?: Story[]) => {
      if (story.id !== currentStory.id) {
        setPlayHistoryBacklog((prev) => [currentStory, ...prev.slice(0, 29)]);
      }
      if (newContext && newContext.length > 0) {
        setContextList(newContext);
        const idx = newContext.findIndex((s) => s.id === story.id);
        if (idx >= 0) {
          setQueue(newContext.slice(idx + 1, idx + 25));
        }
      }
      const saved = progressMap[story.id];
      const resumeAt =
        saved && saved.duration > 0 && saved.position < saved.duration - 25
          ? saved.position
          : 0;
      setInitialPosition(resumeAt);
      setLastStoryId(story.id);
      setAutoplayToken((n) => n + 1);
      recordHistory(story.id);
    },
    [currentStory, progressMap, recordHistory, setLastStoryId]
  );

  const handleProgress = useCallback(
    (vid: string, pos: number, dur: number) => {
      const now = Date.now();
      if (now - lastSavedTickRef.current < 3000) return;
      lastSavedTickRef.current = now;
      if (!Number.isFinite(pos) || pos <= 1) return;
      setProgressMap((prev) => ({
        ...prev,
        [vid]: {
          position: pos,
          duration: dur > 0 ? dur : prev[vid]?.duration || storyMap.get(vid)?.durationSeconds || 0,
          updatedAt: now,
        },
      }));
    },
    [setProgressMap, storyMap]
  );

  const carousel = useMemo(
    () =>
      resolveCarouselNeighbors({
        currentStory,
        queue,
        contextList,
        playHistoryBacklog,
        catalog,
        playlistMap,
        storyMap,
      }),
    [currentStory, queue, contextList, playHistoryBacklog, catalog, playlistMap, storyMap]
  );

  const handleNext = useCallback(() => {
    if (queue.length > 0) {
      const [nextStory, ...rest] = queue;
      setQueue(rest);
      setPlayHistoryBacklog((prev) => [currentStory, ...prev.slice(0, 29)]);
      setInitialPosition(0);
      setLastStoryId(nextStory.id);
      setAutoplayToken((n) => n + 1);
      recordHistory(nextStory.id);
      return;
    }

    const pool = contextList.length > 0 ? contextList : catalog.stories;
    if (shuffle && pool.length > 1) {
      const candidates = pool.filter((s) => s.id !== currentStory.id);
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      if (pick) {
        playStory(pick, pool);
      }
      return;
    }

    if (contextList.length >= catalog.stories.length && carousel.nextStory) {
      playStory(carousel.nextStory);
      return;
    }

    const idx = pool.findIndex((s) => s.id === currentStory.id);
    if (idx >= 0 && idx + 1 < pool.length) {
      playStory(pool[idx + 1], pool);
    } else if (repeatMode === 'all' && pool.length > 0) {
      playStory(pool[0], pool);
    } else if (carousel.nextStory) {
      playStory(carousel.nextStory);
    }
  }, [
    queue,
    contextList,
    catalog.stories,
    shuffle,
    currentStory,
    repeatMode,
    carousel.nextStory,
    playStory,
    recordHistory,
    setLastStoryId,
  ]);

  const handlePrev = useCallback(() => {
    if (playHistoryBacklog.length > 0) {
      const [prevStory, ...rest] = playHistoryBacklog;
      setPlayHistoryBacklog(rest);
      setInitialPosition(progressMap[prevStory.id]?.position || 0);
      setLastStoryId(prevStory.id);
      setAutoplayToken((n) => n + 1);
      return;
    }
    if (carousel.prevStory) {
      playStory(carousel.prevStory);
      return;
    }
    const pool = contextList.length > 0 ? contextList : catalog.stories;
    const idx = pool.findIndex((s) => s.id === currentStory.id);
    if (idx > 0) {
      playStory(pool[idx - 1], pool);
    }
  }, [playHistoryBacklog, progressMap, carousel.prevStory, contextList, currentStory.id, playStory, setLastStoryId]);

  const handleEndedRef = useRef<() => void>(() => {});

  const {
    isPlaying,
    isBuffering,
    currentTime,
    duration,
    embedError,
    pause,
    togglePlay,
    seekTo,
    skipBy,
  } = useYouTubePlayer({
    containerRef: playerContainerRef,
    videoId: currentStory.id,
    initialPosition,
    autoplayToken,
    volume,
    muted,
    playbackRate,
    onProgress: handleProgress,
    onEnded: () => handleEndedRef.current(),
  });

  handleEndedRef.current = () => {
    if (sleepEndOfStory) {
      setSleepEndOfStory(false);
      showToast(t('toastSleepStopped'));
      return;
    }
    if (repeatMode === 'one') {
      seekTo(0);
      setAutoplayToken((n) => n + 1);
      return;
    }
    if (queue.length === 0 && carousel.nextStory && contextList.length >= catalog.stories.length && !shuffle) {
      playStory(carousel.nextStory);
      return;
    }
    handleNext();
  };

  // Sleep timer countdown
  useEffect(() => {
    if (sleepMinutesLeft === null) return;
    const timer = window.setInterval(() => {
      setSleepMinutesLeft((mins) => {
        if (mins === null) return null;
        if (mins <= 1) {
          pause();
          showToast(t('toastSleepEnded'));
          return null;
        }
        return mins - 1;
      });
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [sleepMinutesLeft, pause, showToast, t]);

  const handleSelectSleepTimer = useCallback(
    (mode: number | 'end' | null) => {
      if (mode === null) {
        setSleepMinutesLeft(null);
        setSleepEndOfStory(false);
        showToast(t('toastSleepOff'));
      } else if (mode === 'end') {
        setSleepMinutesLeft(null);
        setSleepEndOfStory(true);
        showToast(t('toastSleepEnd'));
      } else {
        setSleepEndOfStory(false);
        setSleepMinutesLeft(mode);
        showToast(tf('toastSleepMins', { mins: digits(mode) }));
      }
    },
    [showToast, t, tf, digits]
  );

  // Dynamic ambient palette matching cover art (hovered or active)
  const activePalette = hoveredPalette || currentStory.palette;
  useEffect(() => {
    applyAmbientPalette(activePalette);
  }, [activePalette]);

  // Media Session OS Integration
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentStory.title,
        artist: currentStory.author,
        album: currentStory.series || 'Kahon · কাহন',
        artwork: [
          { src: currentStory.thumbnailFallback, sizes: '480x360', type: 'image/jpeg' },
          { src: currentStory.thumbnail, sizes: '720x404', type: 'image/jpeg' },
        ],
      });
      navigator.mediaSession.setActionHandler('play', () => togglePlay());
      navigator.mediaSession.setActionHandler('pause', () => togglePlay());
      navigator.mediaSession.setActionHandler('previoustrack', handlePrev);
      navigator.mediaSession.setActionHandler('nexttrack', handleNext);
      navigator.mediaSession.setActionHandler('seekbackward', () => skipBy(-15));
      navigator.mediaSession.setActionHandler('seekforward', () => skipBy(30));
    } catch {
      // Ignore MediaSession errors in unsupported browsers
    }
  }, [currentStory, togglePlay, handlePrev, handleNext, skipBy]);

  // Global keyboard controls
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.code === 'Space') {
        if (tag === 'BUTTON' || tag === 'A') return;
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        skipBy(-15);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        skipBy(30);
      } else if (e.key === 'Escape') {
        setImmersiveOpen(false);
        setMobileNavOpen(false);
        setMobileRightOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [togglePlay, skipBy]);

  const handleToggleLike = useCallback(
    (storyId: string) => {
      setLikedIds((prev) => {
        const exists = prev.includes(storyId);
        showToast(exists ? t('toastRemoved') : t('toastSaved'));
        return exists ? prev.filter((id) => id !== storyId) : [storyId, ...prev];
      });
    },
    [setLikedIds, showToast, t]
  );

  const handleAddQueue = useCallback(
    (story: Story) => {
      setQueue((prev) => [...prev, story]);
      showToast(tf('toastQueued', { title: story.title }));
    },
    [showToast, tf]
  );

  const handlePlayPlaylist = useCallback(
    (pl: Playlist, doShuffle = false) => {
      const tracks = pl.videoIds
        .map((vid) => storyMap.get(vid))
        .filter((s): s is Story => Boolean(s));
      if (tracks.length === 0) return;
      const ordered = doShuffle
        ? [...tracks].sort(() => Math.random() - 0.5)
        : tracks;
      playStory(ordered[0], ordered);
    },
    [playStory, storyMap]
  );

  const handlePlayAll = useCallback(
    (stories: Story[], doShuffle = false) => {
      if (stories.length === 0) return;
      const ordered = doShuffle
        ? [...stories].sort(() => Math.random() - 0.5)
        : stories;
      playStory(ordered[0], ordered);
    },
    [playStory]
  );

  const handleShuffleChannel = useCallback(() => {
    const pick = catalog.stories[Math.floor(Math.random() * catalog.stories.length)];
    if (pick) playStory(pick, catalog.stories);
  }, [catalog.stories, playStory]);

  const handleCycleSpeed = useCallback(() => {
    setPlaybackRate((prev) => {
      const idx = SPEED_OPTIONS.indexOf(prev);
      const next = SPEED_OPTIONS[(idx + 1) % SPEED_OPTIONS.length];
      showToast(tf('toastSpeed', { speed: digits(next) }));
      return next;
    });
  }, [setPlaybackRate, showToast, tf, digits]);

  const handleSelectPrevNeighbor = useCallback(
    (story: Story) => {
      if (carousel.prevReason === 'history') {
        handlePrev();
      } else {
        playStory(story);
      }
    },
    [carousel.prevReason, handlePrev, playStory]
  );

  const handleSelectNextNeighbor = useCallback(
    (story: Story) => {
      if (carousel.nextReason === 'queue' && queue.length > 0 && queue[0].id === story.id) {
        handleNext();
      } else {
        playStory(story);
      }
    },
    [carousel.nextReason, queue, handleNext, playStory]
  );

  const handleCycleRepeat = useCallback(() => {
    setRepeatMode((prev) => (prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off'));
  }, [setRepeatMode]);

  const renderMainContent = () => {
    if (currentNav.type === 'home') {
      return (
        <HomeView
          catalog={catalog}
          currentStory={currentStory}
          isPlaying={isPlaying}
          likedSet={likedSet}
          progressMap={progressMap}
          onPlayStory={playStory}
          onTogglePlay={togglePlay}
          onToggleLike={handleToggleLike}
          onAddQueue={handleAddQueue}
          onPlayPlaylist={handlePlayPlaylist}
          onNavigate={navigate}
          onHoverPalette={setHoveredPalette}
          onShuffleChannel={handleShuffleChannel}
        />
      );
    }

    if (currentNav.type === 'browse') {
      return (
        <BrowseView
          catalog={catalog}
          searchQuery={searchQuery}
          initialGenre={currentNav.genre}
          currentStory={currentStory}
          isPlaying={isPlaying}
          likedSet={likedSet}
          progressMap={progressMap}
          onPlayStory={playStory}
          onTogglePlay={togglePlay}
          onToggleLike={handleToggleLike}
          onAddQueue={handleAddQueue}
          onOpenAuthor={(authorName) => navigate({ type: 'author', authorName })}
          onHoverPalette={setHoveredPalette}
        />
      );
    }

    if (currentNav.type === 'playlists') {
      return (
        <PlaylistsView
          playlists={catalog.playlists}
          onOpenPlaylist={(playlistId) => navigate({ type: 'playlist', playlistId })}
          onPlayPlaylist={(pl) => handlePlayPlaylist(pl, false)}
          onHoverPalette={setHoveredPalette}
        />
      );
    }

    if (currentNav.type === 'playlist') {
      const pl = playlistMap.get(currentNav.playlistId);
      if (!pl) {
        return <div className="empty-state">{t('playlistNotFound')}</div>;
      }
      const plStories = pl.videoIds
        .map((id) => storyMap.get(id))
        .filter((s): s is Story => Boolean(s));
      return (
        <DetailView
          kind={pl.isPodcast ? 'Podcast Series' : 'Series Playlist'}
          title={pl.title}
          coverUrl={pl.thumbnail}
          youtubeUrl={pl.youtubeUrl}
          stories={plStories}
          currentStory={currentStory}
          isPlaying={isPlaying}
          likedSet={likedSet}
          progressMap={progressMap}
          onPlayStory={playStory}
          onPlayAll={handlePlayAll}
          onTogglePlay={togglePlay}
          onToggleLike={handleToggleLike}
          onAddQueue={handleAddQueue}
          onOpenAuthor={(authorName) => navigate({ type: 'author', authorName })}
          onHoverPalette={setHoveredPalette}
        />
      );
    }

    if (currentNav.type === 'author') {
      const authorStories = catalog.stories.filter(
        (s) => s.author.toLowerCase() === currentNav.authorName.toLowerCase()
      );
      return (
        <DetailView
          kind="Author Collection"
          title={currentNav.authorName}
          subtitle={t('authorCollectionSub')}
          coverUrl={authorStories[0]?.thumbnail || './images/kahon-logo.jpg'}
          stories={authorStories}
          currentStory={currentStory}
          isPlaying={isPlaying}
          likedSet={likedSet}
          progressMap={progressMap}
          onPlayStory={playStory}
          onPlayAll={handlePlayAll}
          onTogglePlay={togglePlay}
          onToggleLike={handleToggleLike}
          onAddQueue={handleAddQueue}
          onOpenAuthor={(authorName) => navigate({ type: 'author', authorName })}
          onHoverPalette={setHoveredPalette}
        />
      );
    }

    return (
      <LibraryView
        catalog={catalog}
        initialTab={currentNav.tab}
        likedIds={likedIds}
        historyIds={historyIds}
        progressMap={progressMap}
        currentStory={currentStory}
        isPlaying={isPlaying}
        likedSet={likedSet}
        onPlayStory={playStory}
        onTogglePlay={togglePlay}
        onToggleLike={handleToggleLike}
        onAddQueue={handleAddQueue}
        onOpenAuthor={(authorName) => navigate({ type: 'author', authorName })}
        onHoverPalette={setHoveredPalette}
      />
    );
  };

  return (
    <div className="app-root">
      <AmbientBackdrop isPlaying={isPlaying} />

      <div className={`app-shell ${!rightPanelOpen ? 'app-shell--no-right' : ''}`}>
        <Sidebar
          channel={catalog.channel}
          playlists={catalog.playlists}
          nav={currentNav}
          likedCount={likedIds.length}
          mobileOpen={mobileNavOpen}
          onCloseMobile={() => setMobileNavOpen(false)}
          onNavigate={navigate}
        />

        <main className="main-stage glass-panel">
          <TopBar
            searchQuery={searchQuery}
            canGoBack={navIdx > 0}
            canGoForward={navIdx < navStack.length - 1}
            rightPanelOpen={rightPanelOpen}
            onBack={goBack}
            onForward={goForward}
            onSearchChange={handleSearchChange}
            onOpenMobileNav={() => setMobileNavOpen(true)}
            onToggleRightPanel={() => {
              if (window.innerWidth <= 1220) {
                setMobileRightOpen((v) => !v);
              } else {
                setRightPanelOpen((v) => !v);
              }
            }}
          />

          <div className="main-scroll">{renderMainContent()}</div>
        </main>

        <NowPlayingPanel
          currentStory={currentStory}
          carousel={carousel}
          channel={catalog.channel}
          queue={queue}
          isPlaying={isPlaying}
          isLiked={likedSet.has(currentStory.id)}
          showVideo={showVideo}
          embedError={embedError}
          playerContainerRef={playerContainerRef}
          desktopHidden={!rightPanelOpen}
          openMobile={mobileRightOpen}
          onCloseMobile={() => setMobileRightOpen(false)}
          onToggleShowVideo={() => setShowVideo((v) => !v)}
          onToggleLike={handleToggleLike}
          onPlayStory={(s) => playStory(s)}
          onSelectPrevNeighbor={handleSelectPrevNeighbor}
          onSelectNextNeighbor={handleSelectNextNeighbor}
          onRemoveFromQueue={(idx) =>
            setQueue((prev) => prev.filter((_, i) => i !== idx))
          }
          onClearQueue={() => setQueue([])}
          onOpenPlaylist={(playlistId) => {
            setMobileRightOpen(false);
            navigate({ type: 'playlist', playlistId });
          }}
          onOpenAuthor={(authorName) => {
            setMobileRightOpen(false);
            navigate({ type: 'author', authorName });
          }}
        />
      </div>

      <PlayerBar
        story={currentStory}
        isPlaying={isPlaying}
        isBuffering={isBuffering}
        isLiked={likedSet.has(currentStory.id)}
        currentTime={currentTime}
        duration={duration}
        volume={volume}
        muted={muted}
        playbackRate={playbackRate}
        shuffle={shuffle}
        repeatMode={repeatMode}
        sleepMinutesLeft={sleepMinutesLeft}
        sleepEndOfStory={sleepEndOfStory}
        onTogglePlay={togglePlay}
        onPrev={handlePrev}
        onNext={handleNext}
        onSeek={seekTo}
        onSkipBy={skipBy}
        onToggleLike={handleToggleLike}
        onVolumeChange={(v) => {
          setVolume(v);
          if (v > 0 && muted) setMuted(false);
        }}
        onToggleMute={() => setMuted((m) => !m)}
        onCycleSpeed={handleCycleSpeed}
        onToggleShuffle={() => setShuffle((s) => !s)}
        onCycleRepeat={handleCycleRepeat}
        onSelectSleepTimer={handleSelectSleepTimer}
        onToggleQueue={() => {
          if (window.innerWidth <= 1220) {
            setMobileRightOpen((v) => !v);
          } else {
            setRightPanelOpen((v) => !v);
          }
        }}
        onOpenImmersive={() => setImmersiveOpen(true)}
        onOpenAuthor={(authorName) => navigate({ type: 'author', authorName })}
      />

      {immersiveOpen && (
        <ImmersiveModal
          story={currentStory}
          carousel={carousel}
          isPlaying={isPlaying}
          isLiked={likedSet.has(currentStory.id)}
          currentTime={currentTime}
          duration={duration}
          playbackRate={playbackRate}
          onClose={() => setImmersiveOpen(false)}
          onTogglePlay={togglePlay}
          onPrev={handlePrev}
          onNext={handleNext}
          onSelectPrevNeighbor={handleSelectPrevNeighbor}
          onSelectNextNeighbor={handleSelectNextNeighbor}
          onSeek={seekTo}
          onSkipBy={skipBy}
          onToggleLike={handleToggleLike}
          onCycleSpeed={handleCycleSpeed}
        />
      )}

      {toast && (
        <div
          role="status"
          style={{
            position: 'fixed',
            bottom: 112,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 90,
            padding: '9px 18px',
            borderRadius: 9999,
            background: 'rgba(24, 24, 24, 0.92)',
            border: '1px solid rgba(255, 153, 0, 0.48)',
            color: '#f6f3ee',
            fontSize: '0.82rem',
            fontWeight: 600,
            boxShadow: '0 14px 30px rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(16px)',
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}

export default App;
