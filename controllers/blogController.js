const Blog = require('../models/Blog');
const { sanitizeBlogHtml } = require('../utils/sanitizeBlogHtml');
const { slugify } = require('../utils/slugify');
const { deleteFile } = require('../middleware/upload');
const mongoose = require('mongoose');
const { upsertBlogRoute, removeBlogRoute } = require('../utils/seoSync');

const RELATED_SELECT = 'title slug excerpt coverImageUrl publishedAt isTrending isFeatured authorName';

async function ensureUniqueSlug(baseSlug, excludeId) {
    let candidate = baseSlug || 'post';
    let n = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
        const q = { slug: candidate };
        if (excludeId) {
            q._id = { $ne: excludeId };
        }
        const exists = await Blog.findOne(q).select('_id').lean();
        if (!exists) return candidate;
        n += 1;
        candidate = `${baseSlug}-${n}`;
    }
}

const parseTags = (tags) => {
    if (!tags) return [];
    if (Array.isArray(tags)) {
        return tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 30);
    }
    if (typeof tags === 'string') {
        return tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
            .slice(0, 30);
    }
    return [];
};

const parseRelatedIds = (ids) => {
    if (!ids) return [];
    let arr = [];
    if (Array.isArray(ids)) {
        arr = ids;
    } else if (typeof ids === 'string') {
        try {
            const p = JSON.parse(ids);
            arr = Array.isArray(p) ? p : [];
        } catch {
            arr = [];
        }
    }
    return arr.filter((id) => mongoose.Types.ObjectId.isValid(id)).slice(0, 10);
};

// @access Public
const getPublishedBlogs = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const rawLimit = parseInt(req.query.limit, 10);
        const limit = Math.min(
            Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : 12,
            100
        );
        const skip = (page - 1) * limit;
        const { search, tag, category, featured, trending } = req.query;

        const query = {
            status: 'published',
            publishedAt: { $lte: new Date() }
        };

        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { excerpt: { $regex: search, $options: 'i' } },
                { tags: { $regex: search, $options: 'i' } }
            ];
        }
        if (tag) {
            query.tags = tag;
        }
        if (category) {
            query.category = category;
        }
        if (featured === 'true') {
            query.isFeatured = true;
        }
        if (trending === 'true') {
            query.isTrending = true;
        }

        const [blogs, total] = await Promise.all([
            Blog.find(query)
                .sort({ publishedAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Blog.countDocuments(query)
        ]);

        res.json({
            success: true,
            data: {
                blogs,
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
        console.error('getPublishedBlogs error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch blogs' });
    }
};

// @access Public
const getBlogBySlug = async (req, res) => {
    try {
        const { slug } = req.params;
        const blog = await Blog.findOne({
            slug,
            status: 'published',
            publishedAt: { $lte: new Date() }
        })
            .populate('relatedBlogs', RELATED_SELECT)
            .lean();

        if (!blog) {
            return res.status(404).json({ success: false, message: 'Blog not found' });
        }

        await Blog.updateOne({ _id: blog._id }, { $inc: { viewCount: 1 } });

        res.json({
            success: true,
            data: { blog: { ...blog, viewCount: (blog.viewCount || 0) + 1 } }
        });
    } catch (error) {
        console.error('getBlogBySlug error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch blog' });
    }
};

// @access Private Admin
const getBlogs = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
        const skip = (page - 1) * limit;
        const { search, status } = req.query;

        const query = {};
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { excerpt: { $regex: search, $options: 'i' } }
            ];
        }
        if (status && ['draft', 'published'].includes(status)) {
            query.status = status;
        }

        const [blogs, total] = await Promise.all([
            Blog.find(query).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
            Blog.countDocuments(query)
        ]);

        res.json({
            success: true,
            data: {
                blogs,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        console.error('getBlogs error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch blogs' });
    }
};

// @access Private Admin
const getBlogById = async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id).populate('relatedBlogs', RELATED_SELECT).lean();
        if (!blog) {
            return res.status(404).json({ success: false, message: 'Blog not found' });
        }
        res.json({ success: true, data: { blog } });
    } catch (error) {
        console.error('getBlogById error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch blog' });
    }
};

const validateRelated = async (ids, excludeId) => {
    if (!ids.length) return [];
    const found = await Blog.find({ _id: { $in: ids } }).select('_id').lean();
    const set = new Set(found.map((f) => String(f._id)));
    const filtered = ids.filter((id) => set.has(String(id)));
    if (excludeId) {
        return filtered.filter((id) => String(id) !== String(excludeId));
    }
    return filtered;
};

