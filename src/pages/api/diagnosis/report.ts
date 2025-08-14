import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async ({ request, url }) => {
    const reportId = new URL(request.url).searchParams.get('reportId');
    if (!reportId) return new Response('Missing reportId', { status: 400 });
    const html = `<!doctype html><html><body style="font-family: system-ui; padding: 20px; background: #0b1220; color: #fff;"><h1>Diagnosis Report</h1><p><strong>ID:</strong> ${reportId}</p><p>Summary: Software diagnostics indicate potential configuration issues and outdated drivers. Recommended: OS update, driver refresh, and malware scan.</p><p>Note: This is a demo report. In production, attach detailed logs accessible to both developer and customer.</p></body></html>`;
    return new Response(html, { headers: { 'Content-Type': 'text/html' } });
};