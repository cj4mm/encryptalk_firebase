import React, { useEffect, useState } from "react";
import { db } from "./firebase";
import { collection, addDoc, onSnapshot, query, orderBy } from "firebase/firestore";

function deriveKey(password: string): number {
  return Array.from(password).reduce((hash, c) => (hash * 31 + c.charCodeAt(0)) % 256, 0);
}

type Message = {
  sender: string;
  result: string;
  timestamp: string;
};

export default function App() {
  const [sender, setSender] = useState("");
  const [password, setPassword] = useState("");
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"encrypt" | "decrypt">("encrypt");
  const [result, setResult] = useState("");
  const [logs, setLogs] = useState<Message[]>([]);

  const roomId = password || "default-room";
  const key = deriveKey(password);

  const handleProcess = async () => {
    if (!sender || !password || !text) {
      setResult("⚠ 이름, 암호, 입력 모두 필요해요.");
      return;
    }

    const now = new Date().toLocaleString("ko-KR");

    if (mode === "encrypt") {
      const encoder = new TextEncoder();
      const bytes = encoder.encode(text);
      const encrypted = bytes.map((b) => b ^ key);
      const encryptedStr = String.fromCharCode(...encrypted);
      const base64 = btoa(encryptedStr);
      setResult(base64);

      await addDoc(collection(db, roomId), {
        sender,
        result: base64,
        timestamp: now,
      });
    } else {
      try {
        const decrypted = atob(text)
          .split("")
          .map((c) => c.charCodeAt(0) ^ key);
        const decoded = new TextDecoder().decode(new Uint8Array(decrypted));
        setResult(decoded);
      } catch {
        setResult("⚠ 복호화 실패");
      }
    }
  };

  useEffect(() => {
    if (!password) return;
    const q = query(collection(db, roomId), orderBy("timestamp"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messages: Message[] = snapshot.docs.map((doc) => doc.data() as Message);
      setLogs(messages);
    });
    return () => unsubscribe();
  }, [password]);

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <h1>🧠 모질띨빡 암호기 (실시간)</h1>

      <input value={sender} onChange={(e) => setSender(e.target.value)} placeholder="이름" />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="비밀번호 (공유방 키)" />
      <select value={mode} onChange={(e) => setMode(e.target.value as any)}>
        <option value="encrypt">암호화</option>
        <option value="decrypt">복호화</option>
      </select>
      <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={mode === "encrypt" ? "평문 입력" : "암호문 입력"} />
      <button onClick={handleProcess}>{mode === "encrypt" ? "암호화 후 공유" : "복호화"}</button>

      {result && (
        <div style={{ marginTop: 10, background: "#f0f0f0", padding: 10 }}>
          <strong>{mode === "encrypt" ? "암호문" : "복호문"}:</strong> {result}
        </div>
      )}

      <h2>💬 실시간 대화 로그</h2>
      <ul>
        {logs.map((msg, i) => (
          <li key={i}>
            [{msg.timestamp}] {msg.sender}: {msg.result}
          </li>
        ))}
      </ul>
    </div>
  );
}