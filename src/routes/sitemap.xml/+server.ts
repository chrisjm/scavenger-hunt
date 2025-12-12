import type { RequestHandler } from './$types';

const routes = ['/'];

export const GET: RequestHandler = async ({ url }) => {
	const origin = url.origin.replace(/\/$/, '');

	const urls = routes
		.map((path) => {
			const loc = `${origin}${path}`;
			return `    <url>\n      <loc>${loc}</loc>\n    </url>`;
		})
		.join('\n');

	const xml =
		`<?xml version="1.0" encoding="UTF-8"?>\n` +
		`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
		`${urls}\n` +
		`</urlset>\n`;

	return new Response(xml, {
		headers: {
			'Content-Type': 'application/xml'
		}
	});
};
