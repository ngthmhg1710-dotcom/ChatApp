import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useSocket } from '../hooks/useSocket';
import { LogOut, Send } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Chat() {
  const { user, logout } = useAuthStore();
  const { socket, isConnected } = useSocket();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');

  useEffect(() => {
    if (socket) {
      // Listen for new messages
      socket.on('new_message', (data) => {
        setMessages((prev) => [...prev, data.message]);
      });

      return () => {
        socket.off('new_message');
      };
    }
  }, [socket]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || !socket) return;

    // This is a placeholder - implement actual conversation logic
    toast.success('Message functionality requires conversation selection');
    setInputMessage('');
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Chat App</h1>
          <p className="text-sm text-gray-500">
            {isConnected ? (
              <span className="text-green-600">● Connected</span>
            ) : (
              <span className="text-red-600">● Disconnected</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="font-semibold text-gray-800">{user?.username}</p>
            <p className="text-sm text-gray-500">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="p-2 hover:bg-gray-100 rounded-full transition"
            title="Logout"
          >
            <LogOut className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Conversations */}
        <aside className="w-80 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">Conversations</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <p className="text-center text-gray-500 mt-8">
              No conversations yet. Start by adding friends!
            </p>
          </div>
        </aside>

        {/* Chat Area */}
        <main className="flex-1 flex flex-col bg-gray-50">
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-3xl mx-auto">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 mt-20">
                  <p className="text-xl font-semibold mb-2">Welcome to Chat App!</p>
                  <p>Select a conversation to start messaging</p>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div key={idx} className="mb-4">
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <p className="text-sm text-gray-600 mb-1">
                        {msg.sender?.username}
                      </p>
                      <p className="text-gray-800">{msg.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Message Input */}
          <div className="border-t border-gray-200 bg-white p-4">
            <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim()}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Send className="w-5 h-5" />
                Send
              </button>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
