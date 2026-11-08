
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, Mail, ArrowLeft } from "lucide-react";
import "./ForgotPassword.css";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    setError("");
    setMessage("");

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    setMessage(
      "If an account exists with this email, password reset instructions will be sent."
    );
  };

  return (
    <div className="forgot-page">
      <div className="forgot-card">

        <div className="forgot-brand">
          <div className="forgot-logo">
            <ShieldCheck size={32} />
          </div>
          <h1>CalibraTrack</h1>
          <p>Calibration Management System</p>
        </div>

        <div className="forgot-heading">
          <h2>Forgot Password?</h2>
          <p>Enter your registered email address to request a password reset.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="login-form-group">
            <label>Email Address</label>

            <div className="login-input-wrapper">
              <Mail size={18} />

              <input
                type="email"
                placeholder="Enter your registered email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                  setMessage("");
                }}
                required
              />
            </div>
          </div>

          {error && <p className="login-error">{error}</p>}

          {message && (
            <p className="forgot-success">{message}</p>
          )}

          <button type="submit" className="login-submit-btn">
            Request Password Reset
          </button>
        </form>

        <Link to="/login" className="back-to-login">
          <ArrowLeft size={17} />
          Back to Login
        </Link>

      </div>
    </div>
  );
}

export default ForgotPassword;
