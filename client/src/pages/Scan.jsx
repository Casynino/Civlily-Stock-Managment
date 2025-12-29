import { Html5Qrcode } from 'html5-qrcode';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { api } from '../api.js';

export default function ScanPage() {
    const { t } = useTranslation();
    const [running, setRunning] = React.useState(false);
    const [result, setResult] = React.useState(null);
    const [error, setError] = React.useState('');

    const qrRegionId = 'qr-reader';

    async function start() {
        setError('');
        setResult(null);

        const qr = new Html5Qrcode(qrRegionId);
        window.__civlilyQr = qr;

        try {
            const devices = await Html5Qrcode.getCameras();
            const cameraId = devices?.[0]?.id;
            if (!cameraId) throw new Error('NoCamera');

            await qr.start(
                cameraId,
                { fps: 10, qrbox: { width: 250, height: 250 } },
                async (decodedText) => {
                    try {
                        const r = await api.get(`/products/by-qr/${encodeURIComponent(decodedText)}`);
                        setResult(r.data.product);
                    } catch (e) {
                        setResult(null);
                        setError(e?.response?.data?.error || t('qrNotFound'));
                    }
                },
                () => { }
            );
            setRunning(true);
        } catch (e) {
            setError(e?.message || 'ScanFailed');
            try {
                await qr.stop();
            } catch {
                // ignore
            }
            try {
                await qr.clear();
            } catch {
                // ignore
            }
        }
    }

    async function stop() {
        const qr = window.__civlilyQr;
        if (!qr) return;
        try {
            await qr.stop();
        } catch {
            // ignore
        }
        try {
            await qr.clear();
        } catch {
            // ignore
        }
        setRunning(false);
    }

    React.useEffect(() => {
        return () => {
            stop();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div>
            <h2>{t('scan')}</h2>
            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                {!running ? <button onClick={start}>{t('startScan')}</button> : <button onClick={stop}>{t('stopScan')}</button>}
            </div>
            <div id={qrRegionId} style={{ width: 320, marginTop: 12 }} />

            {error ? <div style={{ color: 'crimson', marginTop: 10 }}>{error}</div> : null}

            {result ? (
                <div style={{ marginTop: 12 }}>
                    <strong>{t('product')}:</strong> {result.name}
                </div>
            ) : null}
        </div>
    );
}
