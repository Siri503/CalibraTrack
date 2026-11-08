
import React, { useState } from "react";
import { useNavigate,Link } from "react-router-dom";
import { ShieldCheck, Mail, LockKeyhole, Eye, EyeOff } from "lucide-react";
import "./Login.css";

function Login() {
    const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  
  const handleLogin = (e) => {
  e.preventDefault();

  const demoEmail = "admin@calibratrack.com";
  const demoPassword = "Admin@123";

 if (
  email.trim().toLowerCase() === demoEmail &&
  password === demoPassword
) {
  setError("");

  if (rememberMe) {
    localStorage.setItem("isAuthenticated", "true");
    sessionStorage.removeItem("isAuthenticated");
  } else {
    sessionStorage.setItem("isAuthenticated", "true");
    localStorage.removeItem("isAuthenticated");
  }

  navigate("/dashboard");
  } else {
    setError("Invalid email or password. Please try again.");
  }
};

  return (
    <div className="login-page">

      <div className="login-card">

        <div className="login-brand">
          <div className="login-logo">
            <ShieldCheck size={32} />
          </div>

          <h1>CalibraTrack</h1>
          <p>Calibration Management System</p>
        </div>

        <div className="login-heading">
          <h2>Welcome Back!</h2>
          <p>Sign in to access your dashboard.</p>
        </div>

        <form onSubmit={handleLogin}>

          <div className="login-form-group">
            <label>Email Address</label>

            <div className="login-input-wrapper">
              <Mail size={18} />

              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => {
                    setEmail(e.target.value);
                    setError("");}}
                required
              />
            </div>
          </div>

          <div className="login-form-group">
            <label>Password</label>

            <div className="login-input-wrapper">
              <LockKeyhole size={18} />

              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                 onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                    }}
                required
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          {error && (
                <p className="login-error">
                    {error}
                </p>
                )}

          <div className="login-options">
            <label>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              Remember me
            </label>

           <Link to="/forgot-password" className="forgot-password">
                Forgot Password?
            </Link>
          </div>

          <button type="submit" className="login-submit-btn">
            Sign In
          </button>

        </form>

        <div className="login-footer">
          <p>© 2026 CalibraTrack. All rights reserved.</p>
        </div>

      </div>

    </div>
  );
}

export default Login;
