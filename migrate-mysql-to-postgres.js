// MySQL to PostgreSQL Migration Script
// Run this locally with Node.js to export your MySQL data for PostgreSQL import

const mysql = require('mysql2/promise');
const fs = require('fs');

// MySQL connection configuration
const mysqlConfig = {
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'golan'
};

async function migrateData() {
    console.log('Starting MySQL to PostgreSQL migration...');
    
    let connection;
    try {
        // Connect to MySQL
        connection = await mysql.createConnection(mysqlConfig);
        console.log('Connected to MySQL database');
        
        // Export users
        console.log('\nExporting users...');
        const [users] = await connection.execute('SELECT * FROM users');
        const usersInserts = users.map(user => {
            return `INSERT INTO users (id, first_name, last_name, email, password, role, created_at) VALUES (${user.id}, ${escapeString(user.first_name)}, ${escapeString(user.last_name)}, ${escapeString(user.email)}, ${escapeString(user.password)}, ${escapeString(user.role || 'user')}, '${user.created_at || new Date().toISOString()}') ON CONFLICT (id) DO NOTHING;`;
        }).join('\n');
        
        // Export products
        console.log('Exporting products...');
        const [products] = await connection.execute('SELECT * FROM products');
        const productsInserts = products.map(product => {
            return `INSERT INTO products (id, name, description, price, image, image_url, category, gender, sizes, stock, rating, created_at) VALUES (${product.id}, ${escapeString(product.name)}, ${escapeString(product.description || '')}, ${product.price}, ${escapeString(product.image || '')}, ${escapeString(product.image_url || '')}, ${escapeString(product.category || 'Other')}, ${escapeString(product.gender || 'unisex')}, ${escapeString(product.sizes || 'S,M,L,XL,XXL')}, ${product.stock || 0}, ${product.rating || 0}, '${product.created_at || new Date().toISOString()}') ON CONFLICT (id) DO NOTHING;`;
        }).join('\n');
        
        // Export orders
        console.log('Exporting orders...');
        const [orders] = await connection.execute('SELECT * FROM orders');
        const ordersInserts = orders.map(order => {
            return `INSERT INTO orders (id, order_number, total_amount, first_name, last_name, email, address, city, state, zip_code, status, created_at) VALUES (${order.id}, ${escapeString(order.order_number)}, ${order.total_amount}, ${escapeString(order.first_name || '')}, ${escapeString(order.last_name || '')}, ${escapeString(order.email || '')}, ${escapeString(order.address || '')}, ${escapeString(order.city || '')}, ${escapeString(order.state || '')}, ${escapeString(order.zip_code || '')}, ${escapeString(order.status || 'Processing')}, '${order.created_at || new Date().toISOString()}') ON CONFLICT (id) DO NOTHING;`;
        }).join('\n');
        
        // Export order items
        console.log('Exporting order items...');
        const [orderItems] = await connection.execute('SELECT * FROM order_items');
        const orderItemsInserts = orderItems.map(item => {
            return `INSERT INTO order_items (id, order_id, product_id, quantity, price, size) VALUES (${item.id}, ${item.order_id}, ${item.product_id}, ${item.quantity}, ${item.price}, ${escapeString(item.size || 'M')}) ON CONFLICT (id) DO NOTHING;`;
        }).join('\n');
        
        // Combine all exports
        const sqlFile = `-- Data Migration from MySQL to PostgreSQL
-- Run this in your Vercel Postgres database

-- Users data
${usersInserts ? usersInserts : '-- No users to migrate'}

-- Products data
${productsInserts ? productsInserts : '-- No products to migrate'}

-- Orders data
${ordersInserts ? ordersInserts : '-- No orders to migrate'}

-- Order items data
${orderItemsInserts ? orderItemsInserts : '-- No order items to migrate'}
`;
        
        // Save to file
        fs.writeFileSync('migrated-data.sql', sqlFile);
        console.log('\n✅ Migration complete!');
        console.log(`📄 Data exported to: migrated-data.sql`);
        console.log(`📊 Statistics:`);
        console.log(`   - Users: ${users.length}`);
        console.log(`   - Products: ${products.length}`);
        console.log(`   - Orders: ${orders.length}`);
        console.log(`   - Order Items: ${orderItems.length}`);
        console.log('\nNext steps:');
        console.log('1. Upload migrated-data.sql to Vercel Postgres');
        console.log('2. Run the SQL file in your Vercel Postgres dashboard');
        console.log('3. Your data will be available in the deployed application');
        
    } catch (error) {
        console.error('Migration failed:', error.message);
        console.error('Make sure MySQL is running and credentials are correct in the script');
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

function escapeString(str) {
    if (str === null || str === undefined) return 'NULL';
    return `'${String(str).replace(/'/g, "''")}'`;
}

// Run migration
migrateData();
