const { slugify } = require('./slugify');

/** Single-path segments reserved for app routes and Next.js */
const RESERVED_ROOT_SLUGS = new Set([
    'api', '_next', 'static', 'favicon.ico', 'robots.txt', 'sitemap.xml',
    'blogs', 'blog', 'cart', 'auth', 'wishlist', 'collections', 'product',
    'about', 'contact', 'privacy-policy', 'terms-and-conditions', 'returns-policy',
    'dashboard', 'admin', 'login', 'register', 'search', 'health',
]);

function normalizeRootSlug(input) {
    const s = slugify(String(input || ''));
    return s || 'item';
}

/**
 * Returns true if slug is taken by another entity (global namespace for root URLs).
 * @param {string} slug
 * @param {{ categoryId?: import('mongoose').Types.ObjectId, subCollectionId?: import('mongoose').Types.ObjectId, productId?: import('mongoose').Types.ObjectId }} exclude
 */
async function isRootSlugTaken(slug, exclude = {}) {
    if (!slug || RESERVED_ROOT_SLUGS.has(slug)) return true;

    const Category = require('../models/Category');
    const SubCollection = require('../models/SubCollection');
    const Product = require('../models/Product');
    const PageSeo = require('../models/PageSeo');
    const Blog = require('../models/Blog');

    const cQ = { slug };
    if (exclude.categoryId) cQ._id = { $ne: exclude.categoryId };
    if (await Category.findOne(cQ).lean()) return true;

    const sQ = { slug };
    if (exclude.subCollectionId) sQ._id = { $ne: exclude.subCollectionId };
    if (await SubCollection.findOne(sQ).lean()) return true;

    const pQ = { slug };
    if (exclude.productId) pQ._id = { $ne: exclude.productId };
    if (await Product.findOne(pQ).lean()) return true;

    const path = `/${slug}`;
    const page = await PageSeo.findOne({ path, isActive: true }).lean();
    if (page) return true;

    const blog = await Blog.findOne({ slug, status: 'published' }).lean();
    if (blog) return true;

    return false;
}

/**
 * @param {string} baseSlug
 * @param {{ categoryId?: import('mongoose').Types.ObjectId, subCollectionId?: import('mongoose').Types.ObjectId, productId?: import('mongoose').Types.ObjectId }} exclude
 * @param {{ mode?: 'suffix' | 'error' }} options
 * @returns {Promise<string>}
 */
async function allocateRootSlug(baseSlug, exclude = {}, options = {}) {
    const mode = options.mode || process.env.SLUG_COLLISION_MODE || 'suffix';
    let candidate = normalizeRootSlug(baseSlug);
    if (await isRootSlugTaken(candidate, exclude)) {
        if (mode === 'error') {
            const err = new Error(`Slug "${candidate}" is already in use`);
            err.code = 'SLUG_CONFLICT';
            throw err;
        }
        let n = 1;
        let next = `${candidate}-${n}`;
        while (await isRootSlugTaken(next, exclude)) {
            n += 1;
            next = `${candidate}-${n}`;
            if (n > 1000) {
                const err = new Error('Could not allocate a unique slug');
                err.code = 'SLUG_EXHAUSTED';
                throw err;
            }
        }
        candidate = next;
    }
    return candidate;
}

module.exports = {
    RESERVED_ROOT_SLUGS,
    normalizeRootSlug,
    isRootSlugTaken,
    allocateRootSlug,
    slugify,
};
