import type { APIRoute } from 'astro';

export const prerender = false;

function fakeSpecs() {
    const brands = ['Apple', 'Samsung', 'Dell', 'HP', 'Lenovo', 'Sony', 'LG'];
    const models = ['X100', 'Pro 15', 'S22', 'G7', 'ThinkPad X1', 'Bravia 55', 'Gram'] as const;
    const brand = brands[Math.floor(Math.random() * brands.length)];
    const model = models[Math.floor(Math.random() * models.length)];
    const storageGb = [64, 128, 256, 512, 1024][Math.floor(Math.random() * 5)];
    const ramGb = [4, 8, 16, 32][Math.floor(Math.random() * 4)];
    const cpu = ['A15', 'Snapdragon 8', 'Intel i5', 'Intel i7', 'Ryzen 5'][Math.floor(Math.random() * 5)];
    const year = 2016 + Math.floor(Math.random() * 9);
    const batteryHealthPct = 70 + Math.floor(Math.random() * 30);
    const screenSizeInches = [5.8, 6.1, 13.3, 15.6, 55][Math.floor(Math.random() * 5)];
    const condition = ['Excellent', 'Good', 'Fair', 'Poor'][Math.floor(Math.random() * 4)];

    return {
        brand,
        model,
        storageGb,
        ramGb,
        cpu,
        year,
        batteryHealthPct,
        screenSizeInches,
        condition,
        name1: 'motherboard',
        name2: 'display panel',
        name3: 'battery',
        name4: 'ssd/hdd',
        name5: 'camera module',
        rawOcrText: `${brand} ${model} ${storageGb}GB ${ramGb}GB RAM ${cpu}`
    };
}

export const POST: APIRoute = async ({ request }) => {
    try {
        const { imageDataUrl } = await request.json();
        if (!imageDataUrl) return new Response('Image required', { status: 400 });
        const specs = fakeSpecs();
        return new Response(JSON.stringify({ specs }), { headers: { 'Content-Type': 'application/json' } });
    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
};