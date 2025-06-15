import { useState, useEffect, useRef } from 'react';

export default function Chat({ chatId, currentUser, socket, onStartCall }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Load initial messages
    const fetchMessages = async () => {
      const response = await fetch(`https://chat-app.saharix.com/api/chats/${chatId}/messages`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      setMessages(data);
    };

    fetchMessages();

    // Socket listeners
    const handleNewMessage = (message) => {
      setMessages(prev => [...prev, message]);
    };

    socket.on('new_message', handleNewMessage);

    return () => {
      socket.off('new_message', handleNewMessage);
    };
  }, [chatId, socket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    socket.emit('send_message', {
      chatId,
      senderId: currentUser._id,
      content: newMessage
    });

    setNewMessage('');
  };
  console.log(currentUser)
  return (
    <div className="chat-container">
      <div className="chat-header">
        <h3>Chat</h3>
        <div className="call-buttons">
          <button onClick={() => onStartCall(chatId, 'audio', currentUser.username)}>Call</button>
          <button onClick={() => onStartCall(chatId, 'video', currentUser.username)}>Video</button>
        </div>
      </div>
      
      <div className="messages">
        {messages
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .map((msg) => (
          <div 
            key={msg._id} 
            className={`message ${msg.sender === currentUser._id || msg.sender?._id === currentUser._id ? 'sent' : 'received'}`}
          >
            <p>{msg.content}</p>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="message-form">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}