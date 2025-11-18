import React, { useState } from "react";
import axios from "axios";
import Config from "../config";   // ⭐ import centralized config
import "../styles/register.css";

const Register = ({ onRegister, onSwitch }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!username || !password) {
      alert("Please enter both username and password");
      return;
    }

    setLoading(true);

    try {
      const res = await axios.post(
        Config.REGISTER,        // ⭐ Use config.js instead of hardcoding
        { username, password },
        { headers: { "Content-Type": "application/json" } }
      );

      alert("Registration successful!");
      onRegister(res.data);
      setUsername("");
      setPassword("");

    } catch (err) {
      alert(
        err.response?.data?.message ||
        err.response?.data ||
        err.message
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-wrapper">
      <div className="register-card">
        <div className="register-title">Create Account</div>

        <input
          className="register-input"
          placeholder="Choose a username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <input
          className="register-input"
          type="password"
          placeholder="Create password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          className="register-button"
          onClick={handleRegister}
          disabled={loading}
        >
          {loading ? "Registering..." : "Register"}
        </button>

        <div className="register-link">
          Already have an account?{" "}
          <span onClick={onSwitch}>Login</span>
        </div>
      </div>
    </div>
  );
};

export default Register;
