import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createRoom, listRooms, type Room } from "../api";
import { clearDisplayName } from "../name";

interface Props {
  displayName: string;
  onNameChange: (name: string | null) => void;
}

export default function Home({ displayName, onNameChange }: Props) {
  const navigate = useNavigate();
  const [capacity, setCapacity] = useState(8);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rooms, setRooms] = useState<Room[]>([]);

  useEffect(() => {
    listRooms()
      .then(setRooms)
      .catch(() => setRooms([]));
    const interval = setInterval(() => {
      listRooms()
        .then(setRooms)
        .catch(() => {});
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { room } = await createRoom(displayName, capacity);
      navigate(`/room/${room.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create room");
    } finally {
      setLoading(false);
    }
  }

  function handleChangeName() {
    clearDisplayName();
    onNameChange(null);
  }

  return (
    <div className="page">
      <h1>Circle</h1>
      <p className="subtitle">
        Hey {displayName} — create a room or join via invite link.
      </p>

      <div className="card">
        <form onSubmit={handleCreate}>
          <div className="field">
            <label htmlFor="capacity">Room capacity</label>
            <select
              id="capacity"
              value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value))}
            >
              {[4, 6, 8, 10, 12, 16, 20].map((n) => (
                <option key={n} value={n}>
                  {n} people
                </option>
              ))}
            </select>
          </div>
          {error && <p className="error">{error}</p>}
          <button
            type="submit"
            className="primary"
            style={{ width: "100%" }}
            disabled={loading}
          >
            {loading ? "Creating…" : "Create room"}
          </button>
        </form>
      </div>

      {rooms.length > 0 && (
        <>
          <hr className="divider" />
          <h2 style={{ fontSize: "1.125rem", margin: "0 0 0.5rem" }}>
            Active rooms
          </h2>
          <p className="muted">Multiple rooms can run at the same time.</p>
          <ul className="room-list">
            {rooms.map((room) => (
              <li key={room.id}>
                <div>
                  <strong>{room.hostName}&apos;s room</strong>
                  <div className="muted">
                    {room.participantCount}/{room.capacity} · ID {room.id}
                  </div>
                </div>
                <a href={`/room/${room.id}`}>Join</a>
              </li>
            ))}
          </ul>
        </>
      )}

      <div style={{ marginTop: "2rem", textAlign: "center" }}>
        <button type="button" className="secondary" onClick={handleChangeName}>
          Change name
        </button>
      </div>
    </div>
  );
}
