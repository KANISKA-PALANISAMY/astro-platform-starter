import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
    try {
        const { token } = await request.json();
        if (!token) return new Response(JSON.stringify({ ok: false }), { status: 400 });
        // Always returns ok for demo, replace with real captcha validation.
        return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
    } catch (e: any) {
        return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500 });
    }
};