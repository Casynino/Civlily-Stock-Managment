import { useI18n } from '../i18n/I18nContext.jsx';
import Modal from './Modal.jsx';

export default function ConfirmDialog({ open, title, message, confirmText, danger, onCancel, onConfirm }) {
    const { t } = useI18n();

    return (
        <Modal
            open={open}
            title={title}
            onClose={onCancel}
            footer={
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <button className="button" type="button" onClick={onCancel}>
                        {t('common.cancel')}
                    </button>
                    <button
                        className="button"
                        type="button"
                        onClick={onConfirm}
                        style={danger ? { background: 'var(--danger)', borderColor: 'rgba(0,0,0,0.0)', color: '#fff' } : undefined}
                    >
                        {confirmText || t('common.confirm')}
                    </button>
                </div>
            }
        >
            <div className="muted">{message}</div>
        </Modal>
    );
}
