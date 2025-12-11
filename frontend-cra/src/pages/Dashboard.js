import { useEffect, useState } from "react";
import api from "../api/api";
import useAuth from "../hooks/useAuth";

export default function Dashboard() {
    const { logout } = useAuth();
    const [classrooms, setClassrooms] = useState([]);
    const [newName, setNewName] = useState("");

    useEffect(() => {
        loadClassrooms();
    }, []);

    const loadClassrooms = async () => {
        const res = await api.get("/classrooms");
        setClassrooms(res.data);
    };

    const createClassroom = async () => {
        if (!newName) return;
        await api.post("/classrooms", { name: newName });
        setNewName("");
        loadClassrooms();
    };

    return (
        <div className="p-6">
            <h1 className="text-3xl mb-4">Your Classrooms</h1>

            <button
                onClick={logout}
                className="bg-red-500 text-white px-3 py-1 rounded mb-4"
            >
                Logout
            </button>

            <div className="flex gap-2 mb-4">
                <input
                    className="border p-2 rounded"
                    placeholder="New classroom name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                />
                <button
                    onClick={createClassroom}
                    className="bg-blue-500 text-white px-3 py-2 rounded"
                >
                    +
                </button>
            </div>

            <ul>
                {classrooms.map((c) => (
                    <li key={c.id} className="p-3 border mb-2 rounded">
                        <a className="text-blue-600" href={`/classroom/${c.id}`}>
                            {c.name}
                        </a>
                    </li>
                ))}
            </ul>
        </div>
    );
}
