const Category = require('../models/Category');
const Product = require('../models/Product');
const SubCollection = require('../models/SubCollection');
const { deleteStoredFile } = require('../middleware/upload');
const { upsertCategoryRoute, removeCategoryRoute } = require('../utils/seoSync');

// @desc    Get all categories with pagination and filtering
// @access  Private
const getCategories = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 100;
        const skip = (page - 1) * limit;

        const { search, option, active } = req.query;

        // Build query
        let query = {};

        if (search) {
            query = {
                $or: [
                    { collectionName: { $regex: search, $options: 'i' } },
                    { collectionTitle: { $regex: search, $options: 'i' } },
                    { seoMetaTitle: { $regex: search, $options: 'i' } }
                ]
            };
        }

        if (option) {
            query.categoryOption = option;
        }

        if (active !== undefined) {
            query.isActive = active === 'true';
        }

        // Execute query with pagination
        const categories = await Category.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        // Get total count for pagination
        const total = await Category.countDocuments(query);

        res.json({
            success: true,
            data: {
                categories,
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
        console.error('Get categories error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get categories'
        });
    }
};

// @desc    Get all active categories (for frontend use)
// @access  Public
const getActiveCategories = async (req, res) => {
    try {

        const categories = await Category.find({ isActive: true, categoryOption: 'normal' });


        res.json({
            success: true,
            data: {
                categories
            }
        });
    } catch (error) {
        console.error('Get active categories error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get active categories'
        });
    }
};



const getNavigationTree = async (req, res) => {
    try {
        const categories = await Category.find({
            isActive: true,
            categoryOption: 'normal',
            showInNavigation: { $ne: false },
        })
            .sort({ navOrder: 1, createdAt: 1 })
            .select('collectionName collectionTitle slug photoUrl')
            .lean();

        const catIds = categories.map((c) => c._id);
        const subs = await SubCollection.find({ collection: { $in: catIds }, isActive: true })
            .sort({ sortOrder: 1, createdAt: 1 })
            .select('name slug collection imageUrl')
            .lean();

        const byCol = {};
        for (const s of subs) {
            const k = String(s.collection);
            if (!byCol[k]) byCol[k] = [];
            byCol[k].push(s);
        }

        const tree = categories.map((c) => ({
            ...c,
            subCollections: byCol[String(c._id)] || [],
        }));

        res.json({ success: true, data: { categories: tree } });
    } catch (error) {
        console.error('Navigation tree error:', error);
        res.status(500).json({ success: false, message: 'Failed to load navigation' });
    }
};

const getActiveGiftingCategories = async (req, res) => {
    try {
        const categories = await Category.find({ isActive: true, categoryOption: 'gifting' });

        res.json({
            success: true,
            data: {
                categories
            }
        });
    } catch (error) {
        console.error('Get active categories error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get active categories'
        });
    }
}

// @desc    Get category by ID
// @access  Private
const getCategoryById = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        res.json({
            success: true,
            data: {
                category
            }
        });
    } catch (error) {
        console.error('Get category error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get category'
        });
    }
};

// @desc    Create new category
// @access  Private (Admin only)
const createCategory = async (req, res) => {
    try {
        const {
            collectionName,
            collectionTitle,
            seoMetaTitle,
            metaDescription,
            introParagraph,
            categoryOption,
            photoAlt,
            slugManual,
            showInNavigation,
            navOrder,
        } = req.body;

        const navFlag = showInNavigation === undefined ? true : showInNavigation === true || showInNavigation === 'true';
        const navOrd = navOrder !== undefined && navOrder !== '' ? Number(navOrder) : 0;

        // Check if collection name already exists
        const existingCategory = await Category.findOne({
            collectionName: { $regex: new RegExp(`^${collectionName}$`, 'i') }
        });

        if (existingCategory) {
            if (req.fileUrl) {
                await deleteStoredFile(req.fileUrl);
            }

            return res.status(400).json({
                success: false,
                message: 'Category with this name already exists'
            });
        }

        // Create new category
        const category = new Category({
            collectionName,
            collectionTitle,
            seoMetaTitle,
            metaDescription,
            introParagraph,
            categoryOption,
            photoUrl: req.fileUrl,
            photoAlt,
            slugManual: slugManual || undefined,
            showInNavigation: navFlag,
            navOrder: Number.isFinite(navOrd) ? navOrd : 0,
        });

        await category.save();
        upsertCategoryRoute(category).catch(e => console.error('SEO sync (category create):', e));

        res.status(201).json({
            success: true,
            message: 'Category created successfully',
            data: {
                category
            }
        });
    } catch (error) {
        if (req.fileUrl) {
            await deleteStoredFile(req.fileUrl);
        }

        console.error('Create category error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create category'
        });
    }
};

// @desc    Update category
// @access  Private (Admin only)
const updateCategory = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        // Check if collection name already exists (if being updated)
        if (req.body.collectionName && req.body.collectionName !== category.collectionName) {
            const existingCategory = await Category.findOne({
                collectionName: { $regex: new RegExp(`^${req.body.collectionName}$`, 'i') },
                _id: { $ne: req.params.id }
            });

            if (existingCategory) {
                return res.status(400).json({
                    success: false,
                    message: 'Category with this name already exists'
                });
            }
        }

        // Update category
        Object.assign(category, req.body);
        await category.save();
        upsertCategoryRoute(category).catch(e => console.error('SEO sync (category update):', e));

        res.json({
            success: true,
            message: 'Category updated successfully',
            data: {
                category
            }
        });
    } catch (error) {
        console.error('Update category error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update category'
        });
    }
};

// @desc    Update category photo
// @access  Private (Admin only)
const updateCategoryPhoto = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);

        if (!category) {
            if (req.fileUrl) {
                await deleteStoredFile(req.fileUrl);
            }

            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        if (category.photoUrl) {
            await deleteStoredFile(category.photoUrl);
        }

        // Update photo URL
        category.photoUrl = req.fileUrl;
        await category.save();

        res.json({
            success: true,
            message: 'Category photo updated successfully',
            data: {
                category
            }
        });
    } catch (error) {
        if (req.fileUrl) {
            await deleteStoredFile(req.fileUrl);
        }

        console.error('Update category photo error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update category photo'
        });
    }
};

// @desc    Delete category
// @access  Private (Admin only)
const deleteCategory = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        const hasSubs = await SubCollection.findOne({ collection: req.params.id });
        if (hasSubs) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete category. Remove or reassign its subcollections first.'
            });
        }

        const productsUsingCategory = await Product.findOne({
            productCategories: req.params.id
        });

        if (productsUsingCategory) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete category. It is being used by one or more products.'
            });
        }

        if (category.photoUrl) {
            await deleteStoredFile(category.photoUrl);
        }

        // Delete category
        removeCategoryRoute(category).catch(e => console.error('SEO sync (category delete):', e));
        await Category.findByIdAndDelete(req.params.id);

        res.json({
            success: true,
            message: 'Category deleted successfully'
        });
    } catch (error) {
        console.error('Delete category error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete category'
        });
    }
};

module.exports = {
    getCategories,
    getActiveCategories,
    getNavigationTree,
    getCategoryById,
    createCategory,
    updateCategory,
    updateCategoryPhoto,
    deleteCategory,

    getActiveGiftingCategories

};
