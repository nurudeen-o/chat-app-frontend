import { useState, useEffect } from 'react';

export default function UserList({ currentUser, onSelectChat, onStartCall }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('https://chat-app.saharix.com/api/users', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        setUsers(data.data);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const handleStartChat = async (user) => {
    try {
        const response = await fetch('https://chat-app.saharix.com/api/chats/start', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}`,'Content-Type': 'application/json'  },
          body: JSON.stringify({
            participantId: user._id
          }),
          method: 'POST'
        });
        const data = await response.json();
        console.log(data)
        onSelectChat({
          _id: data._id,
          participants: data.participants
        });
    } catch(e){
        console.log(e);
    }
  };

  if (loading) return <div>Loading users...</div>;

  return (
    <div className="user-list">
      <h3>Users</h3>
      <ul>
        {users.filter(u => u._id !== currentUser._id).map(user => (
          <li key={user._id}>
            <div onClick={() => handleStartChat(user)}>
              {user.username} ({user.status})
            </div>
            <div className="call-buttons">
              <button onClick={() => onStartCall(`chat_${currentUser._id}_${user._id}`, 'audio')}>
                Call
              </button>
              {/* <button onClick={() => onStartCall(`chat_${currentUser._id}_${user._id}`, 'video')}>
                Video
              </button> */}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}