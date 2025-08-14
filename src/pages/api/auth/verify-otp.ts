import type { APIRoute } from 'astro';
import { getStore } from '@netlify/blobs';
import { v4 as uuidv4 } from 'uuid';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
    try {
        const { email, phone, otp } = await request.json();
        if (!otp || (!email && !phone)) return new Response('Bad Request', { status: 400 });

        const blob = getStore('otp-store');
        const userKey = email ? `email:${email}` : `phone:${phone}`;
        const record = await blob.get(userKey, { type: 'json' });
        if (!record) return new Response('OTP not found', { status: 400 });
        if (record.otp !== otp) return new Response('Invalid OTP', { status: 401 });

        const userStore = getStore('users');
        let userId = (await userStore.get(`${userKey}:userId`, { type: 'text' })) as string | null;
        if (!userId) {
            userId = uuidv4();
            await userStore.set(`${userKey}:userId`, userId, { addRandomSuffix: false });
        }

        return new Response(JSON.stringify({ userId }), { headers: { 'Content-Type': 'application/json' } });
    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
};