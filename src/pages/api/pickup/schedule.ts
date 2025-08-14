import type { APIRoute } from 'astro';
import { v4 as uuidv4 } from 'uuid';
import { getStore } from '@netlify/blobs';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
    try {
        const { userId, email, phone, scheduledDateIso, address, estimate, keepComponentName, pointsDiscount, lat, lng } = await request.json();
        if (!userId || !scheduledDateIso || !address) return new Response('Missing fields', { status: 400 });

        const trackingId = `PK-${uuidv4().slice(0, 8).toUpperCase()}`;
        const collectorName = 'Alex Collector';
        const collectorPhone = '+1 800-555-0100';

        const baseAmount = Number(estimate?.amount || 0);
        const keptComponentAmount = keepComponentName ? Number(estimate?.components?.find((c: any) => c.name === keepComponentName)?.amount || 0) : 0;
        const pd = Number(pointsDiscount || 0);
        const netAmount = Math.max(0, baseAmount - keptComponentAmount - pd);

        const discountsApplied: { label: string; amount: number }[] = [];
        if (keptComponentName && keptComponentAmount > 0) discountsApplied.push({ label: `Keep ${keepComponentName}`, amount: keptComponentAmount });
        if (pd > 0) discountsApplied.push({ label: 'Game Points', amount: pd });

        const pickup = {
            scheduledDateIso,
            address,
            contactEmail: email,
            contactPhone: phone,
            collectorName,
            collectorPhone,
            trackingId,
            keepComponentName,
            netAmount,
            discountsApplied,
            lat,
            lng
        };

        const store = getStore('pickups');
        await store.set(trackingId, JSON.stringify({ userId, pickup, estimate }), { addRandomSuffix: false });

        console.log(`Sending confirmation to ${email} for ${trackingId}`);

        return new Response(JSON.stringify({ pickup }), { headers: { 'Content-Type': 'application/json' } });
    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
};