# Subcollections, slugs, S3, and redirects — deployment notes

## Environment variables

**Backend (`.env`)**

- `MONGODB_URI` — unchanged.
- **S3 (optional):** If all four are set, category/product/subcollection image uploads use S3 instead of local disk:
  - `AWS_ACCESS_KEY_ID`
  - `AWS_SECRET_ACCESS_KEY`
  - `AWS_REGION`
  - `AWS_BUCKET`
- **Public URLs for uploaded files:** Set `AWS_PUBLIC_BASE_URL` to your CloudFront distribution or public bucket URL (no trailing slash). If omitted, URLs use the default virtual-hosted–style S3 URL.
- **Slug behaviour:** `SLUG_COLLISION_MODE=suffix` (default) auto-appends `-1`, `-2`, … across collections, subcollections, products, active `PageSeo` root paths, and published blogs. Use `SLUG_COLLISION_MODE=error` to fail instead.

**Frontend**

- `NEXT_PUBLIC_API_URL` — must point at the API root including `/api` (e.g. `https://api.silkriti.in/api`).
- Optional: extend `next.config.mjs` `images.remotePatterns` if you serve images from a new CDN host.

## Database (MongoDB)

Mongoose schema changes apply on deploy; **remove old unique indexes** if they still exist from prior versions (otherwise slug rewrites can fail at the DB layer):

```text
db.categories.dropIndex("slug_1")   // if duplicate key errors on slug
db.products.dropIndex("slug_1")     // if duplicate key errors on slug
```

## One-time data migration

After deploy, link existing products to a default subcollection per collection:

```bash
cd Backend/Silkrirt-Backend
npm run migrate:subs
```

Then re-seed SEO rows if needed (admin SEO tools or call `seedAllExisting` from a script).

## SEO / redirects

- New canonical paths: `/{collection-slug}`, `/{subcollection-slug}`, `/{product-slug}` (plus existing static pages and `/blogs/...`).
- `UrlRedirect` documents and `GET /api/public/legacy-redirect` support:
  - `/collections/{collectionTitle}` → `/{collection.slug}`
  - `/product/{mongoId}` → `/{product.slug}`
- Next.js storefront `middleware.ts` calls `legacy-redirect` for `/collections/*` and `/product/{24-char-id}`.

## New API surface (summary)

- `GET /api/categories/navigation` — mega menu tree (collections with `showInNavigation !== false` + subcollections).
- `GET /api/subcollections/...` — admin CRUD + reorder; public `GET /api/subcollections/by-collection/:collectionId`.
- `GET /api/public/resolve/:slug` — returns `collection` | `subcollection` | `product`.
- `GET /api/public/subcollection/:slug/products` — paginated products.
- `GET /api/public/legacy-redirect?path=...`
- `GET /api/products/public/slug/:slug`

## Testing checklist

1. Run migration; confirm every product has `subCollection` set.
2. Open `/{collection-slug}` — banner + subcollection grid; links work.
3. Open `/{subcollection-slug}` — products grid; pagination query params.
4. Open `/{product-slug}` — product detail (root URL).
5. Navbar: hover desktop mega menu; mobile expand subcollections.
6. Toggle **Show in navigation** on a collection — appears/disappears in nav; still listed on homepage sections if still returned by `/categories/active`.
7. Create product with **subcollection** in admin; storefront resolves slug.
8. With S3 env set, upload category/subcollection/product images — URLs are `https://...`; without S3, `/uploads/...` still works.
9. Hit old `/collections/...` and `/product/{id}` URLs — 301 to new paths.
10. Admin: create subcollection; reorder (API `POST /api/subcollections/reorder`).

## Known follow-ups (optional)

- Server-rendered metadata for `app/[slug]/page.tsx` (currently client-heavy): add a small server wrapper + `generateMetadata` using `resolve` + entity SEO fields.
- Image optimisation (Sharp/Lambda), responsive srcset, and stricter CDN cache headers.
- Full subcollection edit/delete UI in admin (list page is filter + create; extend as needed).
