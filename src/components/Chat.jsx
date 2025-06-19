import { useState, useEffect, useRef } from 'react';

export default function Chat({ chatId, currentUser, socket, onStartCall }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchMessages = async () => {
      const response = await fetch(`https://chat-app.saharix.com/api/chats/${chatId}/messages`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      setMessages(data);
    };

    fetchMessages();

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

  // Helper function to convert file to ArrayBuffer
  const convertFileToBuffer = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  // Send message with optional image
  const sendMessage = async (messageText, imageFile = null) => {
    try {
      let messageData = {
        chatId,
        senderId: currentUser._id,
        content: messageText
      };

      // If there's an image file, convert it to ArrayBuffer
      if (imageFile) {
        const fileData = await convertFileToBuffer(imageFile);
        messageData.imageFile = {
          data: fileData,
          name: imageFile.name,
          type: imageFile.type,
          size: imageFile.size
        };
      }
      console.log(messageData);
      socket.emit('send_message', messageData);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() && !selectedImage) return;

    await sendMessage(newMessage, selectedImage);

    // Clear inputs
    setNewMessage('');
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }

      // Validate file size (e.g., max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('Image size should be less than 10MB');
        return;
      }

      setSelectedImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const renderMessage = (msg) => {
    return (
      <div 
        key={msg._id} 
        className={`message ${msg.sender === currentUser._id || msg.sender?._id === currentUser._id ? 'sent' : 'received'}`}
      >
        {msg.content && <p>{msg.content}</p>}
        {msg.mediaUrl && (
          <div className="message-image">
            <img 
              src={msg.mediaUrl} 
              alt="Shared image" 
              style={{ maxWidth: '300px', maxHeight: '300px', borderRadius: '8px' }}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h3>Chat</h3>
        <div className="call-buttons">
          <button onClick={() => onStartCall(chatId, 'audio', currentUser.username)}>Call</button>
          {/* <button onClick={() => onStartCall(chatId, 'video', currentUser.username)}>Video</button> */}
        </div>
      </div>
      
      <div className="messages">
        {messages
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
          .map((msg) => renderMessage(msg))
        }
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="message-form">
        {/* Image preview */}
        {imagePreview && (
          <div className="image-preview">
            <img 
              src={imagePreview} 
              alt="Preview" 
              style={{ maxWidth: '100px', maxHeight: '100px', borderRadius: '4px' }}
            />
            <button type="button" onClick={removeImage} className="remove-image">×</button>
          </div>
        )}
        
        <div className="input-container">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="message-input"
          />
          
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageSelect}
            accept="image/*"
            style={{ display: 'none' }}
          />
          
          <button 
            type="button" 
            onClick={() => fileInputRef.current?.click()}
            className="image-button"
          >
            📷
          </button>
          
          <button type="submit" className="send-button">Send</button>
        </div>
      </form>
    </div>
  );
}