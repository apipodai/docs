#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(await fs.readFile(path.join(root, "migration-manifest.json"), "utf8"));

function localizedPagePath(language, slug) {
  return language === "en" ? slug : `zh-CN/${slug}`;
}

const sources = {
  gpt: ["OpenAI image generation guide", "https://developers.openai.com/api/docs/guides/image-generation"],
  nano: ["Google Gemini image generation guide", "https://ai.google.dev/gemini-api/docs/image-generation"],
  seedream: ["Volcengine Seedream documentation", "https://www.volcengine.com/docs/82379/1666945"],
  wan: ["Alibaba Cloud Model Studio image generation", "https://help.aliyun.com/zh/model-studio/wan-image-generation-api-reference"],
  veo: ["Google Gemini video generation documentation", "https://ai.google.dev/gemini-api/docs/video"],
  seedance: ["BytePlus Dreamina Seedance 2.0", "https://ai.byteplus.com/en/activity/seedance2-0"],
  grok: ["xAI Imagine video generation documentation", "https://docs.x.ai/developers/model-capabilities/video/generation"],
  sora: ["OpenAI Sora 2 model documentation", "https://developers.openai.com/api/docs/models/sora-2"],
  gemini: ["Google Gemini video generation documentation", "https://ai.google.dev/gemini-api/docs/video"],
  minimax: ["MiniMax H3 video generation documentation", "https://platform.minimax.io/docs/guides/video-generation"],
  kling: ["Kling AI model documentation", "https://app.klingai.com/global/dev/document-api"],
  motionControl: ["APIPod motion control model contract", "https://docs.apipod.ai/models"],
};

