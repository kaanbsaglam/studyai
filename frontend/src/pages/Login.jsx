import { useState, useContext } from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { loginUser } from "../api/authApi";
import { AuthContext } from "../context/AuthContext";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle";

export default function Login() {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const isValidEmail = (value) => /\S+@\S+\.\S+/.test(value);
  const isValidPassword = (value) => value.length >= 8 && value.length <= 64;

  async function handleLogin(e) {
    e.preventDefault();
    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password) {
      toast.error("Email and password are required.");
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    if (!isValidPassword(password)) {
      toast.error("Password must be 8-64 characters.");
      return;
    }

    try {
      const res = await loginUser(trimmedEmail, password);
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
      style={{ backgroundColor: "var(--page-bg)" }}
    >
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>
      {/* main bg shadow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none z-0 rounded-full blur-3xl opacity-50"
        style={{
          width: "800px",
          height: "800px",
          background:
            "radial-gradient(circle at center, rgba(148, 163, 184, 0.25) 0%, rgba(16,22,34,0) 70%)",
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
            backgroundColor: "var(--card-bg)",
            borderRadius: "16px",
            border: "1px solid var(--card-border)",
            boxShadow: "var(--shadow)",
          }}
        >
          <div style={{ padding: "32px 32px 16px 32px", textAlign: "center" }}>
            <div
              className="flex items-center justify-center"
              style={{ gap: "12px", marginBottom: "24px" }}
            >
              <h2
                  style={{
                    color: "var(--text-primary)",
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
                  color: "var(--text-secondary)",
                fontSize: "28px",
                fontWeight: 700,
                marginBottom: "8px",
              }}
            >
              Welcome back
            </h1>
              <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
              Please enter your details to access your workspace.
            </p>
          </div>

          <div style={{ padding: "8px 32px 32px 32px" }}>
            <form onSubmit={handleLogin} className="flex flex-col" style={{ gap: "20px" }}>
              <div className="flex flex-col" style={{ gap: "8px" }}>
                <label style={{ color: "var(--text-primary)", fontSize: "14px", fontWeight: 500 }}>
                  Email
                </label>
                <input
                  className="w-full"
                  style={{
                    height: "48px",
                    padding: "0 12px",
                    backgroundColor: "var(--input-bg)",
                    border: "1px solid var(--input-border)",
                    borderRadius: "8px",
                    color: "var(--text-primary)",
                    outline: "none",
                  }}
                  placeholder="student@mail.com"
                  type="email"
                  value={email}
                  maxLength={254}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="flex flex-col" style={{ gap: "8px" }}>
                <div className="flex justify-between items-center">
                  <p style={{ color: "var(--text-primary)", fontSize: "14px", fontWeight: 500 }}>
                    Password
                  </p>
                  <div
                    className="text-sm cursor-pointer p-2"
                    style={{ color: "var(--accent)", fontWeight: 500 }}
                  >
                    Forgot password ?
                  </div>
                </div>
                <div className="relative">
                  <input
                    className="w-full"
                    style={{
                      height: "48px",
                      padding: "0 44px 0 12px",
                      backgroundColor: "var(--input-bg)",
                      border: "1px solid var(--input-border)",
                      borderRadius: "8px",
                      color: "var(--text-primary)",
                      outline: "none",
                    }}
                    placeholder="••••••••"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    minLength={8}
                    maxLength={64}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-transparent"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                  </button>
                </div>
              </div>

              <div style={{ marginTop: "8px" }}>
                <button
                  type="submit"
                  className="w-full"
                  style={{
                    height: "48px",
                    backgroundColor: "var(--accent)",
                    borderRadius: "8px",
                    color: "#ffffff",
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
                color: "var(--text-secondary)",
                fontSize: "14px",
                marginTop: "24px",
              }}
            >
              Don&apos;t have an account?{" "}
              <Link to="/register" style={{ color: "var(--accent)", fontWeight: 700, textDecoration: "none" }}>
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
