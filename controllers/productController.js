const Product = require('../models/Product');
const Category = require('../models/Category');
const SubCollection = require('../models/SubCollection');
const { deleteStoredFiles } = require('../middleware/upload');
const { upsertProductRoute, removeProductRoute } = require('../utils/seoSync');

// @desc    Get all products with pagination and filtering
// @access  Private
const getProducts = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 100;
        const skip = (page - 1) * limit;

        const { search, category, subCollection, featured, active } = req.query;

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

        if (subCollection) {
            query.subCollection = subCollection;
        }

        if (featured !== undefined) {
            query.isFeatured = featured === 'true';
        }

        if (active !== undefined) {
            query.isActive = active === 'true';
        }

        // Execute query with pagination and populate categories
        const products = await Product.find(query)
            .populate('productCategories', 'collectionName collectionTitle slug')
            .populate({
                path: 'subCollection',
                select: 'name slug collection',
                populate: { path: 'collection', select: 'collectionName collectionTitle slug' },
            })
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

// @desc    Public product search
// @access  Public
const searchProductsPublic = async (req, res) => {
    try {
        const q = (req.query.q || '').trim();
        if (!q || q.length < 2) {
            return res.json({ success: true, data: { products: [] } });
        }
        const limit = Math.min(parseInt(req.query.limit, 10) || 10, 20);
        const products = await Product.search(q).limit(limit);
        return res.json({ success: true, data: { products } });
    } catch (error) {
        console.error('Search products error:', error);
        return res.status(500).json({ success: false, message: 'Search failed' });
    }
};

