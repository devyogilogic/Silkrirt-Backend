const PageSeo = require('../models/PageSeo');
const { seedAllExisting } = require('../utils/seoSync');

// @desc    Get SEO by path (public - for frontend SSR)
// @access  Public
const getSeoByPath = async (req, res) => {
    try {
        let path = req.query.path || '';
        path = (path || '').trim().toLowerCase();
        if (!path) {
            return res.status(400).json({
                success: false,
                message: 'Path is required'
            });
        }
        // Normalize: ensure leading slash, no trailing (except for root)
        if (!path.startsWith('/')) path = '/' + path;
        if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);

        const seo = await PageSeo.findOne({ path, isActive: true });
        if (!seo) {
            return res.json({
                success: true,
                data: { seo: null }
            });
        }

        const payload = {
            path: seo.path,
            title: seo.title,
            description: seo.description,
            jsonLd: seo.jsonLd ? (typeof seo.jsonLd === 'string' ? seo.jsonLd : JSON.stringify(seo.jsonLd)) : null,
            ogTitle: seo.ogTitle,
            ogDescription: seo.ogDescription,
            ogImage: seo.ogImage,
            ogType: seo.ogType,
            ogSiteName: seo.ogSiteName,
            ogLocale: seo.ogLocale,
            twitterCard: seo.twitterCard,
            twitterTitle: seo.twitterTitle,
            twitterDescription: seo.twitterDescription,
            twitterImage: seo.twitterImage,
            twitterSite: seo.twitterSite,
            twitterCreator: seo.twitterCreator,
            canonicalUrl: seo.canonicalUrl,
            robotsNoindex: seo.robotsNoindex,
            robotsNofollow: seo.robotsNofollow
        };

        res.json({
            success: true,
            data: { seo: payload }
        });
    } catch (error) {
        console.error('Get SEO by path error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get SEO'
        });
    }
};

// @desc    Get all SEO entries (admin)
// @access  Private
const getAllSeo = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;
        const search = (req.query.search || '').trim();
        const routeType = (req.query.routeType || '').trim();

        let query = {};
        if (routeType && ['static', 'category', 'product', 'blog'].includes(routeType)) {
            query.routeType = routeType;
        }
        if (search) {
            query.$or = [
                { path: { $regex: search, $options: 'i' } },
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { label: { $regex: search, $options: 'i' } }
            ];
        }

        const [items, total] = await Promise.all([
            PageSeo.find(query).sort({ routeType: 1, path: 1 }).skip(skip).limit(limit).lean(),
            PageSeo.countDocuments(query)
        ]);

        res.json({
            success: true,
            data: {
                items,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit),
                    hasNext: page * limit < total,
                    hasPrev: page > 1
                }
            }
        });
    } catch (error) {
        console.error('Get all SEO error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get SEO list'
        });
    }
};

// @desc    Get single SEO by ID (admin)
// @access  Private
const getSeoById = async (req, res) => {
    try {
        const seo = await PageSeo.findById(req.params.id);
        if (!seo) {
            return res.status(404).json({
                success: false,
                message: 'SEO entry not found'
            });
        }
        res.json({
            success: true,
            data: { seo }
        });
    } catch (error) {
        console.error('Get SEO by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get SEO'
        });
    }
};

// @desc    Create SEO entry (admin)
// @access  Private
const createSeo = async (req, res) => {
    try {
        let path = (req.body.path || '').trim().toLowerCase();
        if (!path) {
            return res.status(400).json({
                success: false,
                message: 'Path is required'
            });
        }
        if (!path.startsWith('/')) path = '/' + path;
        if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);

        const existing = await PageSeo.findOne({ path });
        if (existing) {
            return res.status(400).json({
                success: false,
                message: 'SEO for this path already exists'
            });
        }

        const seo = await PageSeo.create({
            path,
            title: req.body.title,
            description: req.body.description,
            jsonLd: req.body.jsonLd,
            ogTitle: req.body.ogTitle,
            ogDescription: req.body.ogDescription,
            ogImage: req.body.ogImage,
            ogType: req.body.ogType || 'website',
            ogSiteName: req.body.ogSiteName,
            ogLocale: req.body.ogLocale || 'en_IN',
            twitterCard: req.body.twitterCard || 'summary_large_image',
            twitterTitle: req.body.twitterTitle,
            twitterDescription: req.body.twitterDescription,
            twitterImage: req.body.twitterImage,
            twitterSite: req.body.twitterSite,
            twitterCreator: req.body.twitterCreator,
            canonicalUrl: req.body.canonicalUrl,
            robotsNoindex: !!req.body.robotsNoindex,
            robotsNofollow: !!req.body.robotsNofollow,
            isActive: req.body.isActive !== false
        });

        res.status(201).json({
            success: true,
            data: { seo },
            message: 'SEO created'
        });
    } catch (error) {
        console.error('Create SEO error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to create SEO'
        });
    }
};

// @desc    Update SEO entry (admin)
// @access  Private
const updateSeo = async (req, res) => {
    try {
        const seo = await PageSeo.findById(req.params.id);
        if (!seo) {
            return res.status(404).json({
                success: false,
                message: 'SEO entry not found'
            });
        }

        const updates = {};
        const allowed = [
            'path', 'title', 'description', 'jsonLd',
            'ogTitle', 'ogDescription', 'ogImage', 'ogType', 'ogSiteName', 'ogLocale',
            'twitterCard', 'twitterTitle', 'twitterDescription', 'twitterImage', 'twitterSite', 'twitterCreator',
            'canonicalUrl', 'robotsNoindex', 'robotsNofollow', 'isActive'
        ];
        allowed.forEach(f => {
            if (req.body[f] !== undefined) updates[f] = req.body[f];
        });

        if (updates.path) {
            updates.path = updates.path.trim().toLowerCase();
            if (!updates.path.startsWith('/')) updates.path = '/' + updates.path;
            if (updates.path.length > 1 && updates.path.endsWith('/')) updates.path = updates.path.slice(0, -1);
            const existing = await PageSeo.findOne({ path: updates.path, _id: { $ne: req.params.id } });
            if (existing) {
                return res.status(400).json({
                    success: false,
                    message: 'Another SEO entry already uses this path'
                });
            }
        }

        Object.assign(seo, updates);
        await seo.save();

        res.json({
            success: true,
            data: { seo },
            message: 'SEO updated'
        });
    } catch (error) {
        console.error('Update SEO error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to update SEO'
        });
    }
};

// @desc    Delete SEO entry (admin)
// @access  Private
const deleteSeo = async (req, res) => {
    try {
        const seo = await PageSeo.findByIdAndDelete(req.params.id);
        if (!seo) {
            return res.status(404).json({
                success: false,
                message: 'SEO entry not found'
            });
        }
        res.json({
            success: true,
            message: 'SEO deleted'
        });
    } catch (error) {
        console.error('Delete SEO error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete SEO'
        });
    }
};

const seedRoutes = async (req, res) => {
    try {
        await seedAllExisting();
        const total = await PageSeo.countDocuments();
        res.json({ success: true, message: 'SEO routes synced', total });
    } catch (error) {
        console.error('Seed SEO routes error:', error);
        res.status(500).json({ success: false, message: 'Failed to seed routes' });
    }
};

module.exports = {
    getSeoByPath,
    getAllSeo,
    getSeoById,
    createSeo,
    updateSeo,
    deleteSeo,
    seedRoutes
};
