#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(await fs.readFile(path.join(root, "migration-manifest.json"), "utf8"));
const brandColors = { primary: "#7F22FE", light: "#A684FF", dark: "#7008E7" };
const openApiSources = manifest.pages
  .filter((page) => page.schema)
  .flatMap((page) => {
    const basename = page.slug.replaceAll("/", "--");
    return [
      `api-reference/openapi/${basename}.yaml`,
      `api-reference/openapi/${basename}.zh.yaml`,
    ];
  });

const guideGroups = [
  { en: "Overview", zh: "概览", icon: "compass", slugs: ["introduction", "quickstart", "authentication", "endpoint-conventions"] },
  { en: "Core concepts", zh: "核心概念", icon: "blocks", slugs: ["asynchronous-tasks", "webhooks", "error-codes"] },
];

const apiGroups = [
  {
    en: "Images",
    zh: "图片",
    icon: "image",
    groups: [
      { en: "GPT Image 2", zh: "GPT Image 2", icon: "wand-sparkles", prefix: "gpt-image-2/" },
      { en: "Nano Banana", zh: "Nano Banana", icon: "banana", prefix: "nano-banana/" },
      {
        en: "Seedream",
        zh: "Seedream",
        icon: "flower-2",
        groups: [
          { en: "Seedream V4.5", zh: "Seedream V4.5", slugs: ["seedream/4-5-text-to-image", "seedream/4-5-image-to-image"] },
          { en: "Seedream V5.0 Lite", zh: "Seedream V5.0 Lite", slugs: ["seedream/5-0-lite-text-to-image", "seedream/5-0-lite-image-to-image"] },
        ],
      },
      {
        en: "Wan Image",
        zh: "Wan Image",
        icon: "cloud-sun",
        groups: [
          { en: "Wan Image V2.7", zh: "Wan Image V2.7", slugs: ["wan/2-7-text-to-image", "wan/2-7-image-to-image"] },
          { en: "Wan Image V2.7 Pro", zh: "Wan Image V2.7 Pro", slugs: ["wan/2-7-text-to-image-pro", "wan/2-7-image-to-image-pro"] },
        ],
      },
    ],
  },
  {
    en: "Videos",
    zh: "视频",
    icon: "video",
    groups: [
      {
        en: "Veo",
        zh: "Veo",
        icon: "clapperboard",
        groups: [
          { en: "Veo 3.1 Lite", zh: "Veo 3.1 Lite", slugs: ["veo/3-1-lite", "veo/3-1-lite-4k"] },
          { en: "Veo 3.1 Fast", zh: "Veo 3.1 Fast", slugs: ["veo/3-1-fast", "veo/3-1-fast-4k", "veo/3-1-fast-ref"] },
          { en: "Veo 3.1 Quality", zh: "Veo 3.1 Quality", slugs: ["veo/3-1-quality", "veo/3-1-quality-4k"] },
        ],
      },
      {
        en: "Seedance",
        zh: "Seedance",
        icon: "film",
        groups: [
          {
            en: "Seedance 1.0",
            zh: "Seedance 1.0",
            groups: [
              { en: "Seedance 1.0 Lite", zh: "Seedance 1.0 Lite", slugs: ["seedance/seedance-1-0-lite-t2v", "seedance/seedance-1-0-lite-i2v", "seedance/seedance-1-0-lite-i2v-ref"] },
              { en: "Seedance 1.0 Pro Fast", zh: "Seedance 1.0 Pro Fast", slugs: ["seedance/seedance-1-0-pro-fast-t2v", "seedance/seedance-1-0-pro-fast-i2v"] },
              { en: "Seedance 1.0 Pro", zh: "Seedance 1.0 Pro", slugs: ["seedance/seedance-1-0-pro-i2v", "seedance/seedance-1-0-pro-t2v"] },
            ],
          },
          { en: "Seedance 1.5", zh: "Seedance 1.5", slugs: ["seedance/seedance-1-5-pro-i2v", "seedance/seedance-1-5-pro-t2v"] },
          {
            en: "Seedance 2.0",
            zh: "Seedance 2.0",
            groups: [
              { en: "Seedance 2.0 Pro", zh: "Seedance 2.0 Pro", slugs: ["seedance/2-0-text-to-video", "seedance/2-0-image-to-video", "seedance/2-0-reference-to-video"] },
              { en: "Seedance 2.0 Fast", zh: "Seedance 2.0 Fast", slugs: ["seedance/2-0-fast-text-to-video", "seedance/2-0-fast-image-to-video", "seedance/2-0-fast-reference-to-video"] },
              { en: "Seedance 2.0 Mini", zh: "Seedance 2.0 Mini", slugs: ["seedance/2-0-mini-image-to-video", "seedance/2-0-mini-reference-to-video", "seedance/2-0-mini-text-to-video"] },
            ],
          },
        ],
      },
      {
        en: "Grok Imagine",
        zh: "Grok Imagine",
        icon: "orbit",
        groups: [
          { en: "Grok Imagine Video 1.0", zh: "Grok Imagine Video 1.0", slugs: ["grok-imagine/grok-imagine-t2v", "grok-imagine/grok-imagine-i2v"] },
          { en: "Grok Imagine Video 1.5", zh: "Grok Imagine Video 1.5", slugs: ["grok-imagine-1-5/grok-imagine-1-5-fast", "grok-imagine-1-5/grok-imagine-1-5-preview", "grok-imagine-1-5/grok-imagine-1-5-vip"] },
        ],
      },
      { en: "Sora 2", zh: "Sora 2", icon: "aperture", prefix: "sora-2/" },
      { en: "Gemini Omni", zh: "Gemini Omni", icon: "gem", prefix: "gemini-omni/" },
      { en: "MiniMax H3", zh: "MiniMax H3", icon: "scan", prefix: "minimax-h3/" },
      {
        en: "Wan Video",
        zh: "Wan Video",
        icon: "cloud",
        groups: [
          { en: "Wan 2.7", zh: "Wan 2.7", slugs: ["wan/wan2-7-i2v", "wan/wan2-7-t2v", "wan/wan2-7-videoedit"] },
          { en: "Wan 3.0", zh: "Wan 3.0", slugs: ["wan/wan3-0-i2v", "wan/wan3-0-r2v", "wan/wan3-0-t2v"] },
          { en: "Wan 3.0 Prime", zh: "Wan 3.0 Prime", slugs: ["wan/wan3-0-prime-i2v", "wan/wan3-0-prime-r2v", "wan/wan3-0-prime-t2v"] },
        ],
      },
      { en: "Kling Motion Control", zh: "Kling 动作控制", icon: "person-standing", prefix: "kling/" },
      { en: "Motion Control", zh: "动作控制", icon: "move-3d", prefix: "motion-control/" },
    ],
  },
  { en: "Tasks", zh: "任务", icon: "list-checks", slugs: ["query-image-task", "query-video-task"] },
];

