const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = process.env.UPLOAD_PATH || './uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Create subdirectories for different types
        const type = req.uploadType || 'general';
        const typeDir = path.join(uploadDir, type);

        if (!fs.existsSync(typeDir)) {
            fs.mkdirSync(typeDir, { recursive: true });
        }

        cb(null, typeDir);
    },
    filename: function (req, file, cb) {
        // Generate unique filename with timestamp
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

// File filter function
const fileFilter = (req, file, cb) => {
    // Check file type
    if (file.mimetype !== 'image/webp') {
        return cb(new Error('Only WebP images are allowed'), false);
    }

    // Check file size (1MB = 1048576 bytes)
    const maxSize = parseInt(process.env.MAX_FILE_SIZE) || 1048576;
    if (file.size > maxSize) {
        return cb(new Error(`File size must be less than ${maxSize / 1024 / 1024}MB`), false);
    }

    cb(null, true);
};

// Create multer instance
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 1048576, // 1MB
        files: parseInt(process.env.MAX_FILES_PER_PRODUCT) || 5
    }
});

// Middleware for single file upload (categories)
const uploadSingle = (req, res, next) => {
    req.uploadType = 'categories';
    upload.single('photo')(req, res, (err) => {
        if (err) {
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({
                        success: false,
                        message: 'File size too large. Maximum 1MB allowed.'
                    });
                }
                if (err.code === 'LIMIT_FILE_COUNT') {
                    return res.status(400).json({
                        success: false,
                        message: 'Too many files uploaded.'
                    });
                }
            }
            return res.status(400).json({
                success: false,
                message: err.message
            });
        }

        // Add file URL to request if file was uploaded
        if (req.file) {
            req.fileUrl = `/uploads/categories/${req.file.filename}`;
        }
        next();
    });
};

// Middleware for multiple file upload (products)
const uploadMultiple = (req, res, next) => {
    req.uploadType = 'products';
    upload.array('images', parseInt(process.env.MAX_FILES_PER_PRODUCT) || 5)(req, res, (err) => {
        if (err) {
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({
                        success: false,
                        message: 'File size too large. Maximum 1MB allowed per file.'
                    });
                }
                if (err.code === 'LIMIT_FILE_COUNT') {
                    return res.status(400).json({
                        success: false,
                        message: `Too many files. Maximum ${process.env.MAX_FILES_PER_PRODUCT || 5} files allowed.`
                    });
                }
            }
            return res.status(400).json({
                success: false,
                message: err.message
            });
        }

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Please upload at least one image file'
            });
        }

        // Add file URLs to request
        req.fileUrls = req.files.map(file => `/uploads/products/${file.filename}`);
        next();
    });
};

// Function to delete file
const deleteFile = (filePath) => {
    try {
        const fullPath = path.join(__dirname, '..', filePath.replace(/^\//, ''));
        if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error deleting file:', error);
        return false;
    }
};

// Function to delete multiple files
const deleteFiles = (filePaths) => {
    if (!Array.isArray(filePaths)) {
        filePaths = [filePaths];
    }

    return filePaths.map(filePath => deleteFile(filePath));
};

const blogImageMime = new Set(['image/webp', 'image/jpeg', 'image/jpg', 'image/png']);

const blogMaxSize = parseInt(process.env.BLOG_MAX_FILE_SIZE, 10) || 2097152; // 2MB default

const blogStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const type = req.uploadType || 'blogs';
        const typeDir = path.join(uploadDir, type);
        if (!fs.existsSync(typeDir)) {
            fs.mkdirSync(typeDir, { recursive: true });
        }
        cb(null, typeDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname) || '.webp';
        cb(null, 'blog-' + uniqueSuffix + ext);
    }
});

const blogFileFilter = (req, file, cb) => {
    if (!blogImageMime.has(file.mimetype)) {
        return cb(new Error('Only WebP, JPEG, or PNG images are allowed'), false);
    }
    cb(null, true);
};

const uploadBlogMulter = multer({
    storage: blogStorage,
    fileFilter: blogFileFilter,
    limits: {
        fileSize: blogMaxSize,
        files: 1
    }
});

const uploadBlogSingle = (req, res, next) => {
    req.uploadType = 'blogs';
    uploadBlogMulter.single('image')(req, res, (err) => {
        if (err) {
            if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    success: false,
                    message: `File too large. Maximum ${blogMaxSize / 1024 / 1024}MB allowed.`
                });
            }
            return res.status(400).json({
                success: false,
                message: err.message
            });
        }
        if (req.file) {
            req.fileUrl = `/uploads/blogs/${req.file.filename}`;
        }
        next();
    });
};

const uploadBlogCover = (req, res, next) => {
    req.uploadType = 'blogs';
    uploadBlogMulter.single('cover')(req, res, (err) => {
        if (err) {
            if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    success: false,
                    message: `File too large. Maximum ${blogMaxSize / 1024 / 1024}MB allowed.`
                });
            }
            return res.status(400).json({
                success: false,
                message: err.message
            });
        }
        if (req.file) {
            req.fileUrl = `/uploads/blogs/${req.file.filename}`;
        }
        next();
    });
};

const uploadTestimonialAvatar = (req, res, next) => {
    req.uploadType = 'blogs';
    uploadBlogMulter.single('avatar')(req, res, (err) => {
        if (err) {
            if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    success: false,
                    message: `File too large. Maximum ${blogMaxSize / 1024 / 1024}MB allowed.`
                });
            }
            return res.status(400).json({
                success: false,
                message: err.message
            });
        }
        if (req.file) {
            req.fileUrl = `/uploads/blogs/${req.file.filename}`;
        }
        next();
    });
};

module.exports = {
    uploadSingle,
    uploadMultiple,
    uploadBlogSingle,
    uploadBlogCover,
    uploadTestimonialAvatar,
    deleteFile,
    deleteFiles
};
