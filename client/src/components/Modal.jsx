import React from 'react';

export default function Modal({ open, title, children, onClose, footer }) {
    React.useEffect(() => {
        function onKeyDown(e) {
            if (e.key === 'Escape') onClose?.();
        }
        if (open) window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div className="modalOverlay" onMouseDown={onClose}>
            <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
                <div className="modalHeader">
                    <div className="modalTitle">{title}</div>
                    <button className="button" type="button" onClick={onClose}>
                        ✕
                    </button>
                </div>
                <div className="modalBody">{children}</div>
                {footer ? <div className="modalFooter">{footer}</div> : null}
            </div>
        </div>
    );
}
