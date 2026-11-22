/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function deriveAesKey(password: string, edidSalt: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode(`edraw-edid-v1:${edidSalt.toUpperCase()}`),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts the user's email with a key derived from (password + EDID-XXXX)
 * so /edid_index/{edid} never exposes plaintext email PII.
 */
export async function encryptEmailForEdid(
  email: string,
  password: string,
  edid: string
): Promise<{ encryptedEmail: string; iv: string }> {
  const ivBytes = window.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveAesKey(password, edid);
  const encoded = new TextEncoder().encode(email.trim().toLowerCase());
  const cipherBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: ivBytes },
    key,
    encoded
  );
  return {
    encryptedEmail: toBase64(new Uint8Array(cipherBuffer)),
    iv: toBase64(ivBytes),
  };
}

/**
 * Decrypts the email from /edid_index/{edid} using the entered password.
 * Returns null if the password is incorrect or payload is malformed.
 */
export async function decryptEmailFromEdid(
  encryptedEmail: string,
  iv: string,
  password: string,
  edid: string
): Promise<string | null> {
  if (!encryptedEmail || !iv) return null;
  try {
    const key = await deriveAesKey(password, edid);
    const ivBytes = fromBase64(iv);
    const cipherBytes = fromBase64(encryptedEmail);
    const plainBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: ivBytes as unknown as BufferSource,
      },
      key,
      cipherBytes as unknown as BufferSource
    );
    return new TextDecoder().decode(plainBuffer);
  } catch {
    return null;
  }
}
