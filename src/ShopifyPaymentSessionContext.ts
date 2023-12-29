import { EciesDecryptStrategy } from './EciesDecryptStrategy';
import { DecryptedPaymentMethod, PaymentMethod } from './types';

interface ShopifyPaymentSessionContextOptions {
  privateKeyPem: Buffer | string | { [fingerprint: string]: Buffer | string };
}

export class ShopifyPaymentSessionContext {
  public constructor(
    private readonly options: ShopifyPaymentSessionContextOptions
  ) {}

  public decrypt(paymentMethod: PaymentMethod): DecryptedPaymentMethod {
    let privateKey: Buffer | string;

    if (
      this.options.privateKeyPem instanceof Buffer ||
      typeof this.options.privateKeyPem === 'string'
    ) {
      privateKey = this.options.privateKeyPem;
    } else {
      const { fingerprint } = paymentMethod.data;

      privateKey = this.options.privateKeyPem[fingerprint];

      if (!privateKey) {
        throw new Error(
          `Couldn't locate private key for certificate fingerprint: ${fingerprint}`
        );
      }
    }

    const strategy = new EciesDecryptStrategy(privateKey);

    return strategy.decrypt(paymentMethod);
  }
}

export type { ShopifyPaymentSessionContextOptions };
