const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const categoryRoutes = require('./routes/categories');
const subcollectionRoutes = require('./routes/subcollections');
const publicRoutes = require('./routes/public');
const productRoutes = require('./routes/products');
require('./models/SubCollection');
require('./models/UrlRedirect');
const seoRoutes = require('./routes/seo');
const blogRoutes = require('./routes/blogs');
const testimonialRoutes = require('./routes/testimonials');
const faqRoutes = require('./routes/faqs');
const leadRoutes = require('./routes/leads');

const app = express();

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(compression());
app.use(cors());

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve /uploads only when running locally (not in Lambda)
if (!process.env.AWS_LAMBDA_FUNCTION_NAME) {
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
}

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Admin Panel API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/subcollections', subcollectionRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/products', productRoutes);
app.use('/api/seo', seoRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/testimonials', testimonialRoutes);
app.use('/api/faqs', faqRoutes);
app.use('/api/leads', leadRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
  });
});

app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

module.exports = app;
