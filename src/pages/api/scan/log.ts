import type { APIRoute } from 'astro';
import { getStore } from '@netlify/blobs';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
    try {
        const { userId, classified, specs } = await request.json();
        const store = getStore('scan-logs');
        const entry = { ts: Date.now(), userId: userId || 'anon', classified, specs };
        const key = `scan-${entry.ts}-${Math.random().toString(36).slice(2, 8)}`;
        await store.set(key, JSON.stringify(entry), { addRandomSuffix: false });
        return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
};