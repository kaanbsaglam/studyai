import { useEffect, useState } from "react";
import { getClassrooms, createClassroom } from "../api/classroomApi";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle";

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
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
      <div className="p-6 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Your Classrooms</h1>
          <ThemeToggle />
        </div>

      <div className="flex gap-2 mb-4">
        <input
          className="p-2 border flex-1 rounded bg-white text-slate-900 border-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700"
          placeholder="New classroom name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button className="bg-blue-600 text-white px-4 rounded hover:bg-blue-700" onClick={handleCreate}>
          Add
        </button>
      </div>

      <div className="space-y-2">
        {classrooms.map((c) => (
          <div
            key={c.id}
            className="p-3 border rounded cursor-pointer bg-white hover:bg-gray-100 dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700"
            onClick={() => navigate(`/classroom/${c.id}`)}
          >
            {c.name}
          </div>
        ))}
      </div>
      </div>
    </div>
  );
}
