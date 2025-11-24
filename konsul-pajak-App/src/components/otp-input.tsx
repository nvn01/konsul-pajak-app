"use client";

import React, { useRef, useState, useEffect, useCallback, useImperativeHandle, forwardRef } from "react";
import type { KeyboardEvent, ClipboardEvent } from "react";
import { Input } from "./ui/input";

interface OTPInputProps {
    length?: number;
    onComplete: (otp: string) => void;
    disabled?: boolean;
}

export interface OTPInputRef {
    reset: () => void;
}

export const OTPInput = forwardRef<OTPInputRef, OTPInputProps>(
    ({ length = 6, onComplete, disabled = false }, ref) => {
        const [otp, setOtp] = useState<string[]>(new Array(length).fill(""));
        const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
        const hasCompleted = useRef(false);

        // Expose reset method to parent component
        useImperativeHandle(ref, () => ({
            reset: () => {
                setOtp(new Array(length).fill(""));
                hasCompleted.current = false;
                if (inputRefs.current[0]) {
                    inputRefs.current[0].focus();
                }
            },
        }));

        useEffect(() => {
            // Auto-focus first input on mount
            if (inputRefs.current[0]) {
                inputRefs.current[0].focus();
            }
        }, []);

        // Memoize the complete handler to prevent re-triggering
        const handleComplete = useCallback(
            (otpValue: string) => {
                if (!hasCompleted.current) {
                    hasCompleted.current = true;
                    onComplete(otpValue);
                }
            },
            [onComplete]
        );

        useEffect(() => {
            // Check if OTP is complete and hasn't been submitted yet
            const otpValue = otp.join("");
            if (otpValue.length === length && !hasCompleted.current) {
                handleComplete(otpValue);
            }
        }, [otp, length, handleComplete]);

        const handleChange = (index: number, value: string) => {
            // Only allow digits
            const sanitizedValue = value.replace(/[^0-9]/g, "");

            if (sanitizedValue.length === 0) {
                // Handle backspace/delete
                const newOtp = [...otp];
                newOtp[index] = "";
                setOtp(newOtp);
                // Reset completion flag when user modifies OTP
                hasCompleted.current = false;
                return;
            }

            if (sanitizedValue.length === 1) {
                // Single digit entry
                const newOtp = [...otp];
                newOtp[index] = sanitizedValue;
                setOtp(newOtp);

                // Auto-focus next input
                if (index < length - 1 && inputRefs.current[index + 1]) {
                    inputRefs.current[index + 1]?.focus();
                }
            } else if (sanitizedValue.length === length) {
                // Pasted full OTP
                const newOtp = sanitizedValue.split("").slice(0, length);
                setOtp(newOtp);

                // Focus last input
                if (inputRefs.current[length - 1]) {
                    inputRefs.current[length - 1]?.focus();
                }
            }
        };

        const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
            if (e.key === "Backspace" && !otp[index] && index > 0) {
                // Move to previous input on backspace if current is empty
                inputRefs.current[index - 1]?.focus();
            } else if (e.key === "ArrowLeft" && index > 0) {
                inputRefs.current[index - 1]?.focus();
            } else if (e.key === "ArrowRight" && index < length - 1) {
                inputRefs.current[index + 1]?.focus();
            }
        };

        const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
            e.preventDefault();
            const pastedData = e.clipboardData.getData("text");
            const sanitizedData = pastedData.replace(/[^0-9]/g, "");

            if (sanitizedData.length === length) {
                const newOtp = sanitizedData.split("");
                setOtp(newOtp);

                // Focus last input
                if (inputRefs.current[length - 1]) {
                    inputRefs.current[length - 1]?.focus();
                }
            }
        };

        return (
            <div className="flex gap-2 justify-center">
                {otp.map((digit, index) => (
                    <Input
                        key={index}
                        ref={(el) => {
                            inputRefs.current[index] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleChange(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(index, e)}
                        onPaste={handlePaste}
                        disabled={disabled}
                        className="w-12 h-12 text-center text-2xl font-bold"
                        autoComplete="off"
                    />
                ))}
            </div>
        );
    }
);

OTPInput.displayName = "OTPInput";
