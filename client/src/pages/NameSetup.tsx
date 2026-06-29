import { useState } from "react";
import { setDisplayName } from "../name";

interface Props {
  onComplete: (name: string) => void;
}

export default function NameSetup({ onComplete }: Props) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setError("Name must be at least 2 characters");
      return;
    }
    setDisplayName(trimmed);
    onComplete(trimmed);
  }

  return (
    <div className="page">
      <h1>Circle</h1>
      <p className="subtitle">Live debate rooms — what should we call you?</p>

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="name">Your name</label>
            <input
              id="name"
              type="text"
              placeholder="e.g. Alex"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError("");
              }}
              autoFocus
              maxLength={32}
            />
            {error && <p className="error">{error}</p>}
          </div>
          <button type="submit" className="primary" style={{ width: "100%" }}>
            Continue
          </button>
        </form>
      </div>
    </div>
  );
}
