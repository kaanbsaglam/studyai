import { useState, useContext } from "react";
import { loginUser } from "../api/authApi";
import { AuthContext } from "../context/AuthContext";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";

export default function Login() {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    try {
      const res = await loginUser(email, password);
      login(res.data.token);
      toast.success("Logged in!");
      navigate("/");
    } catch {
      toast.error("Invalid credentials");
    }
  }

  return (
    <div className="p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Login</h1>

      <form onSubmit={handleLogin} className="space-y-4">
        <input
          className="w-full p-2 border"
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="w-full p-2 border"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button className="w-full bg-blue-600 text-white p-2">Login</button>
      </form>

      <p className="mt-4">
        No account? <Link to="/register" className="text-blue-600">Register</Link>
      </p>
    </div>
  );
}
