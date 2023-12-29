import crypto from 'crypto';
import { DecryptedPaymentMethod, PaymentMethod } from './types';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const ECKey = require('ec-key');

interface DerivedKeyPair {
  cipherKey: string;
  hmacKey: string;
}

export class EciesDecryptStrategy {
  // There is no type definitions for ECKey
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly privateKey: any;

  public constructor(privateKey: Buffer | string) {
    this.privateKey = new ECKey(privateKey, 'pem');
  }

  /**
   * Decrypts a Shopify encrypted payment method.
   *
   * @param {PaymentMethod} paymentMethod - The encrypted payment method to decrypt.
   * @returns {DecryptedPaymentMethod} The decrypted payment method.
   * @throws {Error} If the decryption fails.
   */
  public decrypt(paymentMethod: PaymentMethod): DecryptedPaymentMethod {
    const {
      data: {
        ephemeral_public_key: ephemeralPublicKey,
        tag,
        encrypted_message: encryptedMessage,
      },
    } = paymentMethod;

    const sharedSecret = this.generateSharedSecret(ephemeralPublicKey);
    const { cipherKey, hmacKey } = this.deriveSymmetricKeyPair(sharedSecret);

    this.verifyMessageHmac(hmacKey, tag, encryptedMessage);

    const decrypted = this.decryptMessage(encryptedMessage, cipherKey);

    try {
      return JSON.parse(decrypted);
    } catch (error) {
      const err = new Error(
        'Unexpected format of decrypted data. Please check the encryption certificate fingerprint and private key.'
      );

      err.stack = error.stack;
      throw err;
    }
  }

  /**
   * Generates a shared secret for the provided ephemeral public key and the private key,
   * using ECDH (Elliptic Curve Diffie-Hellman)
   *
   * @private
   * @param {string} ephemeralPublicKey - The ephemeral public key in PEM format.
   * @returns {string} The shared secret in base64 encoding.
   */
  private generateSharedSecret(ephemeralPublicKey: string): string {
    const publicEc = new ECKey(ephemeralPublicKey, 'pem'); // Create a new ECKey instance from a base-64 spki string

    return this.privateKey.computeSecret(publicEc).toString('base64'); // Compute secret using private key for provided ephemeral public key
  }

  /**
   * Derives a symmetric key pair (cipher key and HMAC key) from the shared secret
   * using HKDF.
   *
   * @private
   * @param {string} sharedSecret - The shared secret in base64 encoding.
   * @returns {DerivedKeyPair} An object containing the cipher key and HMAC key.
   */
  private deriveSymmetricKeyPair(sharedSecret: string): DerivedKeyPair {
    const derived = Buffer.from(
      crypto.hkdfSync('sha256', Buffer.from(sharedSecret, 'base64'), '', '', 48)
    ).toString('hex');

    const cipherKey = derived.slice(0, 64);
    const hmacKey = derived.slice(-32);

    return {
      cipherKey,
      hmacKey,
    };
  }

  /**
   * Verifies the message authentication code (MAC) of the encrypted message.
   *
   * @private
   * @param {string} hmacKey - The HMAC key used to generate the hmac digest.
   * @param {string} tag - The expected HMAC tag in base64 encoding, computed separately by the sender.
   * @param {string} encryptedMessage - The encrypted message in base64 encoding.
   * @throws {Error} If the MAC verification fails.
   */
  private verifyMessageHmac(
    hmacKey: string,
    tag: string,
    encryptedMessage: string
  ): void {
    const hmac = crypto.createHmac('sha256', Buffer.from(hmacKey, 'hex'));

    hmac.update(Buffer.from(encryptedMessage, 'base64'));

    const digest = hmac.digest().toString('binary');
    const computedMac = digest.slice(0, 16);

    if (
      !crypto.timingSafeEqual(
        Buffer.from(computedMac, 'binary'),
        Buffer.from(tag, 'base64')
      )
    ) {
      throw new Error('Invalid Message Authentication Code');
    }
  }

  /**
   * Decrypts the encrypted message using the cipher key.
   *
   * @private
   * @param {string} encryptedMessage - The encrypted message in base64 encoding.
   * @param {string} cipherKey - The cipher key extracted from key derivation function.
   * @returns {string} The decrypted as UTF-8 string.
   */
  private decryptMessage(encryptedMessage: string, cipherKey: string): string {
    const decipher = crypto.createCipheriv(
      'aes-256-ctr',
      Buffer.from(cipherKey, 'hex'),
      Buffer.alloc(16)
    );

    return Buffer.concat([
      decipher.update(Buffer.from(encryptedMessage, 'base64')),
      decipher.final(),
    ]).toString('utf-8');
  }
}
