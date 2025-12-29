import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
    en: {
        translation: {
            appName: 'CIVLILY',
            login: 'Login',
            identifier: 'Email or Staff ID',
            password: 'Password',
            logout: 'Logout',
            home: 'Home',
            sell: 'Sell',
            scan: 'Scan',
            transfers: 'Transfers',
            reports: 'Reports',
            language: 'Language',
            branch: 'Branch',
            activeBranch: 'Active Branch',
            apiHealth: 'API Health',
            startScan: 'Start Scan',
            stopScan: 'Stop Scan',
            qrNotFound: 'Product not found',
            product: 'Product',
        },
    },
    zh: {
        translation: {
            appName: 'CIVLILY',
            login: '登录',
            identifier: '邮箱或员工编号',
            password: '密码',
            logout: '退出登录',
            home: '首页',
            sell: '销售',
            scan: '扫码',
            transfers: '调货',
            reports: '报表',
            language: '语言',
            branch: '分店',
            activeBranch: '当前分店',
            apiHealth: '接口状态',
            startScan: '开始扫码',
            stopScan: '停止扫码',
            qrNotFound: '未找到商品',
            product: '商品',
        },
    },
};

i18n.use(initReactI18next).init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
});

export default i18n;
