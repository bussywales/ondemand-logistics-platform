import { productUpdates, type ProductUpdate, type ProductUpdateAudience } from "../_content/product-updates";

export type ProductUpdateViewerContext = ProductUpdateAudience;

const DISMISSED_UPDATES_KEY = "shipwright.dismissed-product-updates.v1";

function hasWindow() {
  return typeof window !== "undefined";
}

function getAudienceScope(viewer: ProductUpdateViewerContext): ProductUpdateAudience[] {
  if (viewer === "platform_admin") {
    return ["platform_admin", "business", "driver"];
  }

  return [viewer];
}

export function matchesProductUpdateRoute(update: ProductUpdate, routePath?: string) {
  if (!routePath || !update.routeContext?.length) {
    return true;
  }

  return update.routeContext.some((route) => routePath === route || routePath.startsWith(route));
}

export function getRelevantProductUpdates(input: {
  viewer: ProductUpdateViewerContext;
  routePath?: string;
}) {
  const scope = new Set(getAudienceScope(input.viewer));

  return [...productUpdates]
    .filter((update) => update.audience.some((audience) => scope.has(audience)))
    .filter((update) => matchesProductUpdateRoute(update, input.routePath))
    .sort((left, right) => right.releasedAt.localeCompare(left.releasedAt));
}

function getDismissedStorageKey(viewerKey: string) {
  return `${DISMISSED_UPDATES_KEY}:${viewerKey}`;
}

export function readDismissedProductUpdateIds(viewerKey: string) {
  if (!hasWindow()) {
    return [] as string[];
  }

  try {
    const raw = window.localStorage.getItem(getDismissedStorageKey(viewerKey));
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
  } catch {
    return [] as string[];
  }
}

export function dismissProductUpdate(viewerKey: string, updateId: string) {
  if (!hasWindow()) {
    return;
  }

  const current = new Set(readDismissedProductUpdateIds(viewerKey));
  current.add(updateId);
  window.localStorage.setItem(getDismissedStorageKey(viewerKey), JSON.stringify([...current]));
}

export function isProductUpdateDismissed(viewerKey: string, updateId: string) {
  return readDismissedProductUpdateIds(viewerKey).includes(updateId);
}

export function getLatestRelevantProductUpdate(input: {
  viewer: ProductUpdateViewerContext;
  routePath?: string;
  viewerKey: string;
}) {
  return getRelevantProductUpdates({
    viewer: input.viewer,
    routePath: input.routePath
  }).find((update) => !isProductUpdateDismissed(input.viewerKey, update.id)) ?? null;
}
