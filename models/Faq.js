const mongoose = require('mongoose');

const faqSchema = new mongoose.Schema(
    {
        question: {
            type: String,
            required: [true, 'Question is required'],
            trim: true,
            maxlength: [500, 'Question is too long']
        },
        answer: {
            type: String,
            required: [true, 'Answer is required'],
            trim: true,
            maxlength: [5000, 'Answer is too long']
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

faqSchema.index({ isActive: 1, sortOrder: 1 });

module.exports = mongoose.model('Faq', faqSchema);
