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
        <Term>Geospatial indexing</Term> turns location search into indexed cell
        lookups instead of full-table distance scans. Products such as ride
        hailing, delivery, maps, local search, fleet tracking, and marketplace
        discovery all need the same primitive: given a latitude/longitude and a
        radius, find nearby entities quickly.
      </P>

      <Analogy>
        If you want restaurants near a hotel, you would not call every restaurant
        in the country and ask for its distance. You would open a city map, look
        at the neighborhood square containing the hotel, then scan nearby squares.
        Geohash, H3, S2, and quadtrees give databases that kind of map grid.
      </Analogy>

      <LessonSection id="naive-scan" title="The problem: haversine scans do not scale">
        <P>
          The mathematically correct distance between two latitude/longitude
          points is often computed with the haversine formula. The naive query is:
          scan every driver, restaurant, or point of interest; compute distance
          from the user; sort; return the closest results. That is fine for 1,000
          rows and terrible for 100 million.
        </P>
        <CodeBlock label="naive nearby query">{`function nearby(userLat, userLng, radiusMeters):
  matches = []

  for place in allPlaces:
    d = haversine(userLat, userLng, place.lat, place.lng)
    if d <= radiusMeters:
      matches.append((place, d))

  return sortByDistance(matches).take(50)

// Correct, but O(number of places) per request.`}</CodeBlock>
        <P>
          The failure mode is predictable: every &quot;near me&quot; request burns CPU
          across the entire dataset, cannot use a normal B-tree index well, and
          gets slower as your city coverage grows. You need a way to narrow the
          candidate set before doing exact distance math.
        </P>
        <CompareTable
          headers={["Approach", "Candidate count", "Failure mode"]}
          rows={[
            [
              "Full scan plus haversine",
              "Every row in the table",
              "CPU grows with total dataset size",
            ],
            [
              "Bounding box",
              "Rows in a lat/lng rectangle",
              "Better, but awkward near poles and date line",
            ],
            [
              "Grid cell index",
              "Rows in target and neighbor cells",
              "Requires precision choice and boundary filtering",
            ],
          ]}
        />
      </LessonSection>

      <LessonSection id="grid-systems" title="Grid systems: Geohash, H3, S2, and quadtrees">
        <P>
          A geospatial index divides the world into named cells. Each point is
          encoded into the cell containing it, and nearby search becomes a lookup
          over the current cell plus neighboring cells. Different systems choose
          different cell shapes and hierarchy rules.
        </P>
        <CompareTable
          headers={["System", "Cell shape", "Common strengths"]}
          rows={[
            [
              "Geohash",
              "Rectangles encoded as base32 strings",
              "Simple prefix queries; easy to store in text indexes",
            ],
            [
              "H3",
              "Mostly hexagons at multiple resolutions",
              "Uniform neighbor behavior; popular for analytics and dispatch",
            ],
            [
              "S2",
              "Cells projected from a sphere onto cube faces",
              "Strong spherical geometry; used in maps infrastructure",
            ],
            [
              "Quadtree",
              "Recursive square subdivision",
              "Simple hierarchy; useful for tiles and spatial partitioning",
            ],
          ]}
        />
        <P>
          All of them share the same design move: convert two continuous numbers
          into a discrete key. Once location becomes a key, you can index it,
          shard by it, cache it, and query adjacent keys.
        </P>
        <Callout type="info" title="Spatial keys are partitioning keys">
          Geospatial cells are a specialized form of{" "}
          <XLink href="/learn/sharding-partitioning">sharding and partitioning</XLink>.
          You are grouping nearby points so the query touches a small set of
          partitions instead of the whole world.
        </Callout>
      </LessonSection>

      <LessonSection id="encoding-prefix" title="Encoding lat/lng into cells and prefixes">
        <P>
          Geohash interleaves longitude and latitude bits, then encodes them as a
          base32 string. Nearby locations usually share a prefix. Short prefixes
          describe large areas; longer prefixes describe smaller areas. That
          makes geohash friendly to prefix and range lookups.
        </P>
        <CodeBlock label="geohash prefix matching">{`// Example geohashes around Bengaluru.
restaurant_a = "tdr1v9x8"
restaurant_b = "tdr1v9z2"
restaurant_c = "tdr1uabc"
restaurant_far = "tdr4p123"

// Query a neighborhood-sized prefix.
prefix = "tdr1v9"

SELECT *
FROM places
WHERE geohash >= "tdr1v9"
  AND geohash <  "tdr1va";

// Then compute exact haversine distance on the returned candidates.`}</CodeBlock>
        <P>
          H3 and S2 use numeric cell IDs instead of geohash strings, but the
          mental model is similar: encode a point to a cell at a chosen precision,
          look up rows in that cell and neighbors, then filter by exact distance.
        </P>
        <H3>Why exact filtering still matters</H3>
        <P>
          Cells are approximations. A prefix or cell query returns candidates in a
          region, not a perfect circle. Always run an exact distance check after
          the index lookup so users do not see restaurants 9 km away in a 5 km
          search.
        </P>
      </LessonSection>

      <LessonSection id="radius-query" title="Querying a radius with neighbor cells">
        <P>
          A correct radius query must include cells around the query point,
          because the closest object might sit just across a cell boundary. H3
          calls this a <Term>k-ring</Term>: all cells within <code>k</code> steps
          of the center cell. Geohash implementations compute adjacent prefixes
          that cover a bounding box.
        </P>
        <CodeBlock label="radius query with candidate cells">{`function nearby(lat, lng, radiusMeters):
  resolution = chooseResolution(radiusMeters)
  center = h3.latLngToCell(lat, lng, resolution)
  cells = h3.gridDisk(center, kFor(radiusMeters, resolution))

  candidates = []
  for cell in cells:
    candidates += index.lookup(cell)

  return candidates
    .map(p => (p, haversine(lat, lng, p.lat, p.lng)))
    .filter((p, d) => d <= radiusMeters)
    .sortBy(d)
    .take(50)`}</CodeBlock>
        <UL>
          <LI>
            <Term>Candidate generation:</Term> use cells to cheaply find a small
            superset of possible matches.
          </LI>
          <LI>
            <Term>Exact filtering:</Term> compute haversine or a more precise
            distance only on that candidate set.
          </LI>
          <LI>
            <Term>Ranking:</Term> sort by distance, availability, rating,
            delivery time, surge, or product-specific features.
          </LI>
        </UL>
        <Callout type="warning" title="Cell boundaries are the classic bug">
          Same-cell-only queries miss nearby objects across the border. Always
          include neighbor cells, then filter by exact distance.
        </Callout>
      </LessonSection>

      <LessonSection id="precision" title="Precision levels and operational trade-offs">
        <P>
          Precision controls cell size. Coarse cells cover large areas and return
          too many candidates. Fine cells cover small areas and require scanning
          many cells for a large radius. The best precision depends on query
          radius, entity density, and update frequency.
        </P>
        <CompareTable
          headers={["Choice", "Benefit", "Cost"]}
          rows={[
            [
              "Coarse cells",
              "Few cells per query; simple routing",
              "Many false positives in dense cities",
            ],
            [
              "Fine cells",
              "Small candidate sets near the user",
              "More neighbor cells to cover a radius",
            ],
            [
              "Multiple precisions",
              "Pick resolution by query radius",
              "More indexes or duplicated cell memberships",
            ],
          ]}
        />
        <UL>
          <LI>
            <Term>Dense city vs rural area:</Term> the same radius can return 50
            restaurants downtown or two restaurants in a rural area. Adaptive
            search may expand rings until enough candidates appear.
          </LI>
          <LI>
            <Term>Moving objects:</Term> drivers and couriers update location
            frequently. Keep the geospatial index write path cheap and expire old
            locations quickly.
          </LI>
          <LI>
            <Term>Hot cells:</Term> airports, stadiums, and city centers can
            become hot partitions. Split busy cells, add secondary sharding, or
            cache popular lookups.
          </LI>
          <LI>
            <Term>Earth geometry:</Term> latitude/longitude rectangles behave
            oddly near poles and the international date line. Libraries such as
            H3 and S2 help hide those edge cases.
          </LI>
        </UL>
      </LessonSection>

      <LessonSection id="real-world" title="Real-world examples">
        <P>
          Ride-hailing systems such as Uber and Lyft use cell indexes to match
          riders to nearby drivers and to aggregate supply by region. Maps and
          local search use them for points of interest. Delivery systems use them
          to decide whether an address is inside a service area and to estimate
          nearby courier availability.
        </P>
        <CompareTable
          headers={["Use case", "Indexed entity", "Query pattern"]}
          rows={[
            [
              "Ride hailing",
              "Driver current location",
              "Find available drivers in nearby cells, then rank by ETA",
            ],
            [
              "Food delivery",
              "Restaurants and couriers",
              "Find restaurants in service radius and couriers near pickup",
            ],
            [
              "Maps search",
              "Points of interest",
              "Prefix or cell lookup around viewport, then rank results",
            ],
            [
              "Fraud and analytics",
              "Events by location",
              "Aggregate counts by H3 resolution over time windows",
            ],
          ]}
        />
      </LessonSection>

      <KeyTakeaways
        items={[
          "Naive haversine scans are correct but scale with the full dataset, so they fail for large nearby-search systems.",
          "Geospatial indexes encode latitude/longitude into cells using systems such as Geohash, H3, S2, or quadtrees.",
          "A radius query looks up the center cell plus neighbors, then filters candidates with exact distance math.",
          "Precision is a trade-off: coarse cells return too many candidates, fine cells require more cell lookups.",
          "Real systems still handle boundaries, hot cells, moving objects, date-line edge cases, and product-specific ranking.",
        ]}
      />

      <CheckYourself question="Why not compute haversine distance against every restaurant for each nearby query?">
        It is correct but too expensive. The work grows with the entire dataset,
        not with the number of nearby restaurants. A geospatial index first
        narrows the search to relevant cells, then exact distance is computed only
        for candidates.
      </CheckYourself>

      <CheckYourself question="Why must a radius query include neighboring cells?">
        A nearby object can sit just across the boundary of the center cell. If
        you search only the center cell, you miss valid nearby results. Query the
        center plus neighbors, then filter by exact distance.
      </CheckYourself>

      <CheckYourself question="How do you choose geospatial precision?">
        Match it to radius and density. Coarse cells reduce cell count but return
        many false positives; fine cells reduce candidates but require more
        neighbor lookups. Many systems use multiple resolutions or adapt based on
        how many candidates are found.
      </CheckYourself>
    </Prose>
  );
}
