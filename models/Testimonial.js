const mongoose = require('mongoose');

const testimonialSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true,
            maxlength: [120, 'Name is too long']
        },
        location: {
            type: String,
            trim: true,
            maxlength: [120, 'Location is too long']
        },
        text: {
            type: String,
            required: [true, 'Testimonial text is required'],
            trim: true,
            maxlength: [2000, 'Text is too long']
        },
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5,
            default: 5
        },
        avatarUrl: {
            type: String,
            trim: true
        },
        sortOrder: {
            type: Number,
            default: 0
        },
        isActive: {
            type: Boolean,
            default: true
        }
    },
    { timestamps: true }
);

testimonialSchema.index({ isActive: 1, sortOrder: 1 });

module.exports = mongoose.model('Testimonial', testimonialSchema);
