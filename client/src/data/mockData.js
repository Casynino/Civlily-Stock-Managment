export const mock = {
    business: {
        name: 'CIVLILY',
        currency: 'TZS',
    },
    navItems: [],
    branches: [
        { id: 'b-main', name: 'Main Branch', manager: 'Nino' },
        { id: 'b-east', name: 'East Branch', manager: 'Asha' },
    ],
    kpis: {
        cashToday: 0,
        customers: 1,
        products: 1,
        ordersToday: 0,
        transfersPending: 0,
        transfersApproved: 0,
    },
    products: [
        { id: 'P-001', name: 'Sample Product', sku: 'SKU-001', stock: 0, price: 1000, status: 'Active' },
    ],
    sales: [
        { id: 'S-1001', time: '10:12', customer: 'Walk-in', total: 0, status: 'Pending' },
    ],
    customers: [
        { id: 'C-001', name: 'Walk-in', phone: '-', balance: 0 },
    ],
    expenses: [
        { id: 'E-001', category: 'Rent', amount: 0, date: 'Today', note: '—' },
    ],
    staff: [
        { id: 'U-001', name: 'Nino', role: 'ADMIN', branch: 'Main Branch', status: 'Active' },
    ],
};
