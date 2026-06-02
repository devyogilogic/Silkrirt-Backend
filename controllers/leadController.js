const Lead = require('../models/Lead');

// @desc    Submit contact form — public
// @access  Public
const createLead = async (req, res) => {
    try {
        const { name, email, phone, subject, message } = req.body;
        const lead = await Lead.create({ name, email, phone: phone || '', subject, message });
        return res.status(201).json({ success: true, message: 'Message received. We\'ll get back to you soon!', data: { id: lead._id } });
    } catch (error) {
        console.error('Create lead error:', error);
        return res.status(500).json({ success: false, message: 'Failed to submit. Please try again.' });
    }
};

// @desc    Get all leads with pagination & filter
// @access  Private (Admin)
const getLeads = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
        const skip = (page - 1) * limit;
        const { status } = req.query;

        const filter = status ? { status } : {};

        const [leads, total] = await Promise.all([
            Lead.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
            Lead.countDocuments(filter),
        ]);

        return res.json({
            success: true,
            data: {
                leads,
                pagination: { page, limit, total, pages: Math.ceil(total / limit) },
            },
        });
    } catch (error) {
        console.error('Get leads error:', error);
        return res.status(500).json({ success: false, message: 'Failed to get leads' });
    }
};

// @desc    Update lead status / notes
// @access  Private (Admin)
const updateLead = async (req, res) => {
    try {
        const lead = await Lead.findByIdAndUpdate(
            req.params.id,
            { $set: { status: req.body.status, notes: req.body.notes } },
            { new: true, runValidators: true }
        );
        if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
        return res.json({ success: true, data: { lead } });
    } catch (error) {
        console.error('Update lead error:', error);
        return res.status(500).json({ success: false, message: 'Failed to update lead' });
    }
};

// @desc    Delete lead
// @access  Private (Admin)
const deleteLead = async (req, res) => {
    try {
        const lead = await Lead.findByIdAndDelete(req.params.id);
        if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
        return res.json({ success: true, message: 'Lead deleted' });
    } catch (error) {
        console.error('Delete lead error:', error);
        return res.status(500).json({ success: false, message: 'Failed to delete lead' });
    }
};

module.exports = { createLead, getLeads, updateLead, deleteLead };
