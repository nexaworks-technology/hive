/**
 * User Profile Management
 * Stores user's outreach profile (name, email, phone, Calendly link, etc)
 * Used to personalize all cold outreach emails
 */

import { supabase } from '../supabase-client.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../data');
const PROFILE_FILE = path.join(DATA_DIR, 'user-profile.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Default profile structure
const DEFAULT_PROFILE = {
  name: '',
  email: '',
  phone: '',
  jobTitle: '',
  companyName: 'SutraHR',
  calendlyLink: '',
  avatarUrl: '',
  bio: '',
  updatedAt: new Date().toISOString()
};

/**
 * Load user profile from file
 */
export function loadUserProfile() {
  try {
    if (fs.existsSync(PROFILE_FILE)) {
      const data = fs.readFileSync(PROFILE_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('[user-profile] Error loading profile:', err.message);
  }
  return DEFAULT_PROFILE;
}

/**
 * Save user profile to file
 */
export function saveUserProfile(profile) {
  try {
    const data = {
      ...profile,
      updatedAt: new Date().toISOString()
    };
    fs.writeFileSync(PROFILE_FILE, JSON.stringify(data, null, 2));
    return data;
  } catch (err) {
    console.error('[user-profile] Error saving profile:', err.message);
    throw err;
  }
}

/**
 * Get user profile
 */
export function getUserProfile() {
  return loadUserProfile();
}

/**
 * Update user profile
 */
export function updateUserProfile(updates) {
  const current = loadUserProfile();
  const updated = { ...current, ...updates, updatedAt: new Date().toISOString() };
  return saveUserProfile(updated);
}

/**
 * Get profile for email personalization
 * Returns profile data ready to use in email templates
 */
export function getProfileForEmailPersonalization() {
  const profile = loadUserProfile();
  return {
    senderName: profile.name || 'Team',
    senderEmail: profile.email || 'sales@sutrahr.com',
    senderPhone: profile.phone || '',
    senderTitle: profile.jobTitle || '',
    companyName: profile.companyName || 'SutraHR',
    calendlyLink: profile.calendlyLink || '',
    avatarUrl: profile.avatarUrl || '',
    bio: profile.bio || ''
  };
}
