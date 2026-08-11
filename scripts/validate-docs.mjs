#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(await fs.readFile(path.join(root, "docs.json"), "utf8"));
const manifest = JSON.parse(await fs.readFile(path.join(root, "migration-manifest.json"), "utf8"));
const errors = [];

async function exists(page) {
  try {
    await fs.access(path.join(root, `${page}.mdx`));
    return true;
  } catch {
    return false;
  }
}

function collectPages(node, output = []) {
  if (typeof node === "string") output.push(node);
  else if (Array.isArray(node)) node.forEach((item) => collectPages(item, output));
  else if (node && typeof node === "object") Object.values(node).forEach((value) => collectPages(value, output));
  return output;
}

function navigationShape(node) {
  if (typeof node === "string") return node.replace(/^zh-CN\//, "");
  if (Array.isArray(node)) return node.map(navigationShape);
  if (!node || typeof node !== "object") return node;
  return { pages: navigationShape(node.pages || node.groups || []) };
}

function pagePath(language, slug) {
  return language === "en" ? slug : `zh-CN/${slug}`;
}

async function readSourceSpec(slug) {
  const basename = slug.replaceAll("/", "--");
  for (const candidate of [
    path.join(root, "api-reference/specs", `${basename}.yaml.txt`),
    path.join(root, "api-reference/openapi", `${basename}.yaml`),
  ]) {
    try {
      return YAML.parse(await fs.readFile(candidate, "utf8"));
    } catch {
      // Fall back to the normalized OpenAPI source for legacy pages without a raw snapshot.
    }
  }
  throw new Error(`Source OpenAPI snapshot missing for ${slug}`);
}

const guidePages = [
  "introduction",
  "quickstart",
  "authentication",
  "endpoint-conventions",
  "models",
  "asynchronous-tasks",
  "webhooks",
  "error-codes",
];
const expectedPagePaths = new Set([
  ...manifest.pages.flatMap((page) => [pagePath("en", page.slug), pagePath("zh", page.slug)]),
  ...guidePages.flatMap((slug) => [pagePath("en", slug), pagePath("zh", slug)]),
]);
const navigationPages = [...new Set(collectPages(config.navigation.languages).filter((page) => expectedPagePaths.has(page)))];
for (const page of navigationPages) if (!(await exists(page))) errors.push(`Navigation page missing: ${page}`);
if (config.navigation.global?.anchors?.some((anchor) => ["Models", "Pricing"].includes(anchor.anchor))) {
  errors.push("Models and Pricing must be rendered in the header, not the sidebar");
}
const expectedNavbarLinks = ["Models", "Pricing", "Support"];
if (JSON.stringify(config.navbar?.links?.map((link) => link.label)) !== JSON.stringify(expectedNavbarLinks)) {
  errors.push("Unexpected header navigation links");
}
for (const language of ["en", "zh"]) {
  for (const slug of guidePages) {
    const target = pagePath(language, slug);
    if (!(await exists(target))) errors.push(`Guide page missing: ${target}`);
    if (!navigationPages.includes(target)) errors.push(`Guide page not in navigation: ${target}`);
  }
  const languageConfig = config.navigation.languages.find((item) => item.language === (language === "en" ? "en" : "zh-CN"));
  const tabs = languageConfig?.tabs || [];
  const expectedTabs = language === "en" ? ["Get Started", "API Reference"] : ["开始使用", "API 参考"];
  if (JSON.stringify(tabs.map((item) => item.tab)) !== JSON.stringify(expectedTabs)) {
    errors.push(`Unexpected navigation tabs for ${language}`);
  }
  const expectedApiGroups = language === "en" ? ["LLM", "Images", "Videos", "Tasks"] : ["LLM", "图片", "视频", "任务"];
  const apiGroups = tabs.find((item) => item.tab === expectedTabs[1])?.groups || [];
  if (JSON.stringify(apiGroups.map((item) => item.group)) !== JSON.stringify(expectedApiGroups)) {
    errors.push(`Unexpected API navigation groups for ${language}`);
  }
  for (const group of apiGroups) {
    if (!group.icon) errors.push(`Navigation icon missing for ${language}/${group.group}`);
    for (const child of group.pages || []) {
      if (typeof child !== "string" && !child.icon) errors.push(`Navigation icon missing for ${language}/${group.group}/${child.group}`);
    }
  }
  const languagePages = collectPages(tabs).filter((page) => expectedPagePaths.has(page));
  if (new Set(languagePages).size !== languagePages.length) errors.push(`Duplicate navigation page in ${language}`);
}
const englishNavigation = config.navigation.languages.find((item) => item.language === "en");
const chineseNavigation = config.navigation.languages.find((item) => item.language === "zh-CN");
if (JSON.stringify(navigationShape(englishNavigation?.tabs || [])) !== JSON.stringify(navigationShape(chineseNavigation?.tabs || []))) {
  errors.push("English and Chinese navigation hierarchy or page membership differs");
}
for (const page of manifest.pages) {
  for (const language of ["en", "zh"]) if (!(await exists(pagePath(language, page.slug)))) errors.push(`Migrated page missing: ${pagePath(language, page.slug)}`);
  const canonicalPage = `/${page.slug}`;
  if (page.legacy !== canonicalPage && !config.redirects.some((redirect) => redirect.source === page.legacy)) {
    errors.push(`Legacy redirect missing: ${page.legacy}`);
  }
}
const openApiPages = manifest.pages.filter((page) => page.schema);
for (const page of openApiPages) {
  for (const language of ["en", "zh"]) {
    const suffix = language === "zh" ? ".zh" : "";
    try {
      const spec = YAML.parse(await fs.readFile(path.join(root, `api-reference/openapi/${page.slug.replaceAll("/", "--")}${suffix}.yaml`), "utf8"));
      const generatedPath = `api-reference/openapi/${page.slug.replaceAll("/", "--")}${suffix}.yaml`;
      if (spec.openapi !== "3.1.0" || !spec.servers?.some((server) => server.url === "https://api.apipod.ai")) {
        errors.push(`Invalid generated OpenAPI source: ${generatedPath}`);
      }
      if (!spec.paths || Object.keys(spec.paths).length !== 1) errors.push(`Generated OpenAPI source must contain one operation: ${generatedPath}`);
      if (language === "zh") {
        const operation = Object.values(Object.values(spec.paths)[0])[0];
        const descriptions = [];
        const collectPropertyDescriptions = (schema) => {
          if (!schema || typeof schema !== "object") return;
          for (const property of Object.values(schema.properties || {})) {
            descriptions.push(property.description || "");
            collectPropertyDescriptions(property);
          }
          collectPropertyDescriptions(schema.items);
        };
        collectPropertyDescriptions(operation.requestBody?.content?.["application/json"]?.schema);
        for (const response of Object.values(operation.responses || {})) collectPropertyDescriptions(response.content?.["application/json"]?.schema);
        const localizedText = [spec.info?.description, spec.servers?.[0]?.description, operation.summary, operation.description, ...descriptions].filter(Boolean);
        if (!localizedText.length || localizedText.some((description) => !/[\u3400-\u9fff]/.test(description))) {
          errors.push(`Chinese OpenAPI descriptions missing or not localized: ${generatedPath}`);
        }
      }
    } catch (error) {
      errors.push(`Generated OpenAPI source missing or invalid: api-reference/openapi/${page.slug.replaceAll("/", "--")}${suffix}.yaml (${error.message})`);
    }
  }
}
if (config.api?.openapi?.length !== openApiPages.length * 2) errors.push(`Unexpected localized OpenAPI source count: ${config.api?.openapi?.length}`);
const redirectSources = new Set(config.redirects.map((redirect) => redirect.source));
for (const source of manifest.sourcePaths || []) {
  const canonicalPageExists = await exists(source.replace(/^\//, ""));
  if (!redirectSources.has(source) && !canonicalPageExists) errors.push(`Source URL not preserved: ${source}`);
}
for (const redirect of config.redirects) if (redirect.source === redirect.destination) errors.push(`Self redirect is not allowed: ${redirect.source}`);
if (new Set(manifest.sourcePaths || []).size !== manifest.sitemapCount) errors.push("Source path manifest does not match sitemap count");
const schemaNames = manifest.schemaNames || {};
for (const source of manifest.schemaPaths || []) {
  const destination = config.redirects.find((redirect) => redirect.source === source)?.destination;
  const slug = destination?.replace(/^\//, "").replace(/^zh-CN\//, "");
  try {
    const spec = await readSourceSpec(slug);
    const targetOperation = Object.values(spec.paths || {}).flatMap((item) => Object.values(item || {})).find((operation) => operation?.responses);
    if (!spec.components?.schemas?.[schemaNames[source]] && !targetOperation) errors.push(`Schema target has no API operation: ${source} -> ${destination}`);
  } catch {
    errors.push(`Schema snapshot missing for redirect target: ${source} -> ${destination}`);
  }
}

const files = [];
async function walk(directory, isRoot = false) {
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    if (isRoot && [".git", "node_modules", "api-reference", "scripts"].includes(entry.name)) continue;
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(target);
    else if (entry.name.endsWith(".mdx")) files.push(target);
  }
}
await walk(root, true);

for (const file of files) {
  const source = await fs.readFile(file, "utf8");
  if (!source.startsWith("---\n")) errors.push(`Frontmatter missing: ${path.relative(root, file)}`);
  const fenceCount = (source.match(/```/g) || []).length;
  if (fenceCount % 2) errors.push(`Unbalanced code fence: ${path.relative(root, file)}`);
  if (/translate-placeholder|APIPOD\s*(?:TOKEN|令牌|TOK)/i.test(source)) errors.push(`Translation placeholder leaked: ${path.relative(root, file)}`);
  if (/^＃/m.test(source)) errors.push(`Full-width Markdown heading: ${path.relative(root, file)}`);
  for (const component of ["ParamField", "ResponseField", "RequestExample", "Steps", "Step", "Card", "Tip", "Warning", "Tabs", "Tab"]) {
    const opens = (source.match(new RegExp(`<${component}(?:\\s|>)`, "g")) || []).length;
    const closes = (source.match(new RegExp(`</${component}>`, "g")) || []).length;
    if (opens !== closes && !["ParamField", "ResponseField"].includes(component)) errors.push(`Unbalanced ${component} in ${path.relative(root, file)}: ${opens}/${closes}`);
  }
  for (const match of source.matchAll(/\]\((\/[^)#]+)(?:#[^)]+)?\)/g)) {
    const destination = match[1].replace(/^\//, "");
    if (destination.startsWith("http")) continue;
    if (!(await exists(destination)) && (destination.startsWith("zh-CN/") || !destination.includes("/v1/"))) errors.push(`Broken link in ${path.relative(root, file)}: ${match[1]}`);
  }
  for (const match of source.matchAll(/href="(\/[^"#]+)(?:#[^"]+)?"/g)) {
    const destination = match[1].replace(/^\//, "");
    if ((destination.startsWith("zh-CN/") || !destination.includes("/v1/")) && !(await exists(destination))) errors.push(`Broken href in ${path.relative(root, file)}: ${match[1]}`);
  }
}

const modelPages = manifest.pages.filter((page) => page.schema && !page.slug.startsWith("query-"));
if (modelPages.length !== 62) errors.push(`Unexpected model page count: ${modelPages.length}`);
if (new Set(modelPages.map((page) => page.modelId).filter(Boolean)).size !== modelPages.length) errors.push("Every model page must have a unique public model ID");
for (const retiredModelID of ["sora-2", "sora-2-pro"]) {
  if (modelPages.some((page) => page.modelId === retiredModelID)) errors.push(`Retired model remains documented: ${retiredModelID}`);
}
for (const page of modelPages) {
  if (!page.introduction?.en || !page.introduction?.zh) errors.push(`Bilingual model introduction missing: ${page.slug}`);
  if (!page.introduction?.en?.includes(page.modelId) || !page.introduction?.zh?.includes(page.modelId)) errors.push(`Model introduction does not identify the public model ID: ${page.slug}`);
  for (const language of ["en", "zh"]) {
    const source = await fs.readFile(path.join(root, `${pagePath(language, page.slug)}.mdx`), "utf8");
    const markers = [language === "zh" ? "查询任务状态" : "Query task status"];
    for (const marker of markers) if (!source.includes(marker)) errors.push(`Model documentation missing in ${language}/${page.slug}: ${marker}`);
    const supportHeading = language === "zh" ? "## APIPod 支持" : "## APIPod support";
    if (!source.includes(supportHeading)) errors.push(`APIPod support section missing in ${language}/${page.slug}`);
    const frontmatterDescription = source.match(/^description: (.+)$/m)?.[1];
    if (frontmatterDescription) {
      const description = JSON.parse(frontmatterDescription);
      const body = source.replace(/^---[\s\S]*?---\s*/, "");
      if (body.includes(description)) errors.push(`Frontmatter description is duplicated in the body: ${language}/${page.slug}`);
    }
    for (const forbidden of ["## 资料来源", "## Sources", "公开请求契约以当前 APIPod", "The public request contract follows APIPod"]) {
      if (source.includes(forbidden)) errors.push(`Removed model boilerplate still present in ${language}/${page.slug}: ${forbidden}`);
    }
    const expectedSuffix = language === "zh" ? "\\.zh\\.yaml" : "(?<!\\.zh)\\.yaml";
    if (!new RegExp(`^openapi: "api-reference/openapi/.+${expectedSuffix} `, "m").test(source)) errors.push(`Localized OpenAPI operation metadata missing in ${language}/${page.slug}`);
    if (/^## (?:Request body|JSON request body|Request examples|Response body|请求体|JSON 请求体|请求代码|响应体|cURL)$/m.test(source) || /<Tabs>|```(?:json|bash|python|go|rust|javascript)/.test(source)) {
      errors.push(`Inline API reference duplicated in ${language}/${page.slug}`);
    }
    if (/^\+/m.test(source)) errors.push(`Diff marker leaked into ${language}/${page.slug}`);
    if (/<ParamField|<RequestExample/.test(source)) errors.push(`Hidden API component leaked into ${language}/${page.slug}`);
  }
}

for (const page of manifest.pages.filter((item) => item.slug.startsWith("query-"))) {
  for (const language of ["en", "zh"]) {
    const source = await fs.readFile(path.join(root, `${pagePath(language, page.slug)}.mdx`), "utf8");
    if (!source.includes(language === "zh" ? "## 任务状态" : "## Task statuses")) errors.push(`Task guidance missing in ${language}/${page.slug}`);
    const expectedSuffix = language === "zh" ? "\\.zh\\.yaml" : "(?<!\\.zh)\\.yaml";
    if (!new RegExp(`^openapi: "api-reference/openapi/.+${expectedSuffix} `, "m").test(source)) errors.push(`Localized OpenAPI operation metadata missing in ${language}/${page.slug}`);
    if (/^## (?:Path parameter|Response body|Completed response example|路径参数|响应体|完成响应示例|cURL)$/m.test(source) || /```(?:json|bash)/.test(source)) {
      errors.push(`Inline API reference duplicated in ${language}/${page.slug}`);
    }
  }
}

if (manifest.publicPageCount !== manifest.pages.length || manifest.schemaOnlyCount !== 36 || manifest.sitemapCount !== 76) {
  errors.push(`Unexpected source coverage: ${manifest.publicPageCount}/${manifest.pages.length}/${manifest.schemaOnlyCount}/${manifest.sitemapCount}`);
}
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`Validated ${files.length} bilingual MDX pages, ${navigationPages.length} navigation entries, ${config.redirects.length} redirects.`);
