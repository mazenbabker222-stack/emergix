import { Stethoscope } from 'lucide-react';
import { Link } from 'wouter';
import { brand } from '@/config/brand';

export function Brand({ light = false }: { light?: boolean }) {
  const [first, ...rest] = brand.nameParts;
  return <Link href="/" className="brand" aria-label={`${brand.name} home`} style={light ? { color: 'white' } : undefined}>
    <span className="brand-mark"><Stethoscope size={24} aria-hidden="true" /></span>
    <span className="brand-lockup"><span className="brand-word"><span>{first}</span>{rest.length > 0 && <> <i>{rest.join(' ')}</i></>}</span><small>{brand.tagline}</small></span>
  </Link>;
}
