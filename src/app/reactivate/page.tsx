'use client';

import React, { useState } from 'react';
import { RefreshCw, Loader2, CheckCircle2, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function ReactivatePage() {
    const { signOut } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [isDone, setIsDone] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleReactivate = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/users/account', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'reactivate' }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to reactivate account');
            }

            setIsDone(true);

            // Redirect to home feed after a brief delay
            setTimeout(() => {
                window.location.replace('/');
            }, 1500);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
            setIsLoading(false);
        }
    };

    const handleSignOut = async () => {
        await signOut();
        window.location.replace('/');
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Success state */}
                {isDone ? (
                    <div className="bg-card border border-border rounded-2xl p-8 text-center shadow-lg">
                        <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 className="h-8 w-8 text-green-500" />
                        </div>
                        <h1 className="text-2xl font-semibold text-foreground mb-2">Welcome back!</h1>
                        <p className="text-muted-foreground">
                            Your account has been reactivated. Redirecting to your feed...
                        </p>
                    </div>
                ) : (
                    <div className="bg-card border border-border rounded-2xl p-8 shadow-lg">
                        {/* Header */}
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                                <RefreshCw className="h-8 w-8 text-primary" />
                            </div>
                            <h1 className="text-2xl font-semibold text-foreground mb-2">
                                Your account is deactivated
                            </h1>
                            <p className="text-muted-foreground">
                                We&apos;re glad to see you again! Your data is safe and ready to be restored.
                            </p>
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3 mb-6">
                                <p className="text-sm text-destructive">{error}</p>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="space-y-3">
                            <button
                                onClick={handleReactivate}
                                disabled={isLoading}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Reactivating...
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw className="h-4 w-4" />
                                        Reactivate my account
                                    </>
                                )}
                            </button>

                            <button
                                onClick={handleSignOut}
                                disabled={isLoading}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-border rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-60"
                            >
                                <LogOut className="h-4 w-4" />
                                Sign out instead
                            </button>
                        </div>

                        {/* Info */}
                        <p className="text-xs text-muted-foreground text-center mt-6">
                            Reactivating will restore your profile, posts, and connections exactly as they were.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
