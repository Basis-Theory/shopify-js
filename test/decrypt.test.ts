import * as fs from 'fs';
import { ShopifyPaymentSessionContext } from '../src';
import paymentSession from './fixtures/paymentSession.json';

const privateKeyPem = fs.readFileSync(
  'test/fixtures/certificates/private_key.pem'
);
const wrongPrivateKeyPem = fs.readFileSync(
  'test/fixtures/certificates/wrong_private_key.pem'
);

describe('decrypt', () => {
  test('should throw when using wrong key', () => {
    const context = new ShopifyPaymentSessionContext({
      privateKeyPem: wrongPrivateKeyPem,
    });

    expect(() => context.decrypt(paymentSession.payment_method)).toThrow(
      'Invalid Message Authentication Code'
    );
  });

  test('should throw when using key not found', () => {
    const context = new ShopifyPaymentSessionContext({
      privateKeyPem: {
        '84d14a26c7d80e4975ed646f8ba8484a5ee8de970a04f1cf61b775aa7cbdc9cf':
          wrongPrivateKeyPem,
      },
    });

    expect(() => context.decrypt(paymentSession.payment_method)).toThrow(
      "Couldn't locate private key for certificate fingerprint: 23f3812e093737252e98d47aa790ba5e607188837ec9aea797c0dde8ed7ef674"
    );
  });

  test('should decrypt using right key', () => {
    const context = new ShopifyPaymentSessionContext({
      privateKeyPem: privateKeyPem.toString('utf-8'), // string or Buffer is acceptable
    });

    const decrypted = context.decrypt(paymentSession.payment_method);

    expect(decrypted).toMatchSnapshot();
  });

  test('should decrypt finding key by certificate fingerprint', () => {
    const context = new ShopifyPaymentSessionContext({
      privateKeyPem: {
        '23f3812e093737252e98d47aa790ba5e607188837ec9aea797c0dde8ed7ef674':
          privateKeyPem,
        '84d14a26c7d80e4975ed646f8ba8484a5ee8de970a04f1cf61b775aa7cbdc9cf':
          wrongPrivateKeyPem,
      },
    });

    const decrypted = context.decrypt(paymentSession.payment_method);

    expect(decrypted).toMatchSnapshot();
  });
});
