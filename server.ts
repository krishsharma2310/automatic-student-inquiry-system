import express from 'express';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

import fs from 'fs';

dotenv.config();

let supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://hlostzdyjvqsegxdrqil.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhsb3N0emR5anZxc2VneGRycWlsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDIyOTU0OCwiZXhwIjoyMDg5ODA1NTQ4fQ.O2eUJhlPGBz_OsjNLEJA4xiQIaN_e-cpvETK6F3LQhI';

// Clean up URL
if (supabaseUrl && supabaseUrl.endsWith('/')) {
  supabaseUrl = supabaseUrl.slice(0, -1);
}

const isPlaceholder = !supabaseUrl || !supabaseServiceKey || supabaseUrl.includes('your-project-id');

console.log('Supabase URL Configured:', !!supabaseUrl);
console.log('Supabase Service Key Configured:', !!supabaseServiceKey);
if (supabaseUrl) console.log('Supabase URL starts with:', supabaseUrl.substring(0, 15));

if (isPlaceholder) {
console.error('CRITICAL: Supabase credentials missing or invalid in server. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the Secrets panel.');
}

const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseServiceKey || 'placeholder', 
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function createServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Netlify strips /api/ from the path when calling the function.
  // Re-add it so Express routes (which all start with /api/) match correctly.
  if (process.env.NETLIFY) {
    app.use((req, res, next) => {
      if (!req.path.startsWith('/api/')) {
        req.url = '/api' + req.url;
      }
      next();
    });
  }

  // API Routes
  
  // Supabase Health Check
  app.get('/api/supabase-health', async (req, res) => {
    try {
      const { data, error } = await supabase.from('users').select('count', { count: 'exact', head: true });
      if (error) throw error;
      res.json({ 
        status: 'ok', 
        userCount: data
      });
    } catch (error: any) {
      console.error('Supabase Health Check failed:', error);
      res.status(500).json({ 
        status: 'error', 
        message: error.message
      });
    }
  });

  app.post('/api/users/create', async (req, res) => {
    const { email, password, name, role, teamLeadId, assignedCourses, adminId, mobileNo, photoURL, userId } = req.body;
    
    console.log(`Attempting to create user: ${email} (Role: ${role}) by Admin: ${adminId}`);

    try {
      if (!adminId) {
        return res.status(400).json({ error: 'Admin ID is required' });
      }

      // Verify requester is admin
      const { data: adminData, error: adminError } = await supabase
        .from('users')
        .select('role, email')
        .eq('id', adminId)
        .single();

      if (adminError || (adminData.role !== 'admin' && adminData.email !== 'aescms26@gmail.com')) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      // Create user in Supabase Auth
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name, role }
      });

      if (authError) throw authError;

      let nextUserId = userId;
      
      if (!nextUserId) {
        // Generate 4-digit User ID for new user
        // We'll find the max existing user_id to get the next one
        const { data: maxUser } = await supabase
          .from('users')
          .select('user_id')
          .order('user_id', { ascending: false })
          .limit(1)
          .single();
        
        let nextUserIdNum = 1001;
        if (maxUser && maxUser.user_id) {
          const currentMax = parseInt(maxUser.user_id);
          if (!isNaN(currentMax)) {
            nextUserIdNum = currentMax + 1;
          }
        }
        nextUserId = nextUserIdNum.toString();
      }

      const userData = {
        id: authUser.user.id,
        user_id: nextUserId,
        name,
        email,
        role,
        team_lead_id: teamLeadId || null,
        assigned_courses: assignedCourses || [],
        mobile_no: mobileNo || null,
        photo_url: photoURL || null
      };

      // Create or update user profile in 'users' table
      const { error: dbError } = await supabase.from('users').upsert([userData], { onConflict: 'id' });
      if (dbError) {
        console.error('Supabase DB error creating user:', dbError);
        if (dbError.message.includes('check constraint') || dbError.message.includes('invalid input value for enum')) {
          return res.status(500).json({ 
            error: 'Database role constraint violation. Please run the SQL script in Supabase to add the "front_office" role.',
            details: dbError.message 
          });
        }
        throw dbError;
      }

      console.log('User created successfully:', userData.email);
      res.json({ success: true, user: userData });
    } catch (error: any) {
      console.error('Error creating user:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update User (Admin only)
  app.post('/api/users/update', async (req, res) => {
    const { uid, email, name, role, teamLeadId, assignedCourses, adminId, mobileNo, photoURL, userId } = req.body;
    
    try {
      if (!adminId) {
        return res.status(400).json({ error: 'Admin ID is required' });
      }

      // Verify requester is admin
      const { data: adminData, error: adminError } = await supabase
        .from('users')
        .select('role, email')
        .eq('id', adminId)
        .single();

      if (adminError || (adminData.role !== 'admin' && adminData.email !== 'aescms26@gmail.com')) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      // Update user in Supabase Auth
      const { error: authError } = await supabase.auth.admin.updateUserById(uid, {
        email: email || undefined,
        user_metadata: { name, role }
      });

      if (authError) throw authError;

      const updateData: any = {
        name,
        email,
        role,
        team_lead_id: teamLeadId || null,
        assigned_courses: assignedCourses || [],
        mobile_no: mobileNo || null,
        photo_url: photoURL || null
      };

      if (userId) {
        updateData.user_id = userId;
      }

      // Update user profile in 'users' table
      const { error: dbError } = await supabase.from('users').update(updateData).eq('id', uid);
      if (dbError) throw dbError;

      res.json({ success: true });
    } catch (error: any) {
      console.error('Error updating user:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Delete User (Admin only)
  app.delete('/api/users/:userId', async (req, res) => {
    const { userId } = req.params;
    const { adminId } = req.body;

    try {
      // Verify requester is admin
      const { data: adminData, error: adminError } = await supabase
        .from('users')
        .select('role, email')
        .eq('id', adminId)
        .single();

      if (adminError || (adminData.role !== 'admin' && adminData.email !== 'aescms26@gmail.com')) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      // Delete from Auth (this will cascade delete from users table if foreign key is set correctly)
      const { error: authError } = await supabase.auth.admin.deleteUser(userId);
      if (authError) throw authError;

      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting user:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Public Bootstrap Route (to create initial admin)
  app.post('/api/admin/bootstrap', async (req, res) => {
    try {
      const adminEmail = 'aescms26@gmail.com';
      const adminName = 'Admin User';
      const adminPassword = 'Admin@KRMU2026';

      console.log('Starting bootstrap process...');

      // Check if admin already exists in Auth
      const { data: listData, error: listError } = await supabase.auth.admin.listUsers();
      if (listError) {
        console.error('Auth listUsers error:', listError);
        throw listError;
      }
      
      let adminAuthUser = (listData.users as any[]).find(u => u.email === adminEmail);

      if (!adminAuthUser) {
        console.log('Admin user not found in Auth, creating...');
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email: adminEmail,
          password: adminPassword,
          email_confirm: true,
          user_metadata: { name: adminName, role: 'admin' }
        });
        if (createError) {
          console.error('Auth createUser error:', createError);
          throw createError;
        }
        adminAuthUser = newUser.user;
      } else {
        console.log('Admin user already exists in Auth.');
      }

      if (!adminAuthUser) {
        throw new Error('Failed to retrieve admin user after creation/check.');
      }

      // Upsert into public users table
      console.log('Upserting admin into public.users table...');
      const { error: upsertError } = await supabase.from('users').upsert([{
        id: adminAuthUser.id,
        user_id: '1001', // Default 4-digit ID for admin
        name: adminName,
        email: adminEmail,
        role: 'admin',
        mobile_no: '+91 0000000000',
        photo_url: `https://ui-avatars.com/api/?name=Admin&background=D32F2F&color=fff`
      }], { onConflict: 'id' });

      if (upsertError) {
        console.error('Database upsert error:', upsertError);
        if (upsertError.message.includes('column "user_id" of relation "users" does not exist') || 
            upsertError.message.includes('user_id')) {
          return res.status(500).json({ 
            error: 'Database schema mismatch. Please run the SQL script in your Supabase SQL Editor to add the "user_id" column to the "users" table.',
            details: upsertError.message
          });
        }
        throw upsertError;
      }

      console.log('Bootstrap successful.');
      res.json({ success: true, message: 'Admin account bootstrapped successfully. You can now log in.' });
    } catch (error: any) {
      console.error('Bootstrap failed:', error);
      res.status(500).json({ error: error.message || 'Unknown error during bootstrap' });
    }
  });

  // Clear Data (Admin only)
  app.post('/api/admin/clear-data', async (req, res) => {
    const { adminId } = req.body;
    
    try {
      if (!adminId) {
        return res.status(400).json({ error: 'Admin ID is required' });
      }

      // Verify requester is admin
      const { data: adminData, error: adminError } = await supabase
        .from('users')
        .select('role, email')
        .eq('id', adminId)
        .single();

      if (adminError || (adminData.role !== 'admin' && adminData.email !== 'aescms26@gmail.com')) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      // 1. Delete all enquiries
      await supabase.from('enquiries').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      // 2. Delete all courses
      await supabase.from('courses').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      // 3. Delete all users except the current admin and the bootstrap admin
      const { data: users } = await supabase.from('users').select('id, email');
      if (users) {
        for (const u of users) {
          if (u.id !== adminId && u.email !== 'aescms26@gmail.com') {
            await supabase.auth.admin.deleteUser(u.id);
          }
        }
      }

      res.json({ success: true, message: 'System data cleared successfully' });
    } catch (error: any) {
      console.error('Error clearing data:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    const { userId, name } = req.body;
    console.log(`Login attempt: userId="${userId}", name="${name}"`);
    try {
      const { data: userData, error: dbError } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', userId)
        .ilike('name', `%${name}%`)
        .single();

      if (dbError) {
        console.error('Login DB error:', dbError);
        return res.status(401).json({ error: 'Invalid User ID or Name', details: dbError.message });
      }

      if (!userData) {
        console.error('Login: no user found');
        return res.status(401).json({ error: 'Invalid User ID or Name', details: 'No matching user found' });
      }

      res.json({ success: true, user: userData });
    } catch (error: any) {
      console.error('Login error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update user break status (bypasses RLS using service role)
  app.post('/api/users/toggle-break', async (req, res) => {
    const { userId, onBreak, startTime } = req.body;
    
    try {
      const { error } = await supabase
        .from('users')
        .update({
          on_break: onBreak,
          break_start_time: startTime
        })
        .eq('id', userId);

      if (error) {
        console.error('Supabase error toggling break:', error);
        if (error.message.includes('column') && error.message.includes('not found')) {
          const sqlRepair = `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS on_break BOOLEAN DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS break_start_time TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS break_duration_mins INTEGER DEFAULT 30;`;
          
          return res.status(500).json({ 
            error: 'Database schema mismatch. Please run the following SQL in your Supabase SQL Editor:',
            sql: sqlRepair,
            details: error.message
          });
        }
        throw error;
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error toggling break:', error);
      res.status(500).json({ error: error.message || 'Unknown error toggling break' });
    }
  });

  // Update user break duration (bypasses RLS using service role)
  app.post('/api/users/update-break-duration', async (req, res) => {
    const { userId, duration } = req.body;
    
    try {
      const { error } = await supabase
        .from('users')
        .update({ break_duration_mins: duration })
        .eq('id', userId);

      if (error) {
        console.error('Supabase error updating break duration:', error);
        if (error.message.includes('column') && error.message.includes('not found')) {
          const sqlRepair = `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS on_break BOOLEAN DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS break_start_time TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS break_duration_mins INTEGER DEFAULT 30;`;
          
          return res.status(500).json({ 
            error: 'Database schema mismatch. Please run the following SQL in your Supabase SQL Editor:',
            sql: sqlRepair,
            details: error.message
          });
        }
        throw error;
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error updating break duration:', error);
      res.status(500).json({ error: error.message || 'Unknown error updating break duration' });
    }
  });

  // Static files in non-Netlify production environments (Netlify serves these via CDN)
  if (!process.env.NETLIFY) {
    // Serve static files in non-Netlify/Vercel production environments
    const distPath = path.join(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  // Global error handler — prevents unhandled crashes from causing 502s
  app.use((err: any, req: any, res: any, next: any) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
  });

  return app;
}

// Only start the HTTP server when this file is executed directly (local dev / start)
const isMainModule = process.argv[1]?.includes('server');
if (isMainModule) {
  createServer().then((app) => {
    const PORT = parseInt(process.env.PORT || '3000', 10);
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  });
}
