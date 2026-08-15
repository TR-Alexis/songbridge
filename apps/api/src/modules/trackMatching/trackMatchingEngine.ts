import { Track } from '../../core/types/track';

export interface TrackMatchResult {
  track: Track;
  score: number;
}

export class TrackMatchingEngine {
  static readonly MINIMUM_MATCH_SCORE = 45;

  private static normalize(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/(?:\[|\().*?(official|lyrics?|audio|video|remaster(ed)?).*?(?:\]|\))/g, ' ')
      .replace(/\b(official|lyrics?|audio|video|hd|hq)\b/g, ' ')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
      .replace(/\s+/g, ' ');
  }

  private static tokenSimilarity(a: string, b: string): number {
    const tokensA = new Set(a.split(' ').filter(Boolean));
    const tokensB = new Set(b.split(' ').filter(Boolean));
    if (tokensA.size === 0 || tokensB.size === 0) return 0;
    const intersection = [...tokensA].filter((token) => tokensB.has(token)).length;
    return (2 * intersection) / (tokensA.size + tokensB.size);
  }

  static computeSimilarity(a: Track, b: Track): number {
    let score = 0;

    const titleA = this.normalize(a.title);
    const titleB = this.normalize(b.title);
    if (titleA && titleA === titleB) score += 55;
    else if (titleA && titleB && (titleA.includes(titleB) || titleB.includes(titleA))) score += 45;
    else score += Math.round(this.tokenSimilarity(titleA, titleB) * 40);

    const artistsA = a.artists.map((artist) => this.normalize(artist)).filter(Boolean);
    const candidateContext = this.normalize(`${b.artists.join(' ')} ${b.title}`);
    if (artistsA.length > 0 && artistsA.every((artist) => candidateContext.includes(artist))) score += 30;
    else if (artistsA.some((artist) => candidateContext.includes(artist))) score += 15;

    if (a.album && b.album) {
      const albumA = this.normalize(a.album);
      const albumB = this.normalize(b.album);
      if (albumA && albumA === albumB) score += 10;
    }

    if (a.duration && b.duration) {
      const durationDifference = Math.abs(a.duration - b.duration);
      if (durationDifference <= 3000) score += 15;
      else if (durationDifference <= 8000) score += 5;
    }

    if (a.isrc && b.isrc && a.isrc === b.isrc) {
      score += 100;
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
    return best.score < TrackMatchingEngine.MINIMUM_MATCH_SCORE ? null : best;
  }
}
