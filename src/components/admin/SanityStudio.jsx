import { Studio } from 'sanity';
import sanityConfig from '../../../sanity.config.js';

export default function SanityStudio() {
  return <Studio config={sanityConfig} />;
}
