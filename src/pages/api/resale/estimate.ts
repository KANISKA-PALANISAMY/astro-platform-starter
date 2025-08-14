import type { APIRoute } from 'astro';

export const prerender = false;

function componentBreakdown(specs: any, damageSeverity?: string) {
    const components = [
        { name: 'motherboard', base: 40 },
        { name: 'display panel', base: 35 },
        { name: 'battery', base: 15 },
        { name: 'ssd/hdd', base: 20 },
        { name: 'camera module', base: 10 },
        { name: 'charger/cables', base: 5 }
    ];

    const adjusted = components
        .filter((c) => !(damageSeverity === 'highly-sensitive' && c.name === 'display panel'))
        .map((c) => ({ name: c.name, amount: Math.max(1, Math.round(c.base * (Number(specs?.year || 2019) - 2015) / 10)) }));

    return adjusted;
}

export const POST: APIRoute = async ({ request }) => {
    try {
        const { specs, classified, defectType, damageSeverity } = await request.json();
        let amount = 0;
        let strategy: 'hardware-components' | 'software-value' = 'hardware-components';
        let components: { name: string; amount: number }[] | undefined;

        if (defectType === 'hardware') {
            components = componentBreakdown(specs, damageSeverity);
            amount = components.reduce((sum, c) => sum + c.amount, 0);
            strategy = 'hardware-components';
        } else {
            const quality = (Number(specs?.ramGb || 4) + Number(specs?.storageGb || 64) / 128) * 12;
            amount = Math.max(25, Math.round(quality));
            strategy = 'software-value';
        }

        return new Response(
            JSON.stringify({
                estimate: {
                    currency: 'USD',
                    amount,
                    strategy,
                    components
                }
            }),
            { headers: { 'Content-Type': 'application/json' } }
        );
    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
};