import React, { useEffect } from 'react';

const ButtonTest = () => {
  useEffect(() => {
    console.log("🔍 ButtonTest component mounted successfully!");
  }, []);

  const handleButtonClick = (color) => {
    alert(`${color} button clicked!`);
    console.log(`${color} button clicked at ${new Date().toLocaleTimeString()}`);
  };

  return (
    <div className="p-8" style={{ minHeight: '100vh', backgroundColor: '#f0f0f0' }}>
      <h1 style={{ 
        color: 'red', 
        fontSize: '48px', 
        fontWeight: 'bold', 
        textAlign: 'center',
        marginBottom: '20px',
        textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
      }}>
        🚨 BUTTON TEST RENDERS - YOU SHOULD SEE THIS 🚨
      </h1>
      
      <div className="bg-yellow-200 border-4 border-yellow-400 p-8 rounded-lg mb-6" style={{
        backgroundColor: 'yellow',
        border: '10px solid red',
        padding: '30px',
        fontSize: '24px'
      }}>
        <h2 className="text-2xl font-bold text-yellow-800 mb-4">🔍 DIAGNOSTIC BOX - Button Test Component</h2>
        <p className="text-yellow-700 mb-4">If you can see this yellow box, the component is rendering correctly.</p>
        
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => handleButtonClick('Blue')}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 sm:px-8 sm:py-4 sm:min-h-[44px] rounded-lg text-lg transition-colors"
            style={{ 
              backgroundColor: 'blue', 
              color: 'white', 
              padding: '15px 30px', 
              fontSize: '20px',
              border: '3px solid black'
            }}
          >
            Blue Button
          </button>
          
          <button
            onClick={() => handleButtonClick('Green')}
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 sm:px-8 sm:py-4 sm:min-h-[44px] rounded-lg text-lg transition-colors"
            style={{ 
              backgroundColor: 'green', 
              color: 'white', 
              padding: '15px 30px', 
              fontSize: '20px',
              border: '3px solid black'
            }}
          >
            Green Button
          </button>
          
          <button
            onClick={() => handleButtonClick('Red')}
            className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-6 sm:px-8 sm:py-4 sm:min-h-[44px] rounded-lg text-lg transition-colors"
            style={{ 
              backgroundColor: 'red', 
              color: 'white', 
              padding: '15px 30px', 
              fontSize: '20px',
              border: '3px solid black'
            }}
          >
            Red Button
          </button>
          
          <button
            onClick={() => handleButtonClick('White')}
            className="bg-white hover:bg-gray-100 text-black font-bold py-3 px-6 sm:px-8 sm:py-4 sm:min-h-[44px] rounded-lg text-lg border-2 border-gray-300 transition-colors"
            style={{ 
              backgroundColor: 'white', 
              color: 'black', 
              padding: '15px 30px', 
              fontSize: '20px',
              border: '3px solid black'
            }}
          >
            White Button
          </button>
        </div>
      </div>
      
      <div style={{ 
        backgroundColor: 'orange', 
        padding: '20px', 
        fontSize: '18px',
        border: '5px solid purple',
        marginTop: '20px'
      }}>
        <p><strong>Debug Info:</strong></p>
        <p>Current Time: {new Date().toLocaleString()}</p>
        <p>Component Path: /button-test</p>
        <p>If you see this, ButtonTest is definitely rendering!</p>
      </div>
    </div>
  );
};

export default ButtonTest;