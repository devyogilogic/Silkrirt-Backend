const mongoose = require('mongoose');

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
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Generate slug before saving
categorySchema.pre('save', function (next) {
    if (!this.isModified('collectionName')) return next();

    this.slug = this.collectionName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

    next();
});

// Index for better query performance
categorySchema.index({ slug: 1 }, { unique: true });
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
