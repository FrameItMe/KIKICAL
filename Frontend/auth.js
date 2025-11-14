
const API_BASE_URL = "http://localhost:8000/auth";

async function handleRegister(event) {
  if (event && event.preventDefault) event.preventDefault();

  const nameEl = document.getElementById("reg-name");
  const emailEl = document.getElementById("reg-email");
  const passwordEl = document.getElementById("reg-password");
  const msgEl = document.getElementById("register-message");
  const name = nameEl ? nameEl.value.trim() : "";
  const email = emailEl ? emailEl.value.trim() : "";
  const password = passwordEl ? passwordEl.value : "";
  if (msgEl) { msgEl.textContent = ""; msgEl.className = "auth-message"; }

  try {
    const res = await fetch(`${API_BASE_URL}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password })
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (msgEl) {
        msgEl.textContent = data.message || "สมัครสมาชิกไม่สำเร็จ";
        msgEl.classList.add("error");
      } else {
        alert(data.message || "สมัครสมาชิกไม่สำเร็จ");
      }
      return;
    }

    if (msgEl) {
      msgEl.textContent = data.message || "สมัครสมาชิกสำเร็จ";
      msgEl.classList.add("success");
    } else {
      alert(data.message || "สมัครสมาชิกสำเร็จ");
    }

    // สมัครสำเร็จ → ส่งไปหน้า login
    setTimeout(() => {
      window.location.href = "login.html";
    }, 800);

  } catch (err) {
    console.error(err);
    if (msgEl) {
      msgEl.textContent = "เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์";
      msgEl.classList.add("error");
    } else {
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    }
  }
}

async function handleLogin(event) {
  if (event && event.preventDefault) event.preventDefault();

  const emailEl = document.getElementById("login-email") || document.getElementById("email");
  const passwordEl = document.getElementById("login-password") || document.getElementById("password");
  const msgEl = document.getElementById("login-message");
  const email = emailEl ? emailEl.value.trim() : "";
  const password = passwordEl ? passwordEl.value : "";
  if (msgEl) { msgEl.textContent = ""; msgEl.className = "auth-message"; }

  try {
    const res = await fetch(`${API_BASE_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (msgEl) {
        msgEl.textContent = data.message || "เข้าสู่ระบบไม่สำเร็จ";
        msgEl.classList.add("error");
      } else {
        alert(data.message || "เข้าสู่ระบบไม่สำเร็จ");
      }
      return;
    }

    // กรณี API ส่ง token กลับมา
    if (data.token) {
      localStorage.setItem("kikical_token", data.token);
    }

    if (msgEl) {
      msgEl.textContent = data.message || "เข้าสู่ระบบสำเร็จ";
      msgEl.classList.add("success");
    } else {
      alert(data.message || "เข้าสู่ระบบสำเร็จ");
    }

    // login สำเร็จ → ส่งไปหน้า dashboard หรือ home
    setTimeout(() => {
      window.location.href = "index.html"; // เปลี่ยนเป็นหน้า dashboard จริงของโปรเจกต์
    }, 800);

  } catch (err) {
    console.error(err);
    if (msgEl) {
      msgEl.textContent = "เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์";
      msgEl.classList.add("error");
    } else {
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    }
  }
}

// เผื่อมีปุ่ม logout ที่หน้าอื่น
async function logout() {
  const token = localStorage.getItem("kikical_token");
  try {
    await fetch(`${API_BASE_URL}/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });
  } catch (e) {
    console.error(e);
  } finally {
    localStorage.removeItem("kikical_token");
    window.location.href = "login.html";
  }
}
