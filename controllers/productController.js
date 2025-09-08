const Product = require('../models/Product');
const Category = require('../models/Category');
const { deleteFiles } = require('../middleware/upload');

// @desc    Get all products with pagination and filtering
// @access  Private
const getProducts = async (req, res) => {
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
};

// @desc    Get all active products (for frontend use)
// @access  Public
const getActiveProducts = async (req, res) => {
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
};

// @desc    Get featured products
// @access  Public
const getFeaturedProducts = async (req, res) => {
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
};

// @desc    Get products by category
// @access  Public
const getProductsByCategory = async (req, res) => {
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
};

// @desc    Get product by ID
// @access  Private
const getProductById = async (req, res) => {
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
};

// @desc    Create new product
// @access  Private (Admin only)
const createProduct = async (req, res) => {
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
            productImageAlts,
            isFeatured = false
        } = req.body;

        // Convert productCategories from string to array if needed
        const categoriesArray = Array.isArray(productCategories) 
            ? productCategories 
            : productCategories ? productCategories.split(',').map(id => id.trim()) : [];

        console.log(req.body);

        // Check if product with same SKU already exists
        const existingProduct = await Product.findOne({ sku });
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
            _id: { $in: categoriesArray },
            isActive: true
        });

        if (categories.length !== categoriesArray.length) {
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
            productCategories: categoriesArray,
            productImageUrls: req.fileUrls,
            productImageAlts,
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
};

// @desc    Update product
// @access  Private (Admin only)
const updateProduct = async (req, res) => {
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
};

// @desc    Update product images
// @access  Private (Admin only)
const updateProductImages = async (req, res) => {
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

        // Update image URLs and alt texts
        product.productImageUrls = req.fileUrls;
        // If alt texts are provided, update them; otherwise keep existing ones
        if (req.body.productImageAlts) {
            product.productImageAlts = req.body.productImageAlts;
        }
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
};

// @desc    Delete product
// @access  Private (Admin only)
const deleteProduct = async (req, res) => {
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
};

module.exports = {
    getProducts,
    getActiveProducts,
    getFeaturedProducts,
    getProductsByCategory,
    getProductById,
    createProduct,
    updateProduct,
    updateProductImages,
    deleteProduct
};
