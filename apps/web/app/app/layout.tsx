import type { ReactNode } from 'react';
import { BusinessRouteGuard } from '../_components/business-auth-provider';

export default function ProtectedAppLayout(props: { children: ReactNode }) {
  return <BusinessRouteGuard>{props.children}</BusinessRouteGuard>;
}
