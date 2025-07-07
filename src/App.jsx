// File: src/App.jsx
import React, { useEffect, useState } from "react";

const VOLS = ["R_10", "R_25", "R_50", "R_75", "R_100"];

const App = () => {
  const [market, setMarket] = useState("R_10");
  const [ticks, setTicks] = useState([]);
  const [ws, setWs] = useState(null);
  const [clusters, setClusters] = useState([]);
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
          detectSniperPattern(updated);
          return updated;
        });
      }
    };

    return () => socket.close();
  }, [market]);

  const detectSniperPattern = (digits) => {
    if (digits.length < 6) return;

    const clusters = [];
    let currentDigit = null;
    let streak = 1;

    for (let i = 1; i < digits.length; i++) {
      if (digits[i] === digits[i - 1]) {
        streak++;
      } else {
        if (streak >= 2) {
          clusters.push({ digit: digits[i - 1], length: streak, endIndex: i - 1 });
        }
        streak = 1;
      }
    }
    if (streak >= 2) {
      clusters.push({ digit: digits[digits.length - 1], length: streak, endIndex: digits.length - 1 });
    }

    const counted = {};
    clusters.forEach((c) => {
      counted[c.digit] = (counted[c.digit] || 0) + 1;
    });

    const sniperDigit = Object.keys(counted).find((d) => counted[d] >= 3);
    if (sniperDigit && !alertPlayed) {
      speak(`Sniper alert on ${market.replace("R_", "Vol ")}. Digit ${sniperDigit} formed 3 clusters.`);
      setAlertPlayed(true);
    } else if (!sniperDigit) {
      setAlertPlayed(false);
    }
    setClusters(clusters);
  };

  const getClusterClass = (i) => {
    for (let idx = 0; idx < clusters.length; idx++) {
      const cluster = clusters[idx];
      const start = cluster.endIndex - cluster.length + 1;
      if (i >= start && i <= cluster.endIndex) {
        if (idx === 0) return "bg-yellow-500 text-black";
        if (idx === 1) return "bg-green-500 text-black";
        if (idx === 2) return "bg-red-500 text-white";
        return "bg-blue-500 text-white";
      }
    }
    return "bg-gray-900";
  };

  return (
    <div className="min-h-screen bg-black text-green-400 p-4 font-mono">
      <h1 className="text-xl mb-4">🎯 Sniper Bot v4.0</h1>
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
              className={`${getClusterClass(i)} p-2 text-center rounded border border-green-700`}
            >
              {tick}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default App;
