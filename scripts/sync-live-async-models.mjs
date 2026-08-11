#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const origin = (process.env.APIPOD_API_ORIGIN || "http://localhost:8080").replace(/\/$/, "");
const classifications = ["text_to_image", "image_to_image", "image_to_3d", "text_to_video", "image_to_video", "video_to_video"];
const excludedPublicModelIDs = new Set(["sora-2", "sora-2-pro"]);
const legacyModelIDs = {
  "veo/3-1-fast": "veo3-1-fast",
  "veo/3-1-fast-4k": "veo3-1-fast-4k",
  "veo/3-1-fast-ref": "veo3-1-fast-ref",
  "veo/3-1-quality": "veo3-1-quality",
  "veo/3-1-quality-4k": "veo3-1-quality-4k",
  "grok-imagine-1-5/grok-imagine-1-5-fast": "grok-imagine-1.5-fast",
  "grok-imagine-1-5/grok-imagine-1-5-preview": "grok-imagine-1.5-preview",
  "sora-2/sora-2-vip": "sora-2-vip",
};
const manifestPath = path.join(root, "migration-manifest.json");
const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));

const excludedPages = manifest.pages.filter((page) => excludedPublicModelIDs.has(page.modelId));
manifest.pages = manifest.pages.filter((page) => !excludedPublicModelIDs.has(page.modelId));
for (const page of excludedPages) {
  const basename = page.slug.replaceAll("/", "--");
  for (const artifact of [
    `${page.slug}.mdx`,
    `zh-CN/${page.slug}.mdx`,
    `api-reference/specs/${basename}.yaml.txt`,
    `api-reference/openapi/${basename}.yaml`,
    `api-reference/openapi/${basename}.zh.yaml`,
  ]) {
    await fs.rm(path.join(root, artifact), { force: true });
  }
}

async function getJSON(endpoint) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(`${origin}${endpoint}`, { signal: AbortSignal.timeout(60_000) });
      if (response.ok) return response.json();
      const error = new Error(`${endpoint} returned HTTP ${response.status}`);
      if (response.status < 500) throw error;
      lastError = error;
    } catch (error) {
      if (error.message.includes("HTTP 4")) throw error;
      lastError = error;
    }
    if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 500));
  }
  throw lastError;
}

function modelSlug(modelID) {
  if (modelID.startsWith("seedream-")) return `seedream/${modelID.replaceAll(".", "-")}`;
  if (modelID.startsWith("wan2.7-")) return `wan/${modelID.replaceAll(".", "-")}`;
  if (modelID.startsWith("wan3.0-")) return `wan/${modelID.replaceAll(".", "-")}`;
  if (modelID.startsWith("veo3-1-")) return `veo/${modelID.replace("veo3-1", "3-1").replaceAll(".", "-")}`;
  if (modelID.startsWith("seedance-") || modelID.startsWith("doubao-seedance-")) return `seedance/${modelID.replaceAll(".", "-")}`;
  if (modelID.startsWith("grok-imagine-1.5-")) return `grok-imagine-1-5/${modelID.replace("grok-imagine-1.5-", "grok-imagine-1-5-").replaceAll(".", "-")}`;
  if (modelID.startsWith("sora-2")) return `sora-2/${modelID}`;
  if (modelID.startsWith("kling-")) return `kling/${modelID.replaceAll(".", "-")}`;
  if (modelID === "motion-control-m1") return "motion-control/motion-control-m1";
  return `models/${modelID.replaceAll(".", "-")}`;
}

function sourceSnapshotPath(slug) {
  return path.join(root, "api-reference/specs", `${slug.replaceAll("/", "--")}.yaml.txt`);
}

function extractModelID(slug) {
  return `api-reference/openapi/${slug.replaceAll("/", "--")}.yaml`;
}

function operation(spec) {
  for (const item of Object.values(spec.paths || {})) {
    for (const method of ["post", "get"]) if (item?.[method]) return item[method];
  }
  return null;
}

