alter type public.job_status add value if not exists 'EN_ROUTE_PICKUP';
alter type public.job_status add value if not exists 'PICKED_UP';
alter type public.job_status add value if not exists 'EN_ROUTE_DROP';
alter type public.job_status add value if not exists 'DELIVERED';
alter type public.job_status add value if not exists 'DISPATCH_FAILED';

create index if not exists jobs_driver_status_created_idx
  on public.jobs (assigned_driver_id, status, created_at desc)
  where assigned_driver_id is not null;

create index if not exists jobs_created_by_created_idx
  on public.jobs (created_by_user_id, created_at desc);
