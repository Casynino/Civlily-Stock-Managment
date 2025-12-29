import React from 'react';

import { mock } from '../data/mockData.js';

export default function ReportsPage() {
    const [range, setRange] = React.useState('Today');

    return (
        <div className="grid">
            <div className="card">
                <div className="sectionHeader">
                    <div>
                        <div className="sectionTitle">Reports</div>
                        <div className="muted" style={{ fontSize: 12 }}>Sales, stock, profit & loss, and end-of-day summaries (mock)</div>
                    </div>

                    <select
                        value={range}
                        onChange={(e) => setRange(e.target.value)}
                        style={{ padding: '10px 12px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)' }}
                    >
                        <option>Today</option>
                        <option>This Week</option>
                        <option>This Month</option>
                    </select>
                </div>

                <div className="divider" />

                <div className="kpiGrid">
                    <div className="tile">
                        <div className="tileIcon">💳</div>
                        <div>
                            <div className="tileTitle">Revenue</div>
                            <div className="tileValue">{mock.kpis.cashToday} {mock.business.currency}</div>
                        </div>
                    </div>
                    <div className="tile">
                        <div className="tileIcon">📦</div>
                        <div>
                            <div className="tileTitle">Products</div>
                            <div className="tileValue">{mock.kpis.products}</div>
                        </div>
                    </div>
                    <div className="tile">
                        <div className="tileIcon">🧾</div>
                        <div>
                            <div className="tileTitle">Expenses</div>
                            <div className="tileValue">0 {mock.business.currency}</div>
                        </div>
                    </div>
                    <div className="tile">
                        <div className="tileIcon">📈</div>
                        <div>
                            <div className="tileTitle">Net Profit</div>
                            <div className="tileValue">0 {mock.business.currency}</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="card">
                <div className="sectionHeader">
                    <div className="sectionTitle">Exports</div>
                    <button className="button" type="button">Download CSV</button>
                </div>
                <div className="empty">Export will be enabled once the backend is connected.</div>
            </div>
        </div>
    );
}
