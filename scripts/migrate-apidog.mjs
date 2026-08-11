#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ORIGIN = "https://docs.apipod.ai";
const SITEMAP = `${ORIGIN}/sitemap.xml`;
const TRANSLATE_ENDPOINT = "https://translate.googleapis.com/translate_a/single";
const GENERATED_DIRS = ["zh-CN", "api-reference/specs"];

const titleTranslations = new Map([
  ["Getting Started with APIPod API", "APIPod API 快速入门"],
  ["Query Image Task", "查询图片任务"],
  ["Query Video Task", "查询视频任务"],
]);

const groupRules = [
  [/^gpt-image-2\//, "GPT Image 2"],
  [/^nano-banana\//, "Nano Banana"],
  [/^seedream\//, "Seedream"],
  [/^wan\//, "WAN"],
  [/^veo\//, "Veo"],
  [/^seedance\//, "Seedance"],
  [/^grok-imagine(?:-1-5)?\//, "Grok Imagine"],
  [/^sora-2\//, "Sora 2"],
  [/^gemini-omni\//, "Gemini Omni"],
  [/^minimax-h3\//, "MiniMax H3"],
];

function frontmatter(title, description = "") {
  const safeTitle = JSON.stringify(title);
  const safeDescription = JSON.stringify(description || title);
  return `---\ntitle: ${safeTitle}\ndescription: ${safeDescription}\n---\n\n`;
}

function normalizeMdx(value) {
  return value
    .replace(/^# .+\n+/, "")
    .replace(/^## OpenAPI Specification\s*\n+/m, "")
    .replace(/::: tip\[\]\s*\n([\s\S]*?)\n:::/g, "<Tip>\n$1\n</Tip>")
    .replace(/::: warning \[([^\]]+)\]\s*\n([\s\S]*?)\n:::/g, "<Warning title=\"$1\">\n$2\n</Warning>")
    .replace(/```(\w+)\s+theme=\{null\}/g, "```$1")
    .replace(/icon="(?:lucide-)?([^"]+)"/g, 'icon="$1"')
    .trim();
}

function extractYaml(markdown) {
  const match = markdown.match(/```yaml\s*\n([\s\S]*?)\n```/);
  return match ? match[1] : null;
}

function firstOperation(spec) {
  for (const [route, pathItem] of Object.entries(spec.paths || {})) {
    for (const method of ["get", "post", "put", "patch", "delete"]) {
      if (pathItem?.[method]) return { route, method, operation: pathItem[method] };
    }
  }
  return null;
}

function resolveRef(spec, schema) {
  if (!schema?.$ref) return schema || {};
  return schema.$ref.split("/").slice(1).reduce((value, key) => value?.[key], spec) || {};
}

function typeLabel(schema) {
  if (schema.const !== undefined) return "string";
  if (schema.type === "array") return `${schema.items?.type || "string"}[]`;
  return schema.type || (schema.properties ? "object" : "any");
}

function jsonExample(schema, spec, depth = 0) {
  schema = resolveRef(spec, schema);
  if (schema.example !== undefined) return schema.example;
  if (schema.const !== undefined) return schema.const;
  if (schema.default !== undefined) return schema.default;
  if (schema.enum?.length) return schema.enum[0];
  if (schema.type === "array") return [jsonExample(schema.items || {}, spec, depth + 1)];
  if ((schema.type === "object" || schema.properties) && depth < 4) {
    return Object.fromEntries(Object.entries(schema.properties || {}).map(([key, value]) => [key, jsonExample(value, spec, depth + 1)]));
  }
  if (schema.type === "integer" || schema.type === "number") return 0;
  if (schema.type === "boolean") return true;
  return "string";
}

function renderFields(component, schema, spec, required = new Set(), depth = 0) {
  schema = resolveRef(spec, schema);
  if (!schema?.properties || depth > 3) return "";
  return Object.entries(schema.properties).map(([name, raw]) => {
    const field = resolveRef(spec, raw);
    const attrs = [`name=${JSON.stringify(name)}`, `type=${JSON.stringify(typeLabel(field))}`];
    if (required.has(name)) attrs.push("required");
    const details = [];
    if (field.description) details.push(field.description.trim());
    if (field.const !== undefined) details.push(`Fixed value: \`${field.const}\`.`);
    if (field.default !== undefined) details.push(`Default: \`${field.default}\`.`);
    if (field.enum?.length) details.push(`Allowed values: ${field.enum.map((v) => `\`${v}\``).join(", ")}.`);
    const nested = renderFields(component, field, spec, new Set(field.required || []), depth + 1);
    return `<${component} ${attrs.join(" ")}>\n${details.join(" ")}\n${nested}\n</${component}>`;
  }).join("\n\n");
}

function summaryFromOperation(operation, title) {
  const plain = (operation?.description || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/[`#*_>\[\]()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return plain.slice(0, 180) || `${title} API reference for APIPod.`;
}

function renderApiPage(spec, fallbackTitle) {
  const found = firstOperation(spec);
  if (!found) return null;
  const { route, method, operation } = found;
  const title = operation.summary || fallbackTitle;
  const description = summaryFromOperation(operation, title);
  const requestSchema = resolveRef(spec, operation.requestBody?.content?.["application/json"]?.schema);
  const responseEntry = Object.entries(operation.responses || {}).find(([status]) => /^2/.test(status))?.[1];
  const responseSchema = resolveRef(spec, responseEntry?.content?.["application/json"]?.schema);
  const requestFields = renderFields("ParamField", requestSchema, spec, new Set(requestSchema?.required || []));
  const responseFields = renderFields("ResponseField", responseSchema, spec, new Set(responseSchema?.required || []));
  const requestExample = JSON.stringify(jsonExample(requestSchema || {}, spec), null, 2);
  const body = [
    frontmatter(title, description),
    `**Endpoint:** \`${method.toUpperCase()} ${route}\``,
    normalizeMdx(operation.description || description),
    "## Authentication",
    "Send your API key in the `Authorization` header as `Bearer <YOUR_API_KEY>`.",
    requestFields ? `## Request body\n\n${requestFields}` : "",
    requestFields ? `## Request example\n\n<RequestExample>\n\n\`\`\`json\n${requestExample}\n\`\`\`\n\n</RequestExample>` : "",
    responseFields ? `## Response\n\n${responseFields}` : "",
  ].filter(Boolean).join("\n\n");
  return { title, description, body, route, method };
}

function protectMdx(text) {
  const protectedValues = [];
  const pattern = /```[\s\S]*?```|`[^`\n]+`|<[^>]+>|\[[^\]]+\]\([^)]+\)|https?:\/\/[^\s)\]]+|^#{1,6}\s+/gm;
  const output = text.replace(pattern, (value) => {
    const token = ` https://translate-placeholder.invalid/${protectedValues.length} `;
    protectedValues.push(value);
    return token;
  });
  return { output, protectedValues };
}

function restoreMdx(text, values) {
  return text.replace(/https:\/\/translate-placeholder\.invalid\/(\d+)/g, (_, index) => values[Number(index)] ?? _);
}

async function translateText(text) {
  if (!text.trim()) return text;
  const { output, protectedValues } = protectMdx(text);
  const paragraphs = output.split(/(\n{2,})/);
  const translated = [];
  for (const paragraph of paragraphs) {
    if (/^\n+$/.test(paragraph) || !/[A-Za-z]{3}/.test(paragraph)) {
      translated.push(paragraph);
      continue;
    }
    const params = new URLSearchParams({ client: "gtx", sl: "en", tl: "zh-CN", dt: "t", q: paragraph });
    let result;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        const response = await fetch(`${TRANSLATE_ENDPOINT}?${params}`);
        if (response.ok) {
          const payload = await response.json();
          result = payload[0].map((part) => part[0]).join("");
          break;
        }
      } catch (error) {
        if (attempt === 3) throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    }
    if (!result) throw new Error(`Translation failed: ${paragraph.slice(0, 80)}`);
    translated.push(result);
  }
  return restoreMdx(translated.join(""), protectedValues);
}

async function writeFile(relative, contents) {
  const target = path.join(ROOT, relative);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, contents.endsWith("\n") ? contents : `${contents}\n`);
}

async function main() {
  const translate = process.argv.includes("--translate");
  const resume = process.argv.includes("--resume");
  const sitemap = await (await fetch(SITEMAP)).text();
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  const publicUrls = urls.filter((url) => new URL(url).pathname === "/2065583m0" || !/^\/[0-9]+[a-z]0$/.test(new URL(url).pathname));
  const schemaUrls = urls.filter((url) => !publicUrls.includes(url));
  const schemaNames = {};
  for (const url of schemaUrls) {
    const markdown = await (await fetch(`${url}.md`)).text();
    schemaNames[new URL(url).pathname] = markdown.match(/^#\s+(.+)$/m)?.[1]?.trim() || "";
  }
  if (!resume) for (const directory of GENERATED_DIRS) await fs.rm(path.join(ROOT, directory), { recursive: true, force: true });

  const pages = [];
  for (const [index, url] of publicUrls.entries()) {
    const legacySlug = new URL(url).pathname.replace(/^\//, "");
    const slug = legacySlug === "2065583m0" ? "introduction" : legacySlug;
    process.stdout.write(`[${index + 1}/${publicUrls.length}] ${slug}\n`);
    if (resume) {
      try {
        await Promise.all([fs.access(path.join(ROOT, `${slug}.mdx`)), fs.access(path.join(ROOT, `zh-CN/${slug}.mdx`))]);
        const existing = await fs.readFile(path.join(ROOT, `${slug}.mdx`), "utf8");
        const title = existing.match(/^title:\s*"([^"]+)"/m)?.[1] || slug;
        const expectedZhTitle = titleTranslations.get(title) || title;
        const zhPath = path.join(ROOT, `zh-CN/${slug}.mdx`);
        const existingZh = await fs.readFile(zhPath, "utf8");
        await fs.writeFile(zhPath, existingZh
          .replace(/^title:\s*"[^"]+"/m, `title: ${JSON.stringify(expectedZhTitle)}`)
          .replace(/<Badge[^>]*>\s*([^<]+?)\s*<\/Badge>/g, (_, endpoint) => `**接口：** \`${endpoint.trim().replace(/\s*\/\s*/g, "/")}\``));
        const enPath = path.join(ROOT, `${slug}.mdx`);
        await fs.writeFile(enPath, existing.replace(/<Badge[^>]*>\s*([^<]+?)\s*<\/Badge>/g, (_, endpoint) => `**Endpoint:** \`${endpoint.trim()}\``));
        pages.push({ slug, title, legacy: new URL(url).pathname, schema: slug !== "introduction" });
        continue;
      } catch {
        // Generate the missing language pair below.
      }
    }
    const markdown = await (await fetch(`${url}.md`)).text();
    const fallbackTitle = markdown.match(/^#\s+(.+)$/m)?.[1]?.trim() || slug;
    const yaml = extractYaml(markdown);
    let rendered;
    if (yaml) {
      const spec = YAML.parse(yaml);
      await writeFile(`api-reference/specs/${slug.replaceAll("/", "--")}.yaml.txt`, yaml);
      rendered = renderApiPage(spec, fallbackTitle);
    }
    const english = (rendered?.body || `${frontmatter(fallbackTitle)}${normalizeMdx(markdown)}`)
      .replace(/href="\/(query-(?:image|video)-task)"/g, 'href="/$1"');
    await writeFile(`${slug}.mdx`, english);

    let chinese = english;
    if (translate) {
      const withoutFrontmatter = english.replace(/^---[\s\S]*?---\s*/, "");
      const zhTitle = titleTranslations.get(rendered?.title || fallbackTitle) || (rendered?.title || fallbackTitle);
      const zhDescription = await translateText(rendered?.description || `${fallbackTitle} API reference for APIPod.`);
      chinese = `${frontmatter(zhTitle, zhDescription)}${await translateText(withoutFrontmatter)}`
        .replace(/href="\/(query-(?:image|video)-task)"/g, 'href="/zh-CN/$1"');
    }
    await writeFile(`zh-CN/${slug}.mdx`, chinese);
    pages.push({ slug, title: rendered?.title || fallbackTitle, legacy: new URL(url).pathname, schema: Boolean(yaml) });
  }

  await writeFile("migration-manifest.json", JSON.stringify({
    source: ORIGIN,
    generatedAt: new Date().toISOString(),
    sitemapCount: urls.length,
    sourcePaths: urls.map((url) => new URL(url).pathname),
    publicPageCount: pages.length,
    schemaOnlyCount: schemaUrls.length,
    schemaPaths: schemaUrls.map((url) => new URL(url).pathname),
    schemaNames,
    pages
  }, null, 2));
}

await main();
