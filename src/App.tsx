import React, { useEffect, useState } from "react";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  onSnapshot,
  orderBy,
} from "firebase/firestore";
import { db } from "./firebase";

type Mode = "encrypt" | "decrypt";

interface ChatLog {
  id: string;
  name: string;
  mode: Mode;
  message: string;
  timestamp: any;
}

function deriveKeyFromPassword(password: string): number {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    hash = (hash * 31 + password.charCodeAt(i)) % 256;
  }
  return hash;
}

export default function App() {
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<Mode>("encrypt");
  const [logs, setLogs] = useState<ChatLog[]>([]);

  const key = deriveKeyFromPassword(password);

  const handleEncryptOrDecrypt = async () => {
    if (!text || !password || !name) return;

    if (mode === "encrypt") {
      const encoder = new TextEncoder();
      const bytes = encoder.encode(text);
      const encrypted = bytes.map((b) => b ^ key);
      const encryptedStr = String.fromCharCode(...encrypted);
      const base64 = btoa(encryptedStr);

      await addDoc(collection(db, "messages"), {
        name,
        mode: "encrypt",
        message: base64,
        timestamp: serverTimestamp(),
      });

      setText("");
    } else {
      try {
        const binaryStr = atob(text);
        const encrypted = [...binaryStr].map((c) => c.charCodeAt(0));
        const decryptedBytes = encrypted.map((b) => b ^ key);
        const decoder = new TextDecoder();
        const decryptedText = decoder.decode(new Uint8Array(decryptedBytes));
        setText(decryptedText);
      } catch (err) {
        setText("⚠️ 복호화 실패: 올바른 Base64 형식이 아닙니다.");
      }
    }
  };

  useEffect(() => {
    const q = query(collection(db, "messages"), orderBy("timestamp", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newLogs: ChatLog[] = snapshot.docs.map((doc) => {
        const data = doc.data() as Omit<ChatLog, "id">;
        return {
          id: doc.id,
          ...data,
        };
      });
      setLogs(newLogs);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="max-w-xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold text-center">🧠 모질띨빡 암호기 (실시간)</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <input
          type="text"
          placeholder="이름"
          className="border p-2 rounded col-span-1"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          type="password"
          placeholder="비밀번호 (공유방 키)"
          className="border p-2 rounded col-span-1"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <select
          className="border p-2 rounded col-span-1"
          value={mode}
          onChange={(e) => setMode(e.target.value as Mode)}
        >
          <option value="encrypt">암호화</option>
          <option value="decrypt">복호화</option>
        </select>
      </div>

      <textarea
        placeholder="평문 입력"
        className="w-full border p-2 rounded min-h-[120px]"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      <button
        onClick={handleEncryptOrDecrypt}
        className="bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600"
      >
        {mode === "encrypt" ? "암호화 후 공유" : "복호화"}
      </button>

      <div className="mt-6 border-t pt-4">
        <h2 className="text-xl font-bold mb-2">💬 실시간 대화 로그</h2>
        <div className="space-y-1 max-h-[300px] overflow-y-auto">
          {logs.map((log) => (
            <div key={log.id} className="text-sm">
              <span className="font-semibold">{log.name}</span> [{log.mode === "encrypt" ? "🔐" : "🔓"}]: {log.mode === "encrypt" ? log.message : ""}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
