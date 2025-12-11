import { useState } from "react";
import api from "../api/api";
import useAuth from "../hooks/useAuth";

export default function Login() {
    const { login } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const handleLogin = async (e) => {
        e.preventDefault();

        try {
            const res = await api.post("/auth/login", { email, password });
            login(res.data.token);
            window.location.href = "/";
        } catch (err) {
            setError("Invalid email or password");
        }
    };

    return (
        <div className="flex items-center justify-center h-screen bg-gray-100">
            <form onSubmit={handleLogin} className="bg-white p-6 rounded shadow-md w-80">
                <h1 className="text-2xl mb-4 text-center">Login</h1>

                {error && <p className="text-red-500 text-sm mb-2">{error}</p>}

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
                    className="w-full bg-blue-500 text-white py-2 rounded"
                >
                    Login
                </button>

                <p className="mt-3 text-center">
                    No account? <a href="/register" className="text-blue-500">Register</a>
                </p>
            </form>
        </div>
    );
}
