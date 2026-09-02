'use client';

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { LogOut, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

interface LogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LogoutModal({ isOpen, onClose }: LogoutModalProps) {
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Log Out Confirmation"
      description="Are you sure you want to log out of WorkMatch?"
    >
      <div className="space-y-5 pt-2">
        <div className="flex items-center gap-3 p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 text-xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <p>You will need to enter your credentials or sign in with Google again to access your dashboard.</p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isLoggingOut}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={handleConfirmLogout}
            isLoading={isLoggingOut}
            className="font-bold flex items-center gap-1.5"
          >
            <LogOut className="w-4 h-4" /> Yes, Log Out
          </Button>
        </div>
      </div>
    </Modal>
  );
}
