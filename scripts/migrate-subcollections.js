/**
 * One-time migration: default SubCollection per Category + assign products.
 * Run from Backend/Silkrirt-Backend: node scripts/migrate-subcollections.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

const Category = require('../models/Category');
const SubCollection = require('../models/SubCollection');
const Product = require('../models/Product');
const { upsertSubCollectionRoute, upsertProductRoute, upsertCategoryRoute } = require('../utils/seoSync');

async function ensureDefaultSub(cat) {
    let sub = await SubCollection.findOne({ collection: cat._id, sortOrder: 0, name: `All ${cat.collectionName}` });
    if (!sub) {
        sub = await SubCollection.findOne({ collection: cat._id }).sort({ sortOrder: 1, createdAt: 1 });
    }
    if (!sub) {
        sub = new SubCollection({
            collection: cat._id,
            name: `All ${cat.collectionName}`,
            description: cat.introParagraph || '',
            imageUrl: cat.photoUrl || '',
            imageAlt: cat.photoAlt || '',
            seoMetaTitle: cat.seoMetaTitle || '',
            metaDescription: cat.metaDescription || '',
            sortOrder: 0,
            isActive: cat.isActive !== false,
        });
        await sub.save();
        await upsertSubCollectionRoute(sub);
        console.log('Created subcollection', sub.slug, '<-', cat.collectionName);
    }
    return sub;
}

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected');

    const categories = await Category.find({});
    for (const cat of categories) {
        await ensureDefaultSub(cat);
        await upsertCategoryRoute(cat);
    }

    const products = await Product.find({
        $or: [{ subCollection: { $exists: false } }, { subCollection: null }],
    });

    let updated = 0;
    for (const p of products) {
        const catId = Array.isArray(p.productCategories) && p.productCategories.length ? p.productCategories[0] : null;
        if (!catId) {
            console.warn('Skip product (no category):', p._id, p.sku);
            continue;
        }
        const cat = await Category.findById(catId);
        if (!cat) continue;
        const sub = await ensureDefaultSub(cat);
        p.subCollection = sub._id;
        await p.save();
        await upsertProductRoute(p);
        updated += 1;
    }

    console.log('Products linked to subcollections:', updated);
    await mongoose.disconnect();
}

run().catch((e) => {
    console.error(e);
    process.exit(1);
});
