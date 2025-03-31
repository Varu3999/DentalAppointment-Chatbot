import { NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';
import { generateToken } from '@/utils/jwt';



export async function POST(request) {
    try {
        const { email, otp, fullName, phone, dob, insuranceProvider, selfPay } = await request.json();

        if (!email || !otp || !fullName || !phone || !dob) {
            return NextResponse.json(
                { message: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Verify OTP
        const { data: account, error: accountError } = await supabase
            .from('accounts')
            .select('*')
            .eq('email', email)
            .single();

        if (accountError || !account) {
            return NextResponse.json(
                { message: 'Account not found' },
                { status: 400 }
            );
        }

        console.log('Verifying OTP:', { 
            stored: account.otp, 
            received: otp,
            validTill: account.otp_valid_till,
            now: new Date().toISOString()
        });

        if (account.otp !== otp) {
            return NextResponse.json(
                { message: 'Invalid verification code' },
                { status: 400 }
            );
        }

        if (new Date() > new Date(account.otp_valid_till)) {
            return NextResponse.json(
                { message: 'Verification code has expired' },
                { status: 400 }
            );
        }

        // Update account to set it as active and clear OTP
        const { error: activateError } = await supabase
            .from('accounts')
            .update({ 
                is_active: true,
                otp: null,
                otp_valid_till: null
            })
            .eq('id', account.id);

        if (activateError) {
            console.error('Account activation error:', activateError);
            return NextResponse.json(
                { message: 'Failed to activate account' },
                { status: 500 }
            );
        }

        // Create patient record
        const { data: patient, error: patientError } = await supabase
            .from('patients')
            .insert([{
                account_id: account.id,
                full_name: fullName,
                phone,
                dob,
                insurance_provider: insuranceProvider || null,
                self_pay: selfPay
            }])
            .select()
            .single();

        if (patientError) {
            console.error('Patient creation error:', patientError);
            // Revert account activation since patient creation failed
            await supabase
                .from('accounts')
                .update({ is_active: false })
                .eq('id', account.id);
            return NextResponse.json(
                { message: 'Failed to create patient record' },
                { status: 500 }
            );
        }

        // Update account with default_patient_id
        const { error: updateError } = await supabase
            .from('accounts')
            .update({ default_patient_id: patient.id })
            .eq('id', account.id);

        if (updateError) {
            console.error('Account update error:', updateError);
        }



        // Generate JWT token
        const token = generateToken(account.id);

        return NextResponse.json({
            message: 'Registration successful',
            token
        });
    } catch (error) {
        console.error('Verification error:', error);
        return NextResponse.json(
            { message: 'Internal server error' },
            { status: 500 }
        );
    }
}
