import { useState } from "react";
import api from "../api/api";

export default function Register() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");

    const handleRegister = async (e) => {
        e.preventDefault();
        try {
            await api.post("/auth/register", { email, password });
            setMessage("Account created! You can now log in.");
        } catch (err) {
            setMessage("Registration failed.");
        }
    };

    return (
        <div className="flex items-center justify-center h-screen bg-gray-100">
            <form onSubmit={handleRegister} className="bg-white p-6 rounded shadow-md w-80">
                <h1 className="text-2xl mb-4 text-center">Register</h1>

                <input
                    type="email"
                    placeholder="Email"
                    className="w-full p-2 mb-3 border rounded"
                    onChange={(e) => setEmail(e.target.value)}
                />

                <input
                    type="password"
                    placeholder="Password"
                    className="w-full p-2 mb-4 border rounded"
                    onChange={(e) => setPassword(e.target.value)}
                />

                <button
                    type="submit"
                    className="w-full bg-green-500 text-white py-2 rounded"
                >
                    Register
                </button>

                {message && <p className="mt-3 text-center">{message}</p>}

                <p className="mt-3 text-center">
                    Already have an account? <a href="/login" className="text-blue-500">Login</a>
                </p>
            </form>
        </div>
    );
}
