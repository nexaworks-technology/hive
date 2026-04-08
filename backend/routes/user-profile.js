/**
 * User Profile Routes
 * GET /user-profile - Get user profile
 * POST /user-profile - Update user profile
 * POST /user-profile/upload-avatar - Upload avatar image
 */

import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { getUserProfile, updateUserProfile } from '../utils/user-profile.js';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configure multer for avatar upload
const upload = multer({
  dest: path.join(__dirname, '../public/avatars'),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Ensure avatar directory exists
const avatarDir = path.join(__dirname, '../public/avatars');
if (!fs.existsSync(avatarDir)) {
  fs.mkdirSync(avatarDir, { recursive: true });
}

/**
 * GET /user-profile
 * Get current user profile
 */
router.get('/user-profile', (req, res) => {
  try {
    const profile = getUserProfile();
    res.json(profile);
  } catch (err) {
    console.error('[user-profile] Error getting profile:', err);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

/**
 * POST /user-profile
 * Update user profile
 */
router.post('/user-profile', express.json(), (req, res) => {
  try {
    const { name, email, phone, jobTitle, companyName, calendlyLink, bio, avatarUrl } = req.body;

    const updated = updateUserProfile({
      name,
      email,
      phone,
      jobTitle,
      companyName,
      calendlyLink,
      bio,
      avatarUrl
    });

    res.json({ success: true, profile: updated });
  } catch (err) {
    console.error('[user-profile] Error updating profile:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

/**
 * POST /user-profile/upload-avatar
 * Upload user avatar image
 */
router.post('/user-profile/upload-avatar', upload.single('file'), (req, res) => {
  try {
    console.log('📤 Avatar upload request received');
    console.log('File info:', req.file);
    
    if (!req.file) {
      console.log('❌ No file in request');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('✅ File received:', req.file.originalname, 'Size:', req.file.size);

    // Generate public URL for the avatar
    const fileName = `${Date.now()}-${req.file.originalname}`;
    const filePath = path.join(avatarDir, fileName);
    const publicUrl = `/avatars/${fileName}`;

    // Move file to public directory
    console.log('📁 Moving file to:', filePath);
    fs.renameSync(req.file.path, filePath);
    console.log('✅ File moved successfully');

    // Update profile with avatar URL
    const profile = getUserProfile();
    const updated = updateUserProfile({
      ...profile,
      avatarUrl: publicUrl
    });

    console.log('✅ Profile updated with avatar:', publicUrl);
    res.json({ 
      success: true, 
      avatarUrl: publicUrl,
      profile: updated 
    });
  } catch (err) {
    console.error('❌ Avatar upload error:', err);
    res.status(500).json({ error: err.message || 'Failed to upload avatar' });
  }
});

export default router;
