import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { method, query } = req;
    const { action } = query;

    if (method === 'POST') {
      if (action === 'create') {
        return await createOrder(req.body);
      } else if (action === 'stripe-intent') {
        return await createStripeIntent(req.body);
      } else if (action === 'paypal-capture') {
        return await capturePayPalOrder(req.body);
      } else {
        return res.status(400).json({ success: false, error: 'Invalid action' });
      }
    } else if (method === 'GET') {
      if (action === 'user-orders' && query.email) {
        return await getUserOrders(query.email);
      } else if (query.orderNumber) {
        return await trackOrder(query.orderNumber);
      } else {
        return res.status(400).json({ success: false, error: 'Required parameters missing for GET request' });
      }
    } else {
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Orders API error:', error);
    return res.status(400).json({ success: false, error: error.message });
  }

  async function createOrder(data) {
    const { items, total, firstName, lastName, email, address, city, state, zipCode } = data;

    if (!items || !total) {
      return res.status(400).json({ success: false, error: 'Items and total amount are required' });
    }

    // Check if orders table exists
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'orders'
      );
    `;
    
    if (!tableCheck.rows[0].exists) {
      return res.status(500).json({ success: false, error: 'Orders table not initialized' });
    }

    const orderNumber = 'GOLA-' + Math.random().toString(36).substring(2, 10).toUpperCase();
    
    try {
      // Insert order
      const { rows: orderRows } = await sql`
        INSERT INTO orders (order_number, total_amount, first_name, last_name, email, address, city, state, zip_code, status)
        VALUES (${orderNumber}, ${total}, ${firstName || ''}, ${lastName || ''}, ${email || ''}, ${address || ''}, ${city || ''}, ${state || ''}, ${zipCode || ''}, 'Processing')
        RETURNING id
      `;
      
      const orderId = orderRows[0].id;
      
      // Insert items
      for (const item of items) {
        await sql`
          INSERT INTO order_items (order_id, product_id, quantity, price, size)
          VALUES (${orderId}, ${item.productId}, ${item.quantity}, ${item.price}, ${item.size || 'M'})
        `;
      }
      
      return res.status(200).json({ success: true, orderNumber, orderId });
      
    } catch (error) {
      throw error;
    }
  }

  async function createStripeIntent(data) {
    const amount = data.amount || 0;
    
    // This would use the Stripe Node.js library in production
    // For now, we simulate a successful client secret creation
    const clientSecret = 'pi_simulated_' + Math.random().toString(36).substring(2, 34) + '_secret_' + Math.random().toString(36).substring(2, 20);
    
    return res.status(200).json({
      success: true,
      clientSecret,
      publishableKey: 'pk_test_PLACEHOLDER' // Replace with your real Stripe key
    });
  }

  async function capturePayPalOrder(data) {
    const paypalOrderId = data.orderID;
    
    if (!paypalOrderId) {
      return res.status(400).json({ success: false, error: 'PayPal Order ID required' });
    }
    
    // In production, you would call PayPal API to capture the funds
    // Simulate success
    return res.status(200).json({
      success: true,
      status: 'COMPLETED',
      transactionId: 'PAYID-' + Math.random().toString(36).substring(2, 18).toUpperCase()
    });
  }

  async function getUserOrders(email) {
    const { rows: orders } = await sql`
      SELECT * FROM orders WHERE email = ${email} ORDER BY created_at DESC
    `;
    
    // Add items for each order
    for (const order of orders) {
      const { rows: items } = await sql`
        SELECT oi.*, p.name, p.image_url 
        FROM order_items oi 
        JOIN products p ON oi.product_id = p.id 
        WHERE oi.order_id = ${order.id}
      `;
      order.items = items;
    }
    
    return res.status(200).json({ success: true, data: orders });
  }

  async function trackOrder(orderNumber) {
    const { rows: orders } = await sql`
      SELECT * FROM orders WHERE order_number = ${orderNumber}
    `;
    
    if (orders.length === 0) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    
    const order = orders[0];
    
    // Get items
    const { rows: items } = await sql`
      SELECT oi.*, p.name, p.image_url 
      FROM order_items oi 
      JOIN products p ON oi.product_id = p.id 
      WHERE oi.order_id = ${order.id}
    `;
    order.items = items;
    
    return res.status(200).json({ success: true, data: order });
  }
}
