import React from 'react';

const MessageList = ({ messages }) => {
  return (
    <div style={{ height: '300px', overflowY: 'scroll', border: '1px solid #ccc', padding: '10px' }}>
      {messages.map((msg, index) => (
        <div key={index}>
          <strong>{msg.sender}: </strong>{msg.content}
        </div>
      ))}
    </div>
  );
};

export default MessageList;
