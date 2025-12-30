import React from 'react';
import { useStore } from '../data/StoreContext.jsx';

export default function ReportsPage() {
    const [range, setRange] = React.useState('Today');
    const { state } = useStore();
    const currency = state.settings?.currency || 'TZS';
    const sales = Array.isArray(state.sales) ? state.sales : [];
    const products = Array.isArray(state.products) ? state.products : [];

    return (
        <div className="grid">
            <div className="card">
                <div className="sectionHeader">
                    <div>
                        <div className="sectionTitle">Reports</div>
                        <div className="muted" style={{ fontSize: 12 }}>Sales, stock, profit & loss, and end-of-day summaries</div>
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
                            <div className="tileValue">— {currency}</div>
                        </div>
                    </div>
                    <div className="tile">
                        <div className="tileIcon">📦</div>
                        <div>
                            <div className="tileTitle">Products</div>
                            <div className="tileValue">{products.length}</div>
                        </div>
                    </div>
                    <div className="tile">
                        <div className="tileIcon">🧾</div>
                        <div>
                            <div className="tileTitle">Expenses</div>
                            <div className="tileValue">— {currency}</div>
                        </div>
                    </div>
                    <div className="tile">
                        <div className="tileIcon">📈</div>
                        <div>
                            <div className="tileTitle">Net Profit</div>
                            <div className="tileValue">— {currency}</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="card">
                <div className="sectionHeader">
                    <div className="sectionTitle">Exports</div>
                    <button className="button" type="button">Download CSV</button>
                </div>
                <div className="empty">Export will be enabled once reports endpoints are implemented. Current sales loaded: {sales.length}.</div>
            </div>
        </div>
    );
}
