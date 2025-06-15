export default function CallModal({ caller, callType, from, onAnswer }) {
    return (
      <div className="call-modal">
        <div className="call-content">
          <h3>Incoming {callType} call</h3>
          <p>From: {from}</p>
          <div className="call-buttons">
            <button onClick={() => onAnswer(true)}>Accept</button>
            <button onClick={() => onAnswer(false)}>Decline</button>
          </div>
        </div>
      </div>
    );
  }