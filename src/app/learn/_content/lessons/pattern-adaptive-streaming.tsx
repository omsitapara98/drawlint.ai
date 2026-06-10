import {
  Prose,
  LessonSection,
  H3,
  P,
  XLink,
  Term,
  UL,
  LI,
  Callout,
  Analogy,
  CodeBlock,
  CompareTable,
  KeyTakeaways,
  CheckYourself,
} from "@/components/learn";

export default function Lesson() {
  return (
    <Prose>
      <P>
        HLS and DASH solve a deceptively hard video problem: one viewer is on
        fiber, another is on hotel Wi-Fi, another is on a subway, and the same
        movie must keep playing for all of them. <Term>Adaptive streaming</Term>
        encodes the video into short segments at multiple bitrates, publishes a
        manifest that lists those choices, and lets the player choose the next
        segment quality based on real-time network conditions.
      </P>

      <Analogy>
        Think of video as a road trip with gas stations every few miles. If the
        highway is clear, you take the fast lane between stations. If traffic gets
        bad, you switch to the slower lane for the next stretch instead of being
        stuck behind one giant truck for the whole journey.
      </Analogy>

      <LessonSection id="problem" title="The problem: one fixed file cannot fit every network">
        <P>
          A single <code>movie.mp4</code> at one bitrate is simple to store, but it
          fails in two directions. High bitrate video stalls on slow networks
          because the player cannot download bytes as fast as it consumes them.
          Low bitrate video plays everywhere but looks blurry on fast networks and
          large screens. Adaptive streaming turns one large file into many small
          decisions.
        </P>
        <CompareTable
          headers={["Delivery model", "What the player downloads", "What breaks"]}
          rows={[
            ["Single fixed MP4", "One continuous file at one quality", "Either stalls on slow links or wastes quality on fast links"],
            ["Progressive download with Range", "Byte ranges from one rendition", "Seeking works, but quality cannot change without switching files"],
            ["HLS or DASH", "Small segments chosen from many renditions", "Needs an encoding pipeline, manifests, and more objects"],
          ]}
        />
        <Callout type="key" title="The core idea">
          Segment duration is the adaptation window. Every 2-6 seconds the player
          gets a chance to ask, &quot;Can I afford a better rendition now, or should I
          downgrade before the buffer empties?&quot;
        </Callout>
      </LessonSection>

      <LessonSection id="pipeline" title="Encoding pipeline: renditions, segments, and manifests">
        <P>
          After upload, a transcoding pipeline produces a ladder of
          <Term>renditions</Term>: the same content at different resolutions and
          bitrates. Each rendition is cut into aligned segments, usually a few
          seconds long. Alignment matters: segment 120 in the 360p stream must
          represent the same time range as segment 120 in the 1080p stream so the
          player can switch cleanly.
        </P>
        <CodeBlock label="typical adaptive streaming pipeline">{`raw_upload.mp4
  → validate and probe duration/codecs
  → encode rendition ladder:
      426x240   400 kbps
      854x480   900 kbps
      1280x720  2500 kbps
      1920x1080 5000 kbps
  → segment each rendition into 4-second chunks
  → write chunks + manifest to object storage
  → put CDN in front of the manifest and segments`}</CodeBlock>
        <H3>Why storage grows</H3>
        <P>
          You are storing several versions of the same video. If the original is 1
          GB, the total adaptive set might be 2-4 GB depending on the ladder,
          codecs, audio tracks, thumbnails, captions, and packaging. The payoff is
          that every segment is cacheable and every viewer can receive an
          appropriate bitrate.
        </P>
        <UL>
          <LI>
            <Term>HLS:</Term> uses <code>.m3u8</code> playlists and is the default
            for Apple platforms and most web players.
          </LI>
          <LI>
            <Term>DASH:</Term> uses an <code>.mpd</code> manifest and is common in
            standards-based players and Android ecosystems.
          </LI>
          <LI>
            <Term>CMAF:</Term> a packaging approach that lets HLS and DASH share
            many of the same fragmented MP4 media segments.
          </LI>
        </UL>
      </LessonSection>

      <LessonSection id="manifest" title="The manifest: a menu of segment choices">
        <P>
          The manifest is not the video. It is a small text file that tells the
          player which renditions exist, their approximate bandwidth, codecs,
          resolution, and where to fetch each media playlist or segment. The player
          loads the manifest first, then requests media segments from the chosen
          rendition.
        </P>
        <CodeBlock label="simplified HLS master playlist">{`#EXTM3U
#EXT-X-VERSION:7

#EXT-X-STREAM-INF:BANDWIDTH=450000,RESOLUTION=426x240,CODECS="avc1.4d401e,mp4a.40.2"
240p/playlist.m3u8

#EXT-X-STREAM-INF:BANDWIDTH=1000000,RESOLUTION=854x480,CODECS="avc1.4d401f,mp4a.40.2"
480p/playlist.m3u8

#EXT-X-STREAM-INF:BANDWIDTH=2800000,RESOLUTION=1280x720,CODECS="avc1.64001f,mp4a.40.2"
720p/playlist.m3u8

#EXT-X-STREAM-INF:BANDWIDTH=5500000,RESOLUTION=1920x1080,CODECS="avc1.640028,mp4a.40.2"
1080p/playlist.m3u8`}</CodeBlock>
        <CodeBlock label="one media playlist points at short segments">{`#EXTM3U
#EXT-X-TARGETDURATION:4
#EXT-X-MEDIA-SEQUENCE:1200
#EXTINF:4.000,
seg-1200.m4s
#EXTINF:4.000,
seg-1201.m4s
#EXTINF:4.000,
seg-1202.m4s`}</CodeBlock>
        <P>
          Many modern packages use <Term>byte-range requests</Term> instead of one
          physical file per segment. The manifest can point to ranges inside a
          larger media file, and the player sends <code>Range</code> headers to
          fetch just the bytes it needs. This reduces object counts while keeping
          segment-level adaptation.
        </P>
      </LessonSection>

      <LessonSection id="player" title="Player adaptation: bandwidth, buffer, and switching">
        <P>
          The player constantly estimates two things: how fast it can download and
          how much playable video is already buffered. If a 4-second 1080p segment
          takes 7 seconds to download, the buffer is shrinking and the next segment
          should be lower quality. If several segments arrive quickly and the
          buffer is healthy, the player can try a higher rendition.
        </P>
        <CodeBlock label="simplified adaptive bitrate loop">{`for each next segment:
  measuredBandwidth = bytesDownloaded / downloadSeconds
  safetyBandwidth = measuredBandwidth * 0.75

  if bufferSeconds < 10:
    choose lower rendition immediately
  else:
    choose highest rendition whose bitrate < safetyBandwidth

  request segment with HTTP GET or Range
  append bytes to media buffer`}</CodeBlock>
        <CompareTable
          headers={["Signal", "If it gets worse", "Player response"]}
          rows={[
            ["Measured bandwidth", "Segments download slower than real time", "Switch down before playback stalls"],
            ["Buffer depth", "Buffered seconds fall below a threshold", "Prefer continuity over quality"],
            ["Device capability", "CPU or display cannot decode high quality", "Cap maximum resolution or codec"],
            ["CDN/cache health", "Edge misses or origin latency increase", "Player sees slower downloads and adapts down"],
          ]}
        />
        <Callout type="tip" title="Stalls hurt more than blurry video">
          Users forgive a temporary drop from 1080p to 720p far more than a frozen
          spinner. Good ABR algorithms are conservative when the buffer is low and
          opportunistic only when they have cushion.
        </Callout>
      </LessonSection>

      <LessonSection id="delivery" title="CDN delivery and byte ranges">
        <P>
          Adaptive streaming is almost tailor-made for a{" "}
          <XLink href="/learn/pattern-cdn">CDN</XLink>. Millions of viewers request
          the same manifests and segment URLs, so edge caches can serve them near
          users. Your origin should usually be object storage, often the same
          primitive used for{" "}
          <XLink href="/learn/pattern-blob-presigned-urls">blob uploads</XLink>.
        </P>
        <CodeBlock label="segment request through CDN with byte range">{`GET /videos/v123/720p/media.mp4 HTTP/1.1
Host: cdn.example.com
Range: bytes=8388608-10485759

HTTP/1.1 206 Partial Content
Content-Range: bytes 8388608-10485759/734003200
Cache-Control: public, max-age=31536000, immutable`}</CodeBlock>
        <UL>
          <LI>
            <Term>Immutable segment URLs:</Term> include a content hash or version
            in the path so cached chunks can live for months without accidental
            stale playback.
          </LI>
          <LI>
            <Term>Short manifest TTL for live:</Term> live manifests change as new
            segments appear, so cache them briefly while segments can be cached
            much longer.
          </LI>
          <LI>
            <Term>Origin shielding:</Term> put a CDN shield in front of object
            storage so a viral video does not stampede the bucket from thousands
            of edge locations.
          </LI>
        </UL>
      </LessonSection>

      <LessonSection id="gotchas" title="Gotchas and real-world examples">
        <P>
          Netflix, YouTube, Twitch, sports apps, course platforms, and internal
          training portals all use variants of this pattern. The exact codecs and
          packaging differ, but the shape is the same: encode a rendition ladder,
          publish manifests, cache aggressively, and let the player adapt.
        </P>
        <UL>
          <LI>
            <Term>Startup latency:</Term> shorter segments adapt faster but create
            more requests and overhead. Longer segments are cheaper but react
            slowly to bandwidth changes.
          </LI>
          <LI>
            <Term>Codec compatibility:</Term> AV1 or HEVC may save bandwidth but
            not every browser/device can decode them. Manifests often advertise
            multiple codec families.
          </LI>
          <LI>
            <Term>Live latency:</Term> live streaming needs careful segment size,
            playlist window, and player buffer tuning. Low-latency HLS/DASH adds
            partial segments and more moving parts.
          </LI>
          <LI>
            <Term>DRM and signed URLs:</Term> private video often combines CDN
            signed URLs/cookies with license servers. Do not put long-lived secrets
            in manifests.
          </LI>
        </UL>
      </LessonSection>

      <KeyTakeaways
        items={[
          "Adaptive streaming encodes the same video into multiple bitrate renditions and cuts each rendition into short aligned segments.",
          "A manifest is the player's menu: it lists renditions, bandwidths, codecs, resolutions, and segment locations.",
          "The player measures bandwidth and buffer health, then chooses the next segment quality; switching happens segment by segment.",
          "CDNs are essential because manifests and segments are static, cacheable HTTP objects served to many viewers.",
          "Byte-range requests let players fetch only the segment bytes they need, supporting seeking, resume, and lower object counts.",
        ]}
      />

      <CheckYourself question="Why does adaptive streaming use short segments instead of one continuous stream?">
        Short segments create decision points. Every few seconds the player can
        measure download speed and buffer health, then pick a higher or lower
        rendition for the next segment without restarting the video.
      </CheckYourself>

      <CheckYourself question="What is the manifest's job in HLS or DASH?">
        The manifest lists the available renditions and media segment locations.
        The player reads it first, then chooses which rendition&apos;s segments to
        request based on bandwidth, buffer, device capability, and policy.
      </CheckYourself>

      <CheckYourself question="Why put adaptive streaming segments behind a CDN?">
        Segments are immutable HTTP objects requested by many viewers. A CDN caches
        them near users, reducing startup latency and keeping repeated segment
        reads off your origin object store.
      </CheckYourself>
    </Prose>
  );
}
