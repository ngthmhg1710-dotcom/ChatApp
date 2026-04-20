import React from 'react';
import { createRoot } from 'react-dom/client';
import ConfirmDialog from '../components/ConfirmDialog';

export default function confirmAsync({ title = 'Xác nhận', message = '', danger = true, confirmLabel = 'Xác nhận' } = {}) {
  return new Promise((resolve) => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    const cleanup = () => {
      try { root.unmount(); } catch (e) {}
      try { container.remove(); } catch (e) {}
    };

    const onConfirm = () => { resolve(true); cleanup(); };
    const onCancel = () => { resolve(false); cleanup(); };

    root.render(
      React.createElement(ConfirmDialog, {
        title,
        message,
        danger,
        confirmLabel,
        onConfirm,
        onCancel,
      }),
    );
  });
}
