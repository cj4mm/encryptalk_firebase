import React from "react";
import { useState, useEffect } from "react";
import { db } from "./firebase";
import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  Timestamp,
  orderBy,
} from "firebase/firestore";

function xorEncrypt(text: string, password: string): string {
  const key = [...password].reduce((a, c) => a + c.charCodeAt(0), 0) % 256;
  const bytes = new TextEncoder().encode(text).map((b) => b ^ key);
  return btoa(String.fromCharCode(...bytes));
}

function xorDecrypt(base64: string, password: string): string {
  const key = [...password].reduce((a, c) => a + c.charCodeAt(0), 0) % 256;
  try {
    const str = atob(base64);
    const decrypted = [...str].map((c) => c.charCodeAt(0) ^ key);
    return new TextDecoder().decode(new Uint8Array(decrypted));
  } catch (e) {
    return "⚠️ 복호화 실패 (Base64 형식 오류)";
  }
}

function App() {
  const [sender, setSender] = useState("");
  const [password, setPassword] = useState("");
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"encrypt" | "decrypt">("encrypt");
  const [logs, setLogs] = useState<
    { sender: string; text: string; timestamp: string }[]
  >([]);

  const handleSubmit = async () => {
    if (!text || !password || !sender) return;
    if (mode === "encrypt") {
      const encrypted = xorEncrypt(text, password);
      await addDoc(collection(db, "messages"), {
        sender,
        password,
        text: encrypted,
        timestamp: Timestamp.now(),
      });
      setText("");
    } else {
      const decrypted = xorDecrypt(text, password);
      setLogs((prev) => [
        ...prev,
        {
          sender: "🔓 복호화",
          text: decrypted,
          timestamp: new Date().toLocaleString(),
        },
      ]);
    }
  };

  useEffect(() => {
    if (!password) return;
    const q = query(
      collection(db, "messages"),
      where("password", "==", password),
      orderBy("timestamp", "asc")
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => {
        const d = doc.data();
        return {
          sender: d.sender,
          text: d.text,
          timestamp: d.timestamp?.toDate().toLocaleString() || "",
        };
      });
      setLogs(data);
    });
    return () => unsub();
  }, [password]);

  return (
    <div className="max-w-xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold text-center text-pink-600">
        🧠 모질띨빡 암호기 (실시간)
      </h1>

      <div className="space-y-2">
        <input
          placeholder="이름"
          className="w-full p-2 border rounded"
          value={sender}
          onChange={(e) => setSender(e.target.value)}
        />
        <input
          placeholder="비밀번호 (공유방 키)"
          className="w-full p-2 border rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <textarea
          placeholder="평문 입력"
          className="w-full p-2 border rounded"
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="flex justify-between items-center">
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as "encrypt" | "decrypt")}
            className="border rounded px-2 py-1"
          >
            <option value="encrypt">암호화</option>
            <option value="decrypt">복호화</option>
          </select>
          <button
            className="bg-pink-600 text-white px-4 py-2 rounded"
            onClick={handleSubmit}
          >
            암호화 후 공유
          </button>
        </div>
      </div>

      <hr className="my-4" />

      <h2 className="text-lg font-bold">💬 실시간 대화 로그</h2>
      <div className="space-y-1 text-sm">
        {logs.map((log, i) => (
          <div key={i}>
            [{log.timestamp}] <strong>{log.sender}</strong>: {log.text}
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
