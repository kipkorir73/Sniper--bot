// File: src/App.jsx
import React, { useEffect, useState } from "react";

const VOLS = ["R_10", "R_25", "R_50", "R_75", "R_100"];

const App = () => {
  const [tickData, setTickData] = useState({}); // Stores ticks for all markets
  const [clusterData, setClusterData] = useState({}); // Stores clusters for all markets
  const [alertState, setAlertState] = useState({}); // Prevents multiple alerts per digit

  useEffect(() => {
    const sockets = {};
    const initialTicks = {};
    const initialClusters = {};
    const initialAlerts = {};

    VOLS.forEach((market) => {
      initialTicks[market] = [];
      initialClusters[market] = [];
      initialAlerts[market] = false;

      const socket = new WebSocket("wss://ws.derivws.com/websockets/v3?app_id=1089");
      sockets[market] = socket;

      socket.onopen = () => {
        socket.send(JSON.stringify({ ticks: market }));
      };

      socket.onmessage = (e) => {
        const data = JSON.parse(e.data);
        if (data.msg_type === "tick") {
          const digit = parseInt(data.tick.quote.toString().slice(-1));
          setTickData((prev) => {
            const updated = {
              ...prev,
              [market]: [digit, ...(prev[market] || []).slice(0, 29)],
            };
            detectClusters(market, updated[market]);
            return updated;
          });
        }
      };
    });

    setTickData(initialTicks);
    setClusterData(initialClusters);
    setAlertState(initialAlerts);

    return () => {
      Object.values(sockets).forEach((s) => s.close());
    };
  }, []);

  const speak = (text) => {
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(text);
    synth.cancel();
    synth.speak(utterance);
  };

  const detectClusters = (market, digits) => {
    const clusters = [];
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
    setClusterData((prev) => ({ ...prev, [market]: clusters }));

    if (sniperDigit && !alertState[market + sniperDigit]) {
      speak(`Sniper alert on ${market.replace("R_", "Vol ")}. Digit ${sniperDigit} formed 3 clusters.`);
      setAlertState((prev) => ({ ...prev, [market + sniperDigit]: true }));
    }
  };

  const getClusterClass = (market, i) => {
    const clusters = clusterData[market] || [];
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
      <h1 className="text-xl mb-6">🎯 Sniper Bot v4.5 - Multi Market</h1>

      {VOLS.map((market) => (
        <div key={market} className="mb-8 border-t border-gray-700 pt-4">
          <h2 className="text-lg mb-2">📊 {market.replace("R_", "Vol ")}</h2>
          <div className="grid grid-cols-10 gap-2">
            {(tickData[market] || []).map((tick, i) => (
              <div
                key={i}
                className={`${getClusterClass(market, i)} p-2 text-center rounded border border-green-700`}
              >
                {tick}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default App;
