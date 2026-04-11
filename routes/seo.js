const express = require('express');
const { body, param, query } = require('express-validator');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');
const {
    getSeoByPath,
    getAllSeo,
    getSeoById,
    createSeo,
    updateSeo,
    deleteSeo,
    seedRoutes
} = require('../controllers/seoController');

const router = express.Router();

// Public: get SEO by path (for frontend SSR)
router.get('/by-path', [
    query('path').notEmpty().withMessage('Path is required'),
    handleValidationErrors
], getSeoByPath);

// Admin: seed all known routes into PageSeo
router.post('/seed', authenticateToken, requireAdmin, seedRoutes);

// Admin: list all
router.get('/', authenticateToken, requireAdmin, getAllSeo);

// Admin: get one by id (must be after /by-path and /path/:path)
router.get('/:id', authenticateToken, requireAdmin, [
    param('id').matches(/^[a-fA-F0-9]{24}$/).withMessage('Invalid ID'),
    handleValidationErrors
], getSeoById);

// Admin: create
router.post('/', authenticateToken, requireAdmin, [
    body('path').notEmpty().trim().withMessage('Path is required'),
    body('title').optional().trim().isLength({ max: 70 }),
    body('description').optional().trim().isLength({ max: 160 }),
    body('ogTitle').optional().trim().isLength({ max: 70 }),
    body('ogDescription').optional().trim().isLength({ max: 200 }),
    body('twitterTitle').optional().trim().isLength({ max: 70 }),
    body('twitterDescription').optional().trim().isLength({ max: 200 }),
    handleValidationErrors
], createSeo);

// Admin: update
router.put('/:id', authenticateToken, requireAdmin, [
    param('id').matches(/^[a-fA-F0-9]{24}$/).withMessage('Invalid ID'),
    handleValidationErrors
], updateSeo);

// Admin: delete
router.delete('/:id', authenticateToken, requireAdmin, [
    param('id').matches(/^[a-fA-F0-9]{24}$/).withMessage('Invalid ID'),
    handleValidationErrors
], deleteSeo);

module.exports = router;
