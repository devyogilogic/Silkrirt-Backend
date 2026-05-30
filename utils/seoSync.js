const PageSeo = require('../models/PageSeo');
const UrlRedirect = require('../models/UrlRedirect');

const STATIC_ROUTES = [
    { path: '/', label: 'Home' },
    { path: '/about', label: 'About' },
    { path: '/collections', label: 'All Collections' },
    { path: '/blogs', label: 'Blog Listing' },
    { path: '/cart', label: 'Cart' },
    { path: '/auth', label: 'Login / Register' },
    { path: '/wishlist', label: 'Wishlist' },
    { path: '/privacy-policy', label: 'Privacy Policy' },
    { path: '/terms-and-conditions', label: 'Terms & Conditions' },
    { path: '/returns-policy', label: 'Returns Policy' },
];

function normalizePath(p) {
    let s = (p || '').trim();
    try {
        s = decodeURIComponent(s);
    } catch (e) {
        /* ignore */
    }
    s = s.toLowerCase();
    if (!s.startsWith('/')) s = '/' + s;
    if (s.length > 1 && s.endsWith('/')) s = s.slice(0, -1);
    return s;
}

async function seedStaticRoutes() {
    for (const route of STATIC_ROUTES) {
        const path = normalizePath(route.path);
        await PageSeo.findOneAndUpdate(
            { path },
            { $setOnInsert: { path, routeType: 'static', label: route.label, isActive: true } },
            { upsert: true, new: true }
        );
    }
}

async function upsertCategoryRoute(category) {
    if (!category || !category.slug) return;
    const path = normalizePath(`/${category.slug}`);
    await PageSeo.findOneAndUpdate(
        { path },
        {
            $set: {
                routeType: 'category',
                sourceId: category._id,
                label: category.collectionName || category.collectionTitle,
                isActive: category.isActive !== false,
            },
            $setOnInsert: { path },
        },
        { upsert: true, new: true }
    );

    if (category.collectionTitle) {
        const legacy = normalizePath(`/collections/${category.collectionTitle}`);
        await UrlRedirect.findOneAndUpdate(
            { fromPath: legacy },
            { $set: { toPath: path, permanent: true, note: 'collection title URL → slug' } },
            { upsert: true, new: true }
        );
    }
}

async function removeCategoryRoute(category) {
    if (!category || !category.slug) return;
    const path = normalizePath(`/${category.slug}`);
    await PageSeo.findOneAndUpdate({ path, routeType: 'category' }, { $set: { isActive: false } });
}

async function upsertSubCollectionRoute(sub) {
    if (!sub || !sub.slug) return;
    const path = normalizePath(`/${sub.slug}`);
    await PageSeo.findOneAndUpdate(
        { path },
        {
            $set: {
                routeType: 'subcategory',
                sourceId: sub._id,
                label: sub.name,
                isActive: sub.isActive !== false,
            },
            $setOnInsert: { path },
        },
        { upsert: true, new: true }
    );
}

async function removeSubCollectionRoute(sub) {
    if (!sub || !sub.slug) return;
    const path = normalizePath(`/${sub.slug}`);
    await PageSeo.findOneAndUpdate({ path, routeType: 'subcategory' }, { $set: { isActive: false } });
}

async function upsertProductRoute(product) {
    if (!product || !product._id || !product.slug) return;
    const path = normalizePath(`/${product.slug}`);
    await PageSeo.findOneAndUpdate(
        { path },
        {
            $set: {
                routeType: 'product',
                sourceId: product._id,
                label: product.productTitle || `Product ${product._id}`,
                isActive: product.isActive !== false,
            },
            $setOnInsert: { path },
        },
        { upsert: true, new: true }
    );

    const legacyIdPath = normalizePath(`/product/${product._id}`);
    await UrlRedirect.findOneAndUpdate(
        { fromPath: legacyIdPath },
        { $set: { toPath: path, permanent: true, note: 'product id URL → slug' } },
        { upsert: true, new: true }
    );
}

async function removeProductRoute(productOrId) {
    const Product = require('../models/Product');
    const mongoose = require('mongoose');
    let prod = productOrId;
    if (!prod || typeof prod === 'string' || prod instanceof mongoose.Types.ObjectId) {
        const id = prod || productOrId;
        prod = await Product.findById(id).select('slug').lean();
    } else if (prod && prod._id && !prod.slug) {
        prod = await Product.findById(prod._id).select('slug').lean();
    }

    if (prod && prod.slug) {
        const path = normalizePath(`/${prod.slug}`);
        await PageSeo.findOneAndUpdate({ path, routeType: 'product' }, { $set: { isActive: false } });
    }
    const id = prod && prod._id ? prod._id : productOrId;
    if (id) {
        const legacyIdPath = normalizePath(`/product/${id}`);
        await UrlRedirect.findOneAndUpdate(
            { fromPath: legacyIdPath },
            { $set: { toPath: '/', permanent: false, note: 'product removed' } },
            { upsert: true, new: true }
        );
    }
}

async function upsertBlogRoute(blog) {
    if (!blog || !blog.slug) return;
    const path = normalizePath(`/blogs/${blog.slug}`);
    await PageSeo.findOneAndUpdate(
        { path },
        {
            $set: {
                routeType: 'blog',
                sourceId: blog._id,
                label: blog.title || blog.slug,
                isActive: blog.status === 'published',
            },
            $setOnInsert: { path },
        },
        { upsert: true, new: true }
    );
}

async function removeBlogRoute(blog) {
    if (!blog || !blog.slug) return;
    const path = normalizePath(`/blogs/${blog.slug}`);
    await PageSeo.findOneAndUpdate({ path, routeType: 'blog' }, { $set: { isActive: false } });
}

async function seedAllExisting() {
    const Category = require('../models/Category');
    const SubCollection = require('../models/SubCollection');
    const Product = require('../models/Product');
    const Blog = require('../models/Blog');

    await seedStaticRoutes();

    const categories = await Category.find({ isActive: true });
    for (const cat of categories) {
        await upsertCategoryRoute(cat);
    }

    const subs = await SubCollection.find({ isActive: true });
    for (const s of subs) {
        await upsertSubCollectionRoute(s);
    }

    const products = await Product.find({ isActive: true });
    for (const prod of products) {
        await upsertProductRoute(prod);
    }

    const blogs = await Blog.find({ status: 'published' });
    for (const blog of blogs) {
        await upsertBlogRoute(blog);
    }
}

module.exports = {
    STATIC_ROUTES,
    normalizePath,
    seedStaticRoutes,
    seedAllExisting,
    upsertCategoryRoute,
    removeCategoryRoute,
    upsertSubCollectionRoute,
    removeSubCollectionRoute,
    upsertProductRoute,
    removeProductRoute,
    upsertBlogRoute,
    removeBlogRoute,
};
