# Basis Theory Shopify JS

![Version](https://img.shields.io/npm/v/%40basis-theory/shopify-js) ![GitHub Workflow Status (with event)](https://img.shields.io/github/actions/workflow/status/Basis-Theory/shopify-js/release.yml) ![License](https://img.shields.io/npm/l/%40basis-theory%2Fshopify-js)

Utility library for decrypting Shopify Payment App credit card payload.

## Features

- **Shopify Payment App decryption**: Securely decrypt user payment method (credit card) data using easy-to-interact interfaces.
- **Private Key rotation**: Map your decryption keys by certificate fingerprint for easy rotation.

## Shopify Payment App Setup

Follow the steps in [Shopify Payments App documentation](https://shopify.dev/docs/apps/payments/create-a-payments-app) to create a Payments App and Credit Card Payments App Extension.

## Installation

Install the package using NPM:

```shell
npm install @basis-theory/shopify-js --save
```

Or Yarn:

```shell
yarn add @basis-theory/shopify-js
```

## Usage

The credit card payment app extension requires a Payment Session URL, where the Payment Session payload is posted to, containing encrypted credit card data.

The examples below show how to load the private key from the File System into a Buffer, using samples from this repository. But you can load them from you KMS, secret manager, configuration, etc.

> ⚠️ Decrypting the Shopify Payment Session payload must be done in a PCI DSS compliant environment.

If you need help understanding the risks associated with decrypting and manipulating the various forms of cardholder data in your own systems, [reach out to us](https://basistheory.com/contact).

```javascript
import { ShopifyPaymentSessionContext } from '@basis-theory/shopify-js';
import * as fs from 'fs';
import paymentSession from './test/fixtures/paymentSession.json';

// load private key into buffer
const privateKeyPem = fs.readFileSync(
  './test/fixtures/certificates/private_key.pem'
);

// create decryption context
const context = new ShopifyPaymentSessionContext({
  privateKeyPem,
});

// decrypt the payment method
console.log(context.decrypt(paymentSession.payment_method));
```

Or using key rotation:

```javascript
import { ShopifyPaymentSessionContext } from '@basis-theory/shopify-js';
import * as fs from 'fs';
import paymentSession from './test/fixtures/paymentSession.json';

// load private keys into buffer
const privateKeyPemA = fs.readFileSync(
  './test/fixtures/certificates/private_key_a.pem'
);
const privateKeyPemB = fs.readFileSync(
  './test/fixtures/certificates/private_key_b.pem'
);

// create decryption context
const context = new ShopifyPaymentSessionContext({
  privateKeyPem: {
    // get the certificate fingerprint in Shopify payment app certificates dashboard
    '23f3812e093737252e98d47aa790ba5e607188837ec9aea797c0dde8ed7ef674':
      privateKeyPemA,
    '84d14a26c7d80e4975ed646f8ba8484a5ee8de970a04f1cf61b775aa7cbdc9cf':
      privateKeyPemB,
  },
});

// decrypt the payment method
console.log(context.decrypt(paymentSession.payment_method));
```

## Reactors

This package is available to use in [Reactors](https://developers.basistheory.com/docs/concepts/what-are-reactors) context. This enables you to perform decryption and tokenization of the credit card data in an outsourced cardholder data environment hosted by Basis Theory.

[Contact us](https://basistheory.com/contact) to understand how to set up Proxy with mTLS support to listen to Shopify Payment Session request and decrypt it at an isolated environment.

Proxy Request Transform code example:

```javascript
const { ShopifyPaymentSessionContext } = require('@basis-theory/shopify-js');

module.exports = async function (req) {
  const {
    bt,
    args: {
      headers,
      body: { payment_method, ...body },
    },
    configuration: { PRIVATE_KEY_A, PRIVATE_KEY_B },
  } = req;

  const context = new ShopifyPaymentSessionContext({
    privateKeyPem: {
      // get the certificate fingerprint in Shopify payment app certificates dashboard
      '23f3812e093737252e98d47aa790ba5e607188837ec9aea797c0dde8ed7ef674':
        PRIVATE_KEY_A,
      '84d14a26c7d80e4975ed646f8ba8484a5ee8de970a04f1cf61b775aa7cbdc9cf':
        PRIVATE_KEY_B,
    },
  });

  const {
    data: { full_name, pan, month, year, verification_value },
  } = context.decrypt(payment_method);

  const token = await bt.tokens.create({
    type: 'card',
    data: {
      number: pan,
      expiration_month: month,
      expiration_year: year,
      cvc: verification_value,
    },
  });

  return {
    headers,
    body: {
      ...body,
      payment_method: token,
    },
  };
};
```