function profile(page) {
  const slug = page.slug;
  const title = page.title;
  if (page.introduction?.en && page.introduction?.zh) {
    const providerSources = {
      openai: sources.gpt,
      google: slug.startsWith("nano-banana/") ? sources.nano : sources.veo,
      bytedance: slug.startsWith("seedream/") ? sources.seedream : sources.seedance,
      doubao: sources.seedance,
      alibaba: sources.wan,
      xai: sources.grok,
      minimax: sources.minimax,
      kling: sources.kling,
    };
    return {
      source: providerSources[page.modelInfo?.providerId] || sources.motionControl,
      en: page.introduction.en,
      zh: page.introduction.zh,
    };
  }
  if (slug.startsWith("gpt-image-2/")) {
    const variant = slug.endsWith("-lite") ? "This APIPod public ID is a compatibility alias for a configured lower-cost channel route" : slug.endsWith("-fast") ? "This APIPod public ID is a compatibility alias for a configured latency-oriented channel route" : slug.endsWith("-edit") ? "This legacy public ID remains for existing image-editing integrations and requires reference images" : "This is the primary public ID for the GPT Image 2 route; the same request shape supports generation and editing";
    const variantZh = slug.endsWith("-lite") ? "该 APIPod 公开 ID 是配置的低成本通道路由兼容别名" : slug.endsWith("-fast") ? "该 APIPod 公开 ID 是配置的低延迟导向通道路由兼容别名" : slug.endsWith("-edit") ? "该旧公开 ID 为兼容现有图片编辑接入而保留，并要求提供参考图" : "这是 GPT Image 2 路由的主公开 ID；同一种请求结构同时支持生成和编辑";
    return { source: sources.gpt, en: `${title} brings OpenAI's GPT Image 2 image generation and editing workflow to APIPod's asynchronous image endpoint. ${variant}. APIPod exposes prompts up to 4,000 characters, up to six reference images, 1K/2K/4K resolution tiers, common aspect ratios, and PNG, JPEG, or WebP output; Lite/Fast performance and pricing depend on the configured channel.`, zh: `${title} 通过 APIPod 异步图片接口提供 OpenAI GPT Image 2 的图片生成和编辑工作流。${variantZh}。APIPod 开放最长 4,000 字符提示词、最多 6 张参考图、1K/2K/4K 分辨率、常用宽高比以及 PNG、JPEG、WebP 输出；Lite/Fast 的性能和价格取决于配置的通道。` };
  }
  if (slug.startsWith("nano-banana/")) {
    const is2 = slug.endsWith("nano-banana-2");
    const upstream = is2 ? "Google's Gemini 3.1 Flash Image, the general-purpose Nano Banana 2 workhorse" : "Google's Gemini 3 Pro Image, the premium Nano Banana Pro model for complex visual tasks";
    const upstreamZh = is2 ? "Google Gemini 3.1 Flash Image，面向通用场景的 Nano Banana 2 主力模型" : "Google Gemini 3 Pro Image，面向复杂视觉任务的高端 Nano Banana Pro 模型";
    return { source: sources.nano, en: `${title} maps to ${upstream} in APIPod's Gemini-family image workflow. It supports text-to-image, reference-image editing, text rendering, and subject consistency in one asynchronous endpoint; ${is2 ? "Nano Banana 2 is the versatile generalist" : "Nano Banana Pro is intended for harder prompts, world knowledge, localization, and brand consistency"}. APIPod currently allows ${is2 ? "up to 14 reference images and 512px/1K/2K/4K output" : "up to eight reference images and 1K/2K/4K output"}, with optional Google Search grounding.`, zh: `${title} 在 APIPod Gemini 系列图片工作流中映射到${upstreamZh}。它在同一个异步接口中支持文生图、参考图编辑、文字渲染和主体一致性；${is2 ? "Nano Banana 2 更适合作为通用主力模型" : "Nano Banana Pro 面向更复杂的提示词、世界知识、地域化和品牌一致性任务"}。APIPod 当前支持${is2 ? "最多 14 张参考图及 512px/1K/2K/4K 输出" : "最多 8 张参考图及 1K/2K/4K 输出"}，并提供可选的 Google Search 联网能力。` };
  }
  if (slug.startsWith("seedream/")) {
    const v5 = slug.includes("5-0") || page.modelId?.startsWith("seedream-5");
    const edit = slug.includes("image-to-image") || slug.endsWith("-edit") || page.modelId?.endsWith("-edit");
    return { source: sources.seedream, en: `${title} uses ByteDance's Seedream image stack through APIPod's asynchronous image API. This page covers ${edit ? "reference-guided editing, where at least one source image is required" : "text-to-image generation, with optional reference inputs for composition or consistency"}. ${v5 ? "The APIPod Seedream 5.0 Lite contract supports 2K/3K output, PNG or JPEG, and 1-15 images per request." : "The APIPod Seedream V4.5 contract supports 2K/4K output, PNG or JPEG, and a single output image per request."}`, zh: `${title} 通过 APIPod 异步图片接口接入字节跳动 Seedream 图片能力。本页对应${edit ? "参考图驱动的编辑模式，至少需要 1 张源图片" : "文生图，并可使用参考素材辅助构图或保持一致性"}。${v5 ? "APIPod 的 Seedream 5.0 Lite 契约支持 2K/3K、PNG 或 JPEG 输出，每次请求生成 1–15 张图片。" : "APIPod 的 Seedream V4.5 契约支持 2K/4K、PNG 或 JPEG 输出，每次请求生成 1 张图片。"}` };
  }
  if (slug.startsWith("wan/")) {
    const video = /(?:t2v|i2v|r2v|videoedit)/.test(page.modelId || slug);
    if (video) {
      const i2v = /(?:i2v|r2v)/.test(page.modelId || slug);
      const r2v = /r2v/.test(page.modelId || slug);
      return { source: sources.wan, en: `${title} exposes Alibaba's Wan video generation workflow through APIPod's asynchronous video API. Alibaba's Wan family covers text-to-video, image-to-video, reference-to-video, and video editing with controllable motion and scene consistency. This public ID selects ${r2v ? "reference-to-video with image, video, audio, or file references" : i2v ? "image-to-video with a required first frame and optional last frame" : "text-to-video without reference media"}; the exact duration, resolution, audio, and reference-file limits follow APIPod's CUE contract and configured channel.`, zh: `${title} 通过 APIPod 异步视频接口提供阿里 Wan Video生成工作流。Wan 系列覆盖文生视频、图生视频、参考生视频和视频编辑，并支持可控运动与场景一致性。该公开 ID 对应${r2v ? "支持图片、视频、音频或文件参考素材的参考生视频" : i2v ? "必须提供首帧、可选提供尾帧的图生视频" : "不使用参考素材的文生视频"}；具体时长、分辨率、音频和参考文件限制以 APIPod CUE 契约及已配置通道为准。` };
    }
    const edit = slug.includes("image-to-image");
    const pro = slug.endsWith("-pro");
    const pro4k = pro && !edit;
    return { source: sources.wan, en: `${title} exposes Alibaba's Wan 2.7 image model through APIPod. It is designed for ${edit ? "controlled editing while preserving supplied subjects and composition" : "prompt-driven generation with optional reasoning before rendering"}. The current contract supports up to four outputs, color-palette control, and ${edit ? "one to nine source images" : "a deterministic seed"}${pro4k ? "; this Pro text-to-image route also exposes the 4K quality tier" : ""}.`, zh: `${title} 通过 APIPod 接入阿里 Wan 2.7 图片模型，适用于${edit ? "在保持主体和构图的同时进行可控编辑" : "带可选生成前推理的提示词生图"}。当前契约支持一次最多 4 张输出、色板控制，以及${edit ? "1 至 9 张源图片" : "确定性随机种子"}${pro4k ? "；该 Pro 文生图路由还开放 4K 质量档位" : ""}。` };
  }
  if (slug.startsWith("veo/")) {
    const ref = slug.endsWith("fast-ref");
    const quality = slug.includes("quality");
    const k4 = slug.endsWith("4k");
    return { source: sources.veo, en: `${title} provides Google Veo 3.1 through APIPod's async video endpoint. Google's current Gemini documentation describes Veo 3.1 as video generation with native audio, first/last-frame control, image-based direction, and extension. In APIPod, this public ID selects the ${quality ? "quality-focused" : "fast"} route${k4 ? " with a 4K target" : ""}; the exposed contract supports ${ref ? "up to three subject or style reference images and an 8-second clip" : "optional first/last-frame images and 4, 6, or 8-second clips"} at 16:9 or 9:16.`, zh: `${title} 通过 APIPod 异步视频接口提供 Google Veo 3.1。Google 当前 Gemini 文档将 Veo 3.1 定位为支持原生音频、首尾帧控制、图片引导和视频续写的视频生成模型。在 APIPod 中，该公开 ID 选择${quality ? "质量优先" : "快速"}路由${k4 ? "并以 4K 为目标" : ""}；当前契约${ref ? "支持最多 3 张主体或风格参考图，并固定生成 8 秒视频" : "支持可选首尾帧图片，生成 4、6 或 8 秒视频"}，宽高比为 16:9 或 9:16。` };
  }
  if (slug.startsWith("seedance/")) {
    const modelID = page.modelId || "";
    const fast = modelID.includes("fast") || slug.includes("fast");
    const v1 = modelID.includes("1.0") || modelID.includes("1.5");
    const mini = modelID.includes("2.0-mini");
    const vip = modelID.includes("vip");
    const image = /i2v/.test(modelID) || slug.includes("image-to");
    const ref = /r2v/.test(modelID) || slug.includes("reference-to");
    const mode = ref ? "multi-asset reference-to-video" : image ? "first/last-frame image-to-video" : "text-to-video";
    const modeZh = ref ? "多素材参考生视频" : image ? "首尾帧图生视频" : "文生视频";
    const family = v1 ? "Seedance 1.x" : mini ? "Seedance 2.0 Mini" : "Seedance 2.0";
    return { source: sources.seedance, en: `${title} is the ${mode} entry in APIPod's ${family} family${vip ? " VIP route" : ""}. BytePlus describes Seedance as a multimodal video model family for controllable motion, camera direction, and synchronized audio; the 2.0 generation adds image, video, and audio references and intelligent editing. APIPod exposes ${mode === "text-to-video" ? "prompt-only generation for this ID" : mode === "first/last-frame image-to-video" ? "first-frame and optional last-frame inputs" : "up to nine image, three video, and three audio references"}. ${fast ? "Fast routes are limited to 480p/720p." : "The available resolution follows the selected channel."}`, zh: `${title} 是 APIPod ${family}${vip ? " VIP 路由" : ""}中的${modeZh}入口。BytePlus 将 Seedance 定位为支持可控运动、镜头指令和同步音频的多模态视频模型系列；2.0 系列进一步支持图片、视频和音频参考素材及智能编辑。APIPod 为该 ID 开放${mode === "text-to-video" ? "仅使用提示词的生成" : mode === "first/last-frame image-to-video" ? "首帧和可选尾帧输入" : "最多 9 张图片、3 个视频和 3 个音频参考素材"}。${fast ? "Fast 路由限制为 480p/720p。" : "可用分辨率以所选通道为准。"}` };
  }
  if (slug.startsWith("grok-imagine")) {
    const preview = slug.includes("preview");
    const fast = slug.includes("fast");
    const vip = slug.includes("1-5-vip");
    const i2v = slug.endsWith("i2v") || preview || fast || vip;
    return { source: sources.grok, en: `${title} brings xAI's Grok Imagine video workflow to APIPod. xAI's current video documentation describes asynchronous text-to-video, image-to-video, reference-to-video, editing, and extension workflows; its 1.5 family can use an image as a first frame and animate it with synchronized motion. APIPod currently exposes 480p/720p and the following model-specific limits: ${preview ? "Preview is image-to-video only and requires exactly one image" : vip ? "VIP requires a source image and supports up to 15 seconds" : fast ? "1.5 Fast supports 6-30 seconds and up to seven reference images" : i2v ? "the image-to-video ID accepts either image URLs or a prior APIPod task ID, but not both" : "the text-to-video ID rejects image references"}.`, zh: `${title} 通过 APIPod 提供 xAI Grok Imagine 视频工作流。xAI 当前视频文档覆盖异步文生视频、图生视频、参考生视频、视频编辑和续写；1.5 系列可以使用图片作为首帧并生成连贯运动。APIPod 当前开放 480p/720p，并按模型设置以下限制：${preview ? "Preview 仅支持图生视频，必须且只能提供 1 张图片" : vip ? "VIP 必须提供源图片，支持最长 15 秒" : fast ? "1.5 Fast 支持 6–30 秒和最多 7 张参考图" : i2v ? "图生视频可使用图片 URL 或历史 APIPod 任务 ID，但不能同时使用" : "文生视频 ID 拒绝图片引用"}。` };
  }
  if (slug.startsWith("sora-2/")) return { source: sources.sora, en: `${title} exposes OpenAI's Sora 2 video generation through APIPod's asynchronous video endpoint. OpenAI describes Sora 2 as a model that creates videos with synchronized audio from natural language or an image. APIPod keeps this route explicit: prompts are limited to 4,000 characters, the public model ID is fixed in the request, and duration, aspect ratio, image input, and callback behavior follow the live schema for this route.`, zh: `${title} 通过 APIPod 异步视频接口提供 OpenAI Sora 2 视频生成能力。OpenAI 将 Sora 2 定位为可根据自然语言或图片生成带同步音频的视频模型。APIPod 对该路由保持契约明确：提示词最长 4,000 字符，请求中的公开模型 ID 固定，时长、宽高比、图片输入和回调行为以该路由的实时 schema 为准。` };
  if (slug.startsWith("gemini-omni/")) {
    const mode = slug.endsWith("t2v") ? "text-to-video without image input" : slug.endsWith("i2v") ? "first/last-frame generation with one or two images" : slug.endsWith("r2v") ? "reference-to-video with one to five images" : "video extension, which requires a source video and allows up to five reference images";
    const modeZh = slug.endsWith("t2v") ? "不接受图片输入的文生视频" : slug.endsWith("i2v") ? "使用 1–2 张首尾帧图片的视频生成" : slug.endsWith("r2v") ? "使用 1–5 张图片的参考生视频" : "必须提供源视频、并可附带最多 5 张参考图的视频续写";
    return { source: sources.gemini, en: `${title} is an APIPod public routing ID for the configured Gemini Omni video channel, not a separate Google model name. Google's current Gemini video documentation positions Gemini Omni Flash as a multimodal, coherent video model that can reason over text, images, audio, and video and support conversational editing. This page exposes ${mode}; all four IDs share APIPod's async lifecycle, 4,000-character prompt limit, 1-30 second duration range, and 720p/1080p channel limits.`, zh: `${title} 是 APIPod 为配置的 Gemini Omni 视频通道提供的公开路由 ID，并不是独立的 Google 模型名称。Google 当前 Gemini 视频文档将 Gemini Omni Flash 定位为支持文本、图片、音频和视频多模态推理、连贯生成及对话式编辑的视频模型。本页开放${modeZh}；四个 ID 共享 APIPod 异步任务生命周期、4,000 字符提示词上限、1–30 秒时长范围和通道对应的 720p/1080p 限制。` };
  }
  if (slug.startsWith("minimax-h3/")) {
    const mode = slug.endsWith("t2v") ? "pure text-to-video; reference media is rejected" : slug.endsWith("i2v") ? "first-frame generation with one required image and one optional last frame" : "reference-to-video with up to nine images, three videos, and three audio files";
    const modeZh = slug.endsWith("t2v") ? "纯文生视频，不允许参考素材" : slug.endsWith("i2v") ? "首帧生视频，必须提供首帧并可选提供尾帧" : "参考生视频，最多支持 9 张图片、3 个视频和 3 个音频";
    return { source: sources.minimax, en: `${title} exposes MiniMax H3 through APIPod's asynchronous multimodal video endpoint. MiniMax describes H3 as an open general-purpose model that understands text, image, video, and audio together, supports text-to-video, first/last-frame image-to-video, reference generation, and video editing, with 768P/2K output and 4-15 second clips. APIPod's public contract fixes resolution at 2K and this ID is for ${mode}.`, zh: `${title} 通过 APIPod 异步多模态视频接口接入 MiniMax H3。MiniMax 将 H3 定位为可统一理解文本、图片、视频和音频的开放通用模型，支持文生视频、首尾帧图生视频、参考生成和视频编辑，官方输出规格为 768P/2K、4–15 秒。APIPod 公开契约将分辨率固定为 2K，本 ID 对应${modeZh}。` };
  }
  if (slug.startsWith("kling/")) return { source: sources.kling, en: `${title} exposes Kling's motion-control workflow through APIPod's asynchronous video API. The model transfers the motion and timing of a reference video to a character or subject in a reference image while preserving the source audio when requested. APIPod requires one image and one video, accepts character orientation and standard/pro quality controls, and applies the model's media size and duration limits.`, zh: `${title} 通过 APIPod 异步视频接口提供 Kling 动作控制工作流。该模型将参考视频中的动作和节奏迁移到参考图片中的人物或主体，并可按请求保留原始音频。APIPod 要求同时提供 1 张图片和 1 个视频，支持人物朝向、标准/专业质量控制，并遵循模型的素材大小及时长限制。` };
  if (slug.startsWith("motion-control/")) return { source: sources.motionControl, en: `${title} is an APIPod public video-to-video motion-control route. It combines a reference image with a motion video and returns an asynchronous generation task; use the task status endpoint to retrieve the generated artifact. Input validation and provider-specific limits are defined by the current APIPod CUE and adapter contract.`, zh: `${title} 是 APIPod 的公开视频到视频动作控制路由。它结合参考图片和动作视频创建异步生成任务，完成后通过任务状态接口获取结果。输入校验和提供商特定限制以当前 APIPod CUE 规范及适配器契约为准。` };
  return null;
}

function operation(spec) {
  for (const [route, item] of Object.entries(spec.paths || {})) for (const method of ["post", "get"]) if (item[method]) return { route, method, op: item[method] };
}

function resolve(spec, schema) {
  if (!schema?.$ref) return schema || {};
  return schema.$ref.split("/").slice(1).reduce((value, key) => value?.[key], spec) || {};
}

