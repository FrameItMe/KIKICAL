const API_BASE_URL = "http://localhost:8000/auth"; 
// =============================
// REGISTER
// =============================
async function handleRegister(event) {
  if (event) event.preventDefault();

  const name = document.getElementById("reg-name")?.value.trim() || "";
  const email = document.getElementById("reg-email")?.value.trim() || "";
  const password = document.getElementById("reg-password")?.value || "";
  const cpassword = document.getElementById("reg-cpassword")?.value || "";
  const msgEl = document.getElementById("register-message");

  if (msgEl) msgEl.textContent = "";

  if (!name || !email || !password) {
    if (msgEl) {
      msgEl.textContent = "กรุณากรอกข้อมูลให้ครบ";
      msgEl.classList.add("error");
    }
    return;
  }

  if (password !== cpassword) {
    if (msgEl) {
      msgEl.textContent = "รหัสผ่านไม่ตรงกัน";
      msgEl.classList.add("error");
    }
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      if (msgEl) {
        msgEl.textContent = data.error || "สมัครไม่สำเร็จ";
        msgEl.classList.add("error");
      }
      return;
    }

    if (msgEl) {
      msgEl.textContent = data.message || "สมัครสำเร็จ!";
      msgEl.classList.add("success");
    }

    // redirect immediately after successful registration
    window.location.href = "login.html";

  } catch (err) {
    if (msgEl) {
      msgEl.textContent = "เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์";
      msgEl.classList.add("error");
    }
  }
}



// =============================
// LOGIN
// =============================
async function handleLogin(event) {
  if (event) event.preventDefault();

  const email = document.getElementById("email")?.value.trim() || "";
  const password = document.getElementById("password")?.value || "";
  const msgEl = document.getElementById("login-message");

  if (msgEl) msgEl.textContent = "";

  if (!email || !password) {
    if (msgEl) {
      msgEl.textContent = "กรุณากรอกอีเมลและรหัสผ่าน";
      msgEl.classList.add("error");
    }
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      if (msgEl) {
        msgEl.textContent = data.error || "เข้าสู่ระบบไม่สำเร็จ";
        msgEl.classList.add("error");
      }
      return;
    }

    // เก็บ token ใน localStorage (simple approach)
    if (data.token) {
      localStorage.setItem("token", data.token);
    }

    // ตรวจ session โดยเรียก /auth/me ด้วย header Authorization
    try {
      const token = data.token || localStorage.getItem("token");
      const meRes = await fetch(`${API_BASE_URL}/me`, {
        method: "GET",
        headers: { "Authorization": token },
      });
      const meData = await meRes.json();

      if (meRes.ok && meData.user) {
        if (msgEl) {
          msgEl.textContent = "เข้าสู่ระบบสำเร็จ!";
          msgEl.classList.add("success");
        }
        setTimeout(() => {
          window.location.href = "predashboard.html";
        }, 700);
      } else {
        if (msgEl) {
          msgEl.textContent = "Login succeeded but unable to verify session.";
          msgEl.classList.add("error");
        }
      }
    } catch (err) {
      if (msgEl) {
        msgEl.textContent = "Login succeeded but failed to verify session.";
        msgEl.classList.add("error");
      }
    }

  } catch (err) {
    if (msgEl) {
      msgEl.textContent = "เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์";
      msgEl.classList.add("error");
    }
  }
}



// =============================
// LOGOUT
// =============================
async function logout() {
  // Clear local token and redirect
  try {
    localStorage.removeItem("token");
  } catch (err) {
    console.error(err);
  }
  window.location.href = "login.html";
}



// =============================
// CHECK AUTH (Used in dashboard)
// =============================
async function checkAuth() {
  const token = localStorage.getItem("token");
  if (!token) return null;

  try {
    const res = await fetch(`${API_BASE_URL}/me`, {
      method: "GET",
      headers: { "Authorization": token },
    });

    const data = await res.json();
    return data.user || null;
  } catch (err) {
    console.error("Auth check failed:", err);
    return null;
  }
}
