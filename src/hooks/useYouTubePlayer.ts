import { useCallback, useEffect, useRef, useState } from 'react';

interface YTPlayerInstance {
  loadVideoById: (opts: { videoId: string; startSeconds?: number }) => void;
  cueVideoById: (opts: { videoId: string; startSeconds?: number }) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  setVolume: (volume: number) => void;
  mute: () => void;
  unMute: () => void;
  setPlaybackRate: (rate: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  destroy: () => void;
}

declare global {
  interface Window {
    YT?: {
      Player: new (
        el: HTMLElement,
        opts: {
          width?: string | number;
          height?: string | number;
          videoId?: string;
          playerVars?: Record<string, string | number>;
          events?: {
            onReady?: (e: { target: YTPlayerInstance }) => void;
            onStateChange?: (e: { data: number; target: YTPlayerInstance }) => void;
            onError?: (e: { data: number }) => void;
          };
        }
      ) => YTPlayerInstance;
      PlayerState?: {
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let ytApiPromise: Promise<void> | null = null;

function loadYouTubeIframeApi(): Promise<void> {
  if (window.YT && window.YT.Player) {
    return Promise.resolve();
  }
  if (ytApiPromise) return ytApiPromise;

  ytApiPromise = new Promise((resolve) => {
    const prevReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prevReady?.();
      resolve();
    };
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      document.head.appendChild(script);
    }
  });
  return ytApiPromise;
}

interface UseYouTubePlayerOptions {
  containerRef: React.RefObject<HTMLDivElement>;
  videoId: string;
  initialPosition: number;
  autoplayToken: number;
  volume: number;
  muted: boolean;
  playbackRate: number;
  onProgress: (videoId: string, currentTime: number, duration: number) => void;
  onEnded: () => void;
}

export type EmbedErrorCode = 'restricted' | 'missing' | 'paused' | null;

export function useYouTubePlayer({
  containerRef,
  videoId,
  initialPosition,
  autoplayToken,
  volume,
  muted,
  playbackRate,
  onProgress,
  onEnded,
}: UseYouTubePlayerOptions) {
  const playerRef = useRef<YTPlayerInstance | null>(null);
  const readyRef = useRef(false);
  const activeVideoRef = useRef(videoId);
  const initialPosRef = useRef(initialPosition);
  const lastLoadedTokenRef = useRef(autoplayToken);
  const onProgressRef = useRef(onProgress);
  const onEndedRef = useRef(onEnded);

  onProgressRef.current = onProgress;
  onEndedRef.current = onEnded;

  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [currentTime, setCurrentTime] = useState(initialPosition);
  const [duration, setDuration] = useState(0);
  const [embedError, setEmbedError] = useState<EmbedErrorCode>(null);

  // Mount YouTube player once
  useEffect(() => {
    let cancelled = false;

    loadYouTubeIframeApi().then(() => {
      if (cancelled || !containerRef.current || !window.YT?.Player) return;

      const mountEl = document.createElement('div');
      containerRef.current.innerHTML = '';
      containerRef.current.appendChild(mountEl);

      const player = new window.YT.Player(mountEl, {
        width: '100%',
        height: '100%',
        videoId: activeVideoRef.current,
        playerVars: {
          autoplay: 0,
          controls: 1,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          enablejsapi: 1,
          origin: window.location.origin,
          start: Math.floor(initialPosRef.current || 0),
        },
        events: {
          onReady: (event) => {
            if (cancelled) return;
            readyRef.current = true;
            setIsReady(true);
            setEmbedError(null);
            event.target.setVolume(volume);
            if (muted) event.target.mute();
            else event.target.unMute();
            event.target.setPlaybackRate(playbackRate);
            const dur = event.target.getDuration();
            if (dur > 0) setDuration(dur);
            if (lastLoadedTokenRef.current > 0) {
              event.target.loadVideoById({
                videoId: activeVideoRef.current,
                startSeconds: Math.floor(initialPosRef.current || 0),
              });
            }
          },
          onStateChange: (event) => {
            if (cancelled) return;
            const state = event.data;
            if (state === 1) {
              setIsPlaying(true);
              setIsBuffering(false);
              setEmbedError(null);
              const dur = event.target.getDuration();
              if (dur > 0) setDuration(dur);
            } else if (state === 2) {
              setIsPlaying(false);
              setIsBuffering(false);
              const t = event.target.getCurrentTime();
              const d = event.target.getDuration();
              if (d > 0) {
                setCurrentTime(t);
                onProgressRef.current(activeVideoRef.current, t, d);
              }
            } else if (state === 3) {
              setIsBuffering(true);
            } else if (state === 5) {
              setIsPlaying(false);
              setIsBuffering(false);
              const dur = event.target.getDuration();
              if (dur > 0) setDuration(dur);
            } else if (state === 0) {
              setIsPlaying(false);
              setIsBuffering(false);
              onEndedRef.current();
            }
          },
          onError: (event) => {
            if (cancelled) return;
            setIsPlaying(false);
            setIsBuffering(false);
            const code = event.data;
            if (code === 101 || code === 150) {
              setEmbedError('restricted');
            } else if (code === 100) {
              setEmbedError('missing');
            } else {
              setEmbedError('paused');
            }
          },
        },
      });

      playerRef.current = player;
    });

    return () => {
      cancelled = true;
      readyRef.current = false;
      setIsReady(false);
      try {
        playerRef.current?.destroy();
      } catch {
        // Ignore teardown issues
      }
      playerRef.current = null;
    };
  }, [containerRef]);

  // Switch track when videoId or autoplayToken changes
  useEffect(() => {
    const prevId = activeVideoRef.current;
    const prevToken = lastLoadedTokenRef.current;
    activeVideoRef.current = videoId;
    initialPosRef.current = initialPosition;
    lastLoadedTokenRef.current = autoplayToken;

    if (prevId === videoId && prevToken === autoplayToken) return;

    const player = playerRef.current;
    if (!player || !readyRef.current) return;

    if (prevId === videoId) {
      if (autoplayToken > prevToken) {
        player.playVideo();
      }
      return;
    }

    setCurrentTime(initialPosition);
    setDuration(0);
    setEmbedError(null);

    if (autoplayToken > prevToken) {
      setIsBuffering(true);
      player.loadVideoById({
        videoId,
        startSeconds: Math.floor(initialPosition || 0),
      });
    } else {
      player.cueVideoById({
        videoId,
        startSeconds: Math.floor(initialPosition || 0),
      });
    }
  }, [videoId, initialPosition, autoplayToken]);

  // Sync volume & mute
  useEffect(() => {
    const player = playerRef.current;
    if (!player || !readyRef.current) return;
    player.setVolume(volume);
    if (muted) player.mute();
    else player.unMute();
  }, [volume, muted]);

  // Sync playback rate
  useEffect(() => {
    const player = playerRef.current;
    if (!player || !readyRef.current) return;
    try {
      player.setPlaybackRate(playbackRate);
    } catch {
      // Ignore unsupported playback rate
    }
  }, [playbackRate]);

  // Progress polling
  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setInterval(() => {
      const player = playerRef.current;
      if (!player || !readyRef.current) return;
      const t = player.getCurrentTime();
      const d = player.getDuration();
      if (Number.isFinite(t)) setCurrentTime(t);
      if (Number.isFinite(d) && d > 0) setDuration(d);
      onProgressRef.current(activeVideoRef.current, t, d);
    }, 500);
    return () => window.clearInterval(timer);
  }, [isPlaying]);

  const play = useCallback(() => {
    const player = playerRef.current;
    if (!player || !readyRef.current) return;
    player.playVideo();
  }, []);

  const pause = useCallback(() => {
    const player = playerRef.current;
    if (!player || !readyRef.current) return;
    player.pauseVideo();
  }, []);

  const togglePlay = useCallback(() => {
    if (isPlaying) pause();
    else play();
  }, [isPlaying, play, pause]);

  const seekTo = useCallback((seconds: number) => {
    const clamped = Math.max(0, seconds);
    setCurrentTime(clamped);
    const player = playerRef.current;
    if (!player || !readyRef.current) return;
    player.seekTo(clamped, true);
  }, []);

  const skipBy = useCallback(
    (delta: number) => {
      const player = playerRef.current;
      const base = player && readyRef.current ? player.getCurrentTime() : currentTime;
      const target = Math.max(0, Math.min(duration || Infinity, base + delta));
      seekTo(target);
    },
    [currentTime, duration, seekTo]
  );

  return {
    isReady,
    isPlaying,
    isBuffering,
    currentTime,
    duration,
    embedError,
    play,
    pause,
    togglePlay,
    seekTo,
    skipBy,
  };
}