const string = (description, extra = {}) => ({ type: "string", description, ...extra });
const integer = (description, extra = {}) => ({ type: "integer", description, ...extra });
const boolean = (description, extra = {}) => ({ type: "boolean", description, ...extra });
const strings = (description, extra = {}) => ({ type: "array", items: { type: "string" }, description, ...extra });

function objectSchema(properties, required = []) {
  return { type: "object", properties, required };
}

function modelField(model) {
  return string("Public APIPod model ID.", { const: model });
}

function currentRequestSchema(page, raw) {
  const slug = page.slug;
  const model = {
    "gpt-image-2/gpt-image-2": "gpt-image-2",
    "gpt-image-2/gpt-image-2-lite": "gpt-image-2-lite",
    "gpt-image-2/gpt-image-2-fast": "gpt-image-2-fast",
    "veo/3-1-fast": "veo3-1-fast",
    "veo/3-1-fast-4k": "veo3-1-fast-4k",
    "veo/3-1-fast-ref": "veo3-1-fast-ref",
    "veo/3-1-quality": "veo3-1-quality",
    "veo/3-1-quality-4k": "veo3-1-quality-4k",
    "gemini-omni/gemini-omni-t2v": "gemini-omni-t2v",
    "gemini-omni/gemini-omni-i2v": "gemini-omni-i2v",
    "gemini-omni/gemini-omni-r2v": "gemini-omni-r2v",
    "gemini-omni/gemini-omni-extend": "gemini-omni-extend",
    "grok-imagine-1-5/grok-imagine-1-5-fast": "grok-imagine-1.5-fast",
    "grok-imagine-1-5/grok-imagine-1-5-preview": "grok-imagine-1.5-preview",
    "sora-2/sora-2-vip": "sora-2-vip",
  }[slug] || page.modelId || raw?.properties?.model?.const;

  if (slug.startsWith("gpt-image-2/")) {
    const edit = slug.endsWith("-edit");
    return objectSchema({
      model: modelField(model),
      prompt: string("Describe the image to generate or the edit to apply.", { maxLength: 4000 }),
      image_urls: strings("Publicly accessible reference images. The main model supports both generation and editing.", { maxItems: 6 }),
      aspect_ratio: string("Output aspect ratio.", { default: "auto", enum: ["auto", "1:1", "1:2", "1:3", "2:1", "2:3", "3:1", "3:2", "3:4", "4:3", "4:5", "5:4", "16:9", "9:16", "21:9", "9:21"] }),
      resolution: string("Output resolution tier.", { enum: ["1K", "2K", "4K"] }),
      quality: string("Rendering fidelity. Legacy 1K/2K/4K values remain accepted on gpt-image-2 when resolution is omitted.", { default: "auto", enum: ["auto", "low", "medium", "high"] }),
      output_format: string("Output image format.", { enum: ["png", "jpeg", "webp"] }),
      output_compression: integer("Compression percentage for formats that support it.", { minimum: 0, maximum: 100 }),
      background: string("Background handling.", { enum: ["auto", "opaque"] }),
    }, edit ? ["model", "prompt", "image_urls"] : ["model", "prompt"]);
  }

  if (slug.startsWith("nano-banana/")) {
    const is2 = slug.endsWith("nano-banana-2");
    return objectSchema({
      model: modelField(model),
      prompt: string("Describe the image to create or the edit to apply.", { maxLength: 4000 }),
      image_urls: strings("Reference images for editing, composition, or subject consistency.", { maxItems: is2 ? 14 : 8 }),
      aspect_ratio: string("Output aspect ratio.", { default: "auto", enum: is2 ? ["auto", "1:1", "1:4", "1:8", "2:3", "3:2", "3:4", "4:1", "4:3", "4:5", "5:4", "8:1", "16:9", "9:16", "21:9"] : ["auto", "1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "16:9", "9:16", "21:9"] }),
      quality: string("Output resolution tier.", { default: "1K", enum: is2 ? ["512px", "1K", "2K", "4K"] : ["1K", "2K", "4K"] }),
      resolution: string("Alias for the output resolution tier.", { enum: is2 ? ["512", "512px", "1K", "2K", "4K"] : ["1K", "2K", "4K"] }),
      google_search: boolean("Allow the model to use Google Search grounding when the selected channel supports it.", { default: false }),
      callback_url: string("HTTPS endpoint that receives task completion notifications."),
    }, ["model", "prompt"]);
  }

  if (slug.startsWith("seedream/")) {
    const v5 = slug.includes("5-0") || page.modelId?.startsWith("seedream-5");
    const edit = slug.includes("image-to-image") || slug.endsWith("-edit") || page.modelId?.endsWith("-edit");
    return objectSchema({
      model: modelField(model),
      prompt: string("Describe the image or requested edit.", { maxLength: v5 ? 2000 : 4000 }),
      image_urls: strings("Source or reference images.", { maxItems: 14 }),
      aspect_ratio: string("Output aspect ratio.", { default: "1:1", enum: v5 ? ["1:1", "4:3", "3:4", "16:9", "9:16", "3:2", "2:3", "21:9"] : ["1:1", "2:3", "3:2", "3:4", "4:3", "16:9", "9:16", "21:9"] }),
      quality: string("Output resolution tier.", { default: "2K", enum: v5 ? ["2K", "3K"] : ["2K", "4K"] }),
      size: string("Optional explicit output size accepted by the selected channel."),
      output_format: string("Output format.", { enum: ["png", "jpeg"] }),
      n: integer("Number of images to generate. Seedream 5.0 Lite supports up to 15.", { minimum: 1, maximum: v5 ? 15 : 1, default: 1 }),
      callback_url: string("HTTPS endpoint that receives task completion notifications."),
    }, edit ? ["model", "prompt", "image_urls"] : ["model", "prompt"]);
  }

  if (slug.startsWith("wan/")) {
    const video = /(?:t2v|i2v|r2v|videoedit)/.test(page.modelId || slug);
    if (video) {
      const modelID = page.modelId || model;
      const i2v = /i2v/.test(modelID);
      const r2v = /r2v/.test(modelID);
      return objectSchema({
        model: modelField(modelID),
        prompt: string("Describe the scene, motion, camera, and sound.", { maxLength: 5000 }),
        image_urls: strings(i2v || r2v ? "Reference image URLs." : "Reference image URLs, if supported by the selected channel.", { minItems: i2v ? 1 : undefined, maxItems: r2v ? 5 : 2 }),
        video_urls: strings("Reference video URLs.", { maxItems: r2v ? 3 : 1 }),
        audio_urls: strings("Reference audio URLs.", { maxItems: r2v ? 3 : 1 }),
        file_urls: strings("Reference file URLs.", { maxItems: 1 }),
        aspect_ratio: string("Video aspect ratio.", { default: "16:9", enum: ["adaptive", "16:9", "9:16", "1:1"] }),
        resolution: string("Output resolution.", { default: "1080P", enum: ["480P", "720P", "1080P", "480p", "720p", "1080p"] }),
        duration: integer("Clip duration in seconds.", { default: 5, minimum: 2, maximum: 30 }),
        audio: boolean("Generate or preserve audio when supported.", { default: true }),
        seed: integer("Optional deterministic random seed."),
        callback_url: string("HTTPS endpoint that receives task completion notifications."),
      }, ["model", "prompt", ...(i2v || r2v ? ["image_urls"] : [])]);
    }
    const edit = slug.includes("image-to-image");
    const pro = slug.endsWith("-pro");
    return objectSchema({
      model: modelField(model),
      prompt: string("Describe the image to generate or the edit to perform.", { maxLength: 5000 }),
      image_urls: strings("Source images for editing.", { minItems: 1, maxItems: 9 }),
      size: string("Output size or resolution shorthand.", { default: "2K" }),
      quality: string("Output quality tier.", { enum: pro && !edit ? ["1K", "2K", "4K"] : ["1K", "2K"] }),
      aspect_ratio: string("Output aspect ratio.", { enum: ["1:1", "1:4", "1:8", "2:3", "3:2", "3:4", "4:1", "4:3", "4:5", "5:4", "8:1", "16:9", "9:16", "21:9"] }),
      n: integer("Number of images to generate.", { default: 1, minimum: 1, maximum: 4 }),
      thinking_mode: boolean("Allow reasoning before rendering in text-to-image mode.", { default: true }),
      color_palette: { type: "array", description: "Optional palette of 3-10 colors with hexadecimal values and target ratios.", items: { type: "object" }, minItems: 3, maxItems: 10 },
      seed: integer("Optional deterministic random seed."),
      watermark: boolean("Add an upstream watermark to the result.", { default: false }),
    }, edit ? ["model", "prompt", "image_urls"] : ["model", "prompt"]);
  }

  if (slug.startsWith("veo/")) {
    const ref = slug.endsWith("fast-ref");
    const k4 = slug.endsWith("4k");
    return objectSchema({
      model: modelField(model),
      prompt: string("Describe the scene, action, camera, and audio.", { maxLength: 4000 }),
      image_urls: strings(ref ? "Up to three subject or style reference images." : "Optional first and last frame images.", { maxItems: ref ? 3 : 2 }),
      aspect_ratio: string("Video aspect ratio.", { default: "16:9", enum: ["16:9", "9:16"] }),
      resolution: string("Output resolution.", { default: k4 ? "4k" : "720p", enum: ["720p", "1080p", "4k"] }),
      duration: integer("Clip duration in seconds.", { default: 8, enum: ref ? [8] : [4, 6, 8] }),
      callback_url: string("HTTPS endpoint that receives task completion notifications."),
    }, ["model", "prompt"]);
  }

  if (slug.startsWith("seedance/")) {
    const fast = slug.includes("fast");
    const modelID = page.modelId || model;
    const image = /i2v/.test(modelID) || slug.includes("image-to");
    const ref = /r2v/.test(modelID) || slug.includes("reference-to");
    return objectSchema({
      model: modelField(model),
      prompt: string("Describe the content, motion, camera, and audio.", { maxLength: 2000 }),
      image_urls: strings(image ? "One required first frame and one optional last frame." : "Reference images.", { minItems: image ? 1 : undefined, maxItems: image ? 2 : 9 }),
      video_urls: strings("Reference videos.", { maxItems: 3 }),
      audio_urls: strings("Reference audio files.", { maxItems: 3 }),
      aspect_ratio: string("Output aspect ratio, or adaptive selection.", { default: "adaptive", enum: ["adaptive", "16:9", "4:3", "1:1", "3:4", "9:16", "21:9"] }),
      resolution: string("Output resolution.", { default: "720p", enum: fast ? ["480p", "720p"] : ["480p", "720p", "1080p", "4k"] }),
      duration: integer("Clip duration in seconds. Use -1 only for automatic duration on supported routes.", { default: 5, enum: [-1, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] }),
      generate_audio: boolean("Generate synchronized audio.", { default: true }),
      return_last_frame: boolean("Include the generated last frame as the first result item.", { default: false }),
      web_search: boolean("Allow the model to retrieve current information when needed.", { default: false }),
      watermark: boolean("Add an upstream watermark.", { default: false }),
      callback_url: string("HTTPS endpoint that receives task completion notifications."),
    }, ["model", ...(ref ? [] : ["prompt"]), ...(image ? ["image_urls"] : [])]);
  }

  if (slug.startsWith("grok-imagine")) {
    const preview = slug.includes("preview");
    const fast = slug.includes("fast");
    const vip = slug.includes("1-5-vip");
    const i2v = slug.endsWith("i2v") || preview;
    return objectSchema({
      model: modelField(model),
      prompt: string("Describe the motion, scene, and camera behavior.", { maxLength: fast ? 4096 : 4000 }),
      image_url: string("Single source image.", preview ? {} : undefined),
      image_urls: strings("Source or reference images.", { minItems: i2v && !preview ? 1 : undefined, maxItems: preview ? 1 : fast ? 7 : 7 }),
      task_id: string("Prior APIPod task ID to reuse as the source instead of image URLs."),
      index: integer("Result index from task_id, from 0 through 5.", { minimum: 0, maximum: 5 }),
      aspect_ratio: string("Video aspect ratio.", { default: "16:9", enum: ["16:9", "9:16", "1:1", "3:2", "2:3"] }),
      duration: integer("Clip duration in seconds.", { default: fast ? 10 : 6, minimum: fast ? 6 : 1, maximum: fast ? 30 : preview || vip ? 15 : 30 }),
      resolution: string("Output resolution.", { default: "720p", enum: ["480p", "720p"] }),
      mode: string("Generation mode for the base Grok Imagine models.", { enum: ["normal", "fun", "spicy"] }),
    }, ["model", ...(!i2v || preview || fast || vip ? ["prompt"] : []), ...(preview || vip ? ["image_url"] : [])]);
  }

  if (slug.startsWith("sora-2/")) return objectSchema({
    model: modelField(model),
    prompt: string("Describe the scene, action, camera, and sound.", { maxLength: 4000 }),
    image_url: string("Optional first-frame image URL."),
    aspect_ratio: string("Video aspect ratio.", { default: "9:16", enum: ["9:16", "16:9"] }),
    duration: integer("Clip duration in seconds.", { default: 8, enum: [4, 8, 10, 12, 15] }),
    callback_url: string("HTTPS endpoint that receives task completion notifications."),
  }, ["model", "prompt"]);

  if (slug.startsWith("gemini-omni/")) {
    const i2v = slug.endsWith("i2v");
    const r2v = slug.endsWith("r2v");
    const extend = slug.endsWith("extend");
    return objectSchema({
      model: modelField(model),
      prompt: string("Describe the desired scene, motion, or extension.", { maxLength: 4000 }),
      image_urls: strings(i2v ? "First frame and optional last frame." : "Reference images.", { minItems: i2v || r2v ? 1 : undefined, maxItems: i2v ? 2 : 5 }),
      video_url: string("Source video URL required for extension."),
      aspect_ratio: string("Video aspect ratio.", { default: "16:9", enum: ["16:9", "9:16", "1:1"] }),
      resolution: string("Output resolution supported by the selected channel.", { enum: ["720p", "1080p"] }),
      duration: integer("Clip duration in seconds.", { default: 10, minimum: 1, maximum: 30 }),
      callback_url: string("HTTPS endpoint that receives task completion notifications."),
    }, ["model", "prompt", ...(i2v || r2v ? ["image_urls"] : []), ...(extend ? ["video_url"] : [])]);
  }

  if (slug.startsWith("minimax-h3/")) {
    const i2v = slug.endsWith("i2v");
    const r2v = slug.endsWith("r2v");
    return objectSchema({
      model: modelField(model),
      prompt: string("Describe the scene, motion, camera, dialogue, and sound.", { maxLength: 7000 }),
      image_urls: strings(i2v ? "Required first frame and optional last frame." : "Reference images.", { minItems: i2v || r2v ? 1 : undefined, maxItems: i2v ? 2 : 9 }),
      video_urls: strings("Reference videos.", { maxItems: 3 }),
      audio_urls: strings("Reference audio files.", { maxItems: 3 }),
      aspect_ratio: string("Required output ratio for text and reference modes.", { enum: ["16:9", "9:16", "1:1"] }),
      duration: integer("Clip duration in seconds.", { minimum: 4, maximum: 15 }),
      resolution: string("MiniMax H3 currently requires native 2K output.", { const: "2K" }),
      callback_url: string("HTTPS endpoint that receives task completion notifications."),
    }, ["model", "prompt", "duration", "resolution", ...(!i2v ? ["aspect_ratio"] : []), ...(i2v || r2v ? ["image_urls"] : [])]);
  }

  if (slug.startsWith("kling/") || slug.startsWith("motion-control/")) return objectSchema({
    model: modelField(model),
    prompt: string("Describe the desired motion and output behavior.", { maxLength: 2500 }),
    image_url: string("Reference image URL."),
    video_url: string("Reference motion video URL."),
    character_orientation: string("Whether to follow the image or video character orientation.", { enum: ["image", "video"], default: "image" }),
    keep_original_sound: boolean("Keep the original audio of the reference video.", { default: true }),
    quality: string("Video generation quality.", { enum: ["std", "pro"], default: "std" }),
  }, ["model", "prompt", "image_url", "video_url"]);

  return raw;
}

function displayType(schema) {
  if (schema.type === "array") return `${schema.items?.type || "string"}[]`;
  return schema.type || (schema.properties ? "object" : "any");
}

function exampleValue(name, schema, page) {
  const slug = page.slug;
  if (schema.const !== undefined) return schema.const;
  if (name === "prompt") return slug.includes("image-to") || slug.endsWith("i2v") ? "Animate the subject with a slow camera push-in, natural motion, and soft cinematic lighting." : slug.includes("image") || slug.includes("nano") || slug.includes("seedream") || slug.startsWith("wan/") || slug.startsWith("gpt-") ? "A premium product photograph on a dark studio set, precise typography, soft rim lighting, highly detailed." : "A cinematic tracking shot through a rain-soaked neon street, realistic motion, synchronized ambient sound.";
  if (name === "image_url") return "https://cdn.example.com/reference.jpg";
  if (name === "image_urls") return ["https://cdn.example.com/reference-1.jpg"];
  if (name === "video_url") return "https://cdn.example.com/source.mp4";
  if (name === "video_urls") return ["https://cdn.example.com/reference.mp4"];
  if (name === "audio_urls") return ["https://cdn.example.com/reference.mp3"];
  if (name === "callback_url") return "https://example.com/webhooks/apipod";
  if (name === "duration") return slug.includes("minimax") ? 8 : slug.includes("sora") ? 8 : schema.default > 0 ? schema.default : schema.enum?.find((v) => Number(v) > 0) || 8;
  if (name === "resolution") return slug.includes("minimax") ? "2K" : slug.includes("4k") ? "4k" : schema.default || schema.enum?.find((v) => /720|2K/i.test(String(v))) || schema.enum?.[0] || "720p";
  if (name === "quality") return schema.default || schema.enum?.find((v) => /2K|auto/i.test(String(v))) || schema.enum?.[0];
  if (name === "aspect_ratio") return schema.default === "adaptive" ? "adaptive" : schema.enum?.includes("16:9") ? "16:9" : schema.default || schema.enum?.[0];
  if (name === "size") return schema.default || "2K";
  if (name === "n") return 1;
  if (schema.default !== undefined) return schema.default;
  if (schema.enum?.length) return schema.enum[0];
  if (schema.type === "boolean") return name === "generate_audio";
  if (schema.type === "integer" || schema.type === "number") return schema.minimum || 1;
  if (schema.type === "array") return [];
  return "value";
}

function requestExample(schema, spec, page) {
  schema = resolve(spec, schema);
  const required = new Set(schema.required || []);
  const slug = page.slug;
  const important = new Set(["model", "prompt", "aspect_ratio", "resolution", "quality", "duration", "generate_audio", "n", "size"]);
  const modelID = page.modelId || "";
  if (slug.includes("image-to-image") || slug.endsWith("-edit") || slug.endsWith("/grok-imagine-i2v") || slug.includes("preview") || slug.includes("image-to-video") || slug.endsWith("gemini-omni-i2v") || slug.endsWith("gemini-omni-r2v") || slug.endsWith("minimax-h3-i2v") || slug.endsWith("minimax-h3-r2v") || slug.includes("reference-to-video") || slug.endsWith("fast-ref") || /(?:i2v|r2v)/.test(modelID)) important.add("image_urls");
  if (slug.includes("preview") || slug.includes("1-5-vip") || slug.startsWith("sora-2/") || slug.startsWith("kling/") || slug.startsWith("motion-control/")) important.add("image_url");
  if (/(?:t2v|i2v|r2v|videoedit)/.test(modelID) && slug.startsWith("wan/")) {
    important.add("image_urls");
    important.add("video_urls");
    important.add("audio_urls");
    important.add("file_urls");
  }
  if (slug.startsWith("kling/") || slug.startsWith("motion-control/")) important.add("video_url");
  if (slug.endsWith("gemini-omni-extend")) important.add("video_url");
  if (slug.endsWith("minimax-h3-r2v") || slug.includes("reference-to-video") || /r2v/.test(modelID)) {
    important.add("video_urls");
    important.add("audio_urls");
  }
  return Object.fromEntries(Object.entries(schema.properties || {}).filter(([name]) => required.has(name) || important.has(name)).map(([name, raw]) => [name, exampleValue(name, resolve(spec, raw), page)]).filter(([, value]) => value !== undefined && !(Array.isArray(value) && value.length === 0)));
}

const fieldDescriptions = {
  model: ["Public APIPod model ID.", "APIPod 公开模型 ID。"],
  prompt: ["Generation or editing instructions.", "生成或编辑指令。"],
  image_url: ["Publicly accessible source image URL.", "可公开访问的源图片 URL。"],
  image_urls: ["Publicly accessible source or reference image URLs.", "可公开访问的源图片或参考图 URL。"],
  video_url: ["Publicly accessible source video URL.", "可公开访问的源视频 URL。"],
  video_urls: ["Publicly accessible reference video URLs.", "可公开访问的参考视频 URL。"],
  audio_urls: ["Publicly accessible reference audio URLs.", "可公开访问的参考音频 URL。"],
  file_urls: ["Publicly accessible reference file URLs.", "可公开访问的参考文件 URL。"],
  aspect_ratio: ["Output aspect ratio.", "输出宽高比。"],
  resolution: ["Output resolution tier.", "输出分辨率档位。"],
  quality: ["Output quality or image resolution tier.", "输出质量或图片分辨率档位。"],
  size: ["Output size or resolution shorthand.", "输出尺寸或分辨率简写。"],
  duration: ["Video duration in seconds.", "视频时长，单位为秒。"],
  generate_audio: ["Generate synchronized audio with the video.", "为视频生成同步音频。"],
  audio: ["Generate or preserve audio when supported.", "在模型支持时生成或保留音频。"],
  return_last_frame: ["Return the generated last frame for continuation workflows.", "返回生成视频的尾帧，用于续作工作流。"],
  web_search: ["Allow retrieval of current information when supported.", "在通道支持时允许检索实时信息。"],
  google_search: ["Allow Google Search grounding when supported.", "在通道支持时允许使用 Google Search 联网。"],
  callback_url: ["HTTPS endpoint that receives task completion notifications.", "接收任务完成通知的 HTTPS 地址。"],
  watermark: ["Add an upstream watermark.", "添加上游水印。"],
  n: ["Number of images to generate.", "生成图片数量。"],
  seed: ["Deterministic random seed.", "用于复现结果的随机种子。"],
  thinking_mode: ["Allow reasoning before rendering.", "允许模型在渲染前进行推理。"],
  output_format: ["Output image format.", "输出图片格式。"],
  output_compression: ["Output compression percentage.", "输出压缩百分比。"],
  background: ["Background handling mode.", "背景处理模式。"],
  task_id: ["Prior APIPod task ID used as the source.", "作为输入来源的历史 APIPod 任务 ID。"],
  index: ["Result index within the source task.", "源任务结果中的索引。"],
  mode: ["Generation mode.", "生成模式。"],
  character_orientation: ["Character orientation source.", "人物朝向参考来源。"],
  keep_original_sound: ["Keep the original reference-video audio.", "保留参考视频的原始音频。"],
  color_palette: ["Optional target color palette.", "可选目标色板。"],
};

const zhSchemaDescriptions = {
  ...Object.fromEntries(Object.entries(fieldDescriptions).map(([name, descriptions]) => [name, descriptions[1]])),
  code: "HTTP 状态码。",
  message: "响应消息。",
  data: "响应数据。",
  progress: "任务完成进度，范围为 0 到 100。",
  result: "任务完成后返回的生成结果 URL 列表。",
  completed_at: "任务完成时间，Unix 秒级时间戳。",
  status: "任务当前状态。",
  error: "可安全返回给客户端的异步错误信息。",
  error_code: "稳定、可供程序识别的异步错误代码。",
  error_message: "可安全返回给客户端的异步错误信息。",
};

const zhDescriptionTranslations = {
  "Add an upstream watermark to the result.": "为生成结果添加上游水印。",
  "Add an upstream watermark.": "添加上游水印。",
  "Alias for the output resolution tier.": "输出分辨率档位的兼容别名。",
  "Allow reasoning before rendering in text-to-image mode.": "在文生图模式下允许模型先推理再渲染。",
  "Allow the model to retrieve current information when needed.": "允许模型在需要时检索实时信息。",
  "Allow the model to use Google Search grounding when the selected channel supports it.": "所选通道支持时，允许模型使用 Google Search 联网增强。",
  "Background handling.": "背景处理方式。",
  "Client-safe asynchronous error message.": "可安全返回给客户端的异步错误信息。",
  "Clip duration in seconds.": "视频片段时长，单位为秒。",
  "Clip duration in seconds. Use -1 only for automatic duration on supported routes.": "视频片段时长，单位为秒；仅在支持自动时长的路由中可使用 -1。",
  "Completion progress when available.": "任务完成进度（提供商返回时可用）。",
  "Compression percentage for formats that support it.": "支持压缩的输出格式所使用的压缩百分比。",
  "Describe the content, motion, camera, and audio.": "描述视频内容、运动、镜头和音频。",
  "Describe the desired scene, motion, or extension.": "描述目标场景、运动效果或视频续写要求。",
  "Describe the image or requested edit.": "描述要生成的图片或编辑要求。",
  "Describe the image to create or the edit to apply.": "描述要创建的图片或要执行的编辑。",
  "Describe the image to generate or the edit to apply.": "描述要生成的图片或要执行的编辑。",
  "Describe the image to generate or the edit to perform.": "描述要生成的图片或要执行的编辑。",
  "Describe the motion, scene, and camera behavior.": "描述运动、场景和镜头行为。",
  "Describe the scene, action, camera, and audio.": "描述场景、动作、镜头和音频。",
  "Describe the scene, action, camera, and sound.": "描述场景、动作、镜头和声音。",
  "Describe the scene, motion, camera, dialogue, and sound.": "描述场景、运动、镜头、对白和声音。",
  "First frame and optional last frame.": "首帧图片，以及可选的尾帧图片。",
  "Generate synchronized audio.": "生成与视频同步的音频。",
  "Generated artifact URLs returned after completion.": "任务完成后返回的生成结果 URL 列表。",
  "Generation mode for the base Grok Imagine models.": "基础 Grok Imagine 模型使用的生成模式。",
  "HTTP status code.": "HTTP 状态码。",
  "HTTPS endpoint that receives task completion notifications.": "接收任务完成通知的 HTTPS 地址。",
  "Include the generated last frame as the first result item.": "将生成视频的尾帧作为结果列表的第一项返回。",
  "MiniMax H3 currently requires native 2K output.": "MiniMax H3 当前要求使用原生 2K 输出。",
  "Number of images to generate.": "要生成的图片数量。",
  "Number of images to generate. Seedream 5.0 Lite supports up to 15.": "要生成的图片数量；Seedream 5.0 Lite 最多支持 15 张。",
  "One required first frame and one optional last frame.": "必须提供一张首帧图片，可选提供一张尾帧图片。",
  "Optional deterministic random seed.": "可选的确定性随机种子，用于复现结果。",
  "Optional explicit output size accepted by the selected channel.": "所选通道接受的可选明确输出尺寸。",
  "Optional first and last frame images.": "可选的首帧和尾帧图片。",
  "Optional palette of 3-10 colors with hexadecimal values and target ratios.": "可选色板，包含 3 到 10 个十六进制颜色值及其目标占比。",
  "Optional reference image.": "可选的参考图片。",
  "Output aspect ratio, or adaptive selection.": "输出宽高比，也可由模型自适应选择。",
  "Output aspect ratio.": "输出宽高比。",
  "Output format.": "输出格式。",
  "Output image format.": "输出图片格式。",
  "Output quality tier.": "输出质量档位。",
  "Output resolution supported by the selected channel.": "所选通道支持的输出分辨率。",
  "Output resolution tier.": "输出分辨率档位。",
  "Output resolution.": "输出分辨率。",
  "Output size or resolution shorthand.": "输出尺寸或分辨率简写。",
  "Prior APIPod task ID to reuse as the source instead of image URLs.": "要复用为输入素材的历史 APIPod 任务 ID；提供后无需再传图片 URL。",
  "Public APIPod model ID.": "APIPod 公开模型 ID。",
  "Public APIPod task ID used for status queries.": "用于查询任务状态的 APIPod 任务 ID。",
  "Public APIPod task ID.": "APIPod 任务 ID。",
  "Public task status.": "任务当前状态。",
  "Publicly accessible reference images. The main model supports both generation and editing.": "可公开访问的参考图片；主模型同时支持图片生成和编辑。",
  "Reference audio files.": "参考音频文件。",
  "Reference images for editing, composition, or subject consistency.": "用于编辑、构图或保持主体一致性的参考图片。",
  "Reference images.": "参考图片。",
  "Reference videos.": "参考视频。",
  "Rendering fidelity. Legacy 1K/2K/4K values remain accepted on gpt-image-2 when resolution is omitted.": "渲染质量；gpt-image-2 未提供 resolution 时仍兼容旧版 1K、2K、4K 值。",
  "Required first frame and optional last frame.": "必须提供首帧图片，可选提供尾帧图片。",
  "Required output ratio for text and reference modes.": "文生视频和参考生成模式必填的输出宽高比。",
  "Response message.": "响应消息。",
  "Result index from task_id, from 0 through 5.": "task_id 对应结果中的索引，范围为 0 到 5。",
  "Single source image.": "单张源图片。",
  "Source images for editing.": "用于编辑的源图片。",
  "Source or reference images.": "源图片或参考图片。",
  "Source video URL required for extension.": "视频续写必填的源视频 URL。",
  "Stable machine-readable asynchronous error code.": "稳定、可供程序识别的异步错误代码。",
  "Unix completion timestamp in seconds.": "任务完成时间，Unix 秒级时间戳。",
  "Up to three subject or style reference images.": "最多三张主体或风格参考图片。",
  "Video aspect ratio.": "视频宽高比。",
};

function localizedSchema(schema, language, context = "request") {
  const localized = structuredClone(schema);
  if (language !== "zh") return localized;

  const visit = (node) => {
    if (!node || typeof node !== "object") return;
    for (const [name, property] of Object.entries(node.properties || {})) {
      if (context === "response" && name === "task_id") {
        property.description = "用于查询任务状态的 APIPod 任务 ID。";
      } else {
        property.description = zhDescriptionTranslations[property.description] || zhSchemaDescriptions[name] || property.description;
      }
      const constraints = [];
      if (property.maxLength !== undefined) constraints.push(`最大字符串长度：${property.maxLength}。`);
      if (property.minLength !== undefined) constraints.push(`最小字符串长度：${property.minLength}。`);
      if (property.minimum !== undefined) constraints.push(`最小值：${property.minimum}。`);
      if (property.maximum !== undefined) constraints.push(`最大值：${property.maximum}。`);
      if (property.exclusiveMinimum !== undefined) constraints.push(`必须大于：${property.exclusiveMinimum}。`);
      if (property.exclusiveMaximum !== undefined) constraints.push(`必须小于：${property.exclusiveMaximum}。`);
      if (property.minItems !== undefined) constraints.push(`最少项目数：${property.minItems}。`);
      if (property.maxItems !== undefined) constraints.push(`最多项目数：${property.maxItems}。`);
      if (constraints.length) {
        property.description = [property.description, ...constraints].filter(Boolean).join(" ");
        for (const key of ["maxLength", "minLength", "minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum", "minItems", "maxItems"]) delete property[key];
      }
      visit(property);
    }
    visit(node.items);
  };
  visit(localized);
  return localized;
}

function fieldRows(schema, spec, language) {
  schema = resolve(spec, schema);
  const required = new Set(schema.required || []);
  const heading = language === "zh" ? "| 字段 | 类型 | 必填 | 说明 |\n| --- | --- | --- | --- |" : "| Field | Type | Required | Description |\n| --- | --- | --- | --- |";
  const rows = [];
  const visit = (properties, requiredSet, prefix = "") => Object.entries(properties || {}).forEach(([name, raw]) => {
    const field = resolve(spec, raw);
    const qualified = prefix ? `${prefix}.${name}` : name;
    const localized = fieldDescriptions[name]?.[language === "zh" ? 1 : 0];
    const details = [localized || field.description?.replace(/\s+/g, " ").trim()];
    if (field.const !== undefined) details.push(`${language === "zh" ? "固定值" : "Fixed"}: \`${field.const}\``);
    if (field.default !== undefined) details.push(`${language === "zh" ? "默认值" : "Default"}: \`${field.default}\``);
    if (field.enum?.length) details.push(`${language === "zh" ? "可选值" : "Values"}: ${field.enum.map((v) => `\`${v}\``).join(", ")}`);
    if (field.minItems !== undefined || field.maxItems !== undefined) details.push(language === "zh" ? `数量${field.minItems !== undefined ? `至少 ${field.minItems}` : ""}${field.minItems !== undefined && field.maxItems !== undefined ? "，" : ""}${field.maxItems !== undefined ? `最多 ${field.maxItems}` : ""}。` : `Items: ${field.minItems !== undefined ? `minimum ${field.minItems}` : ""}${field.minItems !== undefined && field.maxItems !== undefined ? ", " : ""}${field.maxItems !== undefined ? `maximum ${field.maxItems}` : ""}.`);
    if (field.minimum !== undefined || field.maximum !== undefined) details.push(language === "zh" ? `范围：${field.minimum ?? "不限"}–${field.maximum ?? "不限"}。` : `Range: ${field.minimum ?? "unbounded"}–${field.maximum ?? "unbounded"}.`);
    rows.push(`| \`${qualified}\` | \`${displayType(field)}\` | ${requiredSet.has(name) ? (language === "zh" ? "是" : "Yes") : (language === "zh" ? "否" : "No")} | ${details.filter(Boolean).join(" ").replaceAll("|", "\\|")} |`);
    if (field.properties) visit(field.properties, new Set(field.required || []), qualified);
  });
  visit(schema.properties, required);
  return [heading, ...rows].join("\n");
}

function metaDescription(text, limit = 160) {
  if (text.length <= limit) return text;
  const candidate = text.slice(0, limit + 1);
  const sentenceEnd = Math.max(candidate.lastIndexOf("。"), candidate.lastIndexOf(". "));
  if (sentenceEnd >= 80) return candidate.slice(0, sentenceEnd + 1).trim();
  const wordEnd = candidate.lastIndexOf(" ");
  return `${candidate.slice(0, wordEnd >= 80 ? wordEnd : limit).trim()}...`;
}

function modelIntroductionSections(text, language) {
  const marker = language === "zh"
    ? "在 APIPod 中，公开模型 ID 为"
    : "In APIPod, the public model ID is";
  const markerIndex = text.indexOf(marker);
  if (markerIndex < 0) {
    return { summary: metaDescription(text), support: "" };
  }
  return {
    summary: metaDescription(text.slice(0, markerIndex).trim()),
    support: text.slice(markerIndex).trim(),
  };
}

function requestCodeExamples(route, json) {
  const javascriptPayload = json.split("\n").map((line) => `  ${line}`).join("\n");
  const examples = {
    curl: `curl https://api.apipod.ai${route} \\\n+  -H "Authorization: Bearer $APIPOD_API_KEY" \\\n+  -H "Content-Type: application/json" \\\n+  -d '${json}'`,
    python: `import os\n+import requests\n+\n+payload = ${json.replace(/\btrue\b/g, "True").replace(/\bfalse\b/g, "False").replace(/\bnull\b/g, "None")}\n+\n+response = requests.post(\n+    "https://api.apipod.ai${route}",\n+    headers={\n+        "Authorization": f"Bearer {os.environ['APIPOD_API_KEY']}",\n+        "Content-Type": "application/json",\n+    },\n+    json=payload,\n+    timeout=60,\n+)\n+response.raise_for_status()\n+print(response.json())`,
    go: `package main\n+\n+import (\n+    "bytes"\n+    "encoding/json"\n+    "fmt"\n+    "net/http"\n+    "os"\n+)\n+\n+func main() {\n+    payload := map[string]any{}\n+    if err := json.Unmarshal([]byte(\`${json}\`), &payload); err != nil {\n+        panic(err)\n+    }\n+    body, err := json.Marshal(payload)\n+    if err != nil {\n+        panic(err)\n+    }\n+\n+    req, err := http.NewRequest(http.MethodPost, "https://api.apipod.ai${route}", bytes.NewReader(body))\n+    if err != nil {\n+        panic(err)\n+    }\n+    req.Header.Set("Authorization", "Bearer "+os.Getenv("APIPOD_API_KEY"))\n+    req.Header.Set("Content-Type", "application/json")\n+\n+    resp, err := http.DefaultClient.Do(req)\n+    if err != nil {\n+        panic(err)\n+    }\n+    defer resp.Body.Close()\n+    fmt.Println(resp.Status)\n+}`,
    rust: `use reqwest::Client;\n+use serde_json::json;\n+use std::env;\n+\n+#[tokio::main]\n+async fn main() -> Result<(), Box<dyn std::error::Error>> {\n+    let payload = json!(${json});\n+    let response = Client::new()\n+        .post("https://api.apipod.ai${route}")\n+        .bearer_auth(env::var("APIPOD_API_KEY")?)\n+        .json(&payload)\n+        .send()\n+        .await?\n+        .error_for_status()?;\n+\n+    println!("{}", response.text().await?);\n+    Ok(())\n+}`,
    javascript: `const response = await fetch("https://api.apipod.ai${route}", {\n+  method: "POST",\n+  headers: {\n+    Authorization: \`Bearer \${process.env.APIPOD_API_KEY}\`,\n+    "Content-Type": "application/json",\n+  },\n+  body: JSON.stringify(\n+${javascriptPayload}\n+  ),\n+});\n+\n+if (!response.ok) {\n+  throw new Error(\`APIPod request failed: \${response.status} \${await response.text()}\`);\n+}\n+\n+console.log(await response.json());`,
  };
  return Object.fromEntries(Object.entries(examples).map(([name, source]) => [name, source.replace(/^\+/gm, "")]));
}

function renderCodeTabs(route, json) {
  const examples = requestCodeExamples(route, json);
  return `<Tabs>\n+  <Tab title="cURL">\n+\n+\`\`\`bash\n+${examples.curl}\n+\`\`\`\n+\n+  </Tab>\n+  <Tab title="Python">\n+\n+\`\`\`python\n+${examples.python}\n+\`\`\`\n+\n+  </Tab>\n+  <Tab title="Go">\n+\n+\`\`\`go\n+${examples.go}\n+\`\`\`\n+\n+  </Tab>\n+  <Tab title="Rust">\n+\n+\`\`\`rust\n+${examples.rust}\n+\`\`\`\n+\n+  </Tab>\n+  <Tab title="JavaScript">\n+\n+\`\`\`javascript\n+${examples.javascript}\n+\`\`\`\n+\n+  </Tab>\n+</Tabs>`.replace(/^\+/gm, "");
}

function pageBodyWithInlineApiReference(page, language, spec) {
  const p = profile(page);
  const found = operation(spec);
  const requestSchema = currentRequestSchema(page, resolve(spec, found.op.requestBody?.content?.["application/json"]?.schema));
  const response = Object.entries(found.op.responses || {}).find(([code]) => /^2/.test(code))?.[1];
  const responseSchema = resolve(spec, response?.content?.["application/json"]?.schema);
  const example = requestExample(requestSchema, spec, page);
  const json = JSON.stringify(example, null, 2);
  const curl = `curl https://api.apipod.ai${found.route} \\\n  -H "Authorization: Bearer $APIPOD_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '${json}'`;
  const zh = language === "zh";
  const query = localizedPagePath(language, found.route.includes("images") ? "query-image-task" : "query-video-task");
  const conditions = [];
  if (page.slug.endsWith("/grok-imagine-i2v")) conditions.push(zh ? "`image_url`/`image_urls` 与 `task_id` 二选一；两种来源不能同时使用。`index` 仅可与 `task_id` 一起使用。" : "Provide either `image_url`/`image_urls` or `task_id`, but not both. `index` is valid only with `task_id`.");
  if (page.slug.includes("reference-to-video") || page.slug.endsWith("minimax-h3-r2v")) conditions.push(zh ? "必须至少提供一种参考素材；图片、视频和音频的数量上限以参数表为准。" : "Provide at least one reference asset. The per-media limits are listed in the table.");
  if (page.slug.endsWith("gemini-omni-r2v")) conditions.push(zh ? "必须提供 1–5 张参考图。" : "Provide between one and five reference images.");
  const conditionBlock = conditions.length ? `\n\n<Warning title=${JSON.stringify(zh ? "条件校验" : "Conditional validation")}>${conditions.join(" ")}</Warning>` : "";
  return `---\ntitle: ${JSON.stringify(page.title)}\ndescription: ${JSON.stringify(metaDescription(p[language]))}\n---\n\n**${zh ? "接口" : "Endpoint"}:** \`${found.method.toUpperCase()} ${found.route}\`\n\n${p[language]}\n\n<Note>${zh ? "以下参数边界以当前 APIPod 项目中的 CUE 校验和适配器实现为准；上游模型可能支持更多能力，但未必已通过本公开模型 ID 开放。" : "The limits below follow APIPod's current CUE validation and adapter implementation. An upstream model may support additional features that are not exposed by this public model ID."}</Note>\n\n## ${zh ? "请求体" : "Request body"}\n\n${fieldRows(requestSchema, spec, language)}${conditionBlock}\n\n## ${zh ? "JSON 请求示例" : "JSON request example"}\n\n\`\`\`json\n${json}\n\`\`\`\n\n## cURL\n\n\`\`\`bash\n${curl}\n\`\`\`\n\n## ${zh ? "响应体" : "Response body"}\n\n${fieldRows(responseSchema, spec, language)}\n\n<Card title=${JSON.stringify(zh ? "查询任务状态" : "Query task status")} icon="search" href="/${query}">${zh ? "使用创建接口返回的 task_id 查询进度和结果。" : "Use the task_id returned by the create endpoint to retrieve progress and results."}</Card>\n\n## ${zh ? "资料来源" : "Sources"}\n\n- [${p.source[0]}](${p.source[1]})\n- ${zh ? "APIPod 项目中的 CUE 请求规范、Go 业务校验与提供商适配器" : "APIPod CUE request specifications, Go validation, and provider adapters"}\n`;
}

function withMultiLanguageExamples(body, page, language, spec) {
  const found = operation(spec);
  const requestSchema = currentRequestSchema(page, resolve(spec, found.op.requestBody?.content?.["application/json"]?.schema));
  const json = JSON.stringify(requestExample(requestSchema, spec, page), null, 2);
  const replacement = language === "zh"
    ? `## JSON 请求体\n\n\`\`\`json\n${json}\n\`\`\`\n\n## 请求代码\n\n${renderCodeTabs(found.route, json)}\n\n## 响应体`
    : `## JSON request body\n\n\`\`\`json\n${json}\n\`\`\`\n\n## Request examples\n\n${renderCodeTabs(found.route, json)}\n\n## Response body`;
  return body.replace(
    /## (?:JSON 请求示例|JSON request example)[\s\S]*?## (?:响应体|Response body)/,
    replacement,
  );
}

function pageBody(page, language, spec) {
  const p = profile(page);
  const found = operation(spec);
  const zh = language === "zh";
  const introduction = modelIntroductionSections(p[language], language);
  const query = localizedPagePath(language, found.route.includes("images") ? "query-image-task" : "query-video-task");
  const conditions = [];
  if (page.slug.endsWith("/grok-imagine-i2v")) conditions.push(zh ? "`image_url`/`image_urls` 与 `task_id` 二选一；两种来源不能同时使用。`index` 仅可与 `task_id` 一起使用。" : "Provide either `image_url`/`image_urls` or `task_id`, but not both. `index` is valid only with `task_id`.");
  if (page.slug.includes("reference-to-video") || page.slug.endsWith("minimax-h3-r2v")) conditions.push(zh ? "必须至少提供一种参考素材；图片、视频和音频的数量上限以 API 参数定义为准。" : "Provide at least one reference asset. The per-media limits are defined by the API schema.");
  if (page.slug.endsWith("gemini-omni-r2v")) conditions.push(zh ? "必须提供 1–5 张参考图。" : "Provide between one and five reference images.");
  const conditionBlock = conditions.length ? `\n\n<Warning title=${JSON.stringify(zh ? "条件校验" : "Conditional validation")}>${conditions.join(" ")}</Warning>` : "";

  const support = introduction.support
    ? `## ${zh ? "APIPod 支持" : "APIPod support"}\n\n${introduction.support}`
    : "";
  return `---\ntitle: ${JSON.stringify(page.title)}\ndescription: ${JSON.stringify(introduction.summary)}\n---\n\n${support}${conditionBlock}\n\n<Card title=${JSON.stringify(zh ? "查询任务状态" : "Query task status")} icon="search" href="/${query}">${zh ? "使用创建接口返回的 task_id 查询进度和结果。" : "Use the task_id returned by the create endpoint to retrieve progress and results."}</Card>\n`;
}

function acceptedTaskSchema() {
  return objectSchema({
    code: integer("HTTP status code.", { const: 200 }),
    message: string("Response message.", { const: "success" }),
    data: objectSchema({
      task_id: string("Public APIPod task ID used for status queries."),
    }, ["task_id"]),
  }, ["code", "message", "data"]);
}

function statusResponseSchema(media) {
  const data = {
    task_id: string("Public APIPod task ID."),
    status: string("Public task status.", { enum: ["pending", "processing", "completed", "failed", "cancelled"] }),
    progress: integer("Completion progress when available.", { minimum: 0, maximum: 100 }),
    result: strings("Generated artifact URLs returned after completion."),
    completed_at: integer("Unix completion timestamp in seconds."),
  };
  if (media === "image") {
    data.error_code = string("Stable machine-readable asynchronous error code.");
    data.error_message = string("Client-safe asynchronous error message.");
  } else {
    data.error = string("Client-safe asynchronous error message.");
  }
  return objectSchema({
    code: integer("HTTP status code.", { const: 200 }),
    message: string("Response message.", { const: "success" }),
    data: objectSchema(data, ["task_id", "status"]),
  }, ["code", "message", "data"]);
}

function codeSamples(route, example) {
  const examples = requestCodeExamples(route, JSON.stringify(example, null, 2));
  return [
    { lang: "Shell", label: "cURL", source: examples.curl },
    { lang: "Python", label: "Python", source: examples.python },
    { lang: "Go", label: "Go", source: examples.go },
    { lang: "Rust", label: "Rust", source: examples.rust },
    { lang: "JavaScript", label: "JavaScript", source: examples.javascript },
  ];
}

function mintlifyCreateSpec(page, sourceSpec, language) {
  const found = operation(sourceSpec);
  const requestSchema = currentRequestSchema(page, resolve(sourceSpec, found.op.requestBody?.content?.["application/json"]?.schema));
  const example = requestExample(requestSchema, sourceSpec, page);
  const media = found.route.includes("images") ? "image" : "video";
  const taskID = media === "image" ? "img_task_01JEXAMPLE" : "vid_task_01JEXAMPLE";
  const zh = language === "zh";
  return {
    openapi: "3.1.0",
    info: { title: `${page.title} API`, version: "1.0.0", description: profile(page)[language] },
    servers: [{ url: "https://api.apipod.ai", description: zh ? "生产环境" : "Production" }],
    paths: {
      [found.route]: {
        [found.method]: {
          summary: zh ? "创建生成任务" : "Create Generation Task",
          description: profile(page)[language],
          operationId: `create-${page.slug.replaceAll("/", "-")}`,
          tags: [page.title],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: { "application/json": { schema: localizedSchema(requestSchema, language), example } },
          },
          responses: {
            "200": {
              description: zh ? "任务已受理" : "Task accepted",
              content: {
                "application/json": {
                  schema: localizedSchema(acceptedTaskSchema(), language, "response"),
                  example: { code: 200, message: "success", data: { task_id: taskID } },
                },
              },
            },
          },
          "x-codeSamples": codeSamples(found.route, example),
        },
      },
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "APIPod API key",
          description: zh ? "在 Authorization 请求头中使用 Bearer APIPod_API_KEY。" : "Use your APIPod API key as a Bearer token in the Authorization header.",
        },
      },
    },
  };
}

