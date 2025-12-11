import { useEffect, useState } from "react";
import { getClassrooms, createClassroom } from "../api/classroomApi";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

export default function ClassroomSelector() {
  const [classrooms, setClassrooms] = useState([]);
  const [newName, setNewName] = useState("");
  const navigate = useNavigate();

  async function loadClassrooms() {
    const res = await getClassrooms();
    setClassrooms(res.data);
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    await createClassroom(newName);
    toast.success("Classroom created");
    setNewName("");
    loadClassrooms();
  }

  useEffect(() => {
    async function fetchData() {
      const res = await getClassrooms();
      setClassrooms(res.data);
    }
    fetchData();
  }, []);


  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Your Classrooms</h1>

      <div className="flex gap-2 mb-4">
        <input
          className="p-2 border flex-1"
          placeholder="New classroom name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button className="bg-blue-600 text-white px-4" onClick={handleCreate}>
          Add
        </button>
      </div>

      <div className="space-y-2">
        {classrooms.map((c) => (
          <div
            key={c.id}
            className="p-3 border cursor-pointer hover:bg-gray-100"
            onClick={() => navigate(`/classroom/${c.id}`)}
          >
            {c.name}
          </div>
        ))}
      </div>
    </div>
  );
}
