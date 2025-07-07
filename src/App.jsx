import React, { useEffect, useState } from "react";

const VOLS = ["R_10", "R_25", "R_50", "R_75", "R_100"];

const App = () => {
  const [tickData, setTickData] = useState({});
  const [wsConnections, setWsConnections] = useState({});
  const [alerts, setAlerts] = useState([]);

  const speak = (text) => {
    const synth = window.speechSynthesis;
    synth.cancel();
    synth.speak(new SpeechSynthesisUtterance(text));
  };

  useEffect(() => {
    const connections = {};
    const data = {};

    VOLS.forEach((vol) => {
      data[vol] = [];
      const socket = new WebSocket("wss://ws.derivws.com/websockets/v3?app_id=1089");
      connections[vol] = socket;

      socket.onopen = () => {
        socket.send(JSON.stringify({ ticks: vol }));
      };

      socket.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        if (msg.msg_type === "tick") {
          const digit = parseInt(msg.tick.quote.toString().slice(-1));
          data[vol] = [digit, ...data[vol].slice(0, 29)];
          setTickData((prev) => ({ ...prev, [vol]: [...data[vol]] }));
          checkPattern(vol, data[vol]);
        }
      };
    });

    setWsConnections(connections);
    return () => {
      Object.values(connections).forEach((sock) => sock.close());
    };
  }, []);

  const checkPattern = (vol, digits) => {
    const clusters = {};
    let i = 0;
    while (i < digits.length) {
      let count = 1;
      while (digits[i + count] === digits[i]) count++;
      if (count >= 2) {
        const digit = digits[i];
        clusters[digit] = clusters[digit] ? clusters[digit] + 1 : 1;
        i += count;
      } else {
        i++;
      }
    }

    for (const [digit, count] of Object.entries(clusters)) {
      if (count >= 3) {
        const alertKey = `${vol}-${digit}`;
        setAlerts((prev) => {
          if (prev.some((a) => a.key === alertKey)) return prev;
          speak(`Sniper alert on ${vol.replace("R_", "Vol ")}. Digit ${digit} repeated in 3 patterns.`);
          return [...prev, { key: alertKey, vol, digit, time: new Date().toLocaleTimeString() }];
        });
      }
    }
  };

  return (
    <div className="min-h-screen bg-black text-green-400 p-4 font-mono">
      <h1 className="text-xl mb-4">🎯 Sniper Bot v3.5 - Multi Market</h1>
      {VOLS.map((vol) => (
        <div key={vol} className="mb-6 border border-green-700 p-4 rounded">
          <h2 className="text-lg mb-2">{vol.replace("R_", "Vol ")}</h2>
          <div className="grid grid-cols-10 gap-1">
            {(tickData[vol] || []).map((tick, i) => (
              <div key={i} className="bg-gray-900 p-2 text-center rounded border border-green-600">{tick}</div>
            ))}
          </div>
        </div>
      ))}

      <div className="mt-6">
        <h2 className="text-lg">🔔 Alerts</h2>
        <ul className="mt-2 max-h-64 overflow-y-auto space-y-1 text-sm">
          {alerts.map((alert, idx) => (
            <li key={idx}>[{alert.time}] {alert.vol.replace("R_", "Vol ")} | Digit {alert.digit} triggered sniper alert</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default App;