function mintlifyQuerySpec(page, sourceSpec, language) {
  const found = operation(sourceSpec);
  const media = page.slug.includes("image") ? "image" : "video";
  const taskID = media === "image" ? "img_task_01JEXAMPLE" : "vid_task_01JEXAMPLE";
  const resultURL = media === "image" ? "https://cdn.example.com/generated.png" : "https://cdn.example.com/generated.mp4";
  const zh = language === "zh";
  return {
    openapi: "3.1.0",
    info: { title: `${zh ? (media === "image" ? "查询图片任务" : "查询视频任务") : page.title} API`, version: "1.0.0" },
    servers: [{ url: "https://api.apipod.ai", description: zh ? "生产环境" : "Production" }],
    paths: {
      [found.route]: {
        [found.method]: {
          summary: zh ? "查询生成任务" : "Get Generation Task",
          operationId: `get-${page.slug}`,
          tags: [zh ? (media === "image" ? "图片任务" : "视频任务") : (media === "image" ? "Image tasks" : "Video tasks")],
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "task_id", in: "path", required: true, description: zh ? "创建接口返回的 APIPod 异步任务 ID。" : "APIPod asynchronous task ID returned by the create endpoint.", schema: { type: "string" }, example: taskID }],
          responses: {
            "200": {
              description: zh ? "任务状态" : "Task status",
              content: {
                "application/json": {
                  schema: localizedSchema(statusResponseSchema(media), language, "response"),
                  example: { code: 200, message: "success", data: { task_id: taskID, status: "completed", progress: 100, result: [resultURL], completed_at: 1786358400 } },
                },
              },
            },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "APIPod API key",
          description: zh ? "在 Authorization 请求头中使用 Bearer APIPod_API_KEY。" : "Use your APIPod API key as a Bearer token in the Authorization header.",
        },
      },
    },
  };
}

