/* Shopify uses snake_case  */
/* eslint-disable camelcase */

interface PaymentMethod {
  type: string;
  data: {
    fingerprint: string;
    encrypted_message: string;
    ephemeral_public_key: string;
    tag: string;
  };
}

interface Address {
  given_name?: string;
  family_name: string;
  line1: string;
  line2?: string;
  city: string;
  postal_code?: string;
  province?: string;
  country_code: string;
  phone_number?: string;
  company?: string;
}

interface Customer {
  billing_address: Address;
  shipping_address: Address;
  email?: string;
  phone_number?: string;
  locale: string;
}

interface ClientDetails {
  ip_address: string;
  user_agent: string;
  accept_language: string;
}

interface PaymentSessionPayload {
  id: string;
  gid: string;
  group: string;
  amount: string;
  currency: string;
  test: boolean;
  merchant_locale: string;
  payment_method: PaymentMethod;
  proposed_at: string;
  customer?: Customer;
  kind: string;
  client_details?: ClientDetails;
}

/**
 * 2023-07 spec
 */
interface DecryptedPaymentMethod {
  type: string;
  data: {
    full_name: string;
    pan: string;
    month: number;
    year: number;
    verification_value: string;
  };
}

export type {
  PaymentSessionPayload,
  PaymentMethod,
  Address,
  Customer,
  ClientDetails,
  DecryptedPaymentMethod,
};
/* eslint-enable camelcase */
