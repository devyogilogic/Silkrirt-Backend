const mongoose = require('mongoose');
const { allocateRootSlug, slugify } = require('../utils/globalSlug');

const subCollectionSchema = new mongoose.Schema({
    collection: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: [true, 'Collection is required'],
    },
    name: {
        type: String,
        required: [true, 'Subcollection name is required'],
        trim: true,
        maxlength: [150, 'Name cannot exceed 150 characters'],
    },
    slug: {
        type: String,
        lowercase: true,
        trim: true,
    },
    /** Manual SEO slug override (base before global uniqueness) */
    slugManual: {
        type: String,
        lowercase: true,
        trim: true,
        maxlength: [200, 'Slug override cannot exceed 200 characters'],
    },
    description: {
        type: String,
        trim: true,
        maxlength: [2000, 'Description cannot exceed 2000 characters'],
        default: '',
    },
    imageUrl: {
        type: String,
        trim: true,
        default: '',
    },
    imageAlt: {
        type: String,
        trim: true,
        maxlength: [125, 'Image alt cannot exceed 125 characters'],
        default: '',
    },
    seoMetaTitle: {
        type: String,
        trim: true,
        maxlength: [60, 'SEO meta title cannot exceed 60 characters'],
        default: '',
    },
    metaDescription: {
        type: String,
        trim: true,
        maxlength: [160, 'Meta description cannot exceed 160 characters'],
        default: '',
    },
    sortOrder: {
        type: Number,
        default: 0,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
}, {
    timestamps: true,
    suppressReservedKeysWarning: true,
});

subCollectionSchema.index({ collection: 1, sortOrder: 1 });
subCollectionSchema.index({ slug: 1 });

subCollectionSchema.pre('save', async function (next) {
    try {
        const needSlug = this.isNew || this.isModified('name') || this.isModified('slugManual');
        if (!needSlug) return next();

        const base = this.slugManual && String(this.slugManual).trim()
            ? slugify(this.slugManual)
            : slugify(this.name);

        this.slug = await allocateRootSlug(base, { subCollectionId: this._id });
        return next();
    } catch (e) {
        return next(e);
    }
});

subCollectionSchema.statics.listByCollection = function (collectionId, activeOnly = true) {
    const q = { collection: collectionId };
    if (activeOnly) q.isActive = true;
    return this.find(q).sort({ sortOrder: 1, createdAt: 1 });
};

module.exports = mongoose.model('SubCollection', subCollectionSchema);
