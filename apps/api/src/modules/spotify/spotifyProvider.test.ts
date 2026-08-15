import assert from 'node:assert/strict';
import test from 'node:test';
import { getPlaylistItemTrack, getPlaylistTrackCount } from './spotifyProvider';

test('reads the 2026 playlist items field', () => {
  assert.equal(getPlaylistTrackCount({ items: { total: 12 } }), 12);
});

test('keeps compatibility with the legacy tracks field', () => {
  assert.equal(getPlaylistTrackCount({ tracks: { total: 8 } }), 8);
});

test('reads new and legacy playlist item shapes', () => {
  const track = { id: 'track-id' };
  assert.equal(getPlaylistItemTrack({ item: track }), track);
  assert.equal(getPlaylistItemTrack({ track }), track);
  assert.equal(getPlaylistItemTrack({}), null);
});
