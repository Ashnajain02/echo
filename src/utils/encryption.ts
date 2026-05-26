/**
 * Encryption utilities for securing user data.
 * Uses AES-GCM with a key derived from the user's ID via PBKDF2.
 */
import type { JournalComment } from '@/types';
import { logger } from '@/lib/logger';

// Cache derived keys per user session to avoid 100K PBKDF2 iterations on every call.
const keyCache = new Map<string, CryptoKey>();

export const deriveKeyFromUserId = async (userId: string): Promise<CryptoKey> => {
  const cached = keyCache.get(userId);
  if (cached) return cached;

  const encoder = new TextEncoder();
  const userIdBuffer = encoder.encode(userId);
  const salt = encoder.encode("journal-encryption-salt");

  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    userIdBuffer,
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );

  const key = await window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );

  keyCache.set(userId, key);
  return key;
};

export const clearKeyCache = () => keyCache.clear();

/**
 * Encrypts text using AES-GCM
 * @param text Text to encrypt
 * @param userId User's ID for key derivation
 * @returns Encrypted data as a base64 string with IV
 */
export const encryptText = async (text: string, userId: string): Promise<string> => {
  try {
    if (!text || !userId) return text;
    
    const key = await deriveKeyFromUserId(userId);
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    
    // Generate a random IV for each encryption
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    
    // Encrypt the data
    const encryptedData = await window.crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv
      },
      key,
      data
    );
    
    // Combine IV and encrypted data into a single buffer
    const combinedData = new Uint8Array(iv.length + encryptedData.byteLength);
    combinedData.set(iv);
    combinedData.set(new Uint8Array(encryptedData), iv.length);
    
    // Convert to base64 for storage
    return btoa(String.fromCharCode(...combinedData));
  } catch (error) {
    logger.error("encryption", "encryptText failed:", error);
    return text; // Fallback to unencrypted text if encryption fails
  }
};

/**
 * Decrypts text using AES-GCM
 * @param encryptedText Base64 string with IV and encrypted data
 * @param userId User's ID for key derivation
 * @returns Decrypted text
 */
export const decryptText = async (encryptedText: string, userId: string): Promise<string> => {
  try {
    if (!encryptedText || !userId) return encryptedText;
    
    // Check if it's likely an encrypted string (simple heuristic)
    // Base64 strings usually don't contain typical text characters like spaces
    if (encryptedText.includes(' ') && !encryptedText.startsWith('eyJ')) {
      return encryptedText; // Likely not encrypted
    }
    
    const key = await deriveKeyFromUserId(userId);
    
    // Convert base64 to array buffer
    const binaryString = atob(encryptedText);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Extract IV (first 12 bytes)
    const iv = bytes.slice(0, 12);
    const encryptedData = bytes.slice(12);
    
    // Decrypt the data
    const decryptedData = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv
      },
      key,
      encryptedData
    );
    
    // Decode the decrypted data to text
    const decoder = new TextDecoder();
    return decoder.decode(decryptedData);
  } catch (error) {
    logger.error("encryption", "decryptText failed:", error);
    return encryptedText; // Return original text if decryption fails
  }
};

/**
 * Minimal shape required for entry-level encrypt/decrypt.
 * Generic over the concrete entry type so callers (JournalEntry, draft rows,
 * etc.) get their original type back from these functions instead of a widened
 * `Record<string, unknown>`.
 */
type EncryptableEntry = { content: string; comments?: JournalComment[] };

/**
 * Encrypts the content field of an entry (and folds comments into the
 * encrypted blob). Returns the same shape with `content` replaced by ciphertext
 * and `comments` removed.
 */
export const encryptJournalEntry = async <T extends EncryptableEntry>(
  entry: T,
  userId: string,
): Promise<T> => {
  if (!entry || !userId) return entry;
  if (!entry.content) return { ...entry };

  const dataToEncrypt = JSON.stringify({
    content: entry.content,
    comments: entry.comments ?? [],
  });

  const { comments: _comments, ...rest } = entry;
  void _comments;

  return {
    ...(rest as T),
    content: await encryptText(dataToEncrypt, userId),
  };
};

/**
 * Decrypts the content field of an entry. Supports both the legacy plain-text
 * format and the current JSON-wrapped `{ content, comments }` format.
 */
export const decryptJournalEntry = async <T extends EncryptableEntry>(
  entry: T,
  userId: string,
): Promise<T> => {
  if (!entry || !userId) return entry;
  if (!entry.content) return { ...entry };

  try {
    const decryptedText = await decryptText(entry.content, userId);

    try {
      const parsed = JSON.parse(decryptedText);
      if (parsed && typeof parsed === 'object' && typeof parsed.content === 'string') {
        return {
          ...entry,
          content: parsed.content,
          comments: Array.isArray(parsed.comments) ? parsed.comments : [],
        };
      }
    } catch {
      // Fall through — legacy plain-text format.
    }

    return { ...entry, content: decryptedText, comments: [] };
  } catch (decryptError) {
    logger.error('encryption', 'failed to decrypt entry:', decryptError);
    // Keep the ciphertext as content so the failure is visible upstream
    // rather than silently producing an empty entry.
    return { ...entry, comments: [] };
  }
};