function modelIDFromSpec(spec) {
  return spec.info?.["x-apipod-metadata"]?.modelId ||
    spec.components?.schemas?.Input?.properties?.model?.const ||
    operation(spec)?.requestBody?.content?.["application/json"]?.schema?.properties?.model?.const;
}

function fallbackSchema(model) {
  const video = model.classifications.some((classification) => classification.includes("video"));
  const route = video ? "/v1/videos/generations" : "/v1/images/generations";
  const statusRoute = video ? "/v1/videos/status/{task_id}" : "/v1/images/status/{task_id}";
  return {
    openapi: "3.0.4",
    info: {
      title: model.display_name || model.model_id,
      version: "1.0.0",
      "x-apipod-metadata": { modelId: model.model_id, modelType: video ? "video" : "image" },
    },
    components: {
      schemas: {
        Input: {
          type: "object",
          properties: {
            model: { type: "string", const: model.model_id, description: "Public APIPod model ID." },
            prompt: { type: "string", description: "Generation instructions." },
          },
          required: ["model", "prompt"],
        },
      },
    },
    paths: {
      [route]: {
        post: {
          summary: model.display_name || model.model_id,
          requestBody: { required: true, content: { "application/json": { schema: { "$ref": "#/components/schemas/Input" } } } },
          responses: { "200": { description: "Task accepted" } },
        },
      },
      [statusRoute]: { get: { summary: `${model.display_name || model.model_id} task status`, responses: { "200": { description: "Task status" } } } },
    },
  };
}

async function fetchCatalog(language) {
  const result = new Map();
  for (const classification of classifications) {
    const response = await getJSON(`/public/models?lang=${encodeURIComponent(language)}&classification=${encodeURIComponent(classification)}`);
    for (const model of response.data || []) {
      const current = result.get(model.model_id) || { ...model, classifications: [] };
      current.classifications = [...new Set([...current.classifications, classification])];
      result.set(model.model_id, current);
    }
  }
  return result;
}

const catalog = await fetchCatalog("en");
const catalogZh = await fetchCatalog("zh-CN");
for (const modelID of excludedPublicModelIDs) {
  catalog.delete(modelID);
  catalogZh.delete(modelID);
}

