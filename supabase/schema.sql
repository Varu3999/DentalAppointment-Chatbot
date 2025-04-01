-- Create accounts table
CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    otp TEXT,
    otp_valid_till TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    default_patient_id UUID
);

-- Create patients table
CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    dob DATE NOT NULL,
    insurance_provider TEXT,
    self_pay BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key constraint for default_patient_id after patients table is created
ALTER TABLE accounts 
ADD CONSTRAINT fk_default_patient 
FOREIGN KEY (default_patient_id) 
REFERENCES patients(id) 
ON DELETE SET NULL;

-- Create time_slots table
CREATE TABLE IF NOT EXISTS time_slots (
    slot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    time TIMESTAMP WITH TIME ZONE NOT NULL,
    reserved BOOLEAN DEFAULT FALSE,
    duration INTEGER NOT NULL DEFAULT 15, -- duration in minutes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on time for faster queries
CREATE INDEX IF NOT EXISTS idx_time_slots_time ON time_slots(time);

-- Create appointments table
CREATE TABLE IF NOT EXISTS appointments (
    appointment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id),
    slot_id UUID NOT NULL REFERENCES time_slots(slot_id),
    appointment_type TEXT NOT NULL CHECK (appointment_type IN ('Cleaning', 'General Checkup', 'Emergency')),
    additional_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(slot_id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_slot ON appointments(slot_id);

-- Drop existing functions with the same name if they exist
DROP FUNCTION IF EXISTS public.generate_time_slots();

-- Function to generate time slots for next 90 days
CREATE OR REPLACE FUNCTION public.generate_time_slots()
RETURNS void AS $$
DECLARE
    start_dt DATE;
    end_dt DATE;
    curr_time TIMESTAMP WITH TIME ZONE;
    slot_exists BOOLEAN;
BEGIN
    -- Set the date range
    start_dt := CURRENT_DATE;
    end_dt := start_dt + INTERVAL '90 days';

    -- Loop through each day
    WHILE start_dt <= end_dt LOOP
        -- Only process Monday through Friday
        IF EXTRACT(DOW FROM start_dt) BETWEEN 1 AND 5 THEN
            -- Start at 9 AM PST
            curr_time := start_dt + INTERVAL '9 hours';
            
            -- Convert to PST
            curr_time := curr_time AT TIME ZONE 'PST';

            -- Generate slots until 8 PM
            WHILE EXTRACT(HOUR FROM curr_time) < 20 LOOP
                -- Check if slot already exists
                SELECT EXISTS (
                    SELECT 1 
                    FROM time_slots 
                    WHERE time = curr_time
                ) INTO slot_exists;

                -- If slot doesn't exist, create it
                IF NOT slot_exists THEN
                    INSERT INTO time_slots (time, duration)
                    VALUES (curr_time, 15);
                END IF;

                -- Move to next 15-minute slot
                curr_time := curr_time + INTERVAL '15 minutes';
            END LOOP;
        END IF;

        -- Move to next day
        start_dt := start_dt + INTERVAL '1 day';
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create a cron job to run generate_time_slots() daily
-- Note: This needs to be set up in Supabase dashboard or using their API

-- Function to book appointment with transaction
CREATE OR REPLACE FUNCTION public.book_appointment(
    p_patient_id UUID,
    p_slot_id UUID,
    p_appointment_type TEXT,
    p_additional_notes TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_appointment_id UUID;
BEGIN
    -- Start transaction
    BEGIN
        -- Check if slot is available
        IF EXISTS (SELECT 1 FROM time_slots WHERE slot_id = p_slot_id AND reserved = true) THEN
            RAISE EXCEPTION 'Slot is already reserved';
        END IF;

        -- Create appointment
        INSERT INTO appointments (patient_id, slot_id, appointment_type, additional_notes)
        VALUES (p_patient_id, p_slot_id, p_appointment_type, p_additional_notes)
        RETURNING appointment_id INTO v_appointment_id;

        -- Mark slot as reserved
        UPDATE time_slots
        SET reserved = true
        WHERE slot_id = p_slot_id;

        -- Return the appointment id
        RETURN v_appointment_id;
    EXCEPTION
        WHEN OTHERS THEN
            -- Rollback will happen automatically
            RAISE;
    END;
END;
$$ LANGUAGE plpgsql;

-- Function to cancel appointment with transaction
CREATE OR REPLACE FUNCTION public.cancel_appointment(
    p_appointment_id UUID
) RETURNS void AS $$
DECLARE
    v_slot_id UUID;
BEGIN
    -- Start transaction
    BEGIN
        -- Get the slot_id before deleting the appointment
        SELECT slot_id INTO v_slot_id
        FROM appointments
        WHERE appointment_id = p_appointment_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Appointment not found';
        END IF;

        -- Delete the appointment
        DELETE FROM appointments
        WHERE appointment_id = p_appointment_id;

        -- Mark slot as available
        UPDATE time_slots
        SET reserved = false
        WHERE slot_id = v_slot_id;
    EXCEPTION
        WHEN OTHERS THEN
            -- Rollback will happen automatically
            RAISE;
    END;
END;
$$ LANGUAGE plpgsql;
