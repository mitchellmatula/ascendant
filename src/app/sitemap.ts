import { MetadataRoute } from "next";
import { db } from "@/lib/db";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://ascendant.app";

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteUrl}/challenges`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/domains`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/gyms`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
  ];

  // Dynamic challenge pages
  const challenges = await db.challenge.findMany({
    where: { isActive: true },
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });

  const challengePages: MetadataRoute.Sitemap = challenges.map((challenge) => ({
    url: `${siteUrl}/challenges/${challenge.slug}`,
    lastModified: challenge.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  // Dynamic discipline pages
  const disciplines = await db.discipline.findMany({
    where: { isActive: true },
    select: { slug: true, updatedAt: true },
  });

  const disciplinePages: MetadataRoute.Sitemap = disciplines.map((discipline) => ({
    url: `${siteUrl}/disciplines/${discipline.slug}`,
    lastModified: discipline.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // Dynamic domain pages
  const domains = await db.domain.findMany({
    where: { isActive: true },
    select: { slug: true, updatedAt: true },
  });

  const domainPages: MetadataRoute.Sitemap = domains.map((domain) => ({
    url: `${siteUrl}/domains/${domain.slug}`,
    lastModified: domain.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // Public gym pages
  const gyms = await db.gym.findMany({
    where: { isActive: true },
    select: { slug: true, updatedAt: true },
  });

  const gymPages: MetadataRoute.Sitemap = gyms.map((gym) => ({
    url: `${siteUrl}/gym/${gym.slug}`,
    lastModified: gym.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return [
    ...staticPages,
    ...challengePages,
    ...disciplinePages,
    ...domainPages,
    ...gymPages,
  ];
}
