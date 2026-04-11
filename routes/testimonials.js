const express = require('express');
const { body, param, query } = require('express-validator');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { uploadTestimonialAvatar } = require('../middleware/upload');
const { handleValidationErrors } = require('../middleware/validation');
const {
    getActiveTestimonials,
    getTestimonials,
    getTestimonialById,
    createTestimonial,
    updateTestimonial,
    deleteTestimonial
} = require('../controllers/testimonialController');

const router = express.Router();

router.get('/active', getActiveTestimonials);

router.get(
    '/',
    authenticateToken,
    requireAdmin,
    [query('page').optional().isInt({ min: 1 }), query('limit').optional().isInt({ min: 1, max: 100 }), handleValidationErrors],
    getTestimonials
);

router.get(
    '/:id',
    authenticateToken,
    requireAdmin,
    [param('id').matches(/^[a-fA-F0-9]{24}$/).withMessage('Invalid ID'), handleValidationErrors],
    getTestimonialById
);

router.post(
    '/',
    authenticateToken,
    requireAdmin,
    uploadTestimonialAvatar,
    [body('name').notEmpty().trim(), body('text').notEmpty().trim(), handleValidationErrors],
    createTestimonial
);

router.put(
    '/:id',
    authenticateToken,
    requireAdmin,
    uploadTestimonialAvatar,
    [param('id').matches(/^[a-fA-F0-9]{24}$/).withMessage('Invalid ID'), handleValidationErrors],
    updateTestimonial
);

router.delete(
    '/:id',
    authenticateToken,
    requireAdmin,
    [param('id').matches(/^[a-fA-F0-9]{24}$/).withMessage('Invalid ID'), handleValidationErrors],
    deleteTestimonial
);

module.exports = router;
