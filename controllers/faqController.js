const Faq = require('../models/Faq');

const getActiveFaqs = async (req, res) => {
    try {
        const list = await Faq.find({ isActive: true }).sort({ sortOrder: 1, createdAt: -1 }).lean();
        res.json({ success: true, data: { faqs: list } });
    } catch (error) {
        console.error('getActiveFaqs error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch FAQs' });
    }
};

const getFaqs = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
        const skip = (page - 1) * limit;
        const [faqs, total] = await Promise.all([
            Faq.find().sort({ sortOrder: 1, createdAt: -1 }).skip(skip).limit(limit).lean(),
            Faq.countDocuments()
        ]);
        res.json({
            success: true,
            data: {
                faqs,
                pagination: { page, limit, total, pages: Math.ceil(total / limit) }
            }
        });
    } catch (error) {
        console.error('getFaqs error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch FAQs' });
    }
};

const getFaqById = async (req, res) => {
    try {
        const f = await Faq.findById(req.params.id).lean();
        if (!f) {
            return res.status(404).json({ success: false, message: 'Not found' });
        }
        res.json({ success: true, data: { faq: f } });
    } catch (error) {
        console.error('getFaqById error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch FAQ' });
    }
};

const createFaq = async (req, res) => {
    try {
        const body = req.body;
        const f = await Faq.create({
            question: body.question,
            answer: body.answer,
            sortOrder: parseInt(body.sortOrder, 10) || 0,
            isActive: body.isActive !== false && body.isActive !== 'false'
        });
        res.status(201).json({ success: true, data: { faq: f }, message: 'Created' });
    } catch (error) {
        console.error('createFaq error:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to create' });
    }
};

const updateFaq = async (req, res) => {
    try {
        const f = await Faq.findById(req.params.id);
        if (!f) {
            return res.status(404).json({ success: false, message: 'Not found' });
        }
        const body = req.body;
        if (body.question !== undefined) f.question = body.question;
        if (body.answer !== undefined) f.answer = body.answer;
        if (body.sortOrder !== undefined) f.sortOrder = parseInt(body.sortOrder, 10) || 0;
        if (body.isActive !== undefined) f.isActive = body.isActive !== false && body.isActive !== 'false';
        await f.save();
        res.json({ success: true, data: { faq: f }, message: 'Updated' });
    } catch (error) {
        console.error('updateFaq error:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to update' });
    }
};

const deleteFaq = async (req, res) => {
    try {
        const f = await Faq.findByIdAndDelete(req.params.id);
        if (!f) {
            return res.status(404).json({ success: false, message: 'Not found' });
        }
        res.json({ success: true, message: 'Deleted' });
    } catch (error) {
        console.error('deleteFaq error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete' });
    }
};

module.exports = {
    getActiveFaqs,
    getFaqs,
    getFaqById,
    createFaq,
    updateFaq,
    deleteFaq
};
