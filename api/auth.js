import { sql } from '@vercel/postgres';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { method, query } = req;
    const { action } = query;

    if (method !== 'POST') {
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    if (action === 'register') {
      return await registerUser(req.body);
    } else if (action === 'login') {
      return await loginUser(req.body);
    } else if (action === 'forgot-password') {
      return res.status(200).json({ success: true, message: 'Reset link sent if email exists' });
    } else {
      return res.status(400).json({ success: false, error: `Invalid action: ${action}` });
    }

  } catch (error) {
    console.error('Auth API error:', error);
    return res.status(400).json({ success: false, error: error.message });
  }

  async function registerUser(data) {
    const { email, password, firstName, lastName } = data;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    // Check if users table exists
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'users'
      );
    `;
    
    if (!tableCheck.rows[0].exists) {
      return res.status(500).json({ success: false, error: 'Users table not initialized' });
    }

    // Check if user exists
    const { rows: existingUsers } = await sql`
      SELECT id FROM users WHERE email = ${email}
    `;
    
    if (existingUsers.length > 0) {
      return res.status(400).json({ success: false, error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    const { rows } = await sql`
      INSERT INTO users (first_name, last_name, email, password)
      VALUES (${firstName || ''}, ${lastName || ''}, ${email}, ${hashedPassword})
      RETURNING id, email, first_name, last_name
    `;
    
    const user = rows[0];
    
    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name
      }
    });
  }

  async function loginUser(data) {
    const { email, password } = data;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    // Check if users table exists
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'users'
      );
    `;
    
    if (!tableCheck.rows[0].exists) {
      return res.status(500).json({ success: false, error: 'Users table not initialized' });
    }

    const { rows: users } = await sql`
      SELECT * FROM users WHERE email = ${email}
    `;
    
    const user = users[0];

    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role || 'user'
      }
    });
  }
}