const schemaRedirects = {
  "/14024404d0": "/nano-banana/nano-banana-pro",
  "/14024943d0": "/seedream/4-5-text-to-image",
  "/14025414d0": "/seedream/5-0-lite-text-to-image",
  "/14024675d0": "/gpt-image-2/gpt-image-2",
  "/14024783d0": "/query-image-task",
  "/14025470d0": "/wan/2-7-text-to-image",
  "/14027954d0": "/wan/2-7-image-to-image",
  "/14027955d0": "/wan/2-7-text-to-image-pro",
  "/14027966d0": "/wan/2-7-image-to-image-pro",
  "/14037703d0": "/veo/3-1-fast",
  "/14126452d0": "/seedance/2-0-text-to-video",
  "/14126895d0": "/seedance/2-0-image-to-video",
  "/14126909d0": "/seedance/2-0-reference-to-video",
  "/14139985d0": "/seedance/2-0-fast-text-to-video",
  "/14139986d0": "/seedance/2-0-fast-image-to-video",
  "/14139989d0": "/seedance/2-0-fast-reference-to-video",
  "/14454319d0": "/gpt-image-2/gpt-image-2",
  "/14454323d0": "/gpt-image-2/gpt-image-2",
  "/14563793d0": "/grok-imagine/grok-imagine-t2v",
  "/14563794d0": "/grok-imagine/grok-imagine-i2v",
  "/14667206d0": "/sora-2/sora-2-vip",
  "/14807471d0": "/nano-banana/nano-banana-2",
  "/15589232d0": "/grok-imagine-1-5/grok-imagine-1-5-preview",
  "/15747666d0": "/veo/3-1-fast-4k",
  "/15747672d0": "/veo/3-1-fast-ref",
  "/15747849d0": "/veo/3-1-quality",
  "/15747934d0": "/veo/3-1-quality-4k",
  "/15748097d0": "/gemini-omni/gemini-omni-t2v",
  "/15748175d0": "/gemini-omni/gemini-omni-i2v",
  "/15748545d0": "/gemini-omni/gemini-omni-r2v",
  "/15748551d0": "/gemini-omni/gemini-omni-extend",
  "/16626823d0": "/grok-imagine-1-5/grok-imagine-1-5-fast",
  "/16724960d0": "/gpt-image-2/gpt-image-2-lite",
  "/16809455d0": "/minimax-h3/minimax-h3-t2v",
  "/16809456d0": "/minimax-h3/minimax-h3-i2v",
  "/16809458d0": "/minimax-h3/minimax-h3-r2v"
};

