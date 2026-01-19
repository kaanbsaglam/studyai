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
    <div
      className="p-6 w-full min-h-screen flex flex-col relative overflow-hidden font-display"
      style={{ backgroundColor: "#1f2631" }}
    >
      {/* main bg shadow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none z-0 rounded-full blur-3xl opacity-50"
        style={{
          width: "800px",
          height: "800px",
          background:
            "radial-gradient(circle at center, rgba(228, 228, 228, 0.15) 0%, rgba(16,22,34,0) 70%)",
        }}
      ></div>

      <div
        className="flex flex-1 flex-col relative z-10 justify-center items-center"
        style={{ padding: "24px" }}
      >
        <div
          className="w-full"
          style={{
            maxWidth: "480px",
            backgroundColor: "#1a1d23",
            borderRadius: "16px",
            border: "1px solid #232f48",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          }}
        >
          <div style={{ padding: "32px 32px 16px 32px", textAlign: "center" }}>
            <div
              className="flex items-center justify-center"
              style={{ gap: "12px", marginBottom: "24px" }}
            >
              <h2
                style={{
                  color: "white",
                  fontSize: "36px",
                  fontWeight: 700,
                  letterSpacing: "-0.015em",
                }}
              >
                StudyAI
              </h2>
            </div>
            <h1
              style={{
                color: "#777777",
                fontSize: "28px",
                fontWeight: 700,
                marginBottom: "8px",
              }}
            >
              Welcome back
            </h1>
            <p style={{ color: "#7d8ca3", fontSize: "14px" }}>
              Please enter your details to access your workspace.
            </p>
          </div>

          <div style={{ padding: "8px 32px 32px 32px" }}>
            <form onSubmit={handleLogin} className="flex flex-col" style={{ gap: "20px" }}>
              <div className="flex flex-col" style={{ gap: "8px" }}>
                <label style={{ color: "white", fontSize: "14px", fontWeight: 500 }}>
                  Email
                </label>
                <input
                  className="w-full"
                  style={{
                    height: "48px",
                    padding: "0 12px",
                    backgroundColor: "#0f141c",
                    border: "1px solid #324467",
                    borderRadius: "8px",
                    color: "white",
                    outline: "none",
                  }}
                  placeholder="student@mail.com"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="flex flex-col" style={{ gap: "8px" }}>
                <div className="flex justify-between items-center">
                  <p style={{ color: "white", fontSize: "14px", fontWeight: 500 }}>
                    Password
                  </p>
                  <div
                    className="text-sm cursor-pointer p-2"
                    style={{ color: "#2b6cee", fontWeight: 500 }}
                  >
                    Forgot password ?
                  </div>
                </div>
                <input
                  className="w-full"
                  style={{
                    height: "48px",
                    padding: "0 12px",
                    backgroundColor: "#0f141c",
                    border: "1px solid #324467",
                    borderRadius: "8px",
                    color: "white",
                    outline: "none",
                  }}
                  placeholder="••••••••"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div style={{ marginTop: "8px" }}>
                <button
                  type="submit"
                  className="w-full"
                  style={{
                    height: "48px",
                    backgroundColor: "#2b6cee",
                    borderRadius: "8px",
                    color: "white",
                    fontSize: "14px",
                    fontWeight: 700,
                  }}
                >
                  Sign in
                </button>
              </div>
            </form>

            <p
              style={{
                textAlign: "center",
                color: "#7d8ca3",
                fontSize: "14px",
                marginTop: "24px",
              }}
            >
              Don&apos;t have an account?{" "}
              <Link to="/register" style={{ color: "#2b6cee", fontWeight: 700, textDecoration: "none" }}>
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
