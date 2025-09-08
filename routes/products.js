const express = require('express');
const { body, param, query } = require('express-validator');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { uploadMultiple } = require('../middleware/upload');
const {
    handleValidationErrors,
    isValidObjectId,
    isValidSKU,
    isValidJSON,
    isValidImageUrls,
    isValidProductCategories
} = require('../middleware/validation');
const {
    getProducts,
    getActiveProducts,
    getFeaturedProducts,
    getProductsByCategory,
    getProductById,
    createProduct,
    updateProduct,
    updateProductImages,
    deleteProduct
} = require('../controllers/productController');

const router = express.Router();

// @route   GET /api/products
// @desc    Get all products with pagination and filtering
// @access  Private
router.get('/', [
    authenticateToken,
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('search').optional().isString().withMessage('Search must be a string'),
    query('category').optional().custom(isValidObjectId).withMessage('Invalid category ID'),
    query('featured').optional().isBoolean().withMessage('Featured must be a boolean'),
    query('active').optional().isBoolean().withMessage('Active must be a boolean'),
    handleValidationErrors
], getProducts);

// @route   GET /api/products/active
// @desc    Get all active products (for frontend use)
// @access  Public
router.get('/active', getActiveProducts);

// @route   GET /api/products/featured
// @desc    Get featured products
// @access  Public
router.get('/featured', getFeaturedProducts);

// @route   GET /api/products/category/:categoryId
// @desc    Get products by category
// @access  Public
router.get('/category/:categoryId', [
    param('categoryId').custom(isValidObjectId).withMessage('Invalid category ID'),
    handleValidationErrors
], getProductsByCategory);

// @route   GET /api/products/:id
// @desc    Get product by ID
// @access  Private
router.get('/:id', [
    authenticateToken,
    param('id').custom(isValidObjectId).withMessage('Invalid product ID'),
    handleValidationErrors
], getProductById);

// @route   POST /api/products
// @desc    Create new product
// @access  Private (Admin only)
router.post('/', [
    authenticateToken,
    requireAdmin,
    uploadMultiple,
    body('sku')
        .notEmpty().withMessage('SKU is required')
        .custom(isValidSKU).withMessage('Invalid SKU format'),
    body('productTitle')
        .notEmpty().withMessage('Product title is required')
        .isLength({ max: 200 }).withMessage('Product title cannot exceed 200 characters'),
    body('shortDescription')
        .notEmpty().withMessage('Short description is required')
        .isLength({ max: 500 }).withMessage('Short description cannot exceed 500 characters'),
    body('fullDescription')
        .notEmpty().withMessage('Full description is required')
        .isLength({ max: 5000 }).withMessage('Full description cannot exceed 5000 characters'),
    body('keyFeatures')
        .notEmpty().withMessage('Key features are required')
        .isLength({ max: 2000 }).withMessage('Key features cannot exceed 2000 characters'),
    body('specificationsTable')
        .notEmpty().withMessage('Specifications table is required')
        .custom(isValidJSON).withMessage('Specifications table must be valid JSON'),
    body('seoMetaTitle')
        .notEmpty().withMessage('SEO meta title is required')
        .isLength({ max: 60 }).withMessage('SEO meta title cannot exceed 60 characters'),
    body('seoMetaDescription')
        .notEmpty().withMessage('SEO meta description is required')
        .isLength({ max: 160 }).withMessage('SEO meta description cannot exceed 160 characters'),
    body('productTags')
        .notEmpty().withMessage('Product tags are required')
        .isLength({ max: 500 }).withMessage('Product tags cannot exceed 500 characters'),
  
   
    body('isFeatured')
        .optional()
        .isBoolean().withMessage('isFeatured must be a boolean'),
    handleValidationErrors
], createProduct);

// @route   PUT /api/products/:id
// @desc    Update product
// @access  Private (Admin only)
router.put('/:id', [
    authenticateToken,
    requireAdmin,
    param('id').custom(isValidObjectId).withMessage('Invalid product ID'),
    body('sku')
        .optional()
        .custom(isValidSKU).withMessage('Invalid SKU format'),
    body('productTitle')
        .optional()
        .isLength({ max: 200 }).withMessage('Product title cannot exceed 200 characters'),
    body('shortDescription')
        .optional()
        .isLength({ max: 500 }).withMessage('Short description cannot exceed 500 characters'),
    body('fullDescription')
        .optional()
        .isLength({ max: 5000 }).withMessage('Full description cannot exceed 5000 characters'),
    body('keyFeatures')
        .optional()
        .isLength({ max: 2000 }).withMessage('Key features cannot exceed 2000 characters'),
    body('specificationsTable')
        .optional()
        .custom(isValidJSON).withMessage('Specifications table must be valid JSON'),
    body('seoMetaTitle')
        .optional()
        .isLength({ max: 60 }).withMessage('SEO meta title cannot exceed 60 characters'),
    body('seoMetaDescription')
        .optional()
        .isLength({ max: 160 }).withMessage('SEO meta description cannot exceed 160 characters'),
    body('productTags')
        .optional()
        .isLength({ max: 500 }).withMessage('Product tags cannot exceed 500 characters'),
    body('productCategories')
        .optional()
        .custom(isValidProductCategories).withMessage('Invalid product categories'),
    body('productImageAlts')
        .optional()
        .isArray().withMessage('Product image alt texts must be an array')
        .custom((value) => {
            if (value.length > 5) {
                throw new Error('Maximum 5 alt texts allowed');
            }
            return value.every(alt => typeof alt === 'string' && alt.length <= 125);
        }).withMessage('Each alt text must be a string with max 125 characters'),
    body('isActive')
        .optional()
        .isBoolean().withMessage('isActive must be a boolean'),
    body('isFeatured')
        .optional()
        .isBoolean().withMessage('isFeatured must be a boolean'),
    handleValidationErrors
], updateProduct);

// @route   PUT /api/products/:id/images
// @desc    Update product images
// @access  Private (Admin only)
router.put('/:id/images', [
    authenticateToken,
    requireAdmin,
    param('id').custom(isValidObjectId).withMessage('Invalid product ID'),
    uploadMultiple,
    body('productImageAlts')
        .optional()
        .isArray().withMessage('Product image alt texts must be an array')
        .custom((value) => {
            if (value.length > 5) {
                throw new Error('Maximum 5 alt texts allowed');
            }
            return value.every(alt => typeof alt === 'string' && alt.length <= 125);
        }).withMessage('Each alt text must be a string with max 125 characters'),
    handleValidationErrors
], updateProductImages);

// @route   DELETE /api/products/:id
// @desc    Delete product
// @access  Private (Admin only)
router.delete('/:id', [
    authenticateToken,
    requireAdmin,
    param('id').custom(isValidObjectId).withMessage('Invalid product ID'),
    handleValidationErrors
], deleteProduct);

module.exports = router;
