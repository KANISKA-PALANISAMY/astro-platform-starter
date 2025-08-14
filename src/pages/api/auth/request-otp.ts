import type { APIRoute } from 'astro';
import { getStore } from '@netlify/blobs';
import { v4 as uuidv4 } from 'uuid';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
    try {
        const { email, phone } = await request.json();
        if (!email && !phone) return new Response('Email or phone required', { status: 400 });

        const blob = getStore('otp-store');
        const otp = String(Math.floor(100000 + Math.random() * 900000));
        const userKey = email ? `email:${email}` : `phone:${phone}`;
        await blob.set(userKey, JSON.stringify({ otp, createdAt: Date.now() }), { addRandomSuffix: false });

        // In real app: send via email/SMS provider.
        console.log('OTP for', userKey, 'is', otp);

        return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
};