const mintlifySpecDir = path.join(root, "api-reference/openapi");
await fs.mkdir(mintlifySpecDir, { recursive: true });

async function readSourceSpec(slug) {
  const basename = slug.replaceAll("/", "--");
  for (const candidate of [
    path.join(root, "api-reference/specs", `${basename}.yaml.txt`),
    path.join(root, "api-reference/openapi", `${basename}.yaml`),
  ]) {
    try {
      return YAML.parse(await fs.readFile(candidate, "utf8"));
    } catch {
      // Try the normalized OpenAPI source when a legacy raw snapshot is absent.
    }
  }
  throw new Error(`Source OpenAPI snapshot missing for ${slug}`);
}

for (const page of manifest.pages.filter((item) => item.schema && !item.slug.startsWith("query-"))) {
  const spec = await readSourceSpec(page.slug);
  const found = operation(spec);
  const mintlifySpecName = `${page.slug.replaceAll("/", "--")}.yaml`;
  const zhMintlifySpecName = mintlifySpecName.replace(/\.yaml$/, ".zh.yaml");
  await fs.writeFile(path.join(mintlifySpecDir, mintlifySpecName), YAML.stringify(mintlifyCreateSpec(page, spec, "en")));
  await fs.writeFile(path.join(mintlifySpecDir, zhMintlifySpecName), YAML.stringify(mintlifyCreateSpec(page, spec, "zh")));
  const addOpenAPI = (source, specName) => {
    const openapiTarget = `api-reference/openapi/${specName} ${found.method.toUpperCase()} ${found.route}`;
    return source.replace(/^description: .*$/m, `$&\nopenapi: ${JSON.stringify(openapiTarget)}`);
  };
  await fs.mkdir(path.dirname(path.join(root, `${page.slug}.mdx`)), { recursive: true });
  await fs.mkdir(path.dirname(path.join(root, `zh-CN/${page.slug}.mdx`)), { recursive: true });
  await fs.writeFile(path.join(root, `${page.slug}.mdx`), addOpenAPI(pageBody(page, "en", spec), mintlifySpecName));
  await fs.writeFile(path.join(root, `zh-CN/${page.slug}.mdx`), addOpenAPI(pageBody(page, "zh", spec), zhMintlifySpecName));
}

