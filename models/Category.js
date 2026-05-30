const mongoose = require('mongoose');
const { allocateRootSlug, slugify } = require('../utils/globalSlug');

const categorySchema = new mongoose.Schema({
    collectionName: {
        type: String,
        required: [true, 'Collection name is required'],
        trim: true,
        maxlength: [100, 'Collection name cannot exceed 100 characters']
    },
    collectionTitle: {
        type: String,
        required: [true, 'Collection title is required'],
        trim: true,
        maxlength: [200, 'Collection title cannot exceed 200 characters']
    },
    seoMetaTitle: {
        type: String,
        required: [true, 'SEO meta title is required'],
        trim: true,
        maxlength: [60, 'SEO meta title cannot exceed 60 characters']
    },
    metaDescription: {
        type: String,
        required: [true, 'Meta description is required'],
        trim: true,
        maxlength: [160, 'Meta description cannot exceed 160 characters']
    },
    introParagraph: {
        type: String,
        required: [true, 'Intro paragraph is required'],
        trim: true,
        maxlength: [1000, 'Intro paragraph cannot exceed 1000 characters']
    },
    photoUrl: {
        type: String,
        required: [true, 'Photo URL is required'],
        trim: true
    },
    photoAlt: {
        type: String,
       
        trim: true,
        maxlength: [125, 'Photo alt text cannot exceed 125 characters']
    },
    categoryOption: {
        type: String,
        required: [true, 'Category option is required'],
        enum: {
            values: ['normal', 'gifting'],
            message: 'Category option must be either "normal" or "gifting"'
        },
        default: 'normal'
    },
    slug: {
        type: String,
        lowercase: true,
        trim: true
    },
    /** Optional manual root slug (SEO); uniqueness enforced globally with other entities */
    slugManual: {
        type: String,
        lowercase: true,
        trim: true,
        maxlength: [200, 'Slug override cannot exceed 200 characters']
    },
    showInNavigation: {
        type: Boolean,
        default: true
    },
    navOrder: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Root slug — unique across categories, subcollections, products, active PageSeo root paths, blogs
categorySchema.pre('save', async function (next) {
    try {
        const needSlug = this.isNew || this.isModified('collectionName') || this.isModified('slugManual');
        if (!needSlug) return next();

        const base = this.slugManual && String(this.slugManual).trim()
            ? slugify(this.slugManual)
            : slugify(this.collectionName);

        this.slug = await allocateRootSlug(base, { categoryId: this._id });
        return next();
    } catch (e) {
        return next(e);
    }
});

// Index for better query performance (global uniqueness enforced in application layer)
categorySchema.index({ slug: 1 });
categorySchema.index({ categoryOption: 1 });
categorySchema.index({ isActive: 1 });

// Virtual for formatted category option
categorySchema.virtual('formattedCategoryOption').get(function () {
    return this.categoryOption.charAt(0).toUpperCase() + this.categoryOption.slice(1);
});

// Method to get active categories
categorySchema.statics.getActiveCategories = function () {
    return this.find({ isActive: true }).sort({ createdAt: -1 });
};

// Method to get categories by option
categorySchema.statics.getByOption = function (option) {
    return this.find({ categoryOption: option, isActive: true }).sort({ createdAt: -1 });
};

// Method to search categories
categorySchema.statics.search = function (query) {
    return this.find({
        $and: [
            { isActive: true },
            {
                $or: [
                    { collectionName: { $regex: query, $options: 'i' } },
                    { collectionTitle: { $regex: query, $options: 'i' } },
                    { seoMetaTitle: { $regex: query, $options: 'i' } }
                ]
            }
        ]
    }).sort({ createdAt: -1 });
};

module.exports = mongoose.model('Category', categorySchema);
