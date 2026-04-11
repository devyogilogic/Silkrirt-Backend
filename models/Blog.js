const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, 'Title is required'],
            trim: true,
            maxlength: [200, 'Title cannot exceed 200 characters']
        },
        slug: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
            maxlength: [220, 'Slug is too long']
        },
        excerpt: {
            type: String,
            required: [true, 'Excerpt is required'],
            trim: true,
            maxlength: [500, 'Excerpt cannot exceed 500 characters']
        },
        contentHtml: {
            type: String,
            required: [true, 'Content is required']
        },
        coverImageUrl: {
            type: String,
            trim: true
        },
        authorName: {
            type: String,
            required: [true, 'Author name is required'],
            trim: true,
            maxlength: [120, 'Author name is too long']
        },
        authorImageUrl: {
            type: String,
            trim: true
        },
        authorBio: {
            type: String,
            trim: true,
            maxlength: [300, 'Author bio is too long']
        },
        category: {
            type: String,
            trim: true,
            maxlength: [80, 'Category is too long']
        },
        tags: {
            type: [String],
            default: [],
            validate: {
                validator: (arr) => arr.length <= 30,
                message: 'Too many tags'
            }
        },
        relatedBlogs: {
            type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Blog' }],
            default: [],
            validate: {
                validator: (arr) => arr.length <= 10,
                message: 'At most 10 related blogs'
            }
        },
        status: {
            type: String,
            enum: ['draft', 'published'],
            default: 'draft'
        },
        publishedAt: {
            type: Date
        },
        isFeatured: {
            type: Boolean,
            default: false
        },
        isTrending: {
            type: Boolean,
            default: false
        },
        viewCount: {
            type: Number,
            default: 0,
            min: 0
        },
        readTimeMinutes: {
            type: Number,
            min: 1,
            max: 999
        },
        seoMetaTitle: {
            type: String,
            trim: true,
            maxlength: [70, 'SEO title cannot exceed 70 characters']
        },
        seoMetaDescription: {
            type: String,
            trim: true,
            maxlength: [160, 'SEO description cannot exceed 160 characters']
        }
    },
    { timestamps: true }
);

blogSchema.index({ status: 1, publishedAt: -1 });
blogSchema.index({ tags: 1 });
blogSchema.index({ category: 1 });

module.exports = mongoose.model('Blog', blogSchema);
