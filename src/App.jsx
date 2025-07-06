import React, { useEffect, useState } from "react";

const VOLS = ["R_10", "R_25", "R_50", "R_75", "R_100"];

const App = () => {
  const [market, setMarket] = useState("R_10");
  const [ticks, setTicks] = useState([]);
  const [ws, setWs] = useState(null);
  const [pattern, setPattern] = useState(null);
  const [alertPlayed, setAlertPlayed] = useState(false);

  const speak = (text) => {
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(text);
    synth.cancel();
    synth.speak(utterance);
  };

  useEffect(() => {
    if (ws) ws.close();
    const socket = new WebSocket("wss://ws.derivws.com/websockets/v3?app_id=1089");
    setWs(socket);

    socket.onopen = () => {
      socket.send(JSON.stringify({ ticks: market }));
    };

    socket.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.msg_type === "tick") {
        const digit = parseInt(data.tick.quote.toString().slice(-1));
        setTicks((prev) => {
          const updated = [digit, ...prev.slice(0, 29)];
          detectPattern(updated);
          return updated;
        });
      }
    };

    return () => socket.close();
  }, [market]);

  const detectPattern = (digits) => {
    if (digits.length < 6) return;
    const current = digits[0];
    let count = 1;
    for (let i = 1; i < digits.length; i++) {
      if (digits[i] === current) count++;
      else break;
    }
    if (count >= 3) {
      setPattern({ digit: current, count });
      if (!alertPlayed) {
        speak(`Sniper alert. Digit ${current} repeated ${count} times.`);
        setAlertPlayed(true);
      }
    } else {
      setPattern(null);
      setAlertPlayed(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-green-400 p-4 font-mono">
      <h1 className="text-xl mb-4">🎯 Sniper Bot v1.0</h1>
      <label className="mb-2 block">Select Market:</label>
      <select
        value={market}
        onChange={(e) => setMarket(e.target.value)}
        className="bg-gray-800 p-2 rounded"
      >
        {VOLS.map((v) => (
          <option key={v} value={v}>
            {v.replace("R_", "Vol ")}
          </option>
        ))}
      </select>

      <div className="mt-6">
        <h2 className="text-lg">📉 Last 30 Digits:</h2>
        <div className="grid grid-cols-10 gap-2 mt-2">
          {ticks.map((tick, i) => (
            <div
              key={i}
              className="bg-gray-900 p-2 text-center rounded border border-green-700"
            >
              {tick}
            </div>
          ))}
        </div>
      </div>

      {pattern && (
        <div className="mt-6 p-4 border border-green-600 rounded bg-gray-800">
          <h2 className="text-lg">⚠️ Sniper Pattern Detected</h2>
          <p>
            Digit <strong>{pattern.digit}</strong> repeated <strong>{pattern.count}</strong> times.
          </p>
        </div>
      )}
    </div>
  );
};

export default App;