export const navItems = [
    { type: 'link', to: '/', end: true, label: 'Home', icon: '⌂' },

    { type: 'section', key: 'ops', label: 'Daily Operations' },
    { type: 'link', to: '/sell', label: 'Sell Now', icon: '🛒', roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
    { type: 'link', to: '/scan', label: 'Scan', icon: '▦', roles: ['ADMIN', 'MANAGER', 'CASHIER', 'STOREKEEPER'] },
    { type: 'link', to: '/transfers', label: 'Stock Transfers', icon: '⇄', roles: ['ADMIN', 'MANAGER', 'STOREKEEPER'] },

    { type: 'section', key: 'inv', label: 'Stock & Catalog' },
    { type: 'link', to: '/inventory', label: 'Products & Stock', icon: '▤', roles: ['ADMIN', 'MANAGER', 'STOREKEEPER'] },

    { type: 'section', key: 'insights', label: 'Insights' },
    { type: 'link', to: '/reports', label: 'Reports', icon: '▥', roles: ['ADMIN', 'MANAGER'] },

    { type: 'section', key: 'admin', label: 'Manage' },
    { type: 'link', to: '/staff', label: 'Staff Management', icon: '👥', roles: ['ADMIN'] },
    { type: 'link', to: '/settings', label: 'Preferences', icon: '⚙', roles: ['ADMIN'] },
];
