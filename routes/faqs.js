const express = require('express');
const { body, param, query } = require('express-validator');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');
const {
    getActiveFaqs,
    getFaqs,
    getFaqById,
    createFaq,
    updateFaq,
    deleteFaq
} = require('../controllers/faqController');

const router = express.Router();

router.get('/active', getActiveFaqs);

router.get(
    '/',
    authenticateToken,
    requireAdmin,
    [query('page').optional().isInt({ min: 1 }), query('limit').optional().isInt({ min: 1, max: 100 }), handleValidationErrors],
    getFaqs
);

router.get(
    '/:id',
    authenticateToken,
    requireAdmin,
    [param('id').matches(/^[a-fA-F0-9]{24}$/).withMessage('Invalid ID'), handleValidationErrors],
    getFaqById
);

router.post(
    '/',
    authenticateToken,
    requireAdmin,
    [body('question').notEmpty().trim(), body('answer').notEmpty().trim(), handleValidationErrors],
    createFaq
);

router.put(
    '/:id',
    authenticateToken,
    requireAdmin,
    [param('id').matches(/^[a-fA-F0-9]{24}$/).withMessage('Invalid ID'), handleValidationErrors],
    updateFaq
);

router.delete(
    '/:id',
    authenticateToken,
    requireAdmin,
    [param('id').matches(/^[a-fA-F0-9]{24}$/).withMessage('Invalid ID'), handleValidationErrors],
    deleteFaq
);

module.exports = router;