function queryPageWithInlineApiReference(page, language, spec) {
  const found = operation(spec);
  const response = Object.entries(found.op.responses || {}).find(([code]) => /^2/.test(code))?.[1];
  const responseSchema = resolve(spec, response?.content?.["application/json"]?.schema);
  const zh = language === "zh";
  const media = page.slug.includes("image") ? (zh ? "图片" : "image") : (zh ? "视频" : "video");
  const exampleTask = page.slug.includes("image") ? "img_task_01JEXAMPLE" : "vid_task_01JEXAMPLE";
  return `---\ntitle: ${JSON.stringify(zh ? `查询${media}任务` : `Query ${media} task`)}\ndescription: ${JSON.stringify(zh ? `使用 task_id 查询异步${media}生成任务的状态、进度、结果和错误信息。` : `Retrieve status, progress, results, and errors for an asynchronous ${media} generation task by task_id.`)}\n---\n\n**${zh ? "接口" : "Endpoint"}:** \`GET ${found.route}\`\n\n${zh ? `创建${media}任务后，使用响应中的 \`task_id\` 调用本接口。任务完成前可以按合理间隔轮询；生产环境优先在创建请求中设置 \`callback_url\`。` : `After creating a ${media} task, call this endpoint with the returned \`task_id\`. Poll at a reasonable interval until the task reaches a terminal state; for production workloads, prefer \`callback_url\` on the create request.`}\n\n## ${zh ? "路径参数" : "Path parameter"}\n\n| ${zh ? "字段" : "Field"} | ${zh ? "类型" : "Type"} | ${zh ? "必填" : "Required"} | ${zh ? "说明" : "Description"} |\n| --- | --- | --- | --- |\n| \`task_id\` | \`string\` | ${zh ? "是" : "Yes"} | ${zh ? "创建接口返回的异步任务 ID。" : "Asynchronous task ID returned by the create endpoint."} |\n\n## cURL\n\n\`\`\`bash\ncurl https://api.apipod.ai${found.route.replace("{task_id}", exampleTask)} \\\n  -H "Authorization: Bearer $APIPOD_API_KEY"\n\`\`\`\n\n## ${zh ? "任务状态" : "Task statuses"}\n\n| \`status\` | ${zh ? "含义" : "Meaning"} | ${zh ? "建议动作" : "Recommended action"} |\n| --- | --- | --- |\n| \`pending\` | ${zh ? "任务正在排队。" : "The task is queued."} | ${zh ? "继续等待或轮询。" : "Wait and poll again."} |\n| \`processing\` | ${zh ? "提供商正在生成。" : "The provider is generating the result."} | ${zh ? "继续等待或轮询。" : "Wait and poll again."} |\n| \`completed\` | ${zh ? "任务完成，结果位于 \`data.result\`。" : "The task completed; outputs are in \`data.result\`."} | ${zh ? "下载并持久化结果。" : "Download and persist the outputs."} |\n| \`failed\` | ${zh ? "任务失败。" : "The task failed."} | ${zh ? "检查错误字段和请求日志。" : "Inspect the error fields and request log."} |\n| \`cancelled\` | ${zh ? "任务已取消。" : "The task was cancelled."} | ${zh ? "停止轮询。" : "Stop polling."} |\n\n## ${zh ? "响应体" : "Response body"}\n\n${fieldRows(responseSchema, spec, language)}\n\n## ${zh ? "完成响应示例" : "Completed response example"}\n\n\`\`\`json\n{\n  "code": 200,\n  "message": "success",\n  "data": {\n    "task_id": "${exampleTask}",\n    "status": "completed",\n    "progress": 100,\n    "result": [\n      "https://cdn.example.com/generated.${page.slug.includes("image") ? "png" : "mp4"}"\n    ]\n  }\n}\n\`\`\`\n`;
}

