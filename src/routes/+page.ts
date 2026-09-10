import type { PageLoad } from './$types';
import type { SiteContent } from '$lib/content';

// Keep the prerendered document tiny. The real snapshot is loaded from the
// client bundle (served by jsDelivr) as soon as Svelte mounts.
const emptyContent: SiteContent = {
  primaryColor: '#0aa5b5',
  hero: {
    label: '',
    heading: '',
    subheading: '',
    primaryButtonText: '',
    secondaryButtonText: '',
    details: [],
  },
  sections: [],
  footerText: '',
  footerNote: '',
};

export const ssr = false;
export const prerender = true;

export const load: PageLoad = () => ({ content: emptyContent });
