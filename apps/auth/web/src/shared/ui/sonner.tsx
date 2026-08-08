'use client';

import { Check } from 'lucide-react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      position="bottom-center"
      closeButton
      style={
        {
          '--normal-bg': '#141414',
          '--normal-text': '#ffffff',
          '--normal-border': 'transparent',
          '--border-radius': '18px',
        } as React.CSSProperties
      }
      icons={{
        success: <Check strokeWidth={3} className="size-5 text-white" />,
      }}
      toastOptions={{
        style: { padding: '20px 26px', fontSize: '17px', gap: '14px' },
      }}
      {...props}
    />
  );
};

export { Toaster };
