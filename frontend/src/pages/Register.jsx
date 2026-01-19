import { useState } from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { registerUser } from "../api/authApi";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";

export default function Register() {
  const navigate = useNavigate();
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
      style={{ backgroundColor: "#1f2631" }}
    >
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
        style={{ padding: "20px" }}
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
                style={{ gap: "12px", marginBottom: "10px" }}
              >
                <h2
                  style={{
                    color: "white",
                    fontSize: "36px",
                    fontWeight: 700,
                    letterSpacing: "-0.015em",
                  }}
                >
                  Join StudyAI
                </h2>
              </div>
              <h1
                style={{
                  color: "#777777",
                  fontSize: "28px",
                  fontWeight: 700
                }}
              >
                Create your account
              </h1>
            </div>

            <div style={{ padding: "8px 32px 32px 32px" }}>
              <form onSubmit={handleRegister} className="flex flex-col" style={{ gap: "20px" }}>
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
                    maxLength={254}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="flex flex-col" style={{ gap: "8px" }}>
                  <label style={{ color: "white", fontSize: "14px", fontWeight: 500 }}>
                    Password
                  </label>
                  <div className="relative">
                    <input
                      className="w-full"
                      style={{
                        height: "48px",
                        padding: "0 44px 0 12px",
                        backgroundColor: "#0f141c",
                        border: "1px solid #324467",
                        borderRadius: "8px",
                        color: "white",
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
                      style={{ color: "#9aa4b2" }}
                    >
                      {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                    </button>
                  </div>
                  <p style={{ color: "#8fa1b9", fontSize: "12px" }}>
                    8–64 characters.
                  </p>
                </div>

                <div className="flex flex-col" style={{ gap: "8px" }}>
                  <label style={{ color: "white", fontSize: "14px", fontWeight: 500 }}>
                    Confirm password
                  </label>
                  <div className="relative">
                    <input
                      className="w-full"
                      style={{
                        height: "48px",
                        padding: "0 44px 0 12px",
                        backgroundColor: "#0f141c",
                        border: "1px solid #324467",
                        borderRadius: "8px",
                        color: "white",
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
                      style={{ color: "#9aa4b2" }}
                    >
                      {showConfirmPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                    </button>
                  </div>
                  <p style={{ color: "#8fa1b9", fontSize: "12px" }}>
                    Passwords must match.
                  </p>
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
                    Sign up
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
                Already have an account?{" "}
                <Link to="/login" style={{ color: "#2b6cee", fontWeight: 700, textDecoration: "none" }}>
                  Sign in
                </Link>
              </p>
            </div>
        </div>
      </div>
    </div>
  );
}
