import crypto from 'crypto';

// Get encryption key from environment or throw error
const getEncryptionKey = () => {
  const key = process.env.EMAIL_ENCRYPTION_KEY;
  if (!key) {
    throw new Error('EMAIL_ENCRYPTION_KEY not set in environment');
  }
  // Key should be 32 bytes (256 bits) for AES-256
  // If provided as hex string, convert it
  return key.length === 64 ? Buffer.from(key, 'hex') : Buffer.from(key.padEnd(32, '0').slice(0, 32));
};

/**
 * Encrypt sensitive data (passwords)
 */
export const encryptCredential = (plaintext) => {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Return IV + encrypted data (IV needs to be known for decryption)
    return `${iv.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt credential');
  }
};

/**
 * Decrypt sensitive data
 */
export const decryptCredential = (encryptedData) => {
  try {
    const key = getEncryptionKey();
    const [ivHex, encrypted] = encryptedData.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt credential');
  }
};

/**
 * Generate a random encryption key for initialization
 */
export const generateEncryptionKey = () => {
  return crypto.randomBytes(32).toString('hex');
};
