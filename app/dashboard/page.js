'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetch user data
        fetch('/api/auth/me')
            .then(res => res.json())
            .then(data => {
                if (data.user) {
                    setUser(data.user);
                }
                setLoading(false);
            })
            .catch(() => {
                setLoading(false);
            });
    }, []);

    const handleSignOut = async () => {
        try {
            await fetch('/api/auth/signout', {
                method: 'POST',
            });
            router.push('/signin');
        } catch (error) {
            console.error('Error signing out:', error);
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
                            Welcome{user?.defaultPatientName ? `, ${user.defaultPatientName}` : ''}!
                        </h2>
                        <p className="mt-2 text-sm text-gray-600">
                            {user?.email}
                        </p>
                    </div>
                    <button
                        onClick={handleSignOut}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                        Sign Out
                    </button>
                </div>

                <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                        What would you like to do?
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button
                            onClick={() => router.push('/patients')}
                            className="p-4 border rounded-lg hover:bg-gray-50 text-left"
                        >
                            <h4 className="text-base font-medium text-gray-900">Manage Patients</h4>
                            <p className="mt-1 text-sm text-gray-500">Add, edit, or remove patients from your account</p>
                        </button>
                        <button
                            onClick={() => router.push('/appointments')}
                            className="p-4 border rounded-lg hover:bg-gray-50 text-left"
                        >
                            <h4 className="text-base font-medium text-gray-900">Schedule Appointment</h4>
                            <p className="mt-1 text-sm text-gray-500">Book a new appointment or manage existing ones</p>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
