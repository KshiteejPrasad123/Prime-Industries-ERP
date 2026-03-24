import { useState, useEffect } from 'react';

export function useToast() {
  const [toast, setToast] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  return { toast, showToast };
}

export function Toast({ message }) {
  if (!message) return null;
  return <div className="toast">{message}</div>;
}
