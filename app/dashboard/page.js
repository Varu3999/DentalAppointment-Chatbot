"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function AppointmentList({ appointments, onCancel }) {
  if (!appointments?.length) {
    return <p className="text-sm text-gray-500">No upcoming appointments.</p>;
  }

  return (
    <div className="space-y-4">
      {appointments.map((apt) => (
        <div
          key={apt.id}
          className="bg-white shadow-sm rounded-lg p-4 border border-gray-200"
        >
          <div className="flex justify-between items-start">
            <div>
              <h4 className="text-sm font-medium text-gray-900">
                {apt.patientName}
              </h4>
              <p className="mt-1 text-sm text-gray-600">{apt.formattedTime}</p>
              <p className="text-sm text-gray-600">{apt.type}</p>
              {apt.notes && (
                <p className="mt-1 text-sm text-gray-500">{apt.notes}</p>
              )}
            </div>
            <button
              onClick={() => onCancel(apt.id)}
              className="text-sm text-red-600 hover:text-red-700"
            >
              Cancel
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [appointmentError, setAppointmentError] = useState(null);

  const fetchAppointments = async () => {
    try {
      setLoadingAppointments(true);
      setAppointmentError(null);
      const response = await fetch("/api/appointments");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch appointments");
      }

      setAppointments(data.appointments);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      setAppointmentError(error.message);
    } finally {
      setLoadingAppointments(false);
    }
  };

  const handleCancelAppointment = async (appointmentId) => {
    if (!confirm("Are you sure you want to cancel this appointment?")) {
      return;
    }

    try {
      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to cancel appointment");
      }

      // Refresh appointments list
      fetchAppointments();
    } catch (error) {
      console.error("Error canceling appointment:", error);
      alert("Failed to cancel appointment. Please try again.");
    }
  };

  useEffect(() => {
    // Fetch user data
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user);
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });

    // Fetch appointments
    fetchAppointments();
  }, []);

  const handleSignOut = async () => {
    try {
      await fetch("/api/auth/signout", {
        method: "POST",
      });
      router.push("/signin");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-extrabold text-gray-900">
              Welcome
              {user?.defaultPatientName ? `, ${user.defaultPatientName}` : ""}!
            </h2>
            <p className="mt-2 text-sm text-gray-600">{user?.email}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Sign Out
          </button>
        </div>

        <div className="space-y-6">
          <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Upcoming Appointments
            </h3>
            {loadingAppointments ? (
              <p className="text-sm text-gray-500">Loading appointments...</p>
            ) : appointmentError ? (
              <p className="text-sm text-red-600">{appointmentError}</p>
            ) : (
              <AppointmentList
                appointments={appointments}
                onCancel={handleCancelAppointment}
              />
            )}
          </div>

          <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              What would you like to do?
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => router.push("/patients")}
                className="p-4 border rounded-lg hover:bg-gray-50 text-left"
              >
                <h4 className="text-base font-medium text-gray-900">
                  Manage Patients
                </h4>
                <p className="mt-1 text-sm text-gray-500">
                  Add, edit, or remove patients from your account
                </p>
              </button>
              <button
                onClick={() => router.push("/schedule")}
                className="p-4 border rounded-lg hover:bg-gray-50 text-left"
              >
                <h4 className="text-base font-medium text-gray-900">
                  Schedule Appointment
                </h4>
                <p className="mt-1 text-sm text-gray-500">
                  Book a new appointment or manage existing ones
                </p>
              </button>
              <button
                onClick={() => router.push("/chat")}
                className="p-4 border rounded-lg hover:bg-gray-50 text-left bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100"
              >
                <h4 className="text-base font-medium text-gray-900">
                  Chat Assistant
                </h4>
                <p className="mt-1 text-sm text-gray-500">
                  Book appointments through our AI chat assistant
                </p>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
