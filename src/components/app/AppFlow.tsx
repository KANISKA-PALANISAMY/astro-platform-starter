import React, { useMemo, useState } from 'react';

export type StepKey =
    | 'auth'
    | 'terms'
    | 'pre-scan-damage'
    | 'scan'
    | 'classification'
    | 'device-specs'
    | 'defect'
    | 'diagnosis'
    | 'resale-estimate'
    | 'pickup'
    | 'confirmation'
    | 'gratitude'
    | 'games';

export type DamageSeverity = 'completely' | 'partially' | 'highly-sensitive';

export type DefectType = 'hardware' | 'software';

export type ClassifiedCategory =
    | 'Large Household Appliances'
    | 'Small IT & Telecom Equipment'
    | 'Consumer Electronics'
    | 'Lighting Equipment'
    | 'Monitoring & Control Instruments'
    | 'Medical Devices'
    | 'Hazardous Components';

export type AppState = {
    userId?: string;
    authMethod?: 'email' | 'phone';
    email?: string;
    phone?: string;
    acceptedTerms: boolean;
    damageSeverity?: DamageSeverity;
    classified?: {
        category?: ClassifiedCategory;
        label?: string;
        confidence?: number;
    };
    deviceSpecs?: {
        brand?: string;
        model?: string;
        storageGb?: number;
        ramGb?: number;
        cpu?: string;
        year?: number;
        batteryHealthPct?: number;
        screenSizeInches?: number;
        condition?: string;
        name1?: string;
        name2?: string;
        name3?: string;
        name4?: string;
        name5?: string;
        rawOcrText?: string;
    };
    defectType?: DefectType;
    diagnosisReportId?: string;
    resaleEstimate?: {
        currency: string;
        amount: number;
        strategy: 'hardware-components' | 'software-value';
        notes?: string;
        components?: { name: string; amount: number }[];
    };
    gamePoints?: number;
    pickup?: {
        scheduledDateIso?: string;
        address?: string;
        lat?: number;
        lng?: number;
        contactName?: string;
        contactPhone?: string;
        contactEmail?: string;
        collectorName?: string;
        collectorPhone?: string;
        trackingId?: string;
        keepComponentName?: string;
        netAmount?: number;
        discountsApplied?: { label: string; amount: number }[];
    };
};

const DEFAULT_STATE: AppState = {
    acceptedTerms: false,
    gamePoints: 0
};

function StepContainer(props: { title: string; children: React.ReactNode }) {
    return (
        <section className="p-6 mb-8 bg-gray-900 rounded-lg">
            <h2 className="mb-4 text-2xl font-bold">{props.title}</h2>
            <div>{props.children}</div>
        </section>
    );
}

