import React from 'react';

const TestIndex = () => {
  console.log('TestIndex component rendering...');
  
  return (
    <div style={{ padding: '20px', backgroundColor: 'white', color: 'black' }}>
      <h1 style={{ fontSize: '24px', marginBottom: '10px' }}>Hello World!</h1>
      <p style={{ fontSize: '16px' }}>This is a test page to debug rendering issues.</p>
      <p style={{ fontSize: '14px', color: 'green' }}>If you see this, React is working!</p>
    </div>
  );
};

export default TestIndex;