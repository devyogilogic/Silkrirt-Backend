const Testimonial = require('../models/Testimonial');
const { deleteFile } = require('../middleware/upload');

const getActiveTestimonials = async (req, res) => {
    try {
        const list = await Testimonial.find({ isActive: true }).sort({ sortOrder: 1, createdAt: -1 }).lean();
        res.json({ success: true, data: { testimonials: list } });
    } catch (error) {
        console.error('getActiveTestimonials error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch testimonials' });
    }
};

const getTestimonials = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
        const skip = (page - 1) * limit;
        const [testimonials, total] = await Promise.all([
            Testimonial.find().sort({ sortOrder: 1, createdAt: -1 }).skip(skip).limit(limit).lean(),
            Testimonial.countDocuments()
        ]);
        res.json({
            success: true,
            data: {
                testimonials,
                pagination: { page, limit, total, pages: Math.ceil(total / limit) }
            }
        });
    } catch (error) {
        console.error('getTestimonials error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch testimonials' });
    }
};

const getTestimonialById = async (req, res) => {
    try {
        const t = await Testimonial.findById(req.params.id).lean();
        if (!t) {
            return res.status(404).json({ success: false, message: 'Not found' });
        }
        res.json({ success: true, data: { testimonial: t } });
    } catch (error) {
        console.error('getTestimonialById error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch testimonial' });
    }
};

const createTestimonial = async (req, res) => {
    try {
        const body = req.body;
        let avatarUrl = body.avatarUrl;
        if (req.fileUrl) {
            avatarUrl = req.fileUrl;
        }
        const t = await Testimonial.create({
            name: body.name,
            location: body.location || '',
            text: body.text,
            rating: parseInt(body.rating, 10) || 5,
            avatarUrl,
            sortOrder: parseInt(body.sortOrder, 10) || 0,
            isActive: body.isActive !== false && body.isActive !== 'false'
        });
        res.status(201).json({ success: true, data: { testimonial: t }, message: 'Created' });
    } catch (error) {
        console.error('createTestimonial error:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to create' });
    }
};

const updateTestimonial = async (req, res) => {
    try {
        const t = await Testimonial.findById(req.params.id);
        if (!t) {
            return res.status(404).json({ success: false, message: 'Not found' });
        }
        const body = req.body;
        if (body.name !== undefined) t.name = body.name;
        if (body.location !== undefined) t.location = body.location;
        if (body.text !== undefined) t.text = body.text;
        if (body.rating !== undefined) t.rating = parseInt(body.rating, 10) || 5;
        if (body.sortOrder !== undefined) t.sortOrder = parseInt(body.sortOrder, 10) || 0;
        if (body.isActive !== undefined) t.isActive = body.isActive !== false && body.isActive !== 'false';
        if (req.fileUrl) {
            if (t.avatarUrl && t.avatarUrl.startsWith('/uploads/')) {
                deleteFile(t.avatarUrl);
            }
            t.avatarUrl = req.fileUrl;
        } else if (body.avatarUrl !== undefined) {
            t.avatarUrl = body.avatarUrl;
        }
        await t.save();
        res.json({ success: true, data: { testimonial: t }, message: 'Updated' });
    } catch (error) {
        console.error('updateTestimonial error:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to update' });
    }
};

const deleteTestimonial = async (req, res) => {
    try {
        const t = await Testimonial.findById(req.params.id);
        if (!t) {
            return res.status(404).json({ success: false, message: 'Not found' });
        }
        if (t.avatarUrl && t.avatarUrl.startsWith('/uploads/')) {
            deleteFile(t.avatarUrl);
        }
        await t.deleteOne();
        res.json({ success: true, message: 'Deleted' });
    } catch (error) {
        console.error('deleteTestimonial error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete' });
    }
};

module.exports = {
    getActiveTestimonials,
    getTestimonials,
    getTestimonialById,
    createTestimonial,
    updateTestimonial,
    deleteTestimonial
};
