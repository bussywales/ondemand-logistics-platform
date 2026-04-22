import type { PaymentSummary } from './product-state';

export type PaymentPanelModel = {
  headline: string;
  detail: string;
  requiresMethodCollection: boolean;
  canAuthorize: boolean;
  isFinal: boolean;
};

export function getPaymentPanelModel(input: {
  payment: PaymentSummary;
  stripeEnabled: boolean;
  hasCollectedPaymentMethod: boolean;
}) {
  const { payment, stripeEnabled, hasCollectedPaymentMethod } = input;

  if (payment.status === 'CAPTURED') {
    return {
      headline: 'Payment captured',
      detail: 'The job payment has been captured successfully.',
      requiresMethodCollection: false,
      canAuthorize: false,
      isFinal: true
    } satisfies PaymentPanelModel;
  }

  if (payment.status === 'AUTHORIZED') {
    return {
      headline: 'Payment authorized',
      detail: 'Funds are authorized and ready to capture when the job is delivered.',
      requiresMethodCollection: false,
      canAuthorize: false,
      isFinal: true
    } satisfies PaymentPanelModel;
  }

  if (!stripeEnabled) {
    return {
      headline: 'Stripe frontend not configured',
      detail: 'Add the Stripe publishable key for this deployment before collecting a payment method.',
      requiresMethodCollection: false,
      canAuthorize: false,
      isFinal: false
    } satisfies PaymentPanelModel;
  }

  if (!hasCollectedPaymentMethod) {
    return {
      headline: 'Payment method required',
      detail: 'Collect a card from the operator before authorizing the job payment.',
      requiresMethodCollection: true,
      canAuthorize: false,
      isFinal: false
    } satisfies PaymentPanelModel;
  }

  return {
    headline: 'Ready to authorize',
    detail: 'The card details are collected. Authorize the payment when the operator is ready.',
    requiresMethodCollection: false,
    canAuthorize: true,
    isFinal: false
  } satisfies PaymentPanelModel;
}
