const express = require('express');
const { body, param, query } = require('express-validator');
const Product = require('../models/Product');
const Category = require('../models/Category');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { uploadMultiple, deleteFiles } = require('../middleware/upload');
const {
    handleValidationErrors,
    isValidObjectId,
    isValidSKU,
    isValidJSON,
    isValidImageUrls,
    isValidProductCategories
} = require('../middleware/validation');

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
], async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const { search, category, featured, active } = req.query;

        // Build query
        let query = {};

        if (search) {
            query = {
                $or: [
                    { productTitle: { $regex: search, $options: 'i' } },
                    { shortDescription: { $regex: search, $options: 'i' } },
                    { productTags: { $regex: search, $options: 'i' } },
                    { sku: { $regex: search, $options: 'i' } }
                ]
            };
        }

        if (category) {
            query.productCategories = category;
        }

        if (featured !== undefined) {
            query.isFeatured = featured === 'true';
        }

        if (active !== undefined) {
            query.isActive = active === 'true';
        }

        // Execute query with pagination and populate categories
        const products = await Product.find(query)
            .populate('productCategories', 'collectionName collectionTitle')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        // Get total count for pagination
        const total = await Product.countDocuments(query);

        res.json({
            success: true,
            data: {
                products,
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
        console.error('Get products error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get products'
        });
    }
});

// @route   GET /api/products/active
// @desc    Get all active products (for frontend use)
// @access  Public
router.get('/active', async (req, res) => {
    try {
        const products = await Product.getActiveProducts();

        res.json({
            success: true,
            data: {
                products
            }
        });
    } catch (error) {
        console.error('Get active products error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get active products'
        });
    }
});

// @route   GET /api/products/featured
// @desc    Get featured products
// @access  Public
router.get('/featured', async (req, res) => {
    try {
        const products = await Product.getFeaturedProducts();

        res.json({
            success: true,
            data: {
                products
            }
        });
    } catch (error) {
        console.error('Get featured products error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get featured products'
        });
    }
});

// @route   GET /api/products/category/:categoryId
// @desc    Get products by category
// @access  Public
router.get('/category/:categoryId', [
    param('categoryId').custom(isValidObjectId).withMessage('Invalid category ID'),
    handleValidationErrors
], async (req, res) => {
    try {
        const products = await Product.getByCategory(req.params.categoryId);

        res.json({
            success: true,
            data: {
                products
            }
        });
    } catch (error) {
        console.error('Get products by category error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get products by category'
        });
    }
});

