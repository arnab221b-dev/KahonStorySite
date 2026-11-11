import type { KahonCatalog, Playlist, Story } from '../types';

export type CarouselReason = 'queue' | 'series' | 'history' | 'suggested';

export interface CarouselNeighbors {
  prevStory: Story | null;
  prevReason: CarouselReason;
  nextStory: Story | null;
  nextReason: CarouselReason;
}

const GENERIC_PLAYLIST_TITLES = new Set([
  'kahon podcast',
  'kahon classics podcast',
  'kahon promos',
]);

function findBestSeriesPlaylist(
  story: Story,
  playlistMap: Map<string, Playlist>
): Playlist | null {
  const candidates = story.playlists
    .map((ref) => playlistMap.get(ref.id))
    .filter((pl): pl is Playlist => Boolean(pl && pl.videoIds.length >= 2));

  if (candidates.length === 0) return null;

  const specific = candidates.filter(
    (pl) => !GENERIC_PLAYLIST_TITLES.has(pl.title.toLowerCase())
  );
  const pool = specific.length > 0 ? specific : candidates;

  // Prefer the tightest series (fewest episodes >= 2)
  return [...pool].sort((a, b) => a.videoIds.length - b.videoIds.length)[0] || null;
}

function getRankedSuggestions(
  current: Story,
  catalog: KahonCatalog,
  excludeIds: Set<string>
): Story[] {
  const genreSet = new Set(current.genres);
  return catalog.stories
    .filter((s) => !excludeIds.has(s.id))
    .map((s) => {
      let score = 0;
      if (
        current.author !== 'Kahon Ensemble' &&
        s.author.toLowerCase() === current.author.toLowerCase()
      ) {
        score += 50;
      }
      if (current.series && s.series && s.series === current.series) {
        score += 35;
      }
      for (const g of s.genres) {
        if (genreSet.has(g)) score += 12;
      }
      score += Math.min(10, Math.log10(Math.max(10, s.viewsCount)));
      return { story: s, score };
    })
    .sort((a, b) => b.score - a.score || a.story.index - b.story.index)
    .map((item) => item.story);
}

export function resolveCarouselNeighbors(params: {
  currentStory: Story;
  queue: Story[];
  contextList: Story[];
  playHistoryBacklog: Story[];
  catalog: KahonCatalog;
  playlistMap: Map<string, Playlist>;
  storyMap: Map<string, Story>;
}): CarouselNeighbors {
  const {
    currentStory,
    queue,
    contextList,
    playHistoryBacklog,
    catalog,
    playlistMap,
    storyMap,
  } = params;

  const seriesPlaylist = findBestSeriesPlaylist(currentStory, playlistMap);
  const seriesStories = seriesPlaylist
    ? seriesPlaylist.videoIds
        .map((id) => storyMap.get(id))
        .filter((s): s is Story => Boolean(s))
    : [];
  const seriesIdx = seriesStories.findIndex((s) => s.id === currentStory.id);
  const contextIdx = contextList.findIndex((s) => s.id === currentStory.id);

  // 1. Resolve NEXT story: Queue -> Series Queue -> Context List -> Suggestion
  let nextStory: Story | null = null;
  let nextReason: CarouselReason = 'suggested';

  if (queue.length > 0 && queue[0].id !== currentStory.id) {
    nextStory = queue[0];
    nextReason = 'queue';
  } else if (seriesIdx >= 0 && seriesIdx + 1 < seriesStories.length) {
    nextStory = seriesStories[seriesIdx + 1];
    nextReason = 'series';
  } else if (
    contextList.length > 0 &&
    contextList.length < catalog.stories.length &&
    contextIdx >= 0 &&
    contextIdx + 1 < contextList.length
  ) {
    nextStory = contextList[contextIdx + 1];
    nextReason = 'queue';
  }

  // 2. Resolve PREVIOUS story: Backlog -> Series Previous -> Context Previous -> Suggestion
  let prevStory: Story | null = null;
  let prevReason: CarouselReason = 'suggested';

  const prevHistory = playHistoryBacklog.find((s) => s.id !== currentStory.id);
  if (prevHistory) {
    prevStory = prevHistory;
    prevReason = 'history';
  } else if (seriesIdx > 0) {
    prevStory = seriesStories[seriesIdx - 1];
    prevReason = 'series';
  } else if (
    contextList.length > 0 &&
    contextList.length < catalog.stories.length &&
    contextIdx > 0
  ) {
    prevStory = contextList[contextIdx - 1];
    prevReason = 'queue';
  }

  // 3. Fill any missing side using smart content suggestions
  const exclude = new Set<string>([currentStory.id]);
  if (nextStory) exclude.add(nextStory.id);
  if (prevStory) exclude.add(prevStory.id);

  if (!nextStory || !prevStory) {
    const suggestions = getRankedSuggestions(currentStory, catalog, exclude);
    let idx = 0;
    if (!nextStory && idx < suggestions.length) {
      nextStory = suggestions[idx++];
      nextReason = 'suggested';
    }
    if (!prevStory && idx < suggestions.length) {
      prevStory = suggestions[idx++];
      prevReason = 'suggested';
    }
  }

  return {
    prevStory,
    prevReason,
    nextStory,
    nextReason,
  };
}
