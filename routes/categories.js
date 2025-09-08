const express = require('express');
const { body, param, query } = require('express-validator');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { uploadSingle } = require('../middleware/upload');
const { handleValidationErrors, isValidObjectId, isValidCategoryOption } = require('../middleware/validation');
const {
    getCategories,
    getActiveCategories,
    getCategoryById,
    createCategory,
    updateCategory,
    updateCategoryPhoto,
    deleteCategory
} = require('../controllers/categoryController');

const router = express.Router();

// @route   GET /api/categories
// @desc    Get all categories with pagination and filtering
// @access  Private
router.get('/', [
    authenticateToken,
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('search').optional().isString().withMessage('Search must be a string'),
    query('option').optional().custom(isValidCategoryOption).withMessage('Invalid category option'),
    query('active').optional().isBoolean().withMessage('Active must be a boolean'),
    handleValidationErrors
], getCategories);

// @route   GET /api/categories/active
// @desc    Get all active categories (for frontend use)
// @access  Public
router.get('/active', getActiveCategories);

// @route   GET /api/categories/:id
// @desc    Get category by ID
// @access  Private
router.get('/:id', [
    authenticateToken,
    param('id').custom(isValidObjectId).withMessage('Invalid category ID'),
    handleValidationErrors
], getCategoryById);

// @route   POST /api/categories
// @desc    Create new category
// @access  Private (Admin only)
router.post('/', [
    authenticateToken,
    requireAdmin,
    uploadSingle,
    body('collectionName')
        .notEmpty().withMessage('Collection name is required')
        .isLength({ max: 100 }).withMessage('Collection name cannot exceed 100 characters'),
    body('collectionTitle')
        .notEmpty().withMessage('Collection title is required')
        .isLength({ max: 200 }).withMessage('Collection title cannot exceed 200 characters'),
    body('seoMetaTitle')
        .notEmpty().withMessage('SEO meta title is required')
        .isLength({ max: 60 }).withMessage('SEO meta title cannot exceed 60 characters'),
    body('metaDescription')
        .notEmpty().withMessage('Meta description is required')
        .isLength({ max: 160 }).withMessage('Meta description cannot exceed 160 characters'),
    body('introParagraph')
        .notEmpty().withMessage('Intro paragraph is required')
        .isLength({ max: 1000 }).withMessage('Intro paragraph cannot exceed 1000 characters'),
    body('categoryOption')
        .notEmpty().withMessage('Category option is required')
        .custom(isValidCategoryOption).withMessage('Category option must be either "normal" or "gifting"'),

    handleValidationErrors
], createCategory);

// @route   PUT /api/categories/:id
// @desc    Update category
// @access  Private (Admin only)
router.put('/:id', [
    authenticateToken,
    requireAdmin,
    param('id').custom(isValidObjectId).withMessage('Invalid category ID'),
    body('collectionName')
        .optional()
        .isLength({ max: 100 }).withMessage('Collection name cannot exceed 100 characters'),
    body('collectionTitle')
        .optional()
        .isLength({ max: 200 }).withMessage('Collection title cannot exceed 200 characters'),
    body('seoMetaTitle')
        .optional()
        .isLength({ max: 60 }).withMessage('SEO meta title cannot exceed 60 characters'),
    body('metaDescription')
        .optional()
        .isLength({ max: 160 }).withMessage('Meta description cannot exceed 160 characters'),
    body('introParagraph')
        .optional()
        .isLength({ max: 1000 }).withMessage('Intro paragraph cannot exceed 1000 characters'),
    body('categoryOption')
        .optional()
        .custom(isValidCategoryOption).withMessage('Category option must be either "normal" or "gifting"'),
    body('isActive')
        .optional()
        .isBoolean().withMessage('isActive must be a boolean'),
    body('photoAlt')
        .optional()
        .isLength({ max: 125 }).withMessage('Photo alt text cannot exceed 125 characters'),
    handleValidationErrors
], updateCategory);

// @route   PUT /api/categories/:id/photo
// @desc    Update category photo
// @access  Private (Admin only)
router.put('/:id/photo', [
    authenticateToken,
    requireAdmin,
    param('id').custom(isValidObjectId).withMessage('Invalid category ID'),
    uploadSingle,
    handleValidationErrors
], updateCategoryPhoto);

// @route   DELETE /api/categories/:id
// @desc    Delete category
// @access  Private (Admin only)
router.delete('/:id', [
    authenticateToken,
    requireAdmin,
    param('id').custom(isValidObjectId).withMessage('Invalid category ID'),
    handleValidationErrors
], deleteCategory);

module.exports = router;