// @desc    Get new arrival products
// @access  Public
const getNewArrivalProducts = async (req, res) => {
    try {
        const products = await Product.getNewArrivalProducts();
        res.json({ success: true, data: { products } });
    } catch (error) {
        console.error('Get new arrival products error:', error);
        res.status(500).json({ success: false, message: 'Failed to get new arrival products' });
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

// @desc    Get products by category collectionTitle (case-insensitive)
// @access  Public
const getProductsByCollectionTitle = async (req, res) => {
    try {
        const { title } = req.params;

        if (!title || typeof title !== 'string') {
            return res.status(400).json({ success: false, message: 'Collection title is required' });
        }

        // Find active category matching collectionTitle (case-insensitive)
        const category = await Category.findOne({
            collectionTitle: { $regex: new RegExp(`^${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
            isActive: true,
        });

        if (!category) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        // Fetch products in this category (active only)
        const [products, productCount] = await Promise.all([
            Product.find({ productCategories: category._id, isActive: true })
                .populate('productCategories', 'collectionName collectionTitle')
                .sort({ createdAt: -1 }),
            Product.countDocuments({ productCategories: category._id, isActive: true }),
        ]);

        return res.json({
            success: true,
            data: {
                collectionTitle: category.collectionTitle,
                introParagraph: category.introParagraph,
                imageUrl: category.photoUrl,
                photoAlt: category.photoAlt,
                seoMetaTitle: category.seoMetaTitle,
                metaDescription: category.metaDescription,
                productCount,
                products,
            },
        });
    } catch (error) {
        console.error('Get products by collectionTitle error:', error);
        return res.status(500).json({ success: false, message: 'Failed to get products by collectionTitle' });
    }
};

// @desc    Get active product by ID (storefront, no auth)
// @access  Public
const getProductPublicById = async (req, res) => {
    try {
        const product = await Product.findOne({
            _id: req.params.id,
            isActive: true
        })
            .populate('productCategories', 'collectionName collectionTitle slug')
            .populate({
                path: 'subCollection',
                select: 'name slug description imageUrl collection',
                populate: { path: 'collection', select: 'collectionName collectionTitle slug' },
            });

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
        console.error('Get public product error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get product'
        });
    }
};

const getProductPublicBySlug = async (req, res) => {
    try {
        const raw = (req.params.slug || '').trim().toLowerCase();
        const product = await Product.findOne({ slug: raw, isActive: true })
            .populate('productCategories', 'collectionName collectionTitle slug')
            .populate({
                path: 'subCollection',
                select: 'name slug description imageUrl collection',
                populate: { path: 'collection', select: 'collectionName collectionTitle slug' },
            });

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        res.json({ success: true, data: { product } });
    } catch (error) {
        console.error('Get public product by slug error:', error);
        res.status(500).json({ success: false, message: 'Failed to get product' });
    }
};

// @desc    Get product by ID
// @access  Private
const getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
            .populate('productCategories', 'collectionName collectionTitle slug')
            .populate({
                path: 'subCollection',
                select: 'name slug collection',
                populate: { path: 'collection', select: 'collectionName collectionTitle slug' },
            });

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

// @desc    Get product by productTitle (case-insensitive exact)
// @access  Public
const getProductByTitle = async (req, res) => {
    try {
        const { title } = req.params;

        if (!title || typeof title !== 'string') {
            return res.status(400).json({ success: false, message: 'Product title is required' });
        }

        // Escape regex special chars and do case-insensitive exact match
        const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const product = await Product.findOne({
            productTitle: { $regex: new RegExp(`^${escaped}$`, 'i') },
            isActive: true,
        }).populate('productCategories', 'collectionName collectionTitle');

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        return res.json({
            success: true,
            data: { product },
        });
    } catch (error) {
        console.error('Get product by title error:', error);
        return res.status(500).json({ success: false, message: 'Failed to get product by title' });
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
            subCollectionId,
            slugManual,
            isFeatured = false
        } = req.body;

        let categoriesArray = Array.isArray(productCategories)
            ? productCategories
            : productCategories ? productCategories.split(',').map(id => id.trim()) : [];

        const existingProduct = await Product.findOne({ sku });
        if (existingProduct) {
            if (req.fileUrls) await deleteStoredFiles(req.fileUrls);
            return res.status(400).json({
                success: false,
                message: 'Product with this SKU already exists'
            });
        }

        let subId = subCollectionId && String(subCollectionId).trim() ? subCollectionId : null;
        if (subId) {
            const sub = await SubCollection.findById(subId);
            if (!sub || !sub.isActive) {
                if (req.fileUrls) await deleteStoredFiles(req.fileUrls);
                return res.status(400).json({
                    success: false,
                    message: 'Subcollection not found or inactive'
                });
            }
            categoriesArray = [];
        } else {
            const categories = await Category.find({
                _id: { $in: categoriesArray },
                isActive: true
            });

            if (categories.length !== categoriesArray.length) {
                if (req.fileUrls) await deleteStoredFiles(req.fileUrls);
                return res.status(400).json({
                    success: false,
                    message: 'One or more categories do not exist or are inactive'
                });
            }
        }

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
            subCollection: subId || undefined,
            productImageUrls: req.fileUrls,
            productImageAlts,
            slugManual: slugManual || undefined,
            isFeatured
        });

        await product.save();
        upsertProductRoute(product).catch(e => console.error('SEO sync (product create):', e));

        await product.populate('productCategories', 'collectionName collectionTitle slug');
        await product.populate({
            path: 'subCollection',
            select: 'name slug collection',
            populate: { path: 'collection', select: 'collectionName collectionTitle slug' },
        });

        res.status(201).json({
            success: true,
            message: 'Product created successfully',
            data: {
                product
            }
        });
    } catch (error) {
        if (req.fileUrls) await deleteStoredFiles(req.fileUrls);

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

        if (req.body.subCollectionId !== undefined) {
            const sid = req.body.subCollectionId;
            if (sid === null || sid === '') {
                product.subCollection = null;
            } else {
                const sub = await SubCollection.findById(sid);
                if (!sub) {
                    return res.status(400).json({ success: false, message: 'Subcollection not found' });
                }
                product.subCollection = sid;
            }
        }

        if (req.body.sku) {
            req.body.sku = req.body.sku.toUpperCase();
        }

        const skipKeys = new Set(['subCollectionId', '_id']);
        for (const key of Object.keys(req.body)) {
            if (skipKeys.has(key)) continue;
            product[key] = req.body[key];
        }

        await product.save();
        upsertProductRoute(product).catch(e => console.error('SEO sync (product update):', e));

        await product.populate('productCategories', 'collectionName collectionTitle slug');
        await product.populate({
            path: 'subCollection',
            select: 'name slug collection',
            populate: { path: 'collection', select: 'collectionName collectionTitle slug' },
        });

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
            if (req.fileUrls) await deleteStoredFiles(req.fileUrls);

            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        if (product.productImageUrls && product.productImageUrls.length > 0) {
            await deleteStoredFiles(product.productImageUrls);
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
        if (req.fileUrls) await deleteStoredFiles(req.fileUrls);

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

        if (product.productImageUrls && product.productImageUrls.length > 0) {
            await deleteStoredFiles(product.productImageUrls);
        }

        removeProductRoute(product).catch(e => console.error('SEO sync (product delete):', e));
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
    searchProductsPublic,
    getNewArrivalProducts,
    getFeaturedProducts,
    getProductsByCategory,
    getProductsByCollectionTitle,
    getProductPublicById,
    getProductPublicBySlug,
    getProductById,
    getProductByTitle,
    createProduct,
    updateProduct,
    updateProductImages,
    deleteProduct
};