function cleanDescription(value, language) {
  const normalized = String(value || "").replace(/Gooles's/g, "Google's").replace(/\s+/g, " ").trim();
  if (normalized.length <= 680) return normalized;
  const sentences = normalized.split(language === "zh" ? /(?<=[。！？])/ : /(?<=[.!?])\s+/);
  let result = "";
  for (const sentence of sentences) {
    if (result && result.length + sentence.length > 680) break;
    result += `${result && language !== "zh" ? " " : ""}${sentence}`;
    if (result.length >= 420) break;
  }
  return result || `${normalized.slice(0, 677).trim()}...`;
}

const classificationLabels = {
  en: {
    text_to_image: "text-to-image",
    image_to_image: "image generation and editing",
    text_to_video: "text-to-video",
    image_to_video: "image-to-video",
    video_to_video: "video-to-video",
    image_to_3d: "image-to-3D",
  },
  zh: {
    text_to_image: "文生图",
    image_to_image: "图片生成与编辑",
    text_to_video: "文生视频",
    image_to_video: "图生视频",
    video_to_video: "视频到视频",
    image_to_3d: "图片生成 3D",
  },
};

const inputLabels = {
  en: { text: "text", image: "image", video: "video", audio: "audio", file: "file" },
  zh: { text: "文本", image: "图片", video: "视频", audio: "音频", file: "文件" },
};

const descriptionOverrides = {
  "gpt-image-2": {
    en: "GPT Image 2 is OpenAI's image generation and editing model, exposed through APIPod's primary official-route public ID. It supports prompt-driven generation and reference-image editing in the same asynchronous workflow.",
    zh: "GPT Image 2 是 OpenAI 的图片生成与编辑模型，APIPod 通过主官方路由公开 ID 提供该能力，同一套异步工作流同时支持提示词生图和参考图编辑。",
  },
  "gpt-image-2-fast": {
    en: "GPT Image 2 Fast is APIPod's latency-oriented routing variant for GPT Image 2 rather than a separate OpenAI model. It keeps the shared generation and editing request shape while favoring faster configured channels.",
    zh: "GPT Image 2 Fast 是 APIPod 面向低延迟通道提供的 GPT Image 2 路由版本，并非独立的 OpenAI 模型；它沿用统一的图片生成与编辑请求结构。",
  },
  "gpt-image-2-lite": {
    en: "GPT Image 2 Lite is APIPod's cost-oriented routing variant for GPT Image 2 rather than a separate OpenAI model. It uses the shared generation and editing contract with lower-cost configured channels.",
    zh: "GPT Image 2 Lite 是 APIPod 面向低成本通道提供的 GPT Image 2 路由版本，并非独立的 OpenAI 模型；它沿用统一的图片生成与编辑契约。",
  },
  "gemini-omni-t2v": {
    en: "Gemini Omni T2V is APIPod's text-to-video routing mode for the configured Gemini Omni channel. It uses text instructions to create video without requiring reference media.",
    zh: "Gemini Omni T2V 是 APIPod 为已配置 Gemini Omni 通道提供的文生视频路由模式，仅使用文本指令生成视频，不要求参考素材。",
  },
  "gemini-omni-i2v": {
    en: "Gemini Omni I2V is APIPod's first/last-frame image-to-video routing mode for the configured Gemini Omni channel. It accepts one required first frame and one optional last frame.",
    zh: "Gemini Omni I2V 是 APIPod 为已配置 Gemini Omni 通道提供的首尾帧图生视频路由模式，要求提供首帧，并可选提供尾帧。",
  },
  "gemini-omni-r2v": {
    en: "Gemini Omni R2V is APIPod's reference-to-video routing mode for the configured Gemini Omni channel. It uses one to five reference images to guide subject and visual consistency.",
    zh: "Gemini Omni R2V 是 APIPod 为已配置 Gemini Omni 通道提供的参考生视频路由模式，支持使用 1 至 5 张参考图引导主体和视觉一致性。",
  },
  "gemini-omni-extend": {
    en: "Gemini Omni Extend is APIPod's video extension and editing routing mode for the configured Gemini Omni channel. It requires a source video and can attach up to five reference images.",
    zh: "Gemini Omni Extend 是 APIPod 为已配置 Gemini Omni 通道提供的视频续写与编辑路由模式，要求提供源视频，并可附带最多 5 张参考图。",
  },
  "grok-imagine-1.5-vip": {
    en: "Grok Imagine 1.5 VIP is APIPod's official-channel image-to-video route for Grok Imagine 1.5. It requires a source image and supports 480p or 720p clips up to 15 seconds.",
    zh: "Grok Imagine 1.5 VIP 是 APIPod 为 Grok Imagine 1.5 提供的官方通道路由，仅支持图生视频，要求提供源图片，可生成最长 15 秒的 480p 或 720p 视频。",
  },
  "motion-control-m1": {
    en: "Motion Control M1 transfers the action and timing of a reference video to a subject supplied in a reference image, producing a new asynchronous video result.",
    zh: "Motion Control M1 将参考视频中的动作与节奏迁移到参考图片中的主体，生成新的异步视频结果。",
  },
  "minimax-h3-t2v": {
    en: "MiniMax H3 T2V is the prompt-only text-to-video mode of MiniMax H3. APIPod exposes native 2K output and 4-to-15-second generation for this public ID.",
    zh: "MiniMax H3 T2V 是 MiniMax H3 的纯文生视频模式；APIPod 为该公开 ID 开放原生 2K 输出和 4 至 15 秒视频生成。",
  },
  "seedance-2.0-t2v-vip": {
    en: "Seedance 2.0 T2V VIP is APIPod's full-capability text-to-video route for Seedance 2.0, intended for prompt-driven generation with synchronized audio and the configured standard-quality channel.",
    zh: "Seedance 2.0 T2V VIP 是 APIPod 为 Seedance 2.0 提供的完整能力文生视频路由，面向提示词驱动、同步音频和已配置标准质量通道的生成任务。",
  },
  "sora-2-vip": {
    en: "Sora 2 VIP is APIPod's official-provider routing ID for Sora 2. Its public contract supports 4-, 8-, or 12-second clips and an optional first-frame image.",
    zh: "Sora 2 VIP 是 APIPod 为 Sora 2 提供的官方供应商路由 ID，公开契约支持 4、8、12 秒视频以及可选首帧图片。",
  },
  "veo3-1-lite": {
    en: "Veo 3.1 Lite is APIPod's efficiency-oriented routing variant for Google Veo 3.1, not a separate Google model name. It supports text- or image-guided video generation with audio through the shared Veo contract.",
    zh: "Veo 3.1 Lite 是 APIPod 面向效率优化提供的 Google Veo 3.1 路由版本，并非独立的 Google 模型名称；它通过统一 Veo 契约支持文本或图片引导的带音频视频生成。",
  },
  "veo3-1-lite-4k": {
    en: "Veo 3.1 Lite 4K is APIPod's efficiency-oriented Veo 3.1 route with a 4K output target, not a separate Google model name.",
    zh: "Veo 3.1 Lite 4K 是 APIPod 面向效率优化并以 4K 输出为目标的 Veo 3.1 路由版本，并非独立的 Google 模型名称。",
  },
};

function familyDescription(modelID, language) {
  const zh = language === "zh";

  if (modelID === "nano-banana-2") {
    return zh
      ? "Nano Banana 2 是 Google Gemini 图片系列的通用型生成与编辑模型，重点兼顾生成速度、指令理解、文字渲染和多张参考图下的主体一致性。"
      : "Nano Banana 2 is Google's general-purpose Gemini image generation and editing model, balancing fast generation with instruction following, text rendering, and subject consistency across reference images.";
  }
  if (modelID === "nano-banana-pro") {
    return zh
      ? "Nano Banana Pro 是 Google Gemini 图片系列中面向复杂创作的高质量模型，强调多模态推理、现实世界知识、精细文字渲染、多图融合和高分辨率输出。"
      : "Nano Banana Pro is Google's high-quality Gemini image model for complex creative work, with an emphasis on multimodal reasoning, real-world knowledge, precise text rendering, multi-image composition, and high-resolution output.";
  }

  const seedream = {
    "seedream-v4.5": {
      en: "Seedream 4.5 is ByteDance's text-to-image model for prompt-faithful composition, detailed visual styles, and text rendering.",
      zh: "Seedream 4.5 是字节跳动的文生图模型，重点提升提示词遵循、画面构图、视觉风格和文字渲染能力。",
    },
    "seedream-v4.5-edit": {
      en: "Seedream 4.5 Edit is ByteDance's reference-image editing model, designed to preserve subjects and fine details while following transformation instructions across one or more source images.",
      zh: "Seedream 4.5 Edit 是字节跳动的参考图编辑模型，适合在一张或多张源图片之间保持主体和细节，并按提示词完成可控修改。",
    },
    "seedream-5.0-lite": {
      en: "Seedream 5.0 Lite is APIPod's efficiency-oriented text-to-image route in the Seedream 5 family, intended for prompt-driven generation with flexible high-resolution output.",
      zh: "Seedream 5.0 Lite 是 APIPod 在 Seedream 5 系列中开放的效率型文生图路由，面向提示词驱动和灵活的高分辨率图片生成。",
    },
    "seedream-5.0-lite-edit": {
      en: "Seedream 5.0 Lite Edit is APIPod's efficiency-oriented Seedream 5 route for reference-guided image editing and subject-consistent transformations.",
      zh: "Seedream 5.0 Lite Edit 是 APIPod 在 Seedream 5 系列中开放的效率型图片编辑路由，用于参考图引导和保持主体一致性的图像修改。",
    },
  }[modelID];
  if (seedream) return seedream[language];

  const wanImage = {
    "wan2.7-image": {
      en: "Wan 2.7 Image is Alibaba's text-to-image model with an optional reasoning stage for interpreting prompts and planning composition before rendering.",
      zh: "Wan 2.7 Image 是阿里的文生图模型，可通过可选的生成前推理理解提示词并规划构图。",
    },
    "wan2.7-image-edit": {
      en: "Wan 2.7 Image Edit is Alibaba's instruction-based image editing model for controlled changes that preserve the source structure and principal subjects.",
      zh: "Wan 2.7 Image Edit 是阿里的指令式图片编辑模型，用于在保留原图结构和主要主体的同时完成可控修改。",
    },
    "wan2.7-image-pro": {
      en: "Wan 2.7 Image Pro is the high-resolution text-to-image route in APIPod's Wan 2.7 image family, with a 4K output tier for detailed or large-format assets.",
      zh: "Wan 2.7 Image Pro 是 APIPod Wan 2.7 图片系列中的高分辨率文生图路由，提供 4K 输出档位，适合细节丰富或大尺寸素材。",
    },
    "wan2.7-image-pro-edit": {
      en: "Wan 2.7 Image Pro Edit is the quality-oriented editing route in APIPod's Wan 2.7 image family, combining reference images with text instructions for high-fidelity changes.",
      zh: "Wan 2.7 Image Pro Edit 是 APIPod Wan 2.7 图片系列中的质量优先编辑路由，通过参考图片和文本指令完成高保真修改。",
    },
  }[modelID];
  if (wanImage) return wanImage[language];

  if (modelID.startsWith("veo3-1-")) {
    const reference = modelID.endsWith("fast-ref");
    const quality = modelID.includes("quality");
    const lite = modelID.includes("lite");
    const k4 = modelID.endsWith("-4k");
    if (zh) {
      if (reference) return "Veo 3.1 Fast Ref 是 Google Veo 3.1 的多参考图视频路由，可使用最多 3 张主体或风格参考图控制角色、光线和色调的一致性。";
      const tier = quality ? "质量优先" : lite ? "APIPod 效率优先" : "快速生成";
      return `Veo 3.1 ${quality ? "Quality" : lite ? "Lite" : "Fast"}${k4 ? " 4K" : ""} 基于 Google Veo 3.1，属于${tier}路由，支持文本或首尾帧图片引导，并可生成带音频的视频${k4 ? "；该公开 ID 以 4K 输出为目标" : ""}。`;
    }
    if (reference) return "Veo 3.1 Fast Ref is Google Veo 3.1's multi-reference video route, using up to three subject or style images to guide character, lighting, and color consistency.";
    const tier = quality ? "quality-focused" : lite ? "APIPod efficiency-oriented" : "fast-generation";
    return `Veo 3.1 ${quality ? "Quality" : lite ? "Lite" : "Fast"}${k4 ? " 4K" : ""} is a ${tier} route based on Google Veo 3.1. It supports text or first/last-frame image guidance and can generate video with audio${k4 ? ", with this public ID targeting 4K output" : ""}.`;
  }

  if (modelID.startsWith("seedance-") || modelID.startsWith("doubao-seedance-")) {
    const normalized = modelID.replace(/^doubao-/, "");
    const mode = normalized.includes("-r2v") ? "r2v" : normalized.includes("-i2v") ? "i2v" : "t2v";
    const family = normalized.startsWith("seedance-2.0-mini")
      ? "Seedance 2.0 Mini"
      : normalized.startsWith("seedance-2.0-fast")
        ? "Seedance 2.0 Fast"
        : normalized.startsWith("seedance-2.0")
          ? "Seedance 2.0"
          : normalized.startsWith("seedance-1.5-pro")
            ? "Seedance 1.5 Pro"
            : normalized.startsWith("seedance-1.0-pro-fast")
              ? "Seedance 1.0 Pro Fast"
              : normalized.startsWith("seedance-1.0-pro")
                ? "Seedance 1.0 Pro"
                : "Seedance 1.0 Lite";
    const route = modelID.startsWith("doubao-")
      ? (zh ? "豆包供应商路由" : "Doubao provider route")
      : modelID.endsWith("-vip")
        ? (zh ? "APIPod 完整能力路由" : "APIPod full-capability route")
        : family.includes("Mini")
          ? (zh ? "面向规模化调用的效率型路由" : "efficiency-oriented route for scaled workloads")
          : family.includes("Fast")
            ? (zh ? "低延迟路由" : "lower-latency route")
            : (zh ? "标准路由" : "standard route");
    const modeText = {
      t2v: {
        en: "turns text instructions into video without requiring source media",
        zh: "根据文本指令生成视频，不要求提供源媒体",
      },
      i2v: {
        en: "animates a required first-frame image and can use an optional last frame where the public schema allows it",
        zh: "以必填首帧图片生成视频，并在公开 schema 允许时使用可选尾帧",
      },
      r2v: {
        en: "uses reference images, video, or audio to guide subjects, motion, visual style, and sound",
        zh: "使用参考图片、视频或音频引导主体、动作、视觉风格和声音",
      },
    }[mode];
    return zh
      ? `${family} ${mode === "t2v" ? "文生视频" : mode === "i2v" ? "图生视频" : "参考生视频"}是${route}，${modeText.zh}。Seedance 系列强调提示词遵循、连贯运动、多镜头叙事和音画同步。`
      : `${family} ${mode === "t2v" ? "Text to Video" : mode === "i2v" ? "Image to Video" : "Reference to Video"} is a ${route} that ${modeText.en}. The Seedance family emphasizes prompt following, coherent motion, multi-shot storytelling, and synchronized audio.`;
  }

  if (modelID.startsWith("grok-imagine")) {
    const mode = modelID.endsWith("-t2v") ? "t2v" : "i2v";
    const variant = modelID.includes("1.5-fast") ? "Grok Imagine 1.5 Fast" : modelID.includes("1.5-preview") ? "Grok Imagine 1.5 Preview" : "Grok Imagine";
    const route = modelID.includes("1.5-fast")
      ? (zh ? "面向较长片段和多参考图的快速路由" : "fast route for longer clips and multiple reference images")
      : modelID.includes("1.5-preview")
        ? (zh ? "要求单张源图片的预览路由" : "preview route that requires one source image")
        : mode === "t2v"
          ? (zh ? "文生视频路由" : "text-to-video route")
          : (zh ? "图生视频路由" : "image-to-video route");
    return zh
      ? `${variant} 是 xAI Grok Imagine 视频系列的${route}，用于生成带连贯运动和同步音频的短视频。`
      : `${variant} is a ${route} in xAI's Grok Imagine video family, intended for short clips with coherent motion and synchronized audio.`;
  }

  if (modelID.startsWith("minimax-h3-")) {
    const mode = modelID.endsWith("-t2v") ? "t2v" : modelID.endsWith("-i2v") ? "i2v" : "r2v";
    const detail = {
      t2v: { en: "uses prompts without reference media", zh: "仅使用提示词，不接受参考素材" },
      i2v: { en: "uses a required first frame and an optional last frame", zh: "使用必填首帧和可选尾帧" },
      r2v: { en: "combines image, video, and audio references", zh: "组合图片、视频和音频参考素材" },
    }[mode];
    return zh
      ? `MiniMax H3 ${mode === "t2v" ? "文生视频" : mode === "i2v" ? "图生视频" : "参考生视频"}是 MiniMax H3 多模态视频系列的独立模式，${detail.zh}；APIPod 当前为该系列提供 2K、4 至 15 秒的异步生成契约。`
      : `MiniMax H3 ${mode === "t2v" ? "Text to Video" : mode === "i2v" ? "Image to Video" : "Reference to Video"} is a dedicated mode in MiniMax's multimodal H3 video family that ${detail.en}. APIPod currently exposes a 2K, 4-to-15-second asynchronous contract for this family.`;
  }

  if (modelID === "kling-2.6-motion-control") {
    return zh
      ? "Kling 2.6 Motion Control 是可灵的动作控制模型，将参考视频中的动作和时序迁移到参考图片中的人物或主体，并可按请求保留参考视频音频。"
      : "Kling 2.6 Motion Control transfers motion and timing from a reference video to a character or subject in a reference image, with optional preservation of the reference video's audio.";
  }

  if (modelID.startsWith("wan2.7-") || modelID.startsWith("wan3.0-")) {
    const family = modelID.startsWith("wan3.0-") ? "Wan 3.0" : "Wan 2.7";
    const mode = modelID.endsWith("-t2v") ? "t2v" : modelID.endsWith("-i2v") ? "i2v" : modelID.endsWith("-r2v") ? "r2v" : "edit";
    const detail = {
      t2v: { en: "creates video directly from text prompts without source media", zh: "直接根据文本提示词生成视频，不要求源媒体" },
      i2v: { en: "animates a first-frame image and supports last-frame control where exposed", zh: "将首帧图片生成视频，并在公开契约中支持尾帧控制" },
      r2v: { en: "uses image, video, audio, file, or web references to guide generation", zh: "使用图片、视频、音频、文件或网页参考素材引导生成" },
      edit: { en: "edits a source video from text instructions and optional image references", zh: "根据文本指令和可选图片参考编辑源视频" },
    }[mode];
    return zh
      ? `${family} ${mode === "t2v" ? "文生视频" : mode === "i2v" ? "图生视频" : mode === "r2v" ? "参考生视频" : "视频编辑"}是阿里 Wan Video模型的独立任务模式，${detail.zh}。`
      : `${family} ${mode === "t2v" ? "Text to Video" : mode === "i2v" ? "Image to Video" : mode === "r2v" ? "Reference to Video" : "Video Edit"} is a dedicated task mode in Alibaba's Wan video family that ${detail.en}.`;
  }

  return "";
}

function listText(values, language) {
  if (language === "zh") return values.join("、");
  if (values.length < 2) return values[0] || "";
  return `${values.slice(0, -1).join(", ")} and ${values.at(-1)}`;
}

function modelIntroduction(modelID, language) {
  const localizedCatalog = language === "zh" ? catalogZh : catalog;
  const model = localizedCatalog.get(modelID) || catalog.get(modelID);
  const peerID = modelID.startsWith("doubao-") ? modelID.replace(/^doubao-/, "") : "";
  const peer = peerID ? localizedCatalog.get(peerID) || catalog.get(peerID) : null;
  const rawDescription = descriptionOverrides[modelID]?.[language] || familyDescription(modelID, language) || model?.i18n?.description || model?.description || peer?.i18n?.description || peer?.description;
  const provider = model?.provider?.name || model?.provider_id || "APIPod";
  const base = cleanDescription(rawDescription, language) || (language === "zh"
    ? `${model?.i18n?.display_name || model?.display_name || modelID} 是由 ${provider} 提供、并通过 APIPod 开放的异步生成模型。`
    : `${model?.i18n?.display_name || model?.display_name || modelID} is an asynchronous generation model from ${provider}, exposed through APIPod.`);
  const modes = [...new Set((model?.classifications || []).map((item) => classificationLabels[language][item] || item))];
  const derivedInputs = [];
  if ((model?.classifications || []).some((item) => item.startsWith("text_to_"))) derivedInputs.push("text");
  if ((model?.classifications || []).some((item) => item.startsWith("image_to_"))) derivedInputs.push("image");
  if ((model?.classifications || []).some((item) => item.startsWith("video_to_"))) derivedInputs.push("video");
  const inputs = [...new Set([...(model?.input_types || []), ...derivedInputs])].map((item) => inputLabels[language][item] || item);
  const media = (model?.classifications || []).some((item) => item.includes("video")) ? (language === "zh" ? "视频" : "video") : (language === "zh" ? "图片" : "image");
  const contract = language === "zh"
    ? `在 APIPod 中，公开模型 ID 为 ${modelID}，支持${listText(modes, language)}；接受${listText(inputs, language)}输入，并通过异步${media}任务返回结果。`
    : `In APIPod, the public model ID is ${modelID}. It supports ${listText(modes, language)}, accepts ${listText(inputs, language)} inputs, and returns results through asynchronous ${media} tasks.`;
  const lifecycle = model?.lifecycle && model.lifecycle !== "ga"
    ? (language === "zh" ? `当前 APIPod 模型目录将其标记为${model.lifecycle === "offline" ? "离线" : model.lifecycle}。` : `The current APIPod model catalog marks it as ${model.lifecycle}.`)
    : "";
  return [base, contract, lifecycle].filter(Boolean).join(language === "zh" ? "" : " ");
}

const existing = new Set();
for (const page of manifest.pages.filter((item) => item.schema && !item.slug.startsWith("query-"))) {
  let modelID = page.modelId;
  try {
    const spec = YAML.parse(await fs.readFile(path.join(root, extractModelID(page.slug)), "utf8"));
    const model = modelIDFromSpec(spec);
    if (model) modelID ||= model;
  } catch {
    // The normal docs validator reports missing or invalid existing snapshots.
  }
  if (modelID) {
    page.modelId = modelID;
    existing.add(modelID);
  }
}

const missing = [...catalog.values()]
  .filter((model) => !existing.has(model.model_id))
  .sort((a, b) => modelSlug(a.model_id).localeCompare(modelSlug(b.model_id)));

await fs.mkdir(path.join(root, "api-reference/specs"), { recursive: true });
for (const model of missing) {
  const slug = modelSlug(model.model_id);
  manifest.pages.push({
    slug,
    title: model.display_name || model.model_id,
    legacy: `/${slug}`,
    schema: true,
    modelId: model.model_id,
    classifications: model.classifications,
    source: "localhost:8080/public/models",
  });
}

for (const page of manifest.pages.filter((item) => item.schema && !item.slug.startsWith("query-"))) {
  const model = catalog.get(page.modelId);
  if (!model) throw new Error(`Model metadata missing for documented model: ${page.modelId || page.slug}`);
  const zhModel = catalogZh.get(page.modelId) || model;
  page.classifications = model.classifications;
  page.modelInfo = {
    providerId: model.provider_id,
    inputTypes: model.input_types || [],
    outputTypes: model.output_types || [],
    lifecycle: model.lifecycle,
    displayName: {
      en: model.i18n?.display_name || model.display_name,
      zh: zhModel.i18n?.display_name || zhModel.display_name,
    },
  };
  page.introduction = {
    en: modelIntroduction(page.modelId, "en"),
    zh: modelIntroduction(page.modelId, "zh"),
  };
}

const livePages = manifest.pages.filter((page) => page.source === "localhost:8080/public/models");
const legacyPages = [];
for (const page of manifest.pages) {
  if (!legacyModelIDs[page.slug]) continue;
  try {
    await fs.access(sourceSnapshotPath(page.slug));
  } catch {
    legacyPages.push(page);
  }
}
const refreshPages = [...livePages, ...legacyPages];
for (const page of refreshPages) {
  const modelID = page.modelId || legacyModelIDs[page.slug];
  const model = catalog.get(modelID);
  if (!model) throw new Error(`Previously documented async model is no longer public: ${modelID}`);
  let source;
  try {
    const schema = await getJSON(`/public/schemas/${encodeURIComponent(model.model_id)}`);
    source = schema.data;
  } catch (error) {
    if (!error.message.includes("HTTP 404")) throw error;
    source = fallbackSchema(model);
  }
  if (!source?.openapi || !source?.paths) throw new Error(`Schema missing for ${model.model_id}`);
  await fs.writeFile(sourceSnapshotPath(page.slug), `${JSON.stringify(source, null, 2)}\n`);
}

manifest.generatedAt = new Date().toISOString();
manifest.publicPageCount = manifest.pages.length;
await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Fetched ${catalog.size} public async models; refreshed ${refreshPages.length} schemas and added ${missing.length} models.`);
