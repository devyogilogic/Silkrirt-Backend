const mongoose = require('mongoose');

/**
 * PageSeo - SEO metadata per page/URL path
 * path: unique URL path (e.g. "/", "/collections", "/about", "/product/123")
 */
const pageSeoSchema = new mongoose.Schema({
    path: {
        type: String,
        required: [true, 'Path is required'],
        trim: true,
        unique: true,
        lowercase: true
    },
    routeType: {
        type: String,
        enum: ['static', 'category', 'subcategory', 'product', 'blog', 'cms'],
        default: 'static'
    },
    sourceId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null
    },
    label: {
        type: String,
        trim: true,
        maxlength: [200, 'Label cannot exceed 200 characters']
    },
    title: {
        type: String,
        trim: true,
        maxlength: [70, 'Title cannot exceed 70 characters']
    },
    description: {
        type: String,
        trim: true,
        maxlength: [160, 'Description cannot exceed 160 characters']
    },
    // application/ld+json - stored as string (JSON)
    jsonLd: {
        type: String,
        trim: true,
        validate: {
            validator: function (v) {
                if (!v || v.length === 0) return true;
                try {
                    JSON.parse(v);
                    return true;
                } catch (e) {
                    return false;
                }
            },
            message: 'jsonLd must be valid JSON'
        }
    },
    // Open Graph
    ogTitle: {
        type: String,
        trim: true,
        maxlength: [70, 'og:title cannot exceed 70 characters']
    },
    ogDescription: {
        type: String,
        trim: true,
        maxlength: [200, 'og:description cannot exceed 200 characters']
    },
    ogImage: {
        type: String,
        trim: true
    },
    ogType: {
        type: String,
        trim: true,
        default: 'website',
        enum: ['website', 'article', 'product', 'profile']
    },
    ogSiteName: {
        type: String,
        trim: true
    },
    ogLocale: {
        type: String,
        trim: true,
        default: 'en_IN'
    },
    // Twitter Card
    twitterCard: {
        type: String,
        trim: true,
        default: 'summary_large_image',
        enum: ['summary', 'summary_large_image', 'app', 'player']
    },
    twitterTitle: {
        type: String,
        trim: true,
        maxlength: [70, 'Twitter title cannot exceed 70 characters']
    },
    twitterDescription: {
        type: String,
        trim: true,
        maxlength: [200, 'Twitter description cannot exceed 200 characters']
    },
    twitterImage: {
        type: String,
        trim: true
    },
    twitterSite: {
        type: String,
        trim: true
    },
    twitterCreator: {
        type: String,
        trim: true
    },
    // Canonical and robots
    canonicalUrl: {
        type: String,
        trim: true
    },
    robotsNoindex: {
        type: Boolean,
        default: false
    },
    robotsNofollow: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

pageSeoSchema.index({ isActive: 1 });
pageSeoSchema.index({ routeType: 1 });
pageSeoSchema.index({ sourceId: 1 });

module.exports = mongoose.model('PageSeo', pageSeoSchema);
