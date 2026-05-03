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

export type CustomerRouteNodeState = 'complete' | 'current' | 'upcoming' | 'problem';

const TRACKING_STEP_LABELS: Record<TrackingStepKey, string> = {
  order_placed: 'Order placed',
  payment_authorized: 'Payment authorised',
  driver_assigned: 'Driver assigned',
  picked_up: 'Picked up',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered'
};

const CUSTOMER_TIMELINE_EVENT_COPY: Record<string, { title: string; summary: string }> = {
  CUSTOMER_ORDER_SUBMITTED: {
    title: 'Order received',
    summary: 'We received your order and created the delivery record.'
  },
  JOB_REQUESTED: {
    title: 'Preparing dispatch',
    summary: 'We are preparing delivery and checking for an available courier.'
  },
  JOB_DISPATCH_REQUESTED: {
    title: 'Preparing dispatch',
    summary: 'We are checking for an available courier.'
  },
  JOB_DISPATCH_RETRIED: {
    title: 'Dispatch checked again',
    summary: 'We are checking the courier pool again for this delivery.'
  },
  JOB_ASSIGNED: {
    title: 'Courier assigned',
    summary: 'A courier has been assigned to your order.'
  },
  JOB_EN_ROUTE_PICKUP: {
    title: 'Courier heading to pickup',
    summary: 'Your courier is on the way to collect the order from the restaurant.'
  },
  JOB_PICKED_UP: {
    title: 'Order picked up',
    summary: 'Your order has been collected and will move to drop-off next.'
  },
  JOB_EN_ROUTE_DROP: {
    title: 'Out for delivery',
    summary: 'Your courier is on the way to the drop-off address.'
  },
  JOB_PROOF_OF_DELIVERY_RECORDED: {
    title: 'Delivery recorded',
    summary: 'Delivery completion has been recorded for this order.'
  },
  JOB_DELIVERED: {
    title: 'Delivered',
    summary: 'Delivery has been completed.'
  },
  JOB_DISPATCH_FAILED: {
    title: 'Dispatch under review',
    summary: 'We are checking this delivery and reviewing the next recovery step.'
  },
  JOB_CANCELLED: {
    title: 'Delivery cancelled',
    summary: 'This delivery was cancelled.'
  },
  PAYMENT_AUTHORIZED: {
    title: 'Payment authorised',
    summary: 'Your card was authorised successfully for this order.'
  },
  PAYMENT_AUTHORIZATION_FAILED: {
    title: 'Payment issue',
    summary: 'We could not confirm payment for this order.'
  },
  PAYMENT_CAPTURED: {
    title: 'Payment completed',
    summary: 'Delivery was completed and payment capture finished successfully.'
  }
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

export function buildPublicTrackingHref(orderId: string) {
  return `/track/${orderId}`;
}

export function getCustomerOrderStatusLabel(status: PublicOrderTracking['order']['status']) {
  switch (status) {
    case 'PAYMENT_AUTHORIZED':
      return 'Confirmed';
    case 'PAYMENT_FAILED':
      return 'Payment issue';
    case 'FULFILLED':
      return 'Delivered';
    default:
      return 'Received';
  }
}

export function getCustomerJobStatusLabel(status: JobStatus) {
  switch (status) {
    case 'REQUESTED':
      return 'Preparing dispatch';
    case 'ASSIGNED':
      return 'Courier assigned';
    case 'EN_ROUTE_PICKUP':
      return 'Courier heading to pickup';
    case 'PICKED_UP':
      return 'Picked up';
    case 'EN_ROUTE_DROP':
      return 'On the way';
    case 'DELIVERED':
    case 'COMPLETED':
      return 'Delivered';
    case 'DISPATCH_FAILED':
      return 'Under review';
    case 'CANCELLED':
      return 'Cancelled';
    default:
      return 'Preparing dispatch';
  }
}

export function getCustomerPaymentStatusLabel(status: PaymentStatus) {
  switch (status) {
    case 'AUTHORIZED':
      return 'Authorised';
    case 'CAPTURED':
      return 'Complete';
    case 'FAILED':
      return 'Payment issue';
    case 'PARTIALLY_REFUNDED':
      return 'Partially refunded';
    case 'REFUNDED':
      return 'Refunded';
    case 'CANCELLED':
      return 'Cancelled';
    case 'REQUIRES_PAYMENT_METHOD':
      return 'Payment method needed';
    case 'REQUIRES_CONFIRMATION':
      return 'Awaiting confirmation';
    default:
      return 'Authorised';
  }
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
      headline: 'Your order has been delivered',
      copy: 'Delivery is complete and the payment flow has been closed successfully.'
    };
  }

  if (order.payment.status === 'FAILED') {
    return {
      headline: "We're checking your delivery",
      copy: 'There is a payment issue on this order. We are checking the current delivery state before any next step is taken.'
    };
  }

  if (order.job.status === 'DISPATCH_FAILED') {
    return {
      headline: "We're checking your delivery",
      copy: 'This delivery is under operator review while we check the next recovery step.'
    };
  }

  return {
    headline: "We're tracking your order",
    copy:
      order.job.status === 'EN_ROUTE_DROP'
        ? 'Your order is on the way to the drop-off address.'
        : order.job.status === 'PICKED_UP'
          ? 'Your order has been collected and is moving through the delivery flow.'
          : order.tracking.driverAssigned || ['ASSIGNED', 'EN_ROUTE_PICKUP'].includes(order.job.status)
            ? 'A courier is attached to this delivery and the next live status change will appear here.'
            : isPaymentAuthorized(order.payment.status)
              ? 'Payment is authorised and we are preparing dispatch.'
              : 'Your order exists and we are waiting for the next delivery update.'
  };
}

