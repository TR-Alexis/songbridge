import { Track } from '../../core/types/track';

export interface TrackMatchResult {
  track: Track;
  score: number;
}

export class TrackMatchingEngine {
  static computeSimilarity(a: Track, b: Track): number {
    let score = 0;

    const titleA = a.title.toLowerCase().trim();
    const titleB = b.title.toLowerCase().trim();
    if (titleA === titleB) score += 40;
    else if (titleA.includes(titleB) || titleB.includes(titleA)) score += 20;

    const artistsA = a.artists.map((artist) => artist.toLowerCase().trim()).join(' ');
    const artistsB = b.artists.map((artist) => artist.toLowerCase().trim()).join(' ');
    if (artistsA === artistsB) score += 30;
    else if (artistsA.includes(artistsB) || artistsB.includes(artistsA)) score += 15;

    if (a.album && b.album) {
      const albumA = a.album.toLowerCase().trim();
      const albumB = b.album.toLowerCase().trim();
      if (albumA === albumB) score += 15;
    }

    if (a.duration && b.duration) {
      const durationDifference = Math.abs(a.duration - b.duration);
      if (durationDifference <= 3000) score += 10;
    }

    if (a.isrc && b.isrc && a.isrc === b.isrc) {
      score += 50;
    }

    return score;
  }

  static findBestMatch(target: Track, candidates: Track[]): TrackMatchResult | null {
    if (candidates.length === 0) return null;

    const matches = candidates.map((candidate) => ({
      track: candidate,
      score: TrackMatchingEngine.computeSimilarity(target, candidate),
    }));

    const best = matches.sort((a, b) => b.score - a.score)[0];
    return best.score === 0 ? null : best;
  }
}
