# Admin Panel Backend API

A comprehensive REST API backend for the admin panel built with Node.js, Express, and MongoDB.

## 🚀 Features

- **Authentication & Authorization**

  - JWT-based authentication
  - Password encryption with bcrypt
  - Role-based access control (Admin/User)
  - Token verification middleware

- **Category Management**

  - Create, read, update, delete categories
  - Image upload support (WebP format)
  - SEO metadata management
  - Category options (Normal/Gifting)
  - Slug generation

- **Product Management**

  - Create, read, update, delete products
  - Multiple image upload (up to 5 images)
  - SKU validation (unique)
  - Category associations
  - Specifications table (JSON format)
  - SEO optimization
  - Featured products

- **File Upload**

  - WebP image format validation
  - File size limits (1MB per file)
  - Automatic file cleanup
  - Organized storage structure

- **Security Features**
  - Input validation and sanitization
  - Rate limiting
  - CORS configuration
  - Helmet security headers
  - Error handling

## 📋 Prerequisites

- Node.js (v16 or higher)
- MongoDB (v4.4 or higher)
- npm or pnpm

## 🛠️ Installation

1. **Clone the repository and navigate to backend folder**

   ```bash
   cd backend
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Create environment file**

   ```bash
   cp env.example .env
   ```

4. **Configure environment variables**
   Edit `.env` file with your configuration:

   ```env
   PORT=5000
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/admin-panel
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   JWT_EXPIRES_IN=24h
   MAX_FILE_SIZE=1048576
   UPLOAD_PATH=./uploads
   MAX_FILES_PER_PRODUCT=5
   ADMIN_EMAIL=admin@example.com
   ADMIN_PASSWORD=admin123
   ```

5. **Setup database**

   ```bash
   npm run setup
   ```

6. **Start the server**
   ```bash
   npm run dev
   ```

## 📚 API Documentation

### Base URL

```
http://localhost:5000/api
```

### Authentication Endpoints

#### Login

```http
POST /auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "admin123"
}
```

#### Register (Admin only)

```http
POST /auth/register
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": "newadmin@example.com",
  "password": "password123",
  "role": "admin"
}
```

#### Get Profile

```http
GET /auth/profile
Authorization: Bearer <token>
```

#### Update Profile

```http
PUT /auth/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": "updated@example.com",
  "password": "newpassword123"
}
```

### Category Endpoints

#### Get All Categories

```http
GET /categories?page=1&limit=10&search=electronics&option=normal&active=true
Authorization: Bearer <token>
```

#### Get Active Categories (Public)

```http
GET /categories/active
```

#### Get Category by ID

```http
GET /categories/:id
Authorization: Bearer <token>
```

#### Create Category

```http
POST /categories
Authorization: Bearer <token>
Content-Type: multipart/form-data

{
  "collectionName": "Electronics",
  "collectionTitle": "Latest Electronics Collection",
  "seoMetaTitle": "Electronics - Best Tech Products",
  "metaDescription": "Discover the latest electronics and tech products.",
  "introParagraph": "Explore our comprehensive collection...",
  "categoryOption": "normal",
  "photo": [file]
}
```

#### Update Category

```http
PUT /categories/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "collectionName": "Updated Electronics",
  "isActive": true
}
```

#### Update Category Photo

```http
PUT /categories/:id/photo
Authorization: Bearer <token>
Content-Type: multipart/form-data

{
  "photo": [file]
}
```

#### Delete Category

```http
DELETE /categories/:id
Authorization: Bearer <token>
```

### Product Endpoints

#### Get All Products

```http
GET /products?page=1&limit=10&search=headphones&category=categoryId&featured=true&active=true
Authorization: Bearer <token>
```

#### Get Active Products (Public)

```http
GET /products/active
```

#### Get Featured Products (Public)

```http
GET /products/featured
```

#### Get Products by Category (Public)

```http
GET /products/category/:categoryId
```

#### Get Product by ID

```http
GET /products/:id
Authorization: Bearer <token>
```

#### Create Product

```http
POST /products
Authorization: Bearer <token>
Content-Type: multipart/form-data