function pagePath(language, slug) {
  return language === "en" ? slug : `zh-CN/${slug}`;
}

function matchesNavigationGroup(page, group) {
  const matchesPrefix = (group.prefix && page.slug.startsWith(group.prefix)) ||
    group.prefixes?.some((prefix) => page.slug.startsWith(prefix));
  const matchesClassification = !group.classifications ||
    page.classifications?.some((classification) => group.classifications.includes(classification));
  return matchesPrefix && matchesClassification;
}

function localizedGroups(language, groups) {
  return groups.map((group) => {
    const localizedGroup = { group: group[language], ...(group.icon ? { icon: group.icon } : {}) };
    if (group.groups) {
      return { ...localizedGroup, pages: localizedGroups(language, group.groups) };
    }
    const matches = group.slugs
      ? group.slugs.map((slug) => ({ slug }))
      : manifest.pages.filter((page) => matchesNavigationGroup(page, group));
    return { ...localizedGroup, pages: matches.map((page) => pagePath(language, page.slug)) };
  });
}

function localizedTabs(language) {
  return [
    {
      tab: language === "en" ? "Get Started" : "开始使用",
      groups: localizedGroups(language, guideGroups),
    },
    {
      tab: language === "en" ? "API Reference" : "API 参考",
      groups: localizedGroups(language, apiGroups),
    },
  ];
}

