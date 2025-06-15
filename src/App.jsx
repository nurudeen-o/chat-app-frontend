import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import AuthForm from './components/AuthForm';
import UserList from './components/UserList';
import Chat from './components/Chat';
import CallModal from './components/CallModal';
import './index.css';

const socket = io('https://chat-app.saharix.com', {
  autoConnect: false
});

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState('');
  const [selectedChat, setSelectedChat] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [activeCall, setActiveCall] = useState(null);
  
  // WebRTC refs
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localAudioRef = useRef(null);
  const remoteAudioRef = useRef(null);

  // ICE servers configuration
  const iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  // Initialize peer connection
  const createPeerConnection = () => {
    const pc = new RTCPeerConnection(iceServers);
    
    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice_candidate', {
          chatId: activeCall?.chatId || incomingCall?.chatId,
          candidate: event.candidate
        });
      }
    };

    // Handle remote stream
    pc.ontrack = (event) => {
      console.log('Received remote stream');
      remoteStreamRef.current = event.streams[0];
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = event.streams[0];
      }
    };

    return pc;
  };

  // Get user media (audio only)
  const getUserMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: false 
      });
      localStreamRef.current = stream;
      if (localAudioRef.current) {
        localAudioRef.current.srcObject = stream;
      }
      return stream;
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Could not access microphone. Please check permissions.');
      throw error;
    }
  };

  // Connect socket when authenticated
  useEffect(() => {
    if (token) {
      socket.auth = { token };
      socket.connect();
    }

    return () => {
      socket.disconnect();
    };
  }, [token]);

  // Socket event listeners
  useEffect(() => {
    const handleIncomingCall = (data) => {
      console.log("Incoming call", data);
      setIncomingCall(data);
    };

    const handleCallAnswered = async (data) => {
      if (data.accepted) {
        setActiveCall({
          chatId: incomingCall.chatId,
          callType: incomingCall.callType,
          from: incomingCall.from
        });
        
        // Start WebRTC connection as caller
        if (data.accepted && !peerConnectionRef.current) {
          await initializeCall(true);
        }
      } else {
        // Call was declined, cleanup
        cleanup();
      }
      setIncomingCall(null);
    };

    const handleCallEnded = () => {
      cleanup();
      setActiveCall(null);
      setIncomingCall(null);
    };

    const handleWebRTCOffer = async (data) => {
      console.log('Received WebRTC offer');
      if (!peerConnectionRef.current) {
        await initializeCall(false);
      }
      
      await peerConnectionRef.current.setRemoteDescription(data.offer);
      const answer = await peerConnectionRef.current.createAnswer();
      await peerConnectionRef.current.setLocalDescription(answer);
      
      socket.emit('webrtc_answer', {
        chatId: activeCall?.chatId || incomingCall?.chatId,
        answer
      });
    };

    const handleWebRTCAnswer = async (data) => {
      console.log('Received WebRTC answer');
      await peerConnectionRef.current.setRemoteDescription(data.answer);
    };

    const handleIceCandidate = async (data) => {
      console.log('Received ICE candidate');
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.addIceCandidate(data.candidate);
      }
    };

    socket.on('incoming_call', handleIncomingCall);
    socket.on('call_answered', handleCallAnswered);
    socket.on('call_ended', handleCallEnded);
    socket.on('webrtc_offer', handleWebRTCOffer);
    socket.on('webrtc_answer', handleWebRTCAnswer);
    socket.on('ice_candidate', handleIceCandidate);

    return () => {
      socket.off('incoming_call', handleIncomingCall);
      socket.off('call_answered', handleCallAnswered);
      socket.off('call_ended', handleCallEnded);
      socket.off('webrtc_offer', handleWebRTCOffer);
      socket.off('webrtc_answer', handleWebRTCAnswer);
      socket.off('ice_candidate', handleIceCandidate);
    };
  }, [incomingCall, activeCall]);

  // Initialize WebRTC call
  const initializeCall = async (isInitiator) => {
    try {
      // Get user media
      const stream = await getUserMedia();
      
      // Create peer connection
      peerConnectionRef.current = createPeerConnection();
      
      // Add local stream to peer connection
      stream.getTracks().forEach(track => {
        peerConnectionRef.current.addTrack(track, stream);
      });

      if (isInitiator) {
        // Create and send offer
        const offer = await peerConnectionRef.current.createOffer();
        await peerConnectionRef.current.setLocalDescription(offer);
        
        socket.emit('webrtc_offer', {
          chatId: activeCall?.chatId,
          offer
        });
      }
      
    } catch (error) {
      console.error('Error initializing call:', error);
      cleanup();
    }
  };

  // Cleanup WebRTC resources
  const cleanup = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    
    if (localAudioRef.current) {
      localAudioRef.current.srcObject = null;
    }
    
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }
  };

  const handleLogin = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
  };

  const handleLogout = () => {
    cleanup();
    setUser(null);
    setToken('');
    setSelectedChat(null);
    socket.disconnect();
  };

  const startCall = async (chatId, callType, from) => {
    socket.emit('initiate_call', { chatId, callType, from });
    setActiveCall({ chatId, callType, from });
  };

  const answerCall = async (accepted) => {
    socket.emit('answer_call', {
      chatId: incomingCall.chatId,
      accepted
    });

    if (accepted) {
      setActiveCall({
        chatId: incomingCall.chatId,
        callType: incomingCall.callType,
        from: incomingCall.from
      });
      // WebRTC initialization will be handled in the call_answered event
    } else {
      setIncomingCall(null);
    }
  };

  const endCall = () => {
    socket.emit('end_call', { chatId: activeCall.chatId });
    cleanup();
    setActiveCall(null);
  };

  if (!user) {
    return <AuthForm onLogin={handleLogin} />;
  }

  return (
    <div className="app">
      <header>
        <h1>Simple Chat</h1>
        <button onClick={handleLogout}>Logout</button>
      </header>

      <div className="main-content">
        <UserList 
          currentUser={user} 
          onSelectChat={setSelectedChat} 
          onStartCall={startCall}
        />
        {selectedChat && (
          <Chat 
            chatId={selectedChat._id} 
            currentUser={user} 
            socket={socket} 
            onStartCall={startCall}
          />
        )}
      </div>

      {incomingCall && (
        <CallModal 
          caller={incomingCall.callerId}
          callType={incomingCall.callType}
          from={incomingCall.from}
          onAnswer={answerCall}
        />
      )}

      {activeCall && (
        <div className="active-call">
          <p>Ongoing {activeCall.callType} call with {activeCall.from}</p>
          <button onClick={endCall}>End Call</button>
          
          {/* Audio elements for local and remote streams */}
          <audio 
            ref={localAudioRef}
            autoPlay
            muted
            style={{ display: 'none' }}
          />
          <audio 
            ref={remoteAudioRef}
            autoPlay
            style={{ display: 'none' }}
          />
        </div>
      )}
    </div>
  );
}

export default App;