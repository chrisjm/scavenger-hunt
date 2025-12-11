import type { LayoutServerLoad } from './$types';

const DEFAULT_TITLE = 'Scavenger Hunt';
const DEFAULT_DESCRIPTION = 'Group-based scavenger hunt platform for teams, tasks and leaderboards.';
const DEFAULT_TYPE = 'website';
const DEFAULT_SITE_NAME = 'Scavenger Hunt';
const DEFAULT_IMAGE_PATH = '/masked-icon.svg';

export const load: LayoutServerLoad = async ({ url }) => {
  const origin = url.origin;
  const canonical = origin + url.pathname;
  const image = new URL(DEFAULT_IMAGE_PATH, origin).toString();

  return {
    seo: {
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
      siteName: DEFAULT_SITE_NAME,
      type: DEFAULT_TYPE,
      url: canonical,
      image
    }
  };
};
