import type { AppJob, JobStatus, PaymentStatus, PublicOrderTracking } from './product-state';

export type TrackingStepKey =
  | 'order_placed'
  | 'payment_authorized'
  | 'driver_assigned'
  | 'picked_up'
  | 'out_for_delivery'
  | 'delivered';

export type TrackingStepState = 'complete' | 'current' | 'upcoming' | 'problem';

export type TrackingStep = {
  key: TrackingStepKey;
  label: string;
  state: TrackingStepState;
};

const TRACKING_STEP_LABELS: Record<TrackingStepKey, string> = {
  order_placed: 'Order placed',
  payment_authorized: 'Payment authorised',
  driver_assigned: 'Driver assigned',
  picked_up: 'Picked up',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered'
};

function isPaymentAuthorized(status: PaymentStatus) {
  return ['AUTHORIZED', 'CAPTURED', 'PARTIALLY_REFUNDED', 'REFUNDED'].includes(status);
}

function isDelivered(status: JobStatus) {
  return status === 'DELIVERED' || status === 'COMPLETED';
}

function getCurrentTrackingStage(order: PublicOrderTracking): TrackingStepKey {
  if (isDelivered(order.job.status) || order.order.status === 'FULFILLED') {
    return 'delivered';
  }

  if (order.job.status === 'EN_ROUTE_DROP') {
    return 'out_for_delivery';
  }

  if (order.job.status === 'PICKED_UP') {
    return 'picked_up';
  }

  if (order.tracking.driverAssigned || ['ASSIGNED', 'EN_ROUTE_PICKUP'].includes(order.job.status)) {
    return 'driver_assigned';
  }

  if (isPaymentAuthorized(order.payment.status)) {
    return 'payment_authorized';
  }

  return 'order_placed';
}

export function getTrackingSteps(order: PublicOrderTracking): TrackingStep[] {
  const sequence: TrackingStepKey[] = [
    'order_placed',
    'payment_authorized',
    'driver_assigned',
    'picked_up',
    'out_for_delivery',
    'delivered'
  ];
  const currentStage = getCurrentTrackingStage(order);
  const currentIndex = sequence.indexOf(currentStage);
  const paymentProblem = order.payment.status === 'FAILED';
  const dispatchProblem = order.job.status === 'DISPATCH_FAILED';
  const fullyComplete = currentStage === 'delivered' && (order.order.status === 'FULFILLED' || isDelivered(order.job.status));

  return sequence.map((key, index) => {
    if (paymentProblem && key === 'payment_authorized') {
      return { key, label: TRACKING_STEP_LABELS[key], state: 'problem' };
    }

    if (dispatchProblem && key === 'driver_assigned') {
      return { key, label: TRACKING_STEP_LABELS[key], state: 'problem' };
    }

    if (index < currentIndex) {
      return { key, label: TRACKING_STEP_LABELS[key], state: 'complete' };
    }

    if (fullyComplete) {
      return { key, label: TRACKING_STEP_LABELS[key], state: 'complete' };
    }

    if (index === currentIndex) {
      return {
        key,
        label: TRACKING_STEP_LABELS[key],
        state: paymentProblem || dispatchProblem ? 'problem' : 'current'
      };
    }

    return { key, label: TRACKING_STEP_LABELS[key], state: 'upcoming' };
  });
}

export function getCustomerTrackingSummary(order: PublicOrderTracking) {
  if (order.order.status === 'FULFILLED' || isDelivered(order.job.status)) {
    return {
      headline: 'Delivered',
      copy: 'This order was delivered and the payment flow is complete.'
    };
  }

  if (order.payment.status === 'FAILED') {
    return {
      headline: 'Payment needs attention',
      copy: 'The order exists, but payment did not complete successfully. Contact support before the restaurant prepares it.'
    };
  }

  if (order.job.status === 'DISPATCH_FAILED') {
    return {
      headline: 'Dispatch needs review',
      copy: 'The delivery job was created, but no driver has accepted yet. The operations team is reviewing the dispatch queue.'
    };
  }

  if (order.job.status === 'EN_ROUTE_DROP') {
    return {
      headline: 'Out for delivery',
      copy: 'The order has been picked up and is moving to the drop-off address.'
    };
  }

  if (order.job.status === 'PICKED_UP') {
    return {
      headline: 'Picked up',
      copy: 'The courier has collected the order and will begin the drop-off leg shortly.'
    };
  }

  if (order.tracking.driverAssigned || ['ASSIGNED', 'EN_ROUTE_PICKUP'].includes(order.job.status)) {
    return {
      headline: 'Driver assigned',
      copy: 'A courier is attached to the job. Tracking updates will appear as the delivery progresses.'
    };
  }

  if (isPaymentAuthorized(order.payment.status)) {
    return {
      headline: 'Waiting for driver assignment',
      copy: 'Payment is authorised and the order is in the dispatch queue. A courier has not been assigned yet.'
    };
  }

  return {
    headline: 'Order received',
    copy: 'The order exists and is waiting for the next operational update.'
  };
}

export function getCustomerTrackingSupportCopy(order: PublicOrderTracking) {
  if (order.job.status === 'DISPATCH_FAILED') {
    return 'Dispatch can fail when no eligible drivers are online, the vehicle requirement cannot be matched, or all staged drivers are already active. Contact support if the queue does not move soon.';
  }

  if (!order.tracking.driverAssigned && isPaymentAuthorized(order.payment.status)) {
    return 'A driver is not assigned yet. The operations team will keep retrying dispatch or assign a courier manually.';
  }

  return 'Tracking updates are based on real order, dispatch, and delivery events. No live map is shown in this pilot route yet.';
}

export function getOperatorTrackingStage(job: AppJob) {
  if (isDelivered(job.status)) {
    return 'Delivered';
  }

  if (job.status === 'EN_ROUTE_DROP') {
    return 'Out for delivery';
  }

  if (job.status === 'PICKED_UP') {
    return 'Picked up';
  }

  if (job.status === 'EN_ROUTE_PICKUP') {
    return 'Driver heading to pickup';
  }

  if (job.status === 'ASSIGNED') {
    return 'Driver assigned';
  }

  if (job.status === 'DISPATCH_FAILED') {
    return 'Dispatch failed';
  }

  return 'Awaiting dispatch';
}

export function getTrackingFreshness(latestLocationAt: string | null) {
  if (!latestLocationAt) {
    return 'No live location yet';
  }

  return `Last update ${latestLocationAt}`;
}
