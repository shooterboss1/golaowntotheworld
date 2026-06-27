# Golaown to the World - E-commerce Website

A modern e-commerce platform for streetwear clothing with full shopping cart, user authentication, and admin dashboard.

## Features

- Product browsing with categories (Men, Women, Clearance)
- Shopping cart functionality
- User registration and login
- Order tracking
- Admin dashboard for product/order management
- Payment integration (Stripe, PayPal)
- Responsive design

## Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Node.js Serverless Functions (Vercel)
- **Database**: Vercel Postgres (PostgreSQL)
- **Hosting**: Vercel
- **Authentication**: bcryptjs for password hashing

## Project Structure

```
├── api/                    # Serverless API endpoints
│   ├── auth.js            # User authentication (register, login)
│   ├── products.js        # Product CRUD operations
│   ├── orders.js          # Order management
│   └── admin.js           # Admin dashboard data
├── assets/                # Images and static assets
├── *.html                 # Frontend pages
├── api-client.js          # API client for frontend
├── styles.css             # Global styles
├── package.json           # Node.js dependencies
└── vercel.json            # Vercel configuration
```

## Deployment Instructions (Vercel)

### Prerequisites

1. A Vercel account (free tier available)
2. A GitHub account
3. Vercel Postgres database (free tier available)

### Step 1: Set up Vercel Postgres

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Navigate to your project's Storage tab
3. Create a new Postgres database
4. Copy the connection URLs (POSTGRES_URL, POSTGRES_PRISMA_URL, POSTGRES_URL_NON_POOLING)

### Step 2: Initialize Database Tables

Run the following SQL in your Vercel Postgres database to create the required tables:

```sql
-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    image VARCHAR(255),
    image_url VARCHAR(500),
    category VARCHAR(100),
    gender VARCHAR(20),
    sizes VARCHAR(100),
    stock INT DEFAULT 0,
    rating DECIMAL(3, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255),
    address VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    zip_code VARCHAR(20),
    status VARCHAR(50) DEFAULT 'Processing',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INT REFERENCES orders(id) ON DELETE CASCADE,
    product_id INT REFERENCES products(id),
    quantity INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    size VARCHAR(10) DEFAULT 'M'
);
```

### Step 3: Deploy to Vercel

1. Push your code to GitHub
2. Go to [Vercel](https://vercel.com) and click "Add New Project"
3. Import your GitHub repository
4. Configure environment variables in Vercel project settings:
   - `POSTGRES_URL` (from Vercel Postgres)
   - `POSTGRES_PRISMA_URL` (from Vercel Postgres)
   - `POSTGRES_URL_NON_POOLING` (from Vercel Postgres)
5. Click "Deploy"

### Step 4: Configure Payment (Optional)

For Stripe payments:
- Add `STRIPE_SECRET_KEY` and `STRIPE_PUBLISHABLE_KEY` to environment variables

For PayPal payments:
- Add `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` to environment variables

## Local Development

### Install Dependencies

```bash
npm install
```

### Run Locally with Vercel CLI

```bash
npm run dev
```

This will start the Vercel development server at `http://localhost:3000`

## API Endpoints

- `GET/POST /api/products` - Get/create products
- `GET/PUT/DELETE /api/products?id={id}` - Get/update/delete specific product
- `POST /api/auth?action=register` - Register new user
- `POST /api/auth?action=login` - Login user
- `POST /api/orders?action=create` - Create new order
- `GET /api/orders?orderNumber={number}` - Track order
- `GET /api/admin?action=stats` - Get admin statistics
- `GET /api/admin?action=orders` - Get all orders
- `GET /api/admin?action=users` - Get all users

## License

This project is open source and available for personal and commercial use.
