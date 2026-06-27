import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { query } = req;
    const { action } = query;

    // Simple security check - in production, use session/JWT
    // For now, we assume the frontend handles basic auth check

    if (action === 'stats') {
      return await getStats();
    } else if (action === 'orders') {
      return await getOrders();
    } else if (action === 'users') {
      return await getUsers();
    } else if (action === 'categories') {
      return await getCategories();
    } else {
      return res.status(400).json({ success: false, error: 'Invalid action' });
    }

  } catch (error) {
    console.error('Admin API error:', error);
    return res.status(400).json({ success: false, error: error.message });
  }

  async function getStats() {
    // Total Revenue
    const { rows: revenueResult } = await sql`
      SELECT COALESCE(SUM(total_amount), 0) as revenue 
      FROM orders 
      WHERE status != 'Cancelled'
    `;
    const revenue = parseFloat(revenueResult[0].revenue) || 0;

    // Total Orders
    const { rows: orderCountResult } = await sql`
      SELECT COUNT(*) as count FROM orders
    `;
    const orderCount = parseInt(orderCountResult[0].count) || 0;

    // Total Customers
    const { rows: customerCountResult } = await sql`
      SELECT COUNT(*) as count FROM users
    `;
    const customerCount = parseInt(customerCountResult[0].count) || 0;

    // Total Products
    const { rows: productCountResult } = await sql`
      SELECT COUNT(*) as count FROM products
    `;
    const productCount = parseInt(productCountResult[0].count) || 0;

    return res.status(200).json({
      success: true,
      data: {
        revenue,
        orderCount,
        customerCount,
        productCount
      }
    });
  }

  async function getOrders() {
    const { rows: orders } = await sql`
      SELECT * FROM orders ORDER BY created_at DESC
    `;
    return res.status(200).json({ success: true, data: orders });
  }

  async function getUsers() {
    const { rows: users } = await sql`
      SELECT id, first_name, last_name, email, role, created_at 
      FROM users 
      ORDER BY created_at DESC
    `;
    return res.status(200).json({ success: true, data: users });
  }

  async function getCategories() {
    const { rows: categories } = await sql`
      SELECT DISTINCT category 
      FROM products 
      WHERE category IS NOT NULL AND category != ''
    `;
    const categoryList = categories.map(row => row.category);
    return res.status(200).json({ success: true, data: categoryList });
  }
}
