const Category = require('../models/Category');
const SubCollection = require('../models/SubCollection');
const Product = require('../models/Product');
const UrlRedirect = require('../models/UrlRedirect');
const { normalizePath } = require('../utils/seoSync');

const categoryPopulate = 'collectionName collectionTitle slug photoUrl photoAlt introParagraph seoMetaTitle metaDescription showInNavigation navOrder isActive';
const subPopulate = {
    path: 'subCollection',
    select: 'name slug description imageUrl imageAlt seoMetaTitle metaDescription collection sortOrder',
    populate: { path: 'collection', select: categoryPopulate },
};

const resolveSlug = async (req, res) => {
    try {
        const raw = (req.params.slug || '').trim();
        if (!raw) return res.status(400).json({ success: false, message: 'Slug required' });

        const cat = await Category.findOne({ slug: raw.toLowerCase(), isActive: true }).select(categoryPopulate).lean();
        if (cat) {
            const subCollections = await SubCollection.find({ collection: cat._id, isActive: true })
                .sort({ sortOrder: 1, createdAt: 1 })
                .select('name slug description imageUrl imageAlt sortOrder')
                .lean();
            return res.json({
                success: true,
                data: { type: 'collection', collection: cat, subCollections },
            });
        }

        const sub = await SubCollection.findOne({ slug: raw.toLowerCase(), isActive: true })
            .populate('collection', categoryPopulate)
            .lean();
        if (sub) {
            return res.json({
                success: true,
                data: { type: 'subcollection', subCollection: sub },
            });
        }

        const product = await Product.findOne({ slug: raw.toLowerCase(), isActive: true })
            .populate('productCategories', categoryPopulate)
            .populate(subPopulate)
            .lean();

        if (product) {
            return res.json({
                success: true,
                data: { type: 'product', product },
            });
        }

        return res.status(404).json({ success: false, message: 'Not found' });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ success: false, message: 'Resolve failed' });
    }
};

const getProductsBySubSlug = async (req, res) => {
    try {
        const raw = (req.params.slug || '').trim();
        const sub = await SubCollection.findOne({ slug: raw.toLowerCase(), isActive: true })
            .populate('collection', categoryPopulate)
            .lean();
        if (!sub) return res.status(404).json({ success: false, message: 'Subcollection not found' });

        const page = parseInt(req.query.page, 10) || 1;
        const limit = Math.min(parseInt(req.query.limit, 10) || 24, 100);
        const skip = (page - 1) * limit;

        const [items, total] = await Promise.all([
            Product.find({ subCollection: sub._id, isActive: true })
                .populate('productCategories', categoryPopulate)
                .populate(subPopulate)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Product.countDocuments({ subCollection: sub._id, isActive: true }),
        ]);

        return res.json({
            success: true,
            data: {
                subCollection: sub,
                products: items,
                pagination: { page, limit, total, pages: Math.ceil(total / limit) },
            },
        });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ success: false, message: 'Failed to load products' });
    }
};

const legacyRedirect = async (req, res) => {
    try {
        const pathParam = req.query.path;
        if (!pathParam || typeof pathParam !== 'string') {
            return res.status(400).json({ success: false, message: 'path query required' });
        }
        const path = normalizePath(pathParam);

        const direct = await UrlRedirect.findOne({ fromPath: path }).lean();
        if (direct && direct.toPath) {
            return res.json({
                success: true,
                data: { toPath: direct.toPath, permanent: direct.permanent !== false },
            });
        }

        const productIdMatch = path.match(/^\/product\/([a-f0-9]{24})$/i);
        if (productIdMatch) {
            const p = await Product.findById(productIdMatch[1]).select('slug isActive').lean();
            if (p && p.isActive !== false && p.slug) {
                const toPath = normalizePath(`/${p.slug}`);
                return res.json({ success: true, data: { toPath, permanent: true } });
            }
        }

        const colMatch = path.match(/^\/collections\/(.+)$/i);
        if (colMatch) {
            const segment = colMatch[1];
            let decoded = segment;
            try {
                decoded = decodeURIComponent(segment);
            } catch (e) { /* ignore */ }

            const cat = await Category.findOne({
                isActive: true,
                $or: [
                    { collectionTitle: { $regex: new RegExp(`^${decoded.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
                    { slug: decoded.toLowerCase() },
                ],
            }).select('slug').lean();

            if (cat && cat.slug) {
                const toPath = normalizePath(`/${cat.slug}`);
                return res.json({ success: true, data: { toPath, permanent: true } });
            }
        }

        return res.json({ success: true, data: { toPath: null, permanent: false } });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ success: false, message: 'Redirect lookup failed' });
    }
};

module.exports = {
    resolveSlug,
    getProductsBySubSlug,
    legacyRedirect,
};
