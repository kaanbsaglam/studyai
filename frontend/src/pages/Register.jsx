import { useState } from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { registerUser } from "../api/authApi";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle";

export default function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const isValidEmail = (value) => /\S+@\S+\.\S+/.test(value);
  const isValidPassword = (value) => value.length >= 8 && value.length <= 64;

  async function handleRegister(e) {
    e.preventDefault();
    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password || !confirmPassword) {
      toast.error("All fields are required.");
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

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    try {
      await registerUser(trimmedEmail, password);
      toast.success("Account created!");
      navigate("/login");
    } catch {
      toast.error("Registration failed");
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
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none z-0 rounded-full blur-3xl opacity-50"
        style={{
          width: "800px",
          height: "800px",
          background: "var(--hero-glow)",
        }}
      ></div>

      <div
        className="flex flex-1 flex-col relative z-10 justify-center items-center"
        style={{ padding: "10px" }}
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
            <div style={{ padding: "22px 24px 8px 24px", textAlign: "center" }}>
              <div
                className="flex items-center justify-center"
                style={{ gap: "12px", marginBottom: "6px" }}
              >
                <h2
                  style={{
                    color: "var(--text-primary)",
                    fontSize: "32px",
                    fontWeight: 700,
                    letterSpacing: "-0.015em",
                  }}
                >
                  Join StudyAI
                </h2>
              </div>
              <h1
                style={{
                  color: "var(--text-secondary)",
                  fontSize: "24px",
                  fontWeight: 700
                }}
              >
                Create your account
              </h1>
            </div>

            <div style={{ padding: "6px 24px 18px 24px" }}>
              <form onSubmit={handleRegister} className="flex flex-col" style={{ gap: "16px" }}>
                <div className="flex flex-col" style={{ gap: "6px" }}>
                  <label style={{ color: "var(--text-primary)", fontSize: "14px", fontWeight: 500 }}>
                    Name <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>(optional)</span>
                  </label>
                  <input
                    className="w-full"
                    style={{
                      height: "42px",
                      padding: "0 12px",
                      backgroundColor: "var(--input-bg)",
                      border: "1px solid var(--input-border)",
                      borderRadius: "8px",
                      color: "var(--text-primary)",
                      outline: "none",
                    }}
                    placeholder="John Doe"
                    type="text"
                    value={name}
                    maxLength={100}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="flex flex-col" style={{ gap: "6px" }}>
                  <label style={{ color: "var(--text-primary)", fontSize: "14px", fontWeight: 500 }}>
                    Email
                  </label>
                  <input
                    className="w-full"
                    style={{
                      height: "42px",
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

                <div className="flex flex-col" style={{ gap: "6px" }}>
                  <label style={{ color: "var(--text-primary)", fontSize: "14px", fontWeight: 500 }}>
                    Password
                  </label>
                  <div className="relative">
                    <input
                      className="w-full"
                      style={{
                        height: "42px",
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
                    <p style={{ color: "var(--text-muted)", fontSize: "12px" }}>
                    8–64 characters.
                  </p>
                </div>

                <div className="flex flex-col" style={{ gap: "6px" }}>
                  <label style={{ color: "var(--text-primary)", fontSize: "14px", fontWeight: 500 }}>
                    Confirm password
                  </label>
                  <div className="relative">
                    <input
                      className="w-full"
                      style={{
                        height: "42px",
                        padding: "0 44px 0 12px",
                        backgroundColor: "var(--input-bg)",
                        border: "1px solid var(--input-border)",
                        borderRadius: "8px",
                        color: "var(--text-primary)",
                        outline: "none",
                      }}
                      placeholder="••••••••"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      minLength={8}
                      maxLength={64}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-transparent"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {showConfirmPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                    </button>
                  </div>
                    <p style={{ color: "var(--text-muted)", fontSize: "12px" }}>
                    Passwords must match.
                  </p>
                </div>

                <div style={{ marginTop: "8px" }}>
                  <button
                    type="submit"
                    className="w-full"
                    style={{
                      height: "48px",
                      backgroundColor: "var(--accent)",
                      borderRadius: "8px",
                      color: "white",
                      fontSize: "14px",
                      fontWeight: 700,
                    }}
                  >
                    Sign up
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
                Already have an account?{" "}
                <Link to="/login" style={{ color: "var(--accent)", fontWeight: 700, textDecoration: "none" }}>
                  Sign in
                </Link>
              </p>
            </div>
        </div>
      </div>
    </div>
  );
}
