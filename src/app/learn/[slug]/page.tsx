import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LessonLayout } from "@/components/learn/LessonLayout";
import {
  getLesson,
  getModule,
  getAdjacentLessons,
  allLessonSlugs,
} from "@/app/learn/_content/registry";
import { LESSON_COMPONENTS } from "@/app/learn/_content/lessons";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://drawlint-ai.in";

export function generateStaticParams() {
  return allLessonSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const lesson = getLesson(slug);
  if (!lesson) return { title: "Lesson not found — DrawLint.ai" };
  const mod = getModule(lesson.module);
  const url = `/learn/${slug}`;
  return {
    title: `${lesson.title} — System Design Workbook | DrawLint.ai`,
    description: lesson.summary,
    keywords: [
      lesson.title,
      "system design",
      mod?.title ?? "system design",
      "system design interview",
      "learn system design",
    ],
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      siteName: "DrawLint.ai",
      title: lesson.title,
      description: lesson.summary,
    },
    twitter: {
      card: "summary_large_image",
      title: lesson.title,
      description: lesson.summary,
    },
  };
}

export default async function LessonPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const lesson = getLesson(slug);
  const Body = LESSON_COMPONENTS[slug];
  const mod = lesson ? getModule(lesson.module) : undefined;

  if (!lesson || !Body || !mod) notFound();

  const { prev, next } = getAdjacentLessons(slug);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "TechArticle",
      headline: lesson.title,
      description: lesson.summary,
      url: `${APP_URL}/learn/${slug}`,
      inLanguage: "en",
      author: { "@type": "Organization", name: "DrawLint.ai", url: APP_URL },
      publisher: {
        "@type": "Organization",
        name: "DrawLint.ai",
        url: APP_URL,
        logo: { "@type": "ImageObject", url: `${APP_URL}/logo.svg` },
      },
      isPartOf: {
        "@type": "Course",
        name: "System Design Workbook",
        url: `${APP_URL}/learn`,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "System Design Workbook",
          item: `${APP_URL}/learn`,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: mod.title,
          item: `${APP_URL}/learn`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: lesson.title,
          item: `${APP_URL}/learn/${slug}`,
        },
      ],
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LessonLayout meta={lesson} module={mod} prev={prev} next={next}>
        <Body />
      </LessonLayout>
    </>
  );
}
