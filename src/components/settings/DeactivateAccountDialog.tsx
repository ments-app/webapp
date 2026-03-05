'use client';

import React, { useState } from 'react';
import { PauseCircle, X, Loader2, CheckCircle2, Eye, Shield, Clock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface DeactivateAccountDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

export function DeactivateAccountDialog({ isOpen, onClose }: DeactivateAccountDialogProps) {
    const { signOut } = useAuth();
    const [isProcessing, setIsProcessing] = useState(false);
    const [isDone, setIsDone] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleClose = () => {
        if (isProcessing) return;
        setError(null);
        setIsDone(false);
        onClose();
    };

    const handleDeactivate = async () => {
        setIsProcessing(true);
        setError(null);

        try {
            const res = await fetch('/api/users/account', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'deactivate' }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to deactivate account');
            }

            setIsDone(true);

            // Sign out and redirect after a brief delay
            setTimeout(async () => {
                await signOut();
                window.location.replace('/');
            }, 2000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
            setIsProcessing(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

            {/* Dialog */}
            <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Close button */}
                {!isProcessing && !isDone && (
                    <button
                        onClick={handleClose}
                        className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors z-10"
                    >
                        <X className="h-5 w-5" />
                    </button>
                )}

                {/* Processing/Done states */}
                {isProcessing && !isDone && (
                    <div className="p-8 flex flex-col items-center text-center">
                        <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mb-4 animate-pulse">
                            <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
                        </div>
                        <h2 className="text-xl font-semibold text-foreground mb-2">Deactivating account</h2>
                        <p className="text-sm text-muted-foreground">Please wait...</p>
                    </div>
                )}

                {isDone && (
                    <div className="p-8 flex flex-col items-center text-center">
                        <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                            <CheckCircle2 className="h-8 w-8 text-green-500" />
                        </div>
                        <h2 className="text-xl font-semibold text-foreground mb-2">Account deactivated</h2>
                        <p className="text-sm text-muted-foreground">
                            Your account has been deactivated. You can reactivate by signing in again. Redirecting...
                        </p>
                    </div>
                )}

                {/* Main content */}
                {!isProcessing && !isDone && (
                    <div className="p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                                <PauseCircle className="h-6 w-6 text-amber-500" />
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold text-foreground">Deactivate Account</h2>
                                <p className="text-sm text-muted-foreground">Take a break — your data stays safe</p>
                            </div>
                        </div>

                        {error && (
                            <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3 mb-4">
                                <p className="text-sm text-destructive">{error}</p>
                            </div>
                        )}

                        <div className="space-y-3 mb-6">
                            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
                                <h3 className="font-medium text-amber-600 dark:text-amber-400 text-sm mb-3">What happens when you deactivate:</h3>
                                <ul className="space-y-2.5">
                                    {[
                                        { icon: Eye, text: 'Your profile will be hidden from other users' },
                                        { icon: Shield, text: 'All your data, posts, and connections are preserved' },
                                        { icon: Clock, text: 'You can reactivate anytime by simply signing back in' },
                                    ].map(({ icon: Icon, text }, i) => (
                                        <li key={i} className="flex items-start gap-2.5 text-sm text-foreground/80">
                                            <Icon className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                                            <span>{text}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={handleClose}
                                className="flex-1 px-4 py-2.5 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeactivate}
                                className="flex-1 px-4 py-2.5 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors"
                            >
                                Deactivate my account
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
