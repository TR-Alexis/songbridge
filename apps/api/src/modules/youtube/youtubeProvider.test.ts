import assert from "node:assert/strict";
import test from "node:test";
import { normalizeYouTubeArtist, YouTubeProvider } from "./youtubeProvider";

test("removes the Topic suffix from YouTube artist channels", () => {
  assert.deepEqual(normalizeYouTubeArtist("Metallica - Topic"), ["Metallica"]);
  assert.deepEqual(normalizeYouTubeArtist("Michael Jackson - Topic"), [
    "Michael Jackson",
  ]);
});

test("removes the VEVO suffix and preserves regular channel names", () => {
  assert.deepEqual(normalizeYouTubeArtist("AdeleVEVO"), ["Adele"]);
  assert.deepEqual(normalizeYouTubeArtist("AC/DC"), ["AC/DC"]);
});

test("normalizes the artist while mapping a YouTube playlist item", () => {
  const track = new YouTubeProvider().toTrack({
    title: "Enter Sandman",
    videoOwnerChannelTitle: "Metallica - Topic",
    resourceId: { videoId: "video-id" },
  });

  assert.deepEqual(track.artists, ["Metallica"]);
});