export function getCustomerTrackingNextStep(order: PublicOrderTracking) {
  if (order.order.status === 'FULFILLED' || isDelivered(order.job.status)) {
    return {
      title: 'Delivery complete',
      copy: 'This order has been delivered. Keep this link if you need to review the delivery status again.'
    };
  }

  if (order.payment.status === 'FAILED') {
    return {
      title: "We're checking the payment state",
      copy: 'We are checking the order and payment state before delivery continues.'
    };
  }

  if (order.job.status === 'DISPATCH_FAILED') {
    return {
      title: 'Our operator is reviewing this delivery',
      copy: 'We are checking the courier pool and the next safe recovery step.'
    };
  }

  if (order.job.status === 'EN_ROUTE_DROP') {
    return {
      title: 'Your courier is on the way',
      copy: 'The order has been picked up and is moving to the drop-off address.'
    };
  }

  if (order.job.status === 'PICKED_UP') {
    return {
      title: 'Your order has been picked up',
      copy: 'The courier has collected the order and will continue to drop-off.'
    };
  }

  if (order.tracking.driverAssigned || ['ASSIGNED', 'EN_ROUTE_PICKUP'].includes(order.job.status)) {
    return {
      title: 'A courier has been assigned',
      copy: 'The courier is attached to the job and the next delivery update will appear here.'
    };
  }

  if (isPaymentAuthorized(order.payment.status)) {
    return {
      title: "We're preparing dispatch",
      copy: 'Payment is authorised and we are checking for the next delivery movement.'
    };
  }

  return {
    title: 'We are checking your order',
    copy: 'The order exists and we are waiting for the next operational update.'
  };
}

export function getCustomerTrackingSupportCopy(order: PublicOrderTracking) {
  if (order.job.status === 'DISPATCH_FAILED') {
    return 'An operator is reviewing this delivery. If the status does not change for a while, contact the restaurant or the ShipWright operator for an update.';
  }

  if (!order.tracking.driverAssigned && isPaymentAuthorized(order.payment.status)) {
    return 'Your order is confirmed and dispatch is still being prepared. If this status stays unchanged for a long time, contact the restaurant or the ShipWright operator.';
  }

  return 'Tracking updates are based on real order and delivery events. This page shows status and progress, not a live map.';
}

export function getCustomerTrackingTimelineEntry(eventType: string) {
  return (
    CUSTOMER_TIMELINE_EVENT_COPY[eventType] ?? {
      title: 'Order update',
      summary: 'We recorded a new update for this order.'
    }
  );
}

export function getCustomerRouteNodes(order: PublicOrderTracking): Array<{
  key: 'pickup' | 'courier' | 'dropoff';
  label: string;
  summary: string;
  state: CustomerRouteNodeState;
}> {
  const currentStage = getCurrentTrackingStage(order);
  const hasProblem = order.job.status === 'DISPATCH_FAILED' || order.payment.status === 'FAILED';

  return [
    {
      key: 'pickup',
      label: 'Pickup',
      summary: order.restaurant.name,
      state:
        hasProblem && currentStage === 'payment_authorized'
          ? 'problem'
          : currentStage === 'order_placed' || currentStage === 'payment_authorized'
            ? 'current'
            : 'complete'
    },
    {
      key: 'courier',
      label: 'Courier',
      summary: order.tracking.driverAssigned ? 'Assigned to your order' : 'Awaiting assignment',
      state:
        order.job.status === 'DISPATCH_FAILED'
          ? 'problem'
          : ['driver_assigned', 'picked_up'].includes(currentStage)
            ? 'current'
            : ['out_for_delivery', 'delivered'].includes(currentStage)
              ? 'complete'
              : 'upcoming'
    },
    {
      key: 'dropoff',
      label: 'Drop-off',
      summary: order.delivery.addressSummary,
      state:
        currentStage === 'delivered'
          ? 'complete'
          : currentStage === 'out_for_delivery'
            ? 'current'
            : order.job.status === 'DISPATCH_FAILED'
              ? 'problem'
              : 'upcoming'
    }
  ];
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
