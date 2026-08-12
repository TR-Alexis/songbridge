import assert from 'node:assert/strict';
import test from 'node:test';
import { TrackMatchingEngine } from './trackMatchingEngine';

test('matches a YouTube-style title containing artist and song', () => {
  const source = { title: 'Bailando', artists: ['Enrique Iglesias'] };
  const candidate = { title: 'Enrique Iglesias - Bailando (Official Video)', artists: ['Music Channel'] };

  assert.ok(TrackMatchingEngine.computeSimilarity(source, candidate) >= TrackMatchingEngine.MINIMUM_MATCH_SCORE);
  assert.equal(TrackMatchingEngine.findBestMatch(source, [candidate])?.track, candidate);
});

test('does not award artist points to two empty artist arrays', () => {
  const score = TrackMatchingEngine.computeSimilarity(
    { title: 'First Song', artists: [] },
    { title: 'Completely Different', artists: [] },
  );

  assert.equal(score, 0);
});

test('rejects a weak title overlap', () => {
  const result = TrackMatchingEngine.findBestMatch(
    { title: 'Love Story', artists: ['Taylor Swift'] },
    [{ title: 'A Story About Music', artists: ['Unknown Channel'] }],
  );

  assert.equal(result, null);
});

test('prioritizes an exact ISRC match', () => {
  const source = { title: 'Song', artists: ['Artist'], isrc: 'US-ABC-12-34567' };
  const exact = { title: 'Alternate title', artists: ['Other'], isrc: 'US-ABC-12-34567' };

  assert.equal(TrackMatchingEngine.findBestMatch(source, [exact])?.track, exact);
});
