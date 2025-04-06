"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { ScrollArea } from "../../components/ui/scroll-area";
import { Card } from "../../components/ui/card";
import { UserIcon } from "lucide-react";

export default function ChatPage() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isActionPending, setIsActionPending] = useState(false);
  const [userContext, setUserContext] = useState({
    isAuthenticated: false,
    patients: [],
    appointments: [], // Add appointments array to track user's appointments
  });
  const [conversation, setConversation] = useState([]);

  // Set initial message only when component mounts
  useEffect(() => {
    if (conversation.length === 0) {
      // Only set if conversation is empty
      const defaultMessage =
        userContext.isAuthenticated && userContext.defaultPatient
          ? `Hello ${userContext.defaultPatient.fullName}! I'm your dental appointment assistant. How can I assist you?`
          : "Hello! I'm your dental appointment assistant. How can I assist you?";

      setConversation([
        {
          role: "assistant",
          content: defaultMessage,
          timestamp: new Date().toISOString(),
        },
      ]);
    }
  }, []); // Only run on mount
  // Generate unique message ID
  const generateMessageId = () =>
    `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // For UI display only - filter out action results and system messages
  const messages = conversation
    .filter((msg) => msg.role !== "system") // Filter out all system messages including action results
    .map((msg) => ({
      id: generateMessageId(),
      content: msg.content,
      sender: msg.role === "assistant" ? "bot" : "user",
      timestamp: msg.timestamp,
    }));

  const fetchUserContext = async () => {
    try {
      // Get auth status, user ID, and default patient info
      const authResponse = await fetch("/api/auth/me");
      const authData = await authResponse.json();
      console.log("Auth response:", authData);

      if (!authResponse.ok) {
        console.log("Auth response not ok:", authResponse.status);
        setUserContext((prev) => ({
          ...prev,
          isAuthenticated: false,
          patients: [],
          appointments: [],
        }));
        return;
      }

      // Then fetch all patients if authenticated
      const patientsResponse = await fetch("/api/patients");
      const patientsData = await patientsResponse.json();
      console.log("Patients response:", patientsData);

      if (!patientsResponse.ok) {
        console.error("Error fetching patients:", patientsData);
        setUserContext((prev) => ({
          ...prev,
          isAuthenticated: true,
          userId: authData.user.id,
          email: authData.user.email,
          patients: [],
          appointments: [], // Initialize empty appointments array
          defaultPatient: authData.user.defaultPatientId
            ? {
                id: authData.user.defaultPatientId,
                fullName: authData.user.defaultPatientName,
              }
            : null,
        }));
        return;
      }

      // Fetch user's appointments
      const appointmentsResponse = await fetch("/api/appointments");
      const appointmentsData = await appointmentsResponse.json();
      console.log("Appointments response:", appointmentsData);

      // Set full user context with all data
      setUserContext((prev) => ({
        ...prev,
        isAuthenticated: true,
        userId: authData.user.id,
        email: authData.user.email,
        patients: patientsData.patients || [],
        appointments: appointmentsResponse.ok
          ? appointmentsData.appointments || []
          : [],
        defaultPatient: authData.user.defaultPatientId
          ? {
              id: authData.user.defaultPatientId,
              fullName: authData.user.defaultPatientName,
            }
          : null,
      }));
    } catch (error) {
      console.error("Error fetching user context:", error);
      setUserContext((prev) => ({
        ...prev,
        isAuthenticated: false,
        patients: [],
        appointments: [],
        defaultPatient: null,
      }));
    }
  };
  // Fetch user context and patient data on mount
  useEffect(() => {
    fetchUserContext();
  }, []);

  // Format slots into readable text
  const formatSlots = (slotsResponse) => {
    console.log("Formatting slots:", slotsResponse);

    // Handle different response structures
    const slots = Array.isArray(slotsResponse)
      ? slotsResponse
      : slotsResponse?.slots;

    if (!slots || !Array.isArray(slots) || slots.length === 0) {
      return "No slots available for this date.";
    }

    try {
      return (
        "Available slots:\n" +
        slots
          .map((slot) => {
            const time = slot.startTime || slot.time || slot;
            return `- ${new Date(time).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            })}`;
          })
          .join("\n")
      );
    } catch (error) {
      console.error("Error formatting slots:", error);
      return "Error displaying available slots. Please try again.";
    }
  };

  // Handle different actions returned by the chat
  const handleAction = async (action, parameters) => {
    if (!action) return;

    console.log("Action:", action);
    console.log("Parameters:", parameters);

    setIsActionPending(true);
    try {
      let actionResult = null;

      switch (action) {
        case "CHECK_FAMILY_SLOTS":
          const { date, size } = parameters;
          const familySlotsResponse = await fetch(
            `/api/schedule/availableSlots/family?date=${date}&size=${size}`
          );
          console.log(
            "Family slots API response status:",
            familySlotsResponse.status
          );

          actionResult = {
            status: familySlotsResponse.status,
            data: await familySlotsResponse.json(),
          };
          break;

        case "BOOK_FAMILY_APPOINTMENT":
          const { startSlotId, patientIds, appointmentType, additionalNotes } =
            parameters;
          const familyBookingResponse = await fetch(
            `/api/schedule/book/family`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                startSlotId,
                patientIds,
                appointmentType,
                additionalNotes,
              }),
            }
          );
          console.log(
            "Family booking API response status:",
            familyBookingResponse.status
          );

          actionResult = {
            status: familyBookingResponse.status,
            data: await familyBookingResponse.json(),
          };
          break;

        case "CHECK_EARLIEST_SLOTS":
          const { limit } = parameters;
          const earliestSlotsResponse = await fetch(
            `/api/schedule/availableSlots/earliest${
              limit ? `?limit=${limit}` : ""
            }`
          );
          console.log(
            "Earliest slots API response status:",
            earliestSlotsResponse.status
          );

          actionResult = {
            status: earliestSlotsResponse.status,
            data: await earliestSlotsResponse.json(),
          };
          break;

        case "CHECK_SCHEDULE":
          let { startDate, endDate } = parameters;
          if (!endDate) {
            endDate = startDate;
          }

          const slotsResponse = await fetch(
            `/api/schedule/availableSlots?startDate=${startDate}&endDate=${endDate}`
          );
          console.log("Slots API response status:", slotsResponse.status);

          actionResult = {
            status: slotsResponse.status,
            data: await slotsResponse.json(),
          };

          break;

        case "INITIATE_REGISTRATION":
          const registrationResponse = await fetch("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(parameters),
          });
          actionResult = {
            status: registrationResponse.status,
            data: await registrationResponse.json(),
          };

          break;

        case "INITIATE_SIGNIN":
          const signinResponse = await fetch("/api/auth/signin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(parameters),
          });
          actionResult = {
            status: signinResponse.status,
            data: await signinResponse.json(),
          };

          break;

        case "VERIFY_SIGNIN":
          const verifyResponse = await fetch("/api/auth/signin/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(parameters),
          });
          actionResult = {
            status: verifyResponse.status,
            data: await verifyResponse.json(),
          };
          if (verifyResponse.ok) {
            await fetchUserContext(); // Refresh user context after successful sign in
          }
          break;

        case "SEND_EMERGENCY_REQUEST":
          const emergencyResponse = await fetch("/api/schedule/emergency", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(parameters),
          });
          actionResult = {
            status: emergencyResponse.status,
            data: await emergencyResponse.json(),
          };
          break;

        case "SIGNOUT":
          const signoutResponse = await fetch("/api/auth/signout", {
            method: "POST",
          });
          actionResult = {
            status: signoutResponse.status,
            data: await signoutResponse.json(),
          };
          if (signoutResponse.ok) {
            setUserContext((prev) => ({
              ...prev,
              isAuthenticated: false,
              patients: [],
              defaultPatient: null,
            }));
            router.refresh(); // Refresh to update auth state
          }
          break;

        case "VERIFY_REGISTRATION":
          const registerResponse = await fetch("/api/auth/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(parameters),
          });
          const registerData = await registerResponse.json();
          actionResult = {
            status: registerResponse.status,
            data: registerData,
          };
          if (registerResponse.ok) {
            await fetchUserContext(); // Refresh user context after successful registration
          }
          break;

        case "ADD_PATIENT":
          const addPatientResponse = await fetch("/api/patients", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(parameters),
          });
          actionResult = {
            status: addPatientResponse.status,
            data: await addPatientResponse.json(),
          };
          if (addPatientResponse.ok) {
            const newPatient = actionResult.data;
            setUserContext((prev) => {
              const currentPatients = Array.isArray(prev.patients)
                ? prev.patients
                : [];
              return {
                ...prev,
                patients: [...currentPatients, newPatient],
              };
            });
          }
          break;

        case "BOOK_APPOINTMENT":
          const bookResponse = await fetch("/api/schedule/book", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(parameters),
          });
          actionResult = {
            status: bookResponse.status,
            data: await bookResponse.json(),
          };

          break;

        case "CANCEL_APPOINTMENT":
          const { appointmentId } = parameters;
          const cancelResponse = await fetch(
            `/api/appointments/${appointmentId}`,
            {
              method: "DELETE",
            }
          );
          actionResult = {
            status: cancelResponse.status,
            data: await cancelResponse.json(),
          };
          break;
      }

      // If there's an action response, add it to the chat
      if (actionResult) {
        // First add the action result to the conversation
        const actionResultMessage = {
          role: "system",
          content: "__ACTION_RESULT__",
          timestamp: new Date().toISOString(),
          actionResult: {
            type: action,
            status: actionResult.status,
            message: actionResult.data?.message || "No message provided",
            data: actionResult.data || null,
          },
        };
        setConversation((prev) => [...prev, actionResultMessage]);

        // Then send the updated conversation to the chat API
        const chatResponse = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userContext,
            conversation: [...conversation, actionResultMessage],
          }),
        });

        const data = await chatResponse.json();
        const responseMessage = {
          role: "assistant",
          content: data.BotResponse,
          timestamp: new Date().toISOString(),
        };
        setConversation((prev) => [...prev, responseMessage]);
      }
    } catch (error) {
      console.error("Error handling action:", error);
      // Add error message to chat
      const errorMessage = {
        role: "assistant",
        content:
          "Sorry, I encountered an error processing your request. Please try again.",
        timestamp: new Date().toISOString(),
      };
      setConversation((prev) => [...prev, errorMessage]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    const userMessage = {
      role: "user",
      content: message.trim(),
      timestamp: new Date().toISOString(),
    };

    setConversation((prev) => [...prev, userMessage]);
    setMessage("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userContext,
          conversation: [...conversation, userMessage],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to get response");
      }

      // First show the bot's response message
      const botMessage = {
        role: "assistant",
        content: data.BotResponse,
        timestamp: new Date().toISOString(),
      };
      setConversation((prev) => [...prev, botMessage]);

      // Then handle any action returned by the chat
      if (data.Action) {
        await handleAction(data.Action, data.Parameters);
      }
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage = {
        id: generateMessageId(),
        content: "Sorry, I encountered an error. Please try again.",
        sender: "bot",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);

      // Reset flow and context on error
      setConversationFlow(null);
      setConversationContext({});
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey && !isLoading && !isActionPending) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Reset action pending state after action is complete
  useEffect(() => {
    if (!isLoading) {
      setIsActionPending(false);
    }
  }, [isLoading]);

  return (
    <div className="flex flex-col h-screen bg-gray-50 p-4">
      {userContext.isAuthenticated && (
        <div className="flex justify-end mb-2 text-xs">
          <div className="flex items-center gap-1.5 text-gray-500">
            <UserIcon className="h-3 w-3" />
            <span className="mr-2">{userContext.email}</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs font-normal text-gray-500 hover:text-red-600 hover:bg-transparent"
              onClick={() => handleAction("SIGNOUT", {})}
            >
              Sign out
            </Button>
          </div>
        </div>
      )}
      <Card className="flex flex-col flex-1 max-w-3xl mx-auto w-full bg-white shadow-xl">
        <div className="flex-1 p-4">
          <ScrollArea className="h-[calc(100vh-12rem)]">
            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${
                    msg.sender === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      msg.sender === "user"
                        ? "bg-blue-500 text-white"
                        : "bg-gray-100 text-gray-900"
                    }`}
                  >
                    <p className="text-sm">{msg.content}</p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-lg px-4 py-2 bg-gray-100 text-gray-900">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        <div className="p-4 border-t">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="flex-1"
              disabled={isLoading || isActionPending}
            />
            <Button
              type="submit"
              disabled={isLoading || isActionPending || !message.trim()}
            >
              {isActionPending ? "Waiting for action..." : "Send"}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