function queryPage(page, language) {
  const zh = language === "zh";
  const media = page.slug.includes("image") ? (zh ? "图片" : "image") : (zh ? "视频" : "video");
  return `---\ntitle: ${JSON.stringify(zh ? `查询${media}任务` : `Query ${media} task`)}\ndescription: ${JSON.stringify(zh ? `使用 task_id 查询异步${media}生成任务的状态、进度、结果和错误信息。` : `Retrieve status, progress, results, and errors for an asynchronous ${media} generation task by task_id.`)}\n---\n\n${zh ? `创建${media}任务后，使用响应中的 \`task_id\` 调用本接口。任务完成前可以按合理间隔轮询；生产环境优先在创建请求中设置 \`callback_url\`。` : `After creating a ${media} task, call this endpoint with the returned \`task_id\`. Poll at a reasonable interval until the task reaches a terminal state; for production workloads, prefer \`callback_url\` on the create request.`}\n\n## ${zh ? "任务状态" : "Task statuses"}\n\n| \`status\` | ${zh ? "含义" : "Meaning"} | ${zh ? "建议动作" : "Recommended action"} |\n| --- | --- | --- |\n| \`pending\` | ${zh ? "任务正在排队。" : "The task is queued."} | ${zh ? "继续等待或轮询。" : "Wait and poll again."} |\n| \`processing\` | ${zh ? "提供商正在生成。" : "The provider is generating the result."} | ${zh ? "继续等待或轮询。" : "Wait and poll again."} |\n| \`completed\` | ${zh ? "任务完成，结果位于 \`data.result\`。" : "The task completed; outputs are in \`data.result\`."} | ${zh ? "下载并持久化结果。" : "Download and persist the outputs."} |\n| \`failed\` | ${zh ? "任务失败。" : "The task failed."} | ${zh ? "检查错误字段和请求日志。" : "Inspect the error fields and request log."} |\n| \`cancelled\` | ${zh ? "任务已取消。" : "The task was cancelled."} | ${zh ? "停止轮询。" : "Stop polling."} |\n`;
}

