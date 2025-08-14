import type { APIRoute } from 'astro';
import { v4 as uuidv4 } from 'uuid';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
    try {
        const { specs } = await request.json();
        const reportId = uuidv4();
        const base = 50 + Math.random() * 100;
        const quality = (Number(specs?.ramGb || 4) + Number(specs?.storageGb || 64) / 128) * 10;
        const amount = Math.max(20, Math.round(base + quality));

        return new Response(
            JSON.stringify({
                reportId,
                estimate: {
                    currency: 'USD',
                    amount,
                    strategy: 'software-value',
                    notes: 'Derived from diagnosis report'
                }
            }),
            { headers: { 'Content-Type': 'application/json' } }
        );
    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
};