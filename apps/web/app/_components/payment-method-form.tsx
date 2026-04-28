"use client";

import { CardElement, Elements, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useMemo, useState, type FormEvent } from 'react';
import { normalizeBillingPostcode } from '../_lib/billing-postcode';

export type CollectedPaymentMethod = {
  id: string;
  brand: string | null;
  last4: string | null;
  expMonth: number | null;
  expYear: number | null;
};

type PaymentMethodFormProps = {
  email: string;
  disabled?: boolean;
  onCollected: (paymentMethod: CollectedPaymentMethod) => void;
};

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

const cardElementOptions = {
  hidePostalCode: true,
  style: {
    base: {
      color: '#0a0a0a',
      fontFamily: 'IBM Plex Sans, Segoe UI, sans-serif',
      fontSize: '16px',
      '::placeholder': {
        color: '#666666'
      }
    },
    invalid: {
      color: '#9f2f2f'
    }
  }
} as const;

function InnerPaymentMethodForm(props: PaymentMethodFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [cardholderName, setCardholderName] = useState('');
  const [billingPostcode, setBillingPostcode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!stripe || !elements) {
      return;
    }

    const card = elements.getElement(CardElement);
    if (!card) {
      setError('Card entry is not ready yet.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const normalizedPostcode = normalizeBillingPostcode(billingPostcode);
    const result = await stripe.createPaymentMethod({
      type: 'card',
      card,
      billing_details: {
        address: {
          country: 'GB',
          postal_code: normalizedPostcode || undefined
        },
        email: props.email,
        name: cardholderName.trim() || undefined
      }
    });

    if (result.error) {
      setError(result.error.message ?? 'Unable to collect the payment method.');
      setSubmitting(false);
      return;
    }

    const cardDetails = result.paymentMethod.card;
    props.onCollected({
      id: result.paymentMethod.id,
      brand: cardDetails?.brand ?? null,
      last4: cardDetails?.last4 ?? null,
      expMonth: cardDetails?.exp_month ?? null,
      expYear: cardDetails?.exp_year ?? null
    });
    setSubmitting(false);
  }

  return (
    <form className="payment-method-form" onSubmit={handleSubmit}>
      <label className="ops-field">
        <span>Cardholder name</span>
        <input
          disabled={props.disabled || submitting}
          onChange={(event) => setCardholderName(event.target.value)}
          placeholder="Cardholder name"
          value={cardholderName}
        />
      </label>

      <label className="ops-field">
        <span>Card details</span>
        <div className="card-element-shell">
          <CardElement options={cardElementOptions} />
        </div>
      </label>

      <label className="ops-field">
        <span>Billing postcode</span>
        <input
          autoComplete="postal-code"
          disabled={props.disabled || submitting}
          inputMode="text"
          onChange={(event) => setBillingPostcode(event.target.value)}
          placeholder="SW1A 1AA"
          value={billingPostcode}
        />
        <span className="support-note">UK postcode format is supported. This is sent to Stripe as billing postcode.</span>
      </label>

      {error ? <p className="form-error">{error}</p> : null}

      <div className="ops-actions ops-actions-inline">
        <button className="button button-secondary" disabled={props.disabled || submitting || !stripe} type="submit">
          {submitting ? 'Saving payment method...' : 'Save Payment Method'}
        </button>
      </div>
    </form>
  );
}

export function PaymentMethodForm(props: PaymentMethodFormProps) {
  const stripeUnavailable = useMemo(() => !stripePromise, []);

  if (stripeUnavailable) {
    return (
      <div className="ops-empty-state">
        <strong>Stripe frontend is not configured</strong>
        <p>Add `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` to this deployment to collect a payment method.</p>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      <InnerPaymentMethodForm {...props} />
    </Elements>
  );
}

export function isStripeFrontendConfigured() {
  return Boolean(publishableKey);
}