// @access Private Admin
const createBlog = async (req, res) => {
    try {
        const body = req.body;
        const contentHtml = sanitizeBlogHtml(body.contentHtml || '');
        if (!contentHtml.trim()) {
            return res.status(400).json({ success: false, message: 'Content is required' });
        }

        let slug = body.slug ? slugify(body.slug) : slugify(body.title || '');
        slug = await ensureUniqueSlug(slug);

        const relatedIds = await validateRelated(parseRelatedIds(body.relatedBlogs));

        const tags = parseTags(body.tags);
        const status = body.status === 'published' ? 'published' : 'draft';
        const publishedAt =
            status === 'published'
                ? body.publishedAt
                    ? new Date(body.publishedAt)
                    : new Date()
                : undefined;

        let coverImageUrl = body.coverImageUrl;
        if (req.fileUrl) {
            coverImageUrl = req.fileUrl;
        }

        const blog = await Blog.create({
            title: body.title,
            slug,
            excerpt: body.excerpt,
            contentHtml,
            coverImageUrl,
            authorName: body.authorName,
            authorImageUrl: body.authorImageUrl,
            authorBio: body.authorBio,
            category: body.category,
            tags,
            relatedBlogs: relatedIds,
            status,
            publishedAt,
            isFeatured: body.isFeatured === true || body.isFeatured === 'true',
            isTrending: body.isTrending === true || body.isTrending === 'true',
            readTimeMinutes: body.readTimeMinutes ? parseInt(body.readTimeMinutes, 10) : undefined,
            seoMetaTitle: body.seoMetaTitle,
            seoMetaDescription: body.seoMetaDescription
        });

        const populated = await Blog.findById(blog._id).populate('relatedBlogs', RELATED_SELECT).lean();
        upsertBlogRoute(blog).catch(e => console.error('SEO sync (blog create):', e));
        res.status(201).json({ success: true, data: { blog: populated }, message: 'Blog created' });
    } catch (error) {
        console.error('createBlog error:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to create blog' });
    }
};

// @access Private Admin
const updateBlog = async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id);
        if (!blog) {
            return res.status(404).json({ success: false, message: 'Blog not found' });
        }

        const body = req.body;
        const updates = {};

        if (body.title !== undefined) updates.title = body.title;
        if (body.excerpt !== undefined) updates.excerpt = body.excerpt;
        if (body.contentHtml !== undefined) {
            const clean = sanitizeBlogHtml(body.contentHtml);
            if (!clean.trim()) {
                return res.status(400).json({ success: false, message: 'Content cannot be empty' });
            }
            updates.contentHtml = clean;
        }
        if (body.authorName !== undefined) updates.authorName = body.authorName;
        if (body.authorImageUrl !== undefined) updates.authorImageUrl = body.authorImageUrl;
        if (body.authorBio !== undefined) updates.authorBio = body.authorBio;
        if (body.category !== undefined) updates.category = body.category;
        if (body.tags !== undefined) updates.tags = parseTags(body.tags);
        if (body.relatedBlogs !== undefined) {
            updates.relatedBlogs = await validateRelated(parseRelatedIds(body.relatedBlogs), blog._id);
        }
        if (body.isFeatured !== undefined) updates.isFeatured = body.isFeatured === true || body.isFeatured === 'true';
        if (body.isTrending !== undefined) updates.isTrending = body.isTrending === true || body.isTrending === 'true';
        if (body.readTimeMinutes !== undefined) {
            updates.readTimeMinutes = body.readTimeMinutes ? parseInt(body.readTimeMinutes, 10) : undefined;
        }
        if (body.seoMetaTitle !== undefined) updates.seoMetaTitle = body.seoMetaTitle;
        if (body.seoMetaDescription !== undefined) updates.seoMetaDescription = body.seoMetaDescription;

        if (body.slug !== undefined) {
            let s = slugify(body.slug);
            s = await ensureUniqueSlug(s, blog._id);
            updates.slug = s;
        }

        if (body.status !== undefined) {
            updates.status = body.status === 'published' ? 'published' : 'draft';
            if (updates.status === 'published' && !blog.publishedAt) {
                updates.publishedAt = body.publishedAt ? new Date(body.publishedAt) : new Date();
            }
        }
        if (body.publishedAt !== undefined && body.publishedAt) {
            updates.publishedAt = new Date(body.publishedAt);
        }

        if (req.fileUrl) {
            if (blog.coverImageUrl && blog.coverImageUrl.startsWith('/uploads/')) {
                deleteFile(blog.coverImageUrl);
            }
            updates.coverImageUrl = req.fileUrl;
        } else if (body.coverImageUrl !== undefined) {
            updates.coverImageUrl = body.coverImageUrl;
        }

        Object.assign(blog, updates);
        await blog.save();
        upsertBlogRoute(blog).catch(e => console.error('SEO sync (blog update):', e));

        const populated = await Blog.findById(blog._id).populate('relatedBlogs', RELATED_SELECT).lean();
        res.json({ success: true, data: { blog: populated }, message: 'Blog updated' });
    } catch (error) {
        console.error('updateBlog error:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to update blog' });
    }
};

// @access Private Admin
const deleteBlog = async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id);
        if (!blog) {
            return res.status(404).json({ success: false, message: 'Blog not found' });
        }

        if (blog.coverImageUrl && blog.coverImageUrl.startsWith('/uploads/')) {
            deleteFile(blog.coverImageUrl);
        }

        await Blog.updateMany({ relatedBlogs: blog._id }, { $pull: { relatedBlogs: blog._id } });

        removeBlogRoute(blog).catch(e => console.error('SEO sync (blog delete):', e));
        await blog.deleteOne();
        res.json({ success: true, message: 'Blog deleted' });
    } catch (error) {
        console.error('deleteBlog error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete blog' });
    }
};

// @access Private Admin — multipart field: image
const uploadBlogImage = async (req, res) => {
    try {
        if (!req.fileUrl) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }
        res.json({
            success: true,
            data: { url: req.fileUrl }
        });
    } catch (error) {
        console.error('uploadBlogImage error:', error);
        res.status(500).json({ success: false, message: 'Upload failed' });
    }
};

module.exports = {
    getPublishedBlogs,
    getBlogBySlug,
    getBlogs,
    getBlogById,
    createBlog,
    updateBlog,
    deleteBlog,
    uploadBlogImage
};
