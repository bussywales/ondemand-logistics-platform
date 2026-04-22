import Link from 'next/link';

type BrandTone = 'default' | 'mono' | 'inverse';
type BrandMode = 'responsive' | 'full' | 'icon';

type BrandLogoProps = {
  href?: string;
  className?: string;
  mode?: BrandMode;
  tone?: BrandTone;
  alt?: string;
};

const FULL_SRC: Record<BrandTone, string> = {
  default: '/brand/logo.svg',
  mono: '/brand/logo-mono.svg',
  inverse: '/brand/logo-mono-white.svg'
};

const ICON_SRC: Record<BrandTone, string> = {
  default: '/brand/icon.svg',
  mono: '/brand/icon-mono.svg',
  inverse: '/brand/icon-mono-white.svg'
};

function BrandLogoInner({ className, mode = 'responsive', tone = 'default', alt = 'ShipWright' }: Omit<BrandLogoProps, 'href'>) {
  const classes = ['brand-logo', `brand-logo-${mode}`];
  if (className) {
    classes.push(className);
  }

  return (
    <span className={classes.join(' ')}>
      {mode !== 'icon' ? (
        <img alt={alt} className="brand-logo-full" height={36} src={FULL_SRC[tone]} width={156} />
      ) : null}
      {mode !== 'full' ? (
        <img alt={alt} className="brand-logo-icon" height={36} src={ICON_SRC[tone]} width={40} />
      ) : null}
    </span>
  );
}

export function BrandLogo(props: BrandLogoProps) {
  if (props.href) {
    return (
      <Link aria-label="ShipWright" className="brand-link" href={props.href}>
        <BrandLogoInner {...props} />
      </Link>
    );
  }

  return <BrandLogoInner {...props} />;
}
