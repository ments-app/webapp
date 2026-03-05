'use client';

import React, { useState } from 'react';
import { AlertTriangle, Trash2, X, Loader2, CheckCircle2, MessageSquareOff, UserX } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useUserData } from '@/hooks/useUserData';

interface DeleteAccountDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

type Step = 'warning' | 'confirm' | 'processing' | 'done';

export function DeleteAccountDialog({ isOpen, onClose }: DeleteAccountDialogProps) {
    const { signOut } = useAuth();
    const { userData } = useUserData();
    const [step, setStep] = useState<Step>('warning');
    const [confirmText, setConfirmText] = useState('');
    const [error, setError] = useState<string | null>(null);

    const expectedUsername = userData?.username || '';

    const handleReset = () => {
        setStep('warning');
        setConfirmText('');
        setError(null);
    };

    const handleClose = () => {
        if (step === 'processing') return;
        handleReset();
        onClose();
    };

    const handleDelete = async () => {
        if (confirmText !== expectedUsername) return;

        setStep('processing');
        setError(null);

        try {
            const res = await fetch('/api/users/account', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason: 'User requested permanent deletion' }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to delete account');
            }

            setStep('done');

            setTimeout(async () => {
                await signOut();
                window.location.replace('/');
            }, 2000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
            setStep('confirm');
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
                {step !== 'processing' && step !== 'done' && (
                    <button
                        onClick={handleClose}
                        className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors z-10"
                    >
                        <X className="h-5 w-5" />
                    </button>
                )}

                {/* Warning Step */}
                {step === 'warning' && (
                    <div className="p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
                                <AlertTriangle className="h-6 w-6 text-destructive" />
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold text-foreground">Delete Account</h2>
                                <p className="text-sm text-muted-foreground">Are you sure you want to delete your account?</p>
                            </div>
                        </div>

                        <div className="space-y-3 mb-6">
                            <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4">
                                <h3 className="font-medium text-destructive text-sm mb-3">By deleting your account:</h3>
                                <ul className="space-y-2.5">
                                    {[
                                        { icon: UserX, text: 'Your profile, posts, and all associated data will be removed' },
                                        { icon: MessageSquareOff, text: 'All your messages and conversations will be permanently deleted' },
                                    ].map(({ icon: Icon, text }, i) => (
                                        <li key={i} className="flex items-start gap-2.5 text-sm text-foreground/80">
                                            <Icon className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                                            <span>{text}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                                <p className="text-sm text-muted-foreground">
                                    You can always create a new account with the same email for a fresh start.
                                </p>
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
                                onClick={() => setStep('confirm')}
                                className="flex-1 px-4 py-2.5 bg-destructive text-white rounded-lg text-sm font-medium hover:bg-destructive/90 transition-colors"
                            >
                                Yes, continue
                            </button>
                        </div>
                    </div>
                )}

                {/* Confirm Step */}
                {step === 'confirm' && (
                    <div className="p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
                                <Trash2 className="h-6 w-6 text-destructive" />
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold text-foreground">Confirm Deletion</h2>
                                <p className="text-sm text-muted-foreground">Type your username to confirm</p>
                            </div>
                        </div>

                        {error && (
                            <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3 mb-4">
                                <p className="text-sm text-destructive">{error}</p>
                            </div>
                        )}

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Type <span className="font-mono font-semibold text-destructive">{expectedUsername}</span> to confirm
                            </label>
                            <input
                                type="text"
                                value={confirmText}
                                onChange={(e) => setConfirmText(e.target.value)}
                                placeholder="Enter your username"
                                className="w-full px-4 py-2.5 border border-border bg-background text-foreground rounded-lg focus:ring-2 focus:ring-destructive/30 focus:border-destructive outline-none text-sm transition-colors"
                                autoComplete="off"
                                autoFocus
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => { setStep('warning'); setError(null); }}
                                className="flex-1 px-4 py-2.5 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors"
                            >
                                Go back
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={confirmText !== expectedUsername}
                                className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${confirmText === expectedUsername
                                    ? 'bg-destructive text-white hover:bg-destructive/90 cursor-pointer'
                                    : 'bg-muted text-muted-foreground cursor-not-allowed'
                                    }`}
                            >
                                Delete my account permanently
                            </button>
                        </div>
                    </div>
                )}

                {/* Processing Step */}
                {step === 'processing' && (
                    <div className="p-8 flex flex-col items-center text-center">
                        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4 animate-pulse">
                            <Loader2 className="h-8 w-8 text-destructive animate-spin" />
                        </div>
                        <h2 className="text-xl font-semibold text-foreground mb-2">Deleting your account</h2>
                        <p className="text-sm text-muted-foreground">
                            Removing personal data and messages. Please don&apos;t close this window...
                        </p>
                    </div>
                )}

                {/* Done Step */}
                {step === 'done' && (
                    <div className="p-8 flex flex-col items-center text-center">
                        <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                            <CheckCircle2 className="h-8 w-8 text-green-500" />
                        </div>
                        <h2 className="text-xl font-semibold text-foreground mb-2">Account deleted</h2>
                        <p className="text-sm text-muted-foreground">
                            Your account has been permanently deleted. Redirecting...
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