export default function AppFlow() {
    const [step, setStep] = useState<StepKey>('auth');
    const [state, setState] = useState<AppState>(DEFAULT_STATE);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | undefined>(undefined);

    function next(nextStep: StepKey) {
        setStep(nextStep);
    }

    function update(partial: Partial<AppState>) {
        setState((prev) => ({ ...prev, ...partial }));
    }

    // AUTH STEP
    const [authEmail, setAuthEmail] = useState('');
    const [authPhone, setAuthPhone] = useState('');
    const [captchaOk, setCaptchaOk] = useState(false);
    const [otpSent, setOtpSent] = useState(false);
    const [otp, setOtp] = useState('');

    async function requestOtp() {
        setError(undefined);
        setLoading(true);
        try {
            const res = await fetch('/api/auth/request-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: authEmail || undefined, phone: authPhone || undefined })
            });
            if (!res.ok) throw new Error('Failed to request OTP');
            setOtpSent(true);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }

    async function verifyOtp() {
        setError(undefined);
        setLoading(true);
        try {
            const res = await fetch('/api/auth/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: authEmail || undefined, phone: authPhone || undefined, otp })
            });
            if (!res.ok) throw new Error('Invalid OTP');
            const data = await res.json();
            update({ userId: data.userId, authMethod: authEmail ? 'email' : 'phone', email: authEmail || undefined, phone: authPhone || undefined });
            next('terms');
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }

    // TERMS
    function acceptTerms() {
        update({ acceptedTerms: true });
        next('pre-scan-damage');
    }

    // PRE-SCAN DAMAGE
    function selectDamage(severity: DamageSeverity) {
        update({ damageSeverity: severity });
        next('scan');
    }

    // SCAN & CLASSIFICATION STUBS
    const [imageDataUrl, setImageDataUrl] = useState<string | undefined>(undefined);

    async function classifyImage() {
        setError(undefined);
        setLoading(true);
        try {
            const res = await fetch('/api/scan/classify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageDataUrl, damageSeverity: state.damageSeverity })
            });
            if (!res.ok) throw new Error('Classification failed');
            const data = await res.json();
            update({ classified: data.classified });
            next('classification');
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }

    async function detectSpecs() {
        setError(undefined);
        setLoading(true);
        try {
            const res = await fetch('/api/scan/specs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageDataUrl })
            });
            if (!res.ok) throw new Error('Could not get specs');
            const data = await res.json();
            update({ deviceSpecs: data.specs });
            // Log scan for app builder analytics
            try {
                await fetch('/api/scan/log', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: state.userId, classified: state.classified, specs: data.specs })
                });
            } catch (e) {}
            next('defect');
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }

    // DEFECT
    function chooseDefect(type: DefectType) {
        update({ defectType: type });
        if (type === 'software') {
            next('diagnosis');
        } else {
            next('resale-estimate');
        }
    }

    // DIAGNOSIS
    async function runDiagnosis() {
        setError(undefined);
        setLoading(true);
        try {
            const res = await fetch('/api/diagnosis/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ specs: state.deviceSpecs }) });
            if (!res.ok) throw new Error('Diagnosis failed');
            const data = await res.json();
            update({ diagnosisReportId: data.reportId, resaleEstimate: data.estimate });
            next('resale-estimate');
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }

    // RESALE
    async function computeResale() {
        setError(undefined);
        setLoading(true);
        try {
            const res = await fetch('/api/resale/estimate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    specs: state.deviceSpecs,
                    classified: state.classified,
                    defectType: state.defectType,
                    damageSeverity: state.damageSeverity
                })
            });
            if (!res.ok) throw new Error('Could not estimate');
            const data = await res.json();
            update({ resaleEstimate: data.estimate });
            next('pickup');
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }

    // PICKUP
    const [pickupDate, setPickupDate] = useState<string>('');
    const [pickupAddress, setPickupAddress] = useState('');
    const [keepComponentName, setKeepComponentName] = useState<string>('');
    const [coords, setCoords] = useState<{ lat?: number; lng?: number }>({});

    const pointsDiscount = useMemo(() => {
        return Math.min(Math.round((state.gamePoints || 0) / 10) * 5, 50); // every 10 pts => $5, capped at $50
    }, [state.gamePoints]);

    const keptComponentAmount = useMemo(() => {
        if (!keepComponentName || !state.resaleEstimate?.components?.length) return 0;
        const found = state.resaleEstimate.components.find((c) => c.name === keepComponentName);
        return found?.amount || 0;
    }, [keepComponentName, state.resaleEstimate]);

    const netAmountPreview = useMemo(() => {
        const base = state.resaleEstimate?.amount || 0;
        return Math.max(0, base - keptComponentAmount - pointsDiscount);
    }, [state.resaleEstimate, keptComponentAmount, pointsDiscount]);

    async function useMyLocation() {
        setError(undefined);
        if (!('geolocation' in navigator)) {
            setError('Geolocation not supported');
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;
                setCoords({ lat: latitude, lng: longitude });
            },
            (err) => setError(err.message),
            { enableHighAccuracy: true, timeout: 8000 }
        );
    }

    async function schedulePickup() {
        setError(undefined);
        setLoading(true);
        try {
            const res = await fetch('/api/pickup/schedule', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: state.userId,
                    email: state.email,
                    phone: state.phone,
                    scheduledDateIso: pickupDate,
                    address: pickupAddress,
                    estimate: state.resaleEstimate,
                    keepComponentName,
                    pointsDiscount,
                    lat: coords.lat,
                    lng: coords.lng
                })
            });
            if (!res.ok) throw new Error('Pickup scheduling failed');
            const data = await res.json();
            update({ pickup: data.pickup });
            next('confirmation');
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }

    const resaleLine = useMemo(() => {
        if (!state.resaleEstimate) return '';
        return `${state.resaleEstimate.currency} ${state.resaleEstimate.amount.toFixed(2)} (${state.resaleEstimate.strategy})`;
    }, [state.resaleEstimate]);

    return (
        <div>
            {!!error && <div className="p-3 mb-4 text-sm text-red-300 bg-red-900 rounded">{error}</div>}

            {step === 'auth' && (
                <StepContainer title="Sign up / Login with OTP & Captcha">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className="block mb-1">Email</label>
                            <input className="w-full p-2 text-black rounded" type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} placeholder="name@example.com" />
                        </div>
                        <div>
                            <label className="block mb-1">Mobile Number</label>
                            <input className="w-full p-2 text-black rounded" type="tel" value={authPhone} onChange={(e) => setAuthPhone(e.target.value)} placeholder="+1 555-123-4567" />
                        </div>
                    </div>

                    <div className="mt-4">
                        <label className="inline-flex items-center gap-2">
                            <input type="checkbox" checked={captchaOk} onChange={(e) => setCaptchaOk(e.target.checked)} />
                            <span>I am not a robot (demo captcha)</span>
                        </label>
                    </div>

                    <div className="flex gap-2 mt-4">
                        <button className="btn" disabled={!captchaOk || (!authEmail && !authPhone) || loading} onClick={requestOtp}>
                            {otpSent ? 'Resend OTP' : 'Send OTP'}
                        </button>
                        {otpSent && (
                            <>
                                <input className="p-2 text-black rounded" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="Enter OTP" />
                                <button className="btn" disabled={!otp || loading} onClick={verifyOtp}>
                                    Verify OTP
                                </button>
                            </>
                        )}
                    </div>
                </StepContainer>
            )}

            {step === 'terms' && (
                <StepContainer title="Terms and Policies">
                    <div className="space-y-4">
                        <p>By proceeding, you agree to our terms, privacy, safe-handling of hazardous e‑waste, and consent to store device details for valuation and pickup logistics.</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>OTP identity verification and captcha are required.</li>
                            <li>Images are processed only for classification and valuation.</li>
                            <li>Pickup personnel details will be shared upon scheduling.</li>
                        </ul>
                        <label className="inline-flex items-center gap-2 mt-2">
                            <input type="checkbox" checked={state.acceptedTerms} onChange={(e) => update({ acceptedTerms: e.target.checked })} />
                            <span>I accept the terms and policies.</span>
                        </label>
                        <div>
                            <button className="btn mt-3" disabled={!state.acceptedTerms} onClick={acceptTerms}>
                                Continue
                            </button>
                        </div>
                    </div>
                </StepContainer>
            )}

            {step === 'pre-scan-damage' && (
                <StepContainer title="Before Scanning: Tell us about the damage">
                    <div className="grid gap-3 sm:grid-cols-3">
                        <button className="btn" onClick={() => selectDamage('completely')}>Completely Damaged</button>
                        <button className="btn" onClick={() => selectDamage('partially')}>Partially Damaged</button>
                        <button className="btn" onClick={() => selectDamage('highly-sensitive')}>Highly Sensitive (e.g., touchpad/screen)</button>
                    </div>
                </StepContainer>
            )}

            {step === 'scan' && (
                <StepContainer title="Scan the device (camera)">
                    <p className="mb-4 text-sm opacity-80">For demo, upload an image. In production, enable camera and Google Lens/ML Kit.</p>
                    <input
                        className="block w-full p-2 text-black rounded"
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onloadend = () => setImageDataUrl(reader.result as string);
                            reader.readAsDataURL(file);
                        }}
                    />

                    <div className="flex gap-2 mt-4">
                        <button className="btn" disabled={!imageDataUrl || loading} onClick={classifyImage}>
                            Classify Type
                        </button>
                        <button className="btn" disabled={!imageDataUrl || loading} onClick={detectSpecs}>
                            Detect Specs (OCR)
                        </button>
                    </div>

                    <div className="mt-6 text-sm">
                        <p className="font-semibold">Common Examples:</p>
                        <ul className="list-disc pl-6">
                            <li>Mobile phones, tablets, laptops</li>
                            <li>TVs, monitors, printers</li>
                            <li>Refrigerators, washing machines</li>
                            <li>Cables, chargers, batteries</li>
                            <li>Smartwatches, headphones, routers</li>
                        </ul>
                        <p className="mt-4 font-semibold">Why E‑Waste Matters:</p>
                        <ul className="list-disc pl-6">
                            <li>Contains valuable materials: gold, silver, copper</li>
                            <li>Hazardous substances: lead, mercury, cadmium</li>
                            <li>Improper disposal harms environment and health</li>
                            <li>Recycling recovers materials and reduces pollution</li>
                        </ul>
                    </div>
                </StepContainer>
            )}

            {step === 'classification' && (
                <StepContainer title="Detected Category">
                    <div className="space-y-2">
                        <div>Label: {state.classified?.label}</div>
                        <div>Category: {state.classified?.category}</div>
                        <div>Confidence: {(state.classified?.confidence || 0).toFixed(2)}</div>
                        <button className="btn mt-2" onClick={() => next('device-specs')}>Continue</button>
                    </div>
                </StepContainer>
            )}

            {step === 'device-specs' && (
                <StepContainer title="Confirm Device Specifications">
                    <div className="space-y-3">
                        <p className="text-sm opacity-80">We pre-filled using OCR/AI. Edit if needed.</p>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <input className="p-2 text-black rounded" placeholder="Brand" value={state.deviceSpecs?.brand || ''} onChange={(e) => update({ deviceSpecs: { ...state.deviceSpecs, brand: e.target.value } })} />
                            <input className="p-2 text-black rounded" placeholder="Model" value={state.deviceSpecs?.model || ''} onChange={(e) => update({ deviceSpecs: { ...state.deviceSpecs, model: e.target.value } })} />
                            <input className="p-2 text-black rounded" placeholder="Storage (GB)" type="number" value={state.deviceSpecs?.storageGb || ''} onChange={(e) => update({ deviceSpecs: { ...state.deviceSpecs, storageGb: Number(e.target.value) } })} />
                            <input className="p-2 text-black rounded" placeholder="RAM (GB)" type="number" value={state.deviceSpecs?.ramGb || ''} onChange={(e) => update({ deviceSpecs: { ...state.deviceSpecs, ramGb: Number(e.target.value) } })} />
                            <input className="p-2 text-black rounded" placeholder="CPU" value={state.deviceSpecs?.cpu || ''} onChange={(e) => update({ deviceSpecs: { ...state.deviceSpecs, cpu: e.target.value } })} />
                            <input className="p-2 text-black rounded" placeholder="Year" type="number" value={state.deviceSpecs?.year || ''} onChange={(e) => update({ deviceSpecs: { ...state.deviceSpecs, year: Number(e.target.value) } })} />
                            <input className="p-2 text-black rounded" placeholder="Battery Health (%)" type="number" value={state.deviceSpecs?.batteryHealthPct || ''} onChange={(e) => update({ deviceSpecs: { ...state.deviceSpecs, batteryHealthPct: Number(e.target.value) } })} />
                            <input className="p-2 text-black rounded" placeholder="Screen Size (inches)" type="number" value={state.deviceSpecs?.screenSizeInches || ''} onChange={(e) => update({ deviceSpecs: { ...state.deviceSpecs, screenSizeInches: Number(e.target.value) } })} />
                            <input className="p-2 text-black rounded" placeholder="Condition" value={state.deviceSpecs?.condition || ''} onChange={(e) => update({ deviceSpecs: { ...state.deviceSpecs, condition: e.target.value } })} />
                            <input className="p-2 text-black rounded" placeholder="name1" value={state.deviceSpecs?.name1 || ''} onChange={(e) => update({ deviceSpecs: { ...state.deviceSpecs, name1: e.target.value } })} />
                            <input className="p-2 text-black rounded" placeholder="name2" value={state.deviceSpecs?.name2 || ''} onChange={(e) => update({ deviceSpecs: { ...state.deviceSpecs, name2: e.target.value } })} />
                            <input className="p-2 text-black rounded" placeholder="name3" value={state.deviceSpecs?.name3 || ''} onChange={(e) => update({ deviceSpecs: { ...state.deviceSpecs, name3: e.target.value } })} />
                            <input className="p-2 text-black rounded" placeholder="name4" value={state.deviceSpecs?.name4 || ''} onChange={(e) => update({ deviceSpecs: { ...state.deviceSpecs, name4: e.target.value } })} />
                            <input className="p-2 text-black rounded" placeholder="name5" value={state.deviceSpecs?.name5 || ''} onChange={(e) => update({ deviceSpecs: { ...state.deviceSpecs, name5: e.target.value } })} />
                        </div>
                        <div className="flex gap-2">
                            <button className="btn" onClick={() => next('defect')}>Continue</button>
                        </div>
                    </div>
                </StepContainer>
            )}

            {step === 'defect' && (
                <StepContainer title="Is the defect hardware or software?">
                    <div className="grid gap-3 sm:grid-cols-2">
                        <button className="btn" onClick={() => chooseDefect('hardware')}>Hardware Defect</button>
                        <button className="btn" onClick={() => chooseDefect('software')}>Software Defect</button>
                    </div>
                </StepContainer>
            )}

            {step === 'diagnosis' && (
                <StepContainer title="Run Software Diagnosis">
                    <p className="mb-3 text-sm opacity-80">We will run checks and generate a report. The resale value is derived from this report.</p>
                    <button className="btn" disabled={loading} onClick={runDiagnosis}>Run Diagnosis</button>
                </StepContainer>
            )}

            {step === 'resale-estimate' && (
                <StepContainer title="Approximate Resale Value">
                    {state.resaleEstimate ? (
                        <div className="space-y-3">
                            <div className="text-lg font-semibold">{resaleLine}</div>
                            {!!state.diagnosisReportId && (
                                <div>
                                    <a className="underline" href={`/api/diagnosis/report?reportId=${state.diagnosisReportId}`} target="_blank">View Diagnosis Report</a>
                                </div>
                            )}
                            {!!state.resaleEstimate?.components?.length && (
                                <ul className="pl-6 list-disc">
                                    {state.resaleEstimate.components.map((c) => (
                                        <li key={c.name}>
                                            {c.name}: {state.resaleEstimate?.currency} {c.amount.toFixed(2)}
                                        </li>
                                    ))}
                                </ul>
                            )}
                            <div className="text-sm opacity-80">Game Points: {state.gamePoints} (discount preview at pickup)</div>
                            <p className="text-sm opacity-80">This is an approximate value and may vary slightly after our team inspects the product during pickup.</p>
                            <div className="flex gap-2">
                                <button className="btn" onClick={() => next('pickup')}>Proceed to Pickup</button>
                                <button className="btn" onClick={() => next('games')}>Play & Earn Discounts</button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex gap-2">
                            {state.defectType === 'software' ? (
                                <button className="btn" onClick={runDiagnosis}>Generate from Diagnosis</button>
                            ) : (
                                <button className="btn" onClick={computeResale}>Compute Component Value</button>
                            )}
                        </div>
                    )}
                </StepContainer>
            )}

            {step === 'pickup' && (
                <StepContainer title="Door-step Pickup">
                    <div className="grid gap-3">
                        <div className="text-sm">Base Estimate: {state.resaleEstimate?.currency} {state.resaleEstimate?.amount.toFixed(2)}</div>
                        {!!state.resaleEstimate?.components?.length && (
                            <div>
                                <label className="block mb-1">Keep a component (optional)</label>
                                <select className="p-2 text-black rounded" value={keepComponentName} onChange={(e) => setKeepComponentName(e.target.value)}>
                                    <option value="">None</option>
                                    {state.resaleEstimate.components.map((c) => (
                                        <option key={c.name} value={c.name}>{c.name} (-{state.resaleEstimate?.currency} {c.amount.toFixed(2)})</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div className="text-sm">Points Discount: -{state.resaleEstimate?.currency} {pointsDiscount.toFixed(2)}</div>
                        <div className="text-sm font-semibold">Net after options: {state.resaleEstimate?.currency} {netAmountPreview.toFixed(2)}</div>
                        <input className="p-2 text-black rounded" type="date" value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} />
                        <input className="p-2 text-black rounded" placeholder="Pickup Address" value={pickupAddress} onChange={(e) => setPickupAddress(e.target.value)} />
                        <div className="flex gap-2">
                            <button className="btn" type="button" onClick={useMyLocation}>Use my location</button>
                            {!!coords.lat && !!coords.lng && <span className="text-sm">Location set: {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}</span>}
                        </div>
                        <button className="btn" disabled={!pickupDate || !pickupAddress || loading} onClick={schedulePickup}>Schedule Pickup</button>
                    </div>
                </StepContainer>
            )}

            {step === 'confirmation' && (
                <StepContainer title="Appointment Confirmed">
                    <div className="space-y-2">
                        <div>Tracking ID: {state.pickup?.trackingId}</div>
                        <div>Collector: {state.pickup?.collectorName} ({state.pickup?.collectorPhone})</div>
                        <div>Net Amount: {state.resaleEstimate?.currency} {state.pickup?.netAmount?.toFixed(2)}</div>
                        {!!state.pickup?.discountsApplied?.length && (
                            <div className="text-sm opacity-80">Discounts applied: {state.pickup.discountsApplied.map((d) => `${d.label} - ${state.resaleEstimate?.currency} ${d.amount}`).join(', ')}</div>
                        )}
                        <div>We sent a confirmation email to {state.email} with live updates.</div>
                        <div className="flex gap-2 mt-3">
                            <button className="btn" onClick={() => next('gratitude')}>Continue</button>
                        </div>
                    </div>
                </StepContainer>
            )}

            {step === 'games' && (
                <StepContainer title="Play: Image Matcher & E‑Waste Puzzle">
                    <p className="mb-2 text-sm opacity-80">Earn points and redeem as discounts.</p>
                    <GamesPanel
                        onWin={(points) => {
                            alert(`You won! +${points} points added to your account.`);
                            update({ gamePoints: (state.gamePoints || 0) + points });
                        }}
                    />
                    <div className="mt-4">
                        <button className="btn" onClick={() => next('pickup')}>Proceed to Pickup</button>
                    </div>
                </StepContainer>
            )}

            {step === 'gratitude' && (
                <StepContainer title="Thank you!">
                    <p className="mb-4">Your contribution supports reuse, recycling, and a cleaner environment.</p>
                    <div>
                        <label className="block mb-1">Rate your experience</label>
                        <select className="p-2 text-black rounded" defaultValue={5}>
                            <option value={1}>1</option>
                            <option value={2}>2</option>
                            <option value={3}>3</option>
                            <option value={4}>4</option>
                            <option value={5}>5</option>
                        </select>
                    </div>
                </StepContainer>
            )}
        </div>
    );
}

function GamesPanel(props: { onWin: (points: number) => void }) {
    const [moves, setMoves] = useState(0);
    const [matched, setMatched] = useState(0);

    function simulateMatch() {
        setMoves((m) => m + 1);
        const win = Math.random() > 0.6;
        if (win) {
            const newMatched = matched + 1;
            setMatched(newMatched);
            if (newMatched >= 3) {
                props.onWin(10);
                setMoves(0);
                setMatched(0);
            }
        }
    }

    return (
        <div className="p-4 bg-gray-800 rounded">
            <div className="mb-2 text-sm">Image Matcher Demo: find 3 matches to win (+10 pts).</div>
            <div className="flex items-center gap-2">
                <button className="btn" onClick={simulateMatch}>Try Match</button>
                <div className="text-sm">Matches: {matched} / 3</div>
                <div className="text-sm">Moves: {moves}</div>
            </div>
        </div>
    );
}