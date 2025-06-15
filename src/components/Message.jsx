import { useEffect, useRef } from 'react';
import { format } from 'date-fns';

export default function Message({ message, isCurrentUser }) {
  const messageRef = useRef(null);

  useEffect(() => {
    // Auto-scroll to new messages
    messageRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [message]);

  return (
    <div 
      ref={messageRef}
      className={`message ${isCurrentUser ? 'sent' : 'received'}`}
    >
      {!isCurrentUser && (
        <div className="message-sender">{message.sender?.username}</div>
      )}
      <div className="message-content">
        {message.content}
        {message.mediaUrl && (
          <div className="message-media">
            <img 
              src={message.mediaUrl} 
              alt="Media content" 
              onClick={() => window.open(message.mediaUrl, '_blank')}
            />
          </div>
        )}
      </div>
      <div className="message-time">
        {format(new Date(message.createdAt), 'HH:mm')}
      </div>
    </div>
  );
}