const express = require('express');
const { body, param, query } = require('express-validator');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { handleValidationErrors, isValidObjectId } = require('../middleware/validation');
const { createLead, getLeads, updateLead, deleteLead } = require('../controllers/leadController');

const router = express.Router();

// @route   POST /api/leads
// @desc    Submit contact form (public)
router.post('/', [
    body('name').trim().notEmpty().isLength({ max: 100 }).withMessage('Name is required'),
    body('email').trim().isEmail().withMessage('Valid email is required'),
    body('phone').optional().isLength({ max: 20 }),
    body('subject').trim().notEmpty().isLength({ max: 200 }).withMessage('Subject is required'),
    body('message').trim().notEmpty().isLength({ max: 2000 }).withMessage('Message is required'),
    handleValidationErrors,
], createLead);

// @route   GET /api/leads
// @desc    Get all leads (admin)
router.get('/', [
    authenticateToken,
    requireAdmin,
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isIn(['new', 'contacted', 'converted', 'closed']),
    handleValidationErrors,
], getLeads);

// @route   PATCH /api/leads/:id
// @desc    Update lead status/notes (admin)
router.patch('/:id', [
    authenticateToken,
    requireAdmin,
    param('id').custom(isValidObjectId).withMessage('Invalid lead ID'),
    body('status').optional().isIn(['new', 'contacted', 'converted', 'closed']),
    body('notes').optional().isLength({ max: 1000 }),
    handleValidationErrors,
], updateLead);

// @route   DELETE /api/leads/:id
// @desc    Delete lead (admin)
router.delete('/:id', [
    authenticateToken,
    requireAdmin,
    param('id').custom(isValidObjectId).withMessage('Invalid lead ID'),
    handleValidationErrors,
], deleteLead);

module.exports = router;
