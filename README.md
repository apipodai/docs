# APIPod Documentation

This repository contains the bilingual Mintlify documentation published at
[`https://docs.apipod.ai`](https://docs.apipod.ai). English is the default
language and lives at the repository root without a URL prefix. Simplified
Chinese content lives under `zh-CN/` and is published with the `/zh-CN` URL
prefix. Both languages use the same navigation and page structure.

## Development

Use Node.js 22 LTS, then install the locked project dependencies and run the
preview from this directory:

```bash
npm ci
npm run dev
```

View the preview at `http://localhost:3333`.

## Validation

Run the repository checks before opening a pull request:

```bash
npm run validate
```

The custom validator checks source coverage, bilingual page parity, navigation
targets, redirects, internal links, frontmatter, code fences, and translation
placeholder leaks.

With `npm run dev -- --port 3333` running, validate that the bilingual pages,
OpenAPI request schemas, code examples, and responses are present in rendered
HTML:

```bash
npm run validate:rendered
```

## Synchronizing model schemas

The initial content was migrated from the former Apidog-hosted site. Public
request and response contracts now come exclusively from the OpenAPI Schema
attached to each model in APIPod. CUE validation remains a backend safeguard;
it is not a documentation field source.

To refresh the checked-in legacy source while it remains available:

```bash
npm run sync
```

To discover the currently enabled asynchronous image and video models from a
local APIPod API (`http://localhost:8080` by default), fetch their public schemas,
and regenerate the bilingual pages, run:

```bash
npm run sync:live
```

Set `APIPOD_API_ORIGIN` when the API is running elsewhere. If a public model has
no active configured Schema, synchronization fails instead of inventing a
fallback contract. Configure the model Schema first, then rerun synchronization.

Use `npm run sync:resume` to continue after a transient network failure. The
migration manifest records exact sitemap coverage. Extracted OpenAPI fragments
are stored as `.yaml.txt` snapshots under `api-reference/specs/` for
traceability. The normalized OpenAPI 3.1 sources used by Mintlify's interactive
API Reference are generated under `api-reference/openapi/`. Normalization fixes
OpenAPI value types, injects the documented public model ID, localizes property
descriptions, and creates examples without changing configured fields, required
lists, enums, defaults, or limits.

## Publishing

Connect this repository from the Mintlify dashboard. Changes on the configured
production branch deploy automatically.

## Troubleshooting

- If the preview does not start, confirm `node --version` reports Node 22 and
  run `npm ci` again.
- If a page returns 404, run `node scripts/validate-docs.mjs` and verify its
  route is present in `docs.json`.
