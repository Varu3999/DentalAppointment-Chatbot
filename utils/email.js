import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Common function to send emails
const sendEmail = async (mailOptions) => {
  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};

// Helper function to format date and time
const formatDateTime = (isoString) => {
  const date = new Date(isoString);
  return date.toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/Los_Angeles",
  });
};

// Base email template
const getEmailTemplate = (content) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px;">
            ${content}
        </div>
        <div style="margin-top: 20px; font-size: 14px; color: #666;">
            <p>If you need to reschedule or cancel your appointment, please contact us at least 24 hours in advance.</p>
            <p>Thank you for choosing our dental practice!</p>
        </div>
    </div>
`;

export const sendOTPEmail = async (email, otp) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Your Verification Code",
    html: getEmailTemplate(`
            <h2>Verification Code</h2>
            <p>Your verification code is:</p>
            <h1 style="font-size: 32px; letter-spacing: 5px; background: #ffffff; padding: 20px; text-align: center;">${otp}</h1>
            <p>This code will expire in 10 minutes.</p>
            <p>If you didn't request this code, please ignore this email.</p>
        `),
  };

  return await sendEmail(mailOptions);
};

export const sendEmergencyRequest = async (patientDetails) => {
  const { patientName, patientEmail, patientPhone, additionalNotes } =
    patientDetails;
  const managementEmail = process.env.MANAGEMENT_EMAIL;

  if (!managementEmail) {
    throw new Error("Management email not configured");
  }

  const currentTime = new Date().toLocaleString("en-US", {
    timeZone: "America/Los_Angeles",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: managementEmail,
    subject: "🚨 Emergency Appointment Request",
    html: getEmailTemplate(`
      <h2 style="color: #ff4444;">Emergency Appointment Request</h2>
      <p><strong>Request Time:</strong> ${currentTime}</p>
      <div style="margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px;">
        <h3>Patient Details</h3>
        <p><strong>Name:</strong> ${patientName}</p>
        <p><strong>Email:</strong> ${patientEmail}</p>
        <p><strong>Phone:</strong> ${patientPhone || "Not provided"}</p>
        ${
          additionalNotes
            ? `<p><strong>Additional Notes:</strong> ${additionalNotes}</p>`
            : ""
        }
      </div>
      <p>Please contact the patient as soon as possible to schedule an emergency appointment.</p>
    `),
  };

  return await sendEmail(mailOptions);
};

export const sendAppointmentConfirmation = async (email, appointment) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Your Dental Appointment Confirmation",
    html: getEmailTemplate(`
            <h2>Appointment Confirmation</h2>
            <p>Your dental appointment has been confirmed for:</p>
            <div style="background: #ffffff; padding: 15px; border-radius: 5px; margin: 15px 0;">
                <p><strong>Date & Time:</strong> ${formatDateTime(
                  appointment.time
                )}</p>
                <p><strong>Type:</strong> ${appointment.appointmentType}</p>
                ${
                  appointment.additionalNotes
                    ? `<p><strong>Notes:</strong> ${appointment.additionalNotes}</p>`
                    : ""
                }
            </div>
        `),
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error("Error sending appointment confirmation:", error);
    return false;
  }
};

export const sendFamilyAppointmentConfirmation = async (
  email,
  appointments
) => {
  const firstAppointment = appointments[0];
  const appointmentCount = appointments.length;

  const appointmentsList = appointments
    .map(
      (apt, index) => `
        <div style="background: #ffffff; padding: 15px; border-radius: 5px; margin: 10px 0;">
            <p><strong>Appointment ${index + 1}:</strong></p>
            <p><strong>Time:</strong> ${formatDateTime(apt.time)}</p>
        </div>
    `
    )
    .join("");

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Your Family Dental Appointments Confirmation",
    html: getEmailTemplate(`
            <h2>Family Appointments Confirmation</h2>
            <p>Your family dental appointments have been confirmed:</p>
            <div style="margin: 15px 0;">
                <p><strong>Appointment Type:</strong> ${
                  firstAppointment.appointmentType
                }</p>
                ${
                  firstAppointment.additionalNotes
                    ? `<p><strong>Notes:</strong> ${firstAppointment.additionalNotes}</p>`
                    : ""
                }
                <p><strong>Total Appointments:</strong> ${appointmentCount}</p>
                ${appointmentsList}
            </div>
        `),
  };

  return await sendEmail(mailOptions);
};
