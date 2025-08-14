import type { APIRoute } from 'astro';

export const prerender = false;

const LABELS = [
    { label: 'Phone', category: 'Small IT & Telecom Equipment' },
    { label: 'Laptop', category: 'Small IT & Telecom Equipment' },
    { label: 'Television', category: 'Consumer Electronics' },
    { label: 'Refrigerator', category: 'Large Household Appliances' },
    { label: 'Battery', category: 'Hazardous Components' },
    { label: 'Router', category: 'Small IT & Telecom Equipment' }
];

export const POST: APIRoute = async ({ request }) => {
    try {
        const body = await request.json();
        const { imageDataUrl } = body || {};
        if (!imageDataUrl) return new Response('Image required', { status: 400 });

        const pick = LABELS[Math.floor(Math.random() * LABELS.length)];
        const confidence = 0.6 + Math.random() * 0.35;

        return new Response(
            JSON.stringify({
                classified: { label: pick.label, category: pick.category, confidence }
            }),
            { headers: { 'Content-Type': 'application/json' } }
        );
    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
};