const redirects = [
  { source: "/", destination: "/introduction", permanent: false },
  { source: "/gpt-image-2/gpt-image-2-edit", destination: "/gpt-image-2/gpt-image-2", permanent: true },
  { source: "/en/gpt-image-2/gpt-image-2-edit", destination: "/gpt-image-2/gpt-image-2", permanent: true },
  { source: "/zh/gpt-image-2/gpt-image-2-edit", destination: "/zh-CN/gpt-image-2/gpt-image-2", permanent: true },
  { source: "/sora-2/sora-2", destination: "/sora-2/sora-2-vip", permanent: true },
  { source: "/sora-2/sora-2-pro", destination: "/sora-2/sora-2-vip", permanent: true },
  { source: "/en/sora-2/sora-2", destination: "/sora-2/sora-2-vip", permanent: true },
  { source: "/en/sora-2/sora-2-pro", destination: "/sora-2/sora-2-vip", permanent: true },
  { source: "/zh/sora-2/sora-2", destination: "/zh-CN/sora-2/sora-2-vip", permanent: true },
  { source: "/zh/sora-2/sora-2-pro", destination: "/zh-CN/sora-2/sora-2-vip", permanent: true },
  { source: "/zh-CN/sora-2/sora-2", destination: "/zh-CN/sora-2/sora-2-vip", permanent: true },
  { source: "/zh-CN/sora-2/sora-2-pro", destination: "/zh-CN/sora-2/sora-2-vip", permanent: true },
  { source: "/zh-CN/seedance/seedance-2-0-mini-i2v", destination: "/zh-CN/seedance/2-0-mini-image-to-video", permanent: true },
  { source: "/zh-CN/seedance/seedance-2-0-mini-r2v", destination: "/zh-CN/seedance/2-0-mini-reference-to-video", permanent: true },
  { source: "/zh-CN/seedance/seedance-2-0-mini-t2v", destination: "/zh-CN/seedance/2-0-mini-text-to-video", permanent: true },
  { source: "/seedance/doubao-seedance-1-0-pro-fast-t2v", destination: "/seedance/seedance-1-0-pro-fast-t2v", permanent: true },
  { source: "/en/seedance/doubao-seedance-1-0-pro-fast-t2v", destination: "/seedance/seedance-1-0-pro-fast-t2v", permanent: true },
  { source: "/zh/seedance/doubao-seedance-1-0-pro-fast-t2v", destination: "/zh-CN/seedance/seedance-1-0-pro-fast-t2v", permanent: true },
  { source: "/zh-CN/seedance/doubao-seedance-1-0-pro-fast-t2v", destination: "/zh-CN/seedance/seedance-1-0-pro-fast-t2v", permanent: true },
  ...manifest.pages
    .map((page) => ({ source: page.legacy, destination: `/${page.slug}`, permanent: true }))
    .filter((redirect) => redirect.source !== redirect.destination),
  ...manifest.pages.flatMap((page) => [
    { source: `/en/${page.slug}`, destination: `/${page.slug}`, permanent: true },
    { source: `/zh/${page.slug}`, destination: `/zh-CN/${page.slug}`, permanent: true },
  ]),
  ...Object.entries(schemaRedirects).map(([source, destination]) => ({ source, destination, permanent: true })),
];
const configuredSchemaPaths = Object.keys(schemaRedirects).sort();
const sourceSchemaPaths = [...(manifest.schemaPaths || [])].sort();
if (JSON.stringify(configuredSchemaPaths) !== JSON.stringify(sourceSchemaPaths)) {
  throw new Error("Schema redirect map does not match the schema-only sitemap paths");
}

const config = {
  $schema: "https://mintlify.com/docs.json",
  theme: "mint",
  name: "APIPod Docs",
  description: "APIPod API documentation for image and video generation models.",
  colors: brandColors,
  favicon: "/favicon.ico",
  logo: { light: "/logo.svg", dark: "/logo.svg", href: "https://www.apipod.ai" },
  icons: { library: "lucide" },
  navigation: {
    languages: [
      { language: "en", default: true, tabs: localizedTabs("en") },
      { language: "zh-CN", tabs: localizedTabs("zh") }
    ]
  },
  navbar: {
    links: [
      { label: "Models", href: "https://www.apipod.ai/models" },
      { label: "Pricing", href: "https://www.apipod.ai/pricing" },
      { label: "Support", href: "mailto:api@apipod.ai" }
    ],
    primary: { type: "button", label: "Console", href: "https://www.apipod.ai/console" }
  },
  api: {
    openapi: openApiSources,
    playground: { display: "interactive", proxy: false },
    examples: { languages: ["curl", "python", "go", "rust", "javascript"], defaults: "required" },
    url: "full"
  },
  search: { prompt: "Search APIPod documentation" },
  seo: { indexing: "navigable" },
  contextual: { options: ["copy", "view", "chatgpt", "claude", "cursor"] },
  redirects,
  footer: { socials: { github: "https://github.com/APIPod" } }
};

await fs.writeFile(path.join(root, "docs.json"), `${JSON.stringify(config, null, 2)}\n`);
const navigationPageCount = new Set(config.navigation.languages.flatMap((language) =>
  language.tabs.flatMap((tab) => collectNavigationPages(tab.groups))
)).size;
console.log(`Generated ${config.navigation.languages.length} languages, ${navigationPageCount} navigation pages, and ${redirects.length} redirects.`);

function collectNavigationPages(nodes, output = []) {
  for (const node of nodes || []) {
    for (const page of node.pages || []) {
      if (typeof page === "string") output.push(page);
      else collectNavigationPages([page], output);
    }
  }
  return output;
}
