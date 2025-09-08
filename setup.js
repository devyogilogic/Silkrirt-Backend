const mongoose = require('mongoose');
const User = require('./models/User');
const Category = require('./models/Category');
const Product = require('./models/Product');
require('dotenv').config();

async function setupDatabase() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Create admin user if it doesn't exist
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
        const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

        const existingAdmin = await User.findOne({ email: adminEmail });
        if (!existingAdmin) {
            await User.createAdminUser(adminEmail, adminPassword);
            console.log('✅ Admin user created successfully');
            console.log(`📧 Email: ${adminEmail}`);
            console.log(`🔑 Password: ${adminPassword}`);
        } else {
            console.log('ℹ️  Admin user already exists');
        }

        // Create sample categories if they don't exist
        const sampleCategories = [
            {
                collectionName: 'Electronics',
                collectionTitle: 'Latest Electronics Collection',
                seoMetaTitle: 'Electronics - Best Tech Products',
                metaDescription: 'Discover the latest electronics and tech products with amazing features.',
                introParagraph: 'Explore our comprehensive collection of cutting-edge electronics, from smartphones to smart home devices. We offer the latest technology with competitive prices and excellent customer support.',
                categoryOption: 'normal',
                photoUrl: '/placeholder.svg?height=100&width=100',
                photoAlt: 'Electronics category showing modern tech devices and gadgets'
            },
            {
                collectionName: 'Clothing',
                collectionTitle: 'Fashion & Style Collection',
                seoMetaTitle: 'Clothing - Trendy Fashion Items',
                metaDescription: 'Shop the latest fashion trends and stylish clothing for all occasions.',
                introParagraph: 'Stay ahead of fashion trends with our curated collection of clothing and accessories. From casual wear to formal attire, we have everything you need to express your unique style.',
                categoryOption: 'normal',
                photoUrl: '/placeholder.svg?height=100&width=100',
                photoAlt: 'Clothing category featuring trendy fashion items and stylish apparel'
            },
            {
                collectionName: 'Home Decor',
                collectionTitle: 'Beautiful Home Decor Collection',
                seoMetaTitle: 'Home Decor - Transform Your Space',
                metaDescription: 'Transform your living space with our beautiful home decor items and furniture.',
                introParagraph: 'Create the perfect ambiance in your home with our carefully selected decor items. From wall art to furniture, we help you turn your house into a beautiful, comfortable home.',
                categoryOption: 'normal',
                photoUrl: '/placeholder.svg?height=100&width=100',
                photoAlt: 'Home decor category displaying beautiful furniture and decorative items'
            },
            {
                collectionName: 'Books',
                collectionTitle: 'Amazing Books Collection',
                seoMetaTitle: 'Books - Best Reads & Literature',
                metaDescription: 'Explore our vast collection of books across all genres and interests.',
                introParagraph: 'Dive into the world of literature with our extensive book collection. From bestsellers to classics, fiction to non-fiction, we have books for every reader and every mood.',
                categoryOption: 'normal',
                photoUrl: '/placeholder.svg?height=100&width=100',
                photoAlt: 'Books category showcasing various genres and literature collections'
            },
            {
                collectionName: 'Gifts',
                collectionTitle: 'Perfect Gifts for Everyone',
                seoMetaTitle: 'Gifts - Thoughtful Presents',
                metaDescription: 'Find the perfect gift for your loved ones with our thoughtful gift collection.',
                introParagraph: 'Make every occasion special with our curated gift collection. From birthdays to anniversaries, we have thoughtful and unique gifts that will bring joy to your loved ones.',
                categoryOption: 'gifting',
                photoUrl: '/placeholder.svg?height=100&width=100',
                photoAlt: 'Gifts category featuring thoughtful presents and gift items'
            },
            {
                collectionName: 'Accessories',
                collectionTitle: 'Stylish Accessories Collection',
                seoMetaTitle: 'Accessories - Complete Your Look',
                metaDescription: 'Complete your look with our stylish accessories and fashion items.',
                introParagraph: 'Add the perfect finishing touch to your outfit with our stylish accessories. From jewelry to bags, watches to sunglasses, we have everything you need to complete your look.',
                categoryOption: 'normal',
                photoUrl: '/placeholder.svg?height=100&width=100',
                photoAlt: 'Accessories category displaying stylish jewelry, bags, and fashion accessories'
            }
        ];

        for (const categoryData of sampleCategories) {
            const existingCategory = await Category.findOne({
                collectionName: categoryData.collectionName
            });

            if (!existingCategory) {
                await Category.create(categoryData);
                console.log(`✅ Created category: ${categoryData.collectionName}`);
            }
        }

        // Create sample products if they don't exist
        const categories = await Category.find();
        const electronicsCategory = categories.find(c => c.collectionName === 'Electronics');
        const clothingCategory = categories.find(c => c.collectionName === 'Clothing');
        const booksCategory = categories.find(c => c.collectionName === 'Books');

        if (electronicsCategory && clothingCategory && booksCategory) {
            const sampleProducts = [
                {
                    sku: 'HP-WIRELESS-001',
                    productTitle: 'Premium Wireless Headphones',
                    shortDescription: 'Immersive audio experience with noise cancellation.',
                    fullDescription: 'Experience crystal-clear sound and deep bass with our premium wireless headphones. Designed for comfort and long-lasting battery life, perfect for music lovers and professionals alike. Features advanced noise cancellation technology and premium build quality.',
                    keyFeatures: 'Noise Cancellation\nBluetooth 5.0\n40-Hour Battery Life\nPremium Build Quality\nComfortable Design',
                    specificationsTable: JSON.stringify({
                        "Weight": "250g",
                        "Color": "Black",
                        "Connectivity": "Bluetooth 5.0",
                        "Battery Life": "40 hours",
                        "Charging Time": "2 hours",
                        "Frequency Response": "20Hz-20kHz"
                    }),
                    seoMetaTitle: 'Wireless Headphones - Best Audio',
                    seoMetaDescription: 'Shop premium wireless headphones with noise cancellation and long battery life.',
                    productTags: 'audio, headphones, wireless, tech, music',
                    productCategories: [electronicsCategory._id],
                    productImageUrls: ['/placeholder.svg?height=100&width=100', '/placeholder.svg?height=100&width=100'],
                    productImageAlts: ['Premium wireless headphones in black color', 'Wireless headphones showing comfort design and premium build'],
                    isFeatured: true
                },
                {
                    sku: 'TSHIRT-GRAPHIC-005',
                    productTitle: 'Graphic Print T-Shirt',
                    shortDescription: 'Comfortable cotton t-shirt with unique graphic design.',
                    fullDescription: 'Made from 100% organic cotton, this t-shirt features a vibrant graphic print that stands out. Perfect for casual wear and expressing your unique style. The soft fabric ensures maximum comfort throughout the day.',
                    keyFeatures: '100% Organic Cotton\nUnique Graphic Print\nMachine Washable\nComfortable Fit\nMultiple Sizes Available',
                    specificationsTable: JSON.stringify({
                        "Material": "100% Organic Cotton",
                        "Size": "S, M, L, XL, XXL",
                        "Color": "White",
                        "Care Instructions": "Machine wash cold",
                        "Fit": "Regular fit",
                        "Weight": "180 GSM"
                    }),
                    seoMetaTitle: 'Graphic T-Shirt - Organic Cotton',
                    seoMetaDescription: 'Buy comfortable and stylish graphic print t-shirts made from organic cotton.',
                    productTags: 'clothing, t-shirt, graphic, casual, cotton',
                    productCategories: [clothingCategory._id],
                    productImageUrls: ['/placeholder.svg?height=100&width=100'],
                    productImageAlts: ['Graphic print t-shirt in white color made from organic cotton'],
                    isFeatured: false
                },
                {
                    sku: 'BOOK-FICTION-010',
                    productTitle: 'The Midnight Library',
                    shortDescription: 'A captivating novel about choices and parallel lives.',
                    fullDescription: 'Nora Seed finds herself in a library between life and death, with the chance to undo her regrets and try out different lives. A thought-provoking and heartwarming story that explores the infinite possibilities of life and the choices we make.',
                    keyFeatures: 'Bestselling Novel\nThought-Provoking Plot\nPaperback Edition\nAward-Winning Author\nPerfect Gift',
                    specificationsTable: JSON.stringify({
                        "Author": "Matt Haig",
                        "Genre": "Fiction",
                        "Pages": "304",
                        "Format": "Paperback",
                        "Language": "English",
                        "ISBN": "978-1786892737"
                    }),
                    seoMetaTitle: 'The Midnight Library - Matt Haig',
                    seoMetaDescription: 'Discover "The Midnight Library" by Matt Haig, a novel about life\'s choices.',
                    productTags: 'books, fiction, novel, bestseller, matt-haig',
                    productCategories: [booksCategory._id],
                    productImageUrls: ['/placeholder.svg?height=100&width=100'],
                    productImageAlts: ['The Midnight Library book cover by Matt Haig'],
                    isFeatured: true
                }
            ];

            for (const productData of sampleProducts) {
                const existingProduct = await Product.findOne({ sku: productData.sku });

                if (!existingProduct) {
                    await Product.create(productData);
                    console.log(`✅ Created product: ${productData.productTitle}`);
                }
            }
        }

        console.log('\n🎉 Database setup completed successfully!');
        console.log('\n📋 Next steps:');
        console.log('1. Start the server: npm run dev');
        console.log('2. Access the API at: http://localhost:5000/api');
        console.log('3. Use the admin credentials to login');
        console.log('4. Test the endpoints with Postman or similar tool');

    } catch (error) {
        console.error('❌ Setup failed:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

// Run setup if this file is executed directly
if (require.main === module) {
    setupDatabase();
}

module.exports = setupDatabase;
