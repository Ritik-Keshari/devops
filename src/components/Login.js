import React, { useState } from "react";
import axios from "axios";
import Config from "../config";   // ⭐ use centralized config
import "../styles/login.css";

const Login = ({ onLogin, onSwitch }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) {
      alert("Please enter username and password");
      return;
    }

    setLoading(true);

    try {
      const res = await axios.post(
        Config.LOGIN,   // ⭐ no more hardcoded URL
        { username, password },
        { headers: { "Content-Type": "application/json" } }
      );

      onLogin(res.data);
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
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-title">Login</div>

        <input
          className="login-input"
          placeholder="Enter username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <input
          className="login-input"
          type="password"
          placeholder="Enter password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          className="login-button"
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        <div className="login-link">
          Don't have an account?{" "}
          <span onClick={onSwitch}>Register</span>
        </div>
      </div>
    </div>
  );
};

export default Login;
