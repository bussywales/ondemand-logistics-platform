alter table public.support_escalations
  add column resolution_note text null,
  add column resolution_action text null,
  add column resolution_reason text null,
  add column resolved_by uuid null references public.users(id) on delete set null,
  add column resolved_at timestamptz null;

alter table public.support_escalations
  add constraint support_escalations_resolution_action_check check (
    resolution_action is null or resolution_action in (
      'CUSTOMER_UPDATED',
      'MERCHANT_UPDATED',
      'COURIER_UPDATED',
      'DISPATCH_RETRIED',
      'DRIVER_REASSIGNED',
      'PAYMENT_REVIEWED',
      'REFUND_REVIEWED',
      'ORDER_CANCELLED_MANUALLY',
      'NO_ACTION_REQUIRED',
      'OTHER'
    )
  ),
  add constraint support_escalations_resolution_reason_check check (
    resolution_reason is null or resolution_reason in (
      'CUSTOMER_CONFIRMED',
      'MERCHANT_CONFIRMED',
      'COURIER_CONFIRMED',
      'DELIVERY_COMPLETED',
      'PAYMENT_RISK_CLEARED',
      'DUPLICATE_ESCALATION',
      'TEST_OR_DEMO_RECORD',
      'ESCALATED_OUTSIDE_SHIPWRIGHT',
      'OTHER'
    )
  );

create index support_escalations_org_resolved_at_idx
  on public.support_escalations (org_id, resolved_at desc)
  where resolved_at is not null;
