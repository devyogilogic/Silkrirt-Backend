const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    sku: {
        type: String,
        required: [true, 'SKU is required'],
        trim: true,
        uppercase: true,
        maxlength: [50, 'SKU cannot exceed 50 characters']
    },
    productTitle: {
        type: String,
        required: [true, 'Product title is required'],
        trim: true,
        maxlength: [200, 'Product title cannot exceed 200 characters']
    },
    shortDescription: {
        type: String,
        required: [true, 'Short description is required'],
        trim: true,
        maxlength: [500, 'Short description cannot exceed 500 characters']
    },
    fullDescription: {
        type: String,
        required: [true, 'Full description is required'],
        trim: true,
        maxlength: [5000, 'Full description cannot exceed 5000 characters']
    },
    keyFeatures: {
        type: String,
        required: [true, 'Key features are required'],
        trim: true,
        maxlength: [2000, 'Key features cannot exceed 2000 characters']
    },
    specificationsTable: {
        type: String,
        required: [true, 'Specifications table is required'],
        trim: true,
        validate: {
            validator: function (v) {
                try {
                    JSON.parse(v);
                    return true;
                } catch (e) {
                    return false;
                }
            },
            message: 'Specifications table must be valid JSON'
        }
    },
    seoMetaTitle: {
        type: String,
        required: [true, 'SEO meta title is required'],
        trim: true,
        maxlength: [60, 'SEO meta title cannot exceed 60 characters']
    },
    seoMetaDescription: {
        type: String,
        required: [true, 'SEO meta description is required'],
        trim: true,
        maxlength: [160, 'SEO meta description cannot exceed 160 characters']
    },
    productTags: {
        type: String,
        required: [true, 'Product tags are required'],
        trim: true,
        maxlength: [500, 'Product tags cannot exceed 500 characters']
    },
    productCategories: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: [true, 'At least one category is required']
    }],
    productImageUrls: {
        type: [String],
        required: [true, 'At least one product image is required'],
        validate: {
            validator: function (v) {
                return v.length <= 5;
            },
            message: 'Maximum 5 images allowed per product'
        }
    },
    slug: {
        type: String,
        lowercase: true,
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isFeatured: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Generate slug before saving
productSchema.pre('save', function (next) {
    if (!this.isModified('productTitle')) return next();

    this.slug = this.productTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

    next();
});

// Index for better query performance
productSchema.index({ sku: 1 }, { unique: true });
productSchema.index({ slug: 1 }, { unique: true });
productSchema.index({ productCategories: 1 });
productSchema.index({ isActive: 1 });
productSchema.index({ isFeatured: 1 });
productSchema.index({ productTitle: 'text', shortDescription: 'text', productTags: 'text' });

// Virtual for formatted specifications
productSchema.virtual('formattedSpecifications').get(function () {
    try {
        return JSON.parse(this.specificationsTable);
    } catch (e) {
        return {};
    }
});

// Virtual for tags array
productSchema.virtual('tagsArray').get(function () {
    return this.productTags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
});

// Method to get active products
productSchema.statics.getActiveProducts = function () {
    return this.find({ isActive: true })
        .populate('productCategories', 'collectionName collectionTitle')
        .sort({ createdAt: -1 });
};

// Method to get featured products
productSchema.statics.getFeaturedProducts = function () {
    return this.find({ isActive: true, isFeatured: true })
        .populate('productCategories', 'collectionName collectionTitle')
        .sort({ createdAt: -1 });
};

// Method to get products by category
productSchema.statics.getByCategory = function (categoryId) {
    return this.find({
        productCategories: categoryId,
        isActive: true
    })
        .populate('productCategories', 'collectionName collectionTitle')
        .sort({ createdAt: -1 });
};

// Method to search products
productSchema.statics.search = function (query) {
    return this.find({
        $and: [
            { isActive: true },
            {
                $or: [
                    { productTitle: { $regex: query, $options: 'i' } },
                    { shortDescription: { $regex: query, $options: 'i' } },
                    { productTags: { $regex: query, $options: 'i' } },
                    { sku: { $regex: query, $options: 'i' } }
                ]
            }
        ]
    })
        .populate('productCategories', 'collectionName collectionTitle')
        .sort({ createdAt: -1 });
};

// Method to check if SKU exists
productSchema.statics.skuExists = function (sku, excludeId = null) {
    const query = { sku: sku.toUpperCase() };
    if (excludeId) {
        query._id = { $ne: excludeId };
    }
    return this.findOne(query);
};

module.exports = mongoose.model('Product', productSchema);
