const Category = require('../models/Category');
const Product = require('../models/Product');
const { deleteFile } = require('../middleware/upload');

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



const getActiveGiftingCategories = async (req, res) => {
    try {
        const categories = await Category.find({ isActive: true, type: 'gifting' });

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
            photoAlt
        } = req.body;

        // Check if collection name already exists
        const existingCategory = await Category.findOne({
            collectionName: { $regex: new RegExp(`^${collectionName}$`, 'i') }
        });

        if (existingCategory) {
            // Delete uploaded file if category already exists
            if (req.fileUrl) {
                deleteFile(req.fileUrl);
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
            photoAlt
        });

        await category.save();

        res.status(201).json({
            success: true,
            message: 'Category created successfully',
            data: {
                category
            }
        });
    } catch (error) {
        // Delete uploaded file if error occurs
        if (req.fileUrl) {
            deleteFile(req.fileUrl);
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
            // Delete uploaded file if category not found
            if (req.fileUrl) {
                deleteFile(req.fileUrl);
            }

            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        // Delete old photo if exists
        if (category.photoUrl) {
            deleteFile(category.photoUrl);
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
        // Delete uploaded file if error occurs
        if (req.fileUrl) {
            deleteFile(req.fileUrl);
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

        // Check if category is being used by any products
        const productsUsingCategory = await Product.findOne({
            productCategories: req.params.id
        });

        if (productsUsingCategory) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete category. It is being used by one or more products.'
            });
        }

        // Delete photo file
        if (category.photoUrl) {
            deleteFile(category.photoUrl);
        }

        // Delete category
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
    getCategoryById,
    createCategory,
    updateCategory,
    updateCategoryPhoto,
    deleteCategory,

    getActiveGiftingCategories

};
