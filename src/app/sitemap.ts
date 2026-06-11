import type { MetadataRoute } from "next";
import { allLessonSlugs } from "@/app/learn/_content/registry";
import clientPromise from "@/lib/db/mongodb";

const DB_NAME = "drawlint-db";
const MAX_DESIGN_URLS = 5000;

// Refresh at most hourly so we don't hit the DB on every crawl.
export const revalidate = 3600;

/** Topic + design URLs, queried at request time. Resilient to DB failures. */
async function dynamicLibraryEntries(baseUrl: string, now: Date): Promise<MetadataRoute.Sitemap> {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);

    const [topics, designs] = await Promise.all([
      db
        .collection("topics")
        .find({}, { projection: { _id: 1, slug: 1, updatedAt: 1 } })
        .toArray(),
      db
        .collection("designs")
        .find({ status: { $ne: "draft" } }, { projection: { _id: 1, topicId: 1, updatedAt: 1 } })
        .limit(MAX_DESIGN_URLS)
        .toArray(),
    ]);

    const slugById = new Map<string, string>();
    for (const t of topics) {
      if (t.slug) slugById.set(t._id.toString(), t.slug as string);
    }

    const topicEntries: MetadataRoute.Sitemap = topics
      .filter((t) => t.slug)
      .map((t) => ({
        url: `${baseUrl}/library/${t.slug}`,
        lastModified: t.updatedAt ? new Date(t.updatedAt) : now,
        changeFrequency: "daily" as const,
        priority: 0.8,
      }));

    const designEntries: MetadataRoute.Sitemap = [];
    for (const d of designs) {
      const slug = slugById.get(d.topicId?.toString());
      if (!slug) continue;
      designEntries.push({
        url: `${baseUrl}/library/${slug}/${d._id.toString()}`,
        lastModified: d.updatedAt ? new Date(d.updatedAt) : now,
        changeFrequency: "monthly",
        priority: 0.7,
      });
    }

    return [...topicEntries, ...designEntries];
  } catch (err) {
    console.error("sitemap: failed to load library entries", err);
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://drawlint-ai.in";
  const now = new Date();

  const lessonEntries: MetadataRoute.Sitemap = allLessonSlugs().map((slug) => ({
    url: `${baseUrl}/learn/${slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const libraryEntries = await dynamicLibraryEntries(baseUrl, now);

  return [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/library`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    ...libraryEntries,
    {
      url: `${baseUrl}/challenge`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.85,
    },
    {
      url: `${baseUrl}/guide`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/learn`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/drills`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.85,
    },
    ...lessonEntries,
    {
      url: `${baseUrl}/learn/cheatsheet`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/guide/byo-keys`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/support`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/signin`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.4,
    },
    {
      url: `${baseUrl}/signup`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/changelog`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.5,
    },
  ];
}
