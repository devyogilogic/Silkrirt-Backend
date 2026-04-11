const PageSeo = require('../models/PageSeo');

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
    let s = (p || '').trim().toLowerCase();
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
    if (!category || !category.collectionTitle) return;
    const path = normalizePath(`/collections/${encodeURIComponent(category.collectionTitle)}`);
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
}

async function removeCategoryRoute(category) {
    if (!category || !category.collectionTitle) return;
    const path = normalizePath(`/collections/${encodeURIComponent(category.collectionTitle)}`);
    await PageSeo.findOneAndUpdate({ path, routeType: 'category' }, { $set: { isActive: false } });
}

async function upsertProductRoute(product) {
    if (!product || !product._id) return;
    const path = normalizePath(`/product/${product._id}`);
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
}

async function removeProductRoute(productId) {
    const path = normalizePath(`/product/${productId}`);
    await PageSeo.findOneAndUpdate({ path, routeType: 'product' }, { $set: { isActive: false } });
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
    const Product = require('../models/Product');
    const Blog = require('../models/Blog');

    await seedStaticRoutes();

    const categories = await Category.find({ isActive: true });
    for (const cat of categories) {
        await upsertCategoryRoute(cat);
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
    upsertProductRoute,
    removeProductRoute,
    upsertBlogRoute,
    removeBlogRoute,
};
