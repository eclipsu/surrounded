import { Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { getDisplayName } from "./name";
import NameSetup from "./pages/NameSetup";
import Home from "./pages/Home";
import Room from "./pages/Room";

export default function App() {
  const [name, setName] = useState<string | null>(() => getDisplayName());

  useEffect(() => {
    const onStorage = () => setName(getDisplayName());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  if (!name) {
    return <NameSetup onComplete={setName} />;
  }

  return (
    <Routes>
      <Route path="/" element={<Home displayName={name} onNameChange={setName} />} />
      <Route path="/room/:roomId" element={<Room displayName={name} />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