// @route   GET /api/products/:id
// @desc    Get product by ID
// @access  Private
router.get('/:id', [
    authenticateToken,
    param('id').custom(isValidObjectId).withMessage('Invalid product ID'),
    handleValidationErrors
], async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
            .populate('productCategories', 'collectionName collectionTitle');

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        res.json({
            success: true,
            data: {
                product
            }
        });
    } catch (error) {
        console.error('Get product error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get product'
        });
    }
});

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
    body('productCategories')
        .notEmpty().withMessage('Product categories are required')
        .custom(isValidProductCategories).withMessage('Invalid product categories'),
    body('isFeatured')
        .optional()
        .isBoolean().withMessage('isFeatured must be a boolean'),
    handleValidationErrors
], async (req, res) => {
    try {
        const {
            sku,
            productTitle,
            shortDescription,
            fullDescription,
            keyFeatures,
            specificationsTable,
            seoMetaTitle,
            seoMetaDescription,
            productTags,
            productCategories,
            isFeatured = false
        } = req.body;

        // Check if SKU already exists
        const existingProduct = await Product.skuExists(sku);
        if (existingProduct) {
            // Delete uploaded files if product already exists
            if (req.fileUrls) {
                deleteFiles(req.fileUrls);
            }

            return res.status(400).json({
                success: false,
                message: 'Product with this SKU already exists'
            });
        }

        // Verify all categories exist
        const categories = await Category.find({
            _id: { $in: productCategories },
            isActive: true
        });

        if (categories.length !== productCategories.length) {
            // Delete uploaded files if categories don't exist
            if (req.fileUrls) {
                deleteFiles(req.fileUrls);
            }

            return res.status(400).json({
                success: false,
                message: 'One or more categories do not exist or are inactive'
            });
        }

        // Create new product
        const product = new Product({
            sku: sku.toUpperCase(),
            productTitle,
            shortDescription,
            fullDescription,
            keyFeatures,
            specificationsTable,
            seoMetaTitle,
            seoMetaDescription,
            productTags,
            productCategories,
            productImageUrls: req.fileUrls,
            isFeatured
        });

        await product.save();

        // Populate categories for response
        await product.populate('productCategories', 'collectionName collectionTitle');

        res.status(201).json({
            success: true,
            message: 'Product created successfully',
            data: {
                product
            }
        });
    } catch (error) {
        // Delete uploaded files if error occurs
        if (req.fileUrls) {
            deleteFiles(req.fileUrls);
        }

        console.error('Create product error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create product'
        });
    }
});

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
    body('isActive')
        .optional()
        .isBoolean().withMessage('isActive must be a boolean'),
    body('isFeatured')
        .optional()
        .isBoolean().withMessage('isFeatured must be a boolean'),
    handleValidationErrors
], async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Check if SKU already exists (if being updated)
        if (req.body.sku && req.body.sku.toUpperCase() !== product.sku) {
            const existingProduct = await Product.skuExists(req.body.sku, req.params.id);
            if (existingProduct) {
                return res.status(400).json({
                    success: false,
                    message: 'Product with this SKU already exists'
                });
            }
        }

        // Verify categories exist (if being updated)
        if (req.body.productCategories) {
            const categories = await Category.find({
                _id: { $in: req.body.productCategories },
                isActive: true
            });

            if (categories.length !== req.body.productCategories.length) {
                return res.status(400).json({
                    success: false,
                    message: 'One or more categories do not exist or are inactive'
                });
            }
        }

        // Update product
        if (req.body.sku) {
            req.body.sku = req.body.sku.toUpperCase();
        }

        Object.assign(product, req.body);
        await product.save();

        // Populate categories for response
        await product.populate('productCategories', 'collectionName collectionTitle');

        res.json({
            success: true,
            message: 'Product updated successfully',
            data: {
                product
            }
        });
    } catch (error) {
        console.error('Update product error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update product'
        });
    }
});

// @route   PUT /api/products/:id/images
// @desc    Update product images
// @access  Private (Admin only)
router.put('/:id/images', [
    authenticateToken,
    requireAdmin,
    param('id').custom(isValidObjectId).withMessage('Invalid product ID'),
    uploadMultiple,
    handleValidationErrors
], async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            // Delete uploaded files if product not found
            if (req.fileUrls) {
                deleteFiles(req.fileUrls);
            }

            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Delete old images
        if (product.productImageUrls && product.productImageUrls.length > 0) {
            deleteFiles(product.productImageUrls);
        }

        // Update image URLs
        product.productImageUrls = req.fileUrls;
        await product.save();

        res.json({
            success: true,
            message: 'Product images updated successfully',
            data: {
                product
            }
        });
    } catch (error) {
        // Delete uploaded files if error occurs
        if (req.fileUrls) {
            deleteFiles(req.fileUrls);
        }

        console.error('Update product images error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update product images'
        });
    }
});

// @route   DELETE /api/products/:id
// @desc    Delete product
// @access  Private (Admin only)
router.delete('/:id', [
    authenticateToken,
    requireAdmin,
    param('id').custom(isValidObjectId).withMessage('Invalid product ID'),
    handleValidationErrors
], async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Delete product images
        if (product.productImageUrls && product.productImageUrls.length > 0) {
            deleteFiles(product.productImageUrls);
        }

        // Delete product
        await Product.findByIdAndDelete(req.params.id);

        res.json({
            success: true,
            message: 'Product deleted successfully'
        });
    } catch (error) {
        console.error('Delete product error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete product'
        });
    }
});

module.exports = router;
