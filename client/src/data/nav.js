export const navItems = [
    { type: 'link', to: '/', end: true, label: 'Home', i18nKey: 'nav.home', icon: '⌂' },

    { type: 'section', key: 'ops', label: 'Sales & Orders', i18nKey: 'nav.section.ops' },
    { type: 'link', to: '/sales', label: 'Sell Now', i18nKey: 'nav.sellNow', icon: '🛒' },
    { type: 'link', to: '/customers', label: 'Customers', i18nKey: 'nav.customers', icon: '👤' },

    { type: 'section', key: 'stock', label: 'Stock', i18nKey: 'nav.section.stock' },
    { type: 'link', to: '/inventory', label: 'Products & Stock', i18nKey: 'nav.productsStock', icon: '📦' },
    { type: 'link', to: '/branches', label: 'Branches', i18nKey: 'nav.branches', icon: '🏪' },
    { type: 'link', to: '/transfers', label: 'Transfers', i18nKey: 'nav.transfers', icon: '🔁' },

    { type: 'section', key: 'money', label: 'Accounting', i18nKey: 'nav.section.money' },
    { type: 'link', to: '/expenses', label: 'Expenses', i18nKey: 'nav.expenses', icon: '🧾' },
    { type: 'link', to: '/reports', label: 'Reports', i18nKey: 'nav.reports', icon: '📊' },

    { type: 'section', key: 'admin', label: 'Manage', i18nKey: 'nav.section.admin' },
    { type: 'link', to: '/staff', label: 'Staff', i18nKey: 'nav.staff', icon: '👥' },
    { type: 'link', to: '/settings', label: 'Settings', i18nKey: 'nav.settings', icon: '⚙' },
];