{
  "sku": "HP-WIRELESS-001",
  "productTitle": "Premium Wireless Headphones",
  "shortDescription": "Immersive audio experience with noise cancellation.",
  "fullDescription": "Experience crystal-clear sound...",
  "keyFeatures": "Noise Cancellation\nBluetooth 5.0\n40-Hour Battery Life",
  "specificationsTable": "{\"Weight\": \"250g\", \"Color\": \"Black\"}",
  "seoMetaTitle": "Wireless Headphones - Best Audio",
  "seoMetaDescription": "Shop premium wireless headphones...",
  "productTags": "audio, headphones, wireless, tech",
  "productCategories": ["categoryId1", "categoryId2"],
  "isFeatured": true,
  "images": [file1, file2, file3]
}
```

#### Update Product

```http
PUT /products/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "productTitle": "Updated Product Title",
  "isActive": true,
  "isFeatured": false
}
```

#### Update Product Images

```http
PUT /products/:id/images
Authorization: Bearer <token>
Content-Type: multipart/form-data

{
  "images": [file1, file2, file3, file4, file5]
}
```

#### Delete Product

```http
DELETE /products/:id
Authorization: Bearer <token>
```

## 🔐 Authentication

All protected endpoints require a JWT token in the Authorization header:

```http
Authorization: Bearer <your-jwt-token>
```

## 📁 File Upload

### Supported Formats

- **Images**: WebP only
- **Max File Size**: 1MB per file
- **Max Files per Product**: 5 images

### Upload Structure

```
uploads/
├── categories/
│   └── photo-timestamp-random.webp
└── products/
    ├── images-timestamp-random.webp
    ├── images-timestamp-random.webp
    └── ...
```

## 🗄️ Database Schema

### User Model

```javascript
{
  email: String (unique, required),
  password: String (hashed, required),
  role: String (enum: ['admin', 'user']),
  isActive: Boolean,
  lastLogin: Date,
  timestamps: true
}
```

### Category Model

```javascript
{
  collectionName: String (required, max 100),
  collectionTitle: String (required, max 200),
  seoMetaTitle: String (required, max 60),
  metaDescription: String (required, max 160),
  introParagraph: String (required, max 1000),
  photoUrl: String (required),
  categoryOption: String (enum: ['normal', 'gifting']),
  slug: String (unique, auto-generated),
  isActive: Boolean,
  timestamps: true
}
```

### Product Model

```javascript
{
  sku: String (unique, required, max 50),
  productTitle: String (required, max 200),
  shortDescription: String (required, max 500),
  fullDescription: String (required, max 5000),
  keyFeatures: String (required, max 2000),
  specificationsTable: String (JSON, required),
  seoMetaTitle: String (required, max 60),
  seoMetaDescription: String (required, max 160),
  productTags: String (required, max 500),
  productCategories: [ObjectId] (ref: Category, required),
  productImageUrls: [String] (max 5),
  slug: String (unique, auto-generated),
  isActive: Boolean,
  isFeatured: Boolean,
  timestamps: true
}
```

## 🚨 Error Handling

The API returns consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "fieldName",
      "message": "Validation error message",
      "value": "invalid value"
    }
  ]
}
```

## 🔧 Development

### Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm run setup` - Initialize database with sample data

### Environment Variables

- `PORT` - Server port (default: 5000)
- `NODE_ENV` - Environment (development/production)
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - JWT signing secret
- `JWT_EXPIRES_IN` - JWT expiration time
- `MAX_FILE_SIZE` - Maximum file size in bytes
- `UPLOAD_PATH` - File upload directory
- `MAX_FILES_PER_PRODUCT` - Maximum images per product
- `ADMIN_EMAIL` - Default admin email
- `ADMIN_PASSWORD` - Default admin password

## 🧪 Testing

Test the API endpoints using tools like:

- Postman
- Insomnia
- curl
- Thunder Client (VS Code extension)

### Example curl commands

#### Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'
```

#### Create Category

```bash
curl -X POST http://localhost:5000/api/categories \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "collectionName=Electronics" \
  -F "collectionTitle=Latest Electronics" \
  -F "seoMetaTitle=Electronics - Best Tech" \
  -F "metaDescription=Discover latest electronics" \
  -F "introParagraph=Explore our collection..." \
  -F "categoryOption=normal" \
  -F "photo=@/path/to/image.webp"
```

## 📝 License

This project is licensed under the ISC License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For support and questions, please open an issue in the repository.
