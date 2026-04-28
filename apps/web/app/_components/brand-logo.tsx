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

function BrandLogoInner({ className, mode = 'responsive', tone = 'default' }: Omit<BrandLogoProps, 'href' | 'alt'>) {
  const classes = ['brand-logo', `brand-logo-${mode}`, `brand-logo-${tone}`];
  if (className) {
    classes.push(className);
  }

  return (
    <span className={classes.join(' ')} aria-label="ShipWright">
      <span className="brand-wordmark">ShipWright</span>
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