for (const page of manifest.pages.filter((item) => item.slug.startsWith("query-"))) {
  const spec = await readSourceSpec(page.slug);
  const found = operation(spec);
  const mintlifySpecName = `${page.slug}.yaml`;
  const zhMintlifySpecName = mintlifySpecName.replace(/\.yaml$/, ".zh.yaml");
  await fs.writeFile(path.join(mintlifySpecDir, mintlifySpecName), YAML.stringify(mintlifyQuerySpec(page, spec, "en")));
  await fs.writeFile(path.join(mintlifySpecDir, zhMintlifySpecName), YAML.stringify(mintlifyQuerySpec(page, spec, "zh")));
  const addOpenAPI = (source, specName) => {
    const openapiTarget = `api-reference/openapi/${specName} ${found.method.toUpperCase()} ${found.route}`;
    return source.replace(/^description: .*$/m, `$&\nopenapi: ${JSON.stringify(openapiTarget)}`);
  };
  await fs.mkdir(path.dirname(path.join(root, `${page.slug}.mdx`)), { recursive: true });
  await fs.mkdir(path.dirname(path.join(root, `zh-CN/${page.slug}.mdx`)), { recursive: true });
  await fs.writeFile(path.join(root, `${page.slug}.mdx`), addOpenAPI(queryPage(page, "en", spec), mintlifySpecName));
  await fs.writeFile(path.join(root, `zh-CN/${page.slug}.mdx`), addOpenAPI(queryPage(page, "zh", spec), zhMintlifySpecName));
}

const modelPageCount = manifest.pages.filter((item) => item.schema && !item.slug.startsWith("query-")).length;
const taskPageCount = manifest.pages.filter((item) => item.slug.startsWith("query-")).length;
console.log(`Enhanced ${modelPageCount} model pages and ${taskPageCount} task-query pages with localized English and Simplified Chinese OpenAPI sources.`);
