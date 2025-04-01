'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ScheduleAppointment() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [appointmentType, setAppointmentType] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [bookingInProgress, setBookingInProgress] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  const appointmentTypes = ['Cleaning', 'General Checkup', 'Emergency'];

  useEffect(() => {
    // Fetch patients for the account
    fetch('/api/patients')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data.patients)) {
          setPatients(data.patients);
        }
      })
      .catch(err => console.error('Error fetching patients:', err));
  }, []);

  // Get min date (today) and max date (90 days from today)
  const today = new Date();
  const minDate = today.toISOString().split('T')[0];
  const maxDate = new Date(today.setDate(today.getDate() + 90)).toISOString().split('T')[0];

  const fetchAvailableSlots = async (date) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/schedule/availableSlots?date=${date}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch available slots');
      }

      setAvailableSlots(data.slots);
    } catch (error) {
      setError(error.message);
      setAvailableSlots([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (e) => {
    const date = e.target.value;
    setSelectedDate(date);
    if (date) {
      fetchAvailableSlots(date);
    } else {
      setAvailableSlots([]);
    }
  };

  const handleSlotSelect = (slot) => {
    setSelectedSlot(slot);
    setBookingSuccess(false);
  };

  const handleBookAppointment = async () => {
    if (!selectedPatient || !selectedSlot || !appointmentType) {
      setError('Please select a patient, time slot, and appointment type');
      return;
    }

    setBookingInProgress(true);
    setError(null);

    try {
      const response = await fetch('/api/schedule/book', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patientId: selectedPatient,
          slotId: selectedSlot.id,
          appointmentType,
          additionalNotes
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to book appointment');
      }

      setBookingSuccess(true);
      setSelectedSlot(null);
      setAppointmentType('');
      setAdditionalNotes('');
      fetchAvailableSlots(selectedDate);
    } catch (err) {
      setError(err.message);
    } finally {
      setBookingInProgress(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-extrabold text-gray-900">
              Schedule Appointment
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Select a date and time for your appointment
            </p>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Back to Dashboard
          </button>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6">
          <div className="mb-6">
            <label htmlFor="date" className="block text-sm font-medium text-gray-700">
              Select Date
            </label>
            <input
              type="date"
              id="date"
              name="date"
              min={minDate}
              max={maxDate}
              value={selectedDate}
              onChange={handleDateChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          {loading && (
            <div className="text-center py-4">
              <p className="text-gray-600">Loading available slots...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {!loading && !error && availableSlots.length > 0 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Available Time Slots
                </h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {availableSlots.map((slot) => (
                    <button
                      key={slot.id}
                      onClick={() => handleSlotSelect(slot)}
                      className={`inline-flex items-center justify-center px-4 py-2 border shadow-sm text-sm font-medium rounded-md ${selectedSlot?.id === slot.id
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                        } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
                    >
                      {slot.formattedTime}
                    </button>
                  ))}
                </div>
              </div>

              {selectedSlot && (
                <div className="space-y-4 border-t pt-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Book Appointment for {selectedSlot.formattedTime}
                  </h3>
                  
                  <div>
                    <label htmlFor="patient" className="block text-sm font-medium text-gray-700">
                      Select Patient
                    </label>
                    <select
                      id="patient"
                      value={selectedPatient}
                      onChange={(e) => setSelectedPatient(e.target.value)}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                    >
                      <option value="">Choose a patient</option>
                      {patients.map((patient) => (
                        <option key={patient.id} value={patient.id}>
                          {patient.full_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="appointmentType" className="block text-sm font-medium text-gray-700">
                      Appointment Type
                    </label>
                    <select
                      id="appointmentType"
                      value={appointmentType}
                      onChange={(e) => setAppointmentType(e.target.value)}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                    >
                      <option value="">Select type</option>
                      {appointmentTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                      Additional Notes (Optional)
                    </label>
                    <textarea
                      id="notes"
                      rows={3}
                      value={additionalNotes}
                      onChange={(e) => setAdditionalNotes(e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>

                  <div className="flex items-center justify-end space-x-3">
                    <button
                      onClick={() => setSelectedSlot(null)}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleBookAppointment}
                      disabled={bookingInProgress || !selectedPatient || !appointmentType}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {bookingInProgress ? 'Booking...' : 'Book Appointment'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {bookingSuccess && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-600">
                Appointment booked successfully! A confirmation email has been sent.
              </p>
            </div>
          )}

          {!loading && !error && selectedDate && availableSlots.length === 0 && (
            <div className="text-center py-4">
              <p className="text-gray-600">No available slots for this date.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
