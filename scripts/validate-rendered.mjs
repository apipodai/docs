#!/usr/bin/env node

import fs from "node:fs/promises";
import http from "node:http";

const base = new URL(process.env.DOCS_PREVIEW_URL || "http://localhost:3333");
const manifest = JSON.parse(await fs.readFile(new URL("../migration-manifest.json", import.meta.url), "utf8"));
const checks = [];

function pagePath(language, slug) {
  return language === "en" ? `/${slug}` : `/zh-CN/${slug}`;
}

const guidePages = {
  introduction: {
    en: ["What you can build", "Media task workflow", "Production checklist"],
    zh: ["可以构建什么", "媒体任务流程", "生产环境检查清单"],
  },
  quickstart: {
    en: ["Create an API key", "Create an image task", "Poll the task", "Idempotency-Key"],
    zh: ["创建 API Key", "创建图片任务", "轮询任务", "Idempotency-Key"],
  },
  authentication: {
    en: ["Authorization: Bearer", "x-api-key", "Store keys safely"],
    zh: ["Authorization: Bearer", "x-api-key", "安全保存密钥"],
  },
  "endpoint-conventions": {
    en: ["Base URL and versioning", "Media endpoints", "Idempotent media creation"],
    zh: ["基础地址与版本", "媒体端点", "媒体创建幂等性"],
  },
  "asynchronous-tasks": {
    en: ["Lifecycle", "Polling endpoints", "Polling strategy"],
    zh: ["生命周期", "轮询端点", "轮询策略"],
  },
  webhooks: {
    en: ["Callback request", "Delivery behavior", "Secure the receiver"],
    zh: ["回调请求", "投递行为", "保护接收端"],
  },
  "error-codes": {
    en: ["Error envelopes", "HTTP status codes", "Common machine codes"],
    zh: ["错误结构", "HTTP 状态码", "常见机器码"],
  },
};

for (const page of manifest.pages.filter((item) => item.schema)) {
  for (const language of ["en", "zh"]) {
    checks.push({
      path: pagePath(language, page.slug),
      language,
      model: !page.slug.startsWith("query-"),
    });
  }
}
for (const slug of Object.keys(guidePages)) {
  for (const language of ["en", "zh"]) checks.push({ path: pagePath(language, slug), language, guide: slug, model: false });
}

function fetchPage(pathname) {
  return new Promise((resolve, reject) => {
    const request = http.get(new URL(pathname, base), (response) => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => { body += chunk; });
      response.on("end", () => response.statusCode === 200
        ? resolve(body)
        : reject(new Error(`${pathname}: HTTP ${response.statusCode}`)));
    });
    request.on("error", reject);
  });
}

const failures = [];
for (const check of checks) {
  let body;
  try {
    body = await fetchPage(check.path);
  } catch (error) {
    failures.push(error.message);
    continue;
  }

  const markers = check.guide
    ? guidePages[check.guide][check.language]
    : check.model
    ? check.language === "zh"
      ? ["api.apipod.ai", "Authorization: Bearer", "Content-Type: application/json", "model", "cURL", "Python", "Go", "Rust", "JavaScript", "requests.post"]
      : ["api.apipod.ai", "Authorization: Bearer", "Content-Type: application/json", "model", "cURL", "Python", "Go", "Rust", "JavaScript", "requests.post"]
    : check.language === "zh"
      ? ["任务状态", "api.apipod.ai", "Authorization: Bearer"]
      : ["Task statuses", "api.apipod.ai", "Authorization: Bearer"];

  for (const marker of markers) if (!body.includes(marker)) failures.push(`${check.path}: missing ${marker}`);
  if (check.model && ["## 资料来源", "## Sources", "公开请求契约以当前 APIPod", "The public request contract follows APIPod"].some((marker) => body.includes(marker))) {
    failures.push(`${check.path}: removed model boilerplate is still rendered`);
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`Validated rendered API content on ${checks.length} bilingual pages at ${base.origin}.`);
