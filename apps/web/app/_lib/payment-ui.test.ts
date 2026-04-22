import { describe, expect, it } from 'vitest';
import { getPaymentPanelModel } from './payment-ui';

const basePayment = {
  id: 'payment-1',
  status: 'REQUIRES_PAYMENT_METHOD' as const,
  customerTotalCents: 2400,
  platformFeeCents: 400,
  payoutGrossCents: 1600,
  amountAuthorizedCents: 0,
  amountCapturedCents: 0,
  amountRefundedCents: 0,
  currency: 'gbp',
  clientSecret: null,
  lastError: null
};

describe('payment panel model', () => {
  it('requires method collection when no method exists yet', () => {
    const model = getPaymentPanelModel({
      payment: basePayment,
      stripeEnabled: true,
      hasCollectedPaymentMethod: false
    });

    expect(model.requiresMethodCollection).toBe(true);
    expect(model.canAuthorize).toBe(false);
  });

  it('allows authorization when a method is collected', () => {
    const model = getPaymentPanelModel({
      payment: basePayment,
      stripeEnabled: true,
      hasCollectedPaymentMethod: true
    });

    expect(model.requiresMethodCollection).toBe(false);
    expect(model.canAuthorize).toBe(true);
  });

  it('marks authorized payments as final for the panel action flow', () => {
    const model = getPaymentPanelModel({
      payment: { ...basePayment, status: 'AUTHORIZED', amountAuthorizedCents: 2400 },
      stripeEnabled: true,
      hasCollectedPaymentMethod: true
    });

    expect(model.isFinal).toBe(true);
    expect(model.canAuthorize).toBe(false);
  });
});
