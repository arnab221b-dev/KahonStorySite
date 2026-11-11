export interface Palette {
  dominant: string;
  vibrant: string;
  secondary: string;
  deep: string;
}

export interface PlaylistRef {
  id: string;
  title: string;
}

export interface Story {
  id: string;
  index: number;
  kind: 'video' | 'stream';
  rawTitle: string;
  title: string;
  author: string;
  series: string | null;
  genres: string[];
  durationText: string;
  durationSeconds: number;
  viewsText: string;
  viewsCount: number;
  publishedText: string;
  thumbnail: string;
  thumbnailFallback: string;
  thumbnailHd: string;
  youtubeUrl: string;
  playlists: PlaylistRef[];
  palette: Palette;
}

export interface Playlist {
  id: string;
  title: string;
  thumbnail: string;
  badgeText: string | null;
  isPodcast: boolean;
  videoIds: string[];
  storyCount: number;
  totalDurationSeconds: number;
  youtubeUrl: string;
  palette: Palette;
}

export interface ChannelInfo {
  name: string;
  bengaliName: string;
  handle: string;
  url: string;
  avatar: string;
  banner: string;
  metaSummary: string[];
  descriptionPreview: string;
}

export interface KahonCatalog {
  generatedAt: string;
  channel: ChannelInfo;
  stats: {
    totalStories: number;
    totalPlaylists: number;
    totalDurationHours: number;
  };
  genres: Array<{ name: string; count: number }>;
  topAuthors: Array<{ name: string; count: number }>;
  playlists: Playlist[];
  stories: Story[];
}

export interface ProgressEntry {
  position: number;
  duration: number;
  updatedAt: number;
}

export type RepeatMode = 'off' | 'all' | 'one';

export type NavSection =
  | { type: 'home' }
  | { type: 'browse'; query?: string; genre?: string }
  | { type: 'playlists' }
  | { type: 'playlist'; playlistId: string }
  | { type: 'author'; authorName: string }
  | { type: 'library'; tab?: 'liked' | 'history' | 'resume' };
