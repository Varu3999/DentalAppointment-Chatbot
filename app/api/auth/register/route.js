import { NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';
import { sendOTPEmail } from '@/utils/email';



export async function POST(request) {
    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json(
                { message: 'Email is required' },
                { status: 400 }
            );
        }

        // Check if email exists and account is already active
        const { data: existingUser } = await supabase
            .from('accounts')
            .select('id, is_active')
            .eq('email', email)
            .single();

        if (existingUser?.is_active) {
            return NextResponse.json(
                { message: 'Email already registered' },
                { status: 400 }
            );
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpValidTill = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

        // Create or update account with new OTP
        const { error: upsertError } = await supabase
            .from('accounts')
            .upsert({
                email,
                otp,
                otp_valid_till: otpValidTill.toISOString(),
                is_active: false
            }, {
                onConflict: 'email',
                ignoreDuplicates: false
            });

        if (upsertError) {
            console.error('Error storing OTP:', upsertError);
            return NextResponse.json(
                { message: 'Failed to process registration' },
                { status: 500 }
            );
        }

        console.log('Stored new OTP in database:', { email, otp, otpValidTill });

        // Send OTP email
        const emailSent = await sendOTPEmail(email, otp);

        if (!emailSent) {
            return NextResponse.json(
                { message: 'Failed to send verification email' },
                { status: 500 }
            );
        }

        return NextResponse.json(
            { message: 'Verification code sent' },
            { status: 200 }
        );
    } catch (error) {
        console.error('Registration error:', error);
        return NextResponse.json(
            { message: 'Internal server error' },
            { status: 500 }
        );
    }
}
