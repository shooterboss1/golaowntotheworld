import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { method, query } = req;
    const { id, featured, category, gender, search, maxPrice } = query;

    if (method === 'GET') {
      // Check if products table exists
      const tableCheck = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'products'
        );
      `;
      
      if (!tableCheck.rows[0].exists) {
        return res.status(200).json({ 
          success: true, 
          data: [], 
          message: 'Products table not initialized' 
        });
      }

      // Check if gender column exists
      const columnCheck = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'products' AND column_name = 'gender'
        );
      `;
      const hasGender = columnCheck.rows[0].exists;

      // Check if created_at column exists
      const dateColumnCheck = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'products' AND column_name = 'created_at'
        );
      `;
      const hasCreatedAt = dateColumnCheck.rows[0].exists;

      let queryBuilder = sql`SELECT * FROM products WHERE 1=1`;
      const params = [];

      if (id) {
        queryBuilder = sql`${queryBuilder} AND id = ${id}`;
      }
      
      if (gender && hasGender) {
        queryBuilder = sql`${queryBuilder} AND gender = ${gender}`;
      }
      
      if (category) {
        queryBuilder = sql`${queryBuilder} AND category = ${category}`;
      }
      
      if (search) {
        queryBuilder = sql`${queryBuilder} AND (name ILIKE ${`%${search}%`} OR description ILIKE ${`%${search}%`})`;
      }

      if (maxPrice) {
        queryBuilder = sql`${queryBuilder} AND price <= ${maxPrice}`;
      }

      if (featured === 'true') {
        queryBuilder = sql`${queryBuilder} ORDER BY rating DESC LIMIT 8`;
      } else {
        const orderCol = hasCreatedAt ? 'created_at' : 'id';
        queryBuilder = sql`${queryBuilder} ORDER BY ${sql(orderCol)} DESC`;
      }
      
      const { rows: products } = await queryBuilder;
      
      // If searching for a single product by ID, return the object directly
      if (id && products.length === 1) {
        return res.status(200).json({
          success: true,
          data: products[0]
        });
      }
      
      return res.status(200).json({
        success: true,
        data: products
      });
    } 
    
    if (method === 'POST') {
      const { name, description, price, image, image_url, category, gender, sizes, stock } = req.body;
      
      const { rows } = await sql`
        INSERT INTO products (name, description, price, image, image_url, category, gender, sizes, stock)
        VALUES (${name}, ${description || ''}, ${price}, ${image || ''}, ${image_url || ''}, ${category || 'Other'}, ${gender || 'unisex'}, ${sizes || 'S,M,L,XL,XXL'}, ${stock || 0})
        RETURNING id
      `;
      
      return res.status(200).json({ success: true, id: rows[0].id });
    } 
    
    if (method === 'PUT') {
      const { id: productId, name, description, price, image_url, category, gender, stock } = req.body;
      
      if (!productId) {
        return res.status(400).json({ success: false, error: 'Product ID required' });
      }
      
      await sql`
        UPDATE products 
        SET name = ${name}, 
            description = ${description || ''}, 
            price = ${price}, 
            image_url = ${image_url || ''}, 
            category = ${category || 'Other'}, 
            gender = ${gender || 'unisex'}, 
            stock = ${stock || 0}
        WHERE id = ${productId}
      `;
      
      return res.status(200).json({ success: true });
    } 
    
    if (method === 'DELETE') {
      const { id: productId } = query;
      
      if (!productId) {
        return res.status(400).json({ success: false, error: 'Product ID required' });
      }
      
      await sql`DELETE FROM products WHERE id = ${productId}`;
      
      return res.status(200).json({ success: true });
    }
    
    return res.status(405).json({ success: false, error: 'Method not allowed' });
    
  } catch (error) {
    console.error('Products API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process request: ' + error.message
    });
  }
